import logging
from typing import Optional

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import transaction
from django.http import HttpRequest, HttpResponse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy, reverse
import pandas as pd
import json

from .models import Case, Transaction
from .forms import CaseForm, ImportForm, SettingsForm
from .lib import importer, analyzer, llm_classifier, config
from .services import TransactionService, AnalysisService
from .templatetags.japanese_date import wareki

logger = logging.getLogger(__name__)

# 定数
ITEMS_PER_PAGE = 100  # ページネーションの1ページあたりの件数
MAX_VALIDATION_ERRORS_DISPLAY = 5  # バリデーションエラーの最大表示件数
GIFT_TAX_THRESHOLD = 1_100_000  # 贈与税の基礎控除額


def _parse_amount(value: str, default: int = 0) -> tuple[int, bool]:
    """
    金額文字列を整数に変換

    Args:
        value: 金額文字列（カンマ区切り可）
        default: 変換失敗時のデフォルト値

    Returns:
        (変換後の金額, 成功フラグ) のタプル
    """
    try:
        cleaned = (value or '0').replace(',', '')
        return int(cleaned), True
    except (ValueError, AttributeError):
        return default, False


def _parse_keywords(text: str) -> list[str]:
    """カンマまたは改行区切りのテキストをキーワードリストに変換"""
    return [k.strip() for k in text.replace('\n', ',').split(',') if k.strip()]


def _build_redirect_url(
    view_name: str,
    pk: int,
    tab: Optional[str] = None,
    filters: Optional[dict] = None
) -> str:
    """タブパラメータとフィルター付きのリダイレクトURLを生成"""
    url = reverse(view_name, kwargs={'pk': pk})
    params = []

    if tab:
        params.append(f'tab={tab}')

    if filters:
        for key, values in filters.items():
            if isinstance(values, list):
                for v in values:
                    params.append(f'{key}={v}')
            elif values:
                params.append(f'{key}={values}')

    if params:
        url += '?' + '&'.join(params)

    return url


def export_csv(request: HttpRequest, pk: int, export_type: str) -> HttpResponse:
    """取引データをCSVでエクスポート"""
    logger.info(f"CSVエクスポート開始: case_id={pk}, type={export_type}")
    case = get_object_or_404(Case, pk=pk)
    transactions = case.transactions.all().order_by('date', 'id')

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    df = pd.DataFrame(list(transactions.values()))

    # エクスポートタイプに応じてフィルタリング
    if export_type == 'large':
        df = df[df['is_large'] == True].copy()
        filename = f"{case.name}_多額取引.csv"
    elif export_type == 'transfers':
        df = df[df['is_transfer'] == True].copy()
        filename = f"{case.name}_資金移動.csv"
    elif export_type == 'all':
        filename = f"{case.name}_全取引.csv"
    else:
        filename = f"{case.name}_取引データ.csv"

    if df.empty:
        messages.warning(request, "該当するデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    # 出力カラムを選択・整形
    export_columns = {
        'date': '日付',
        'bank_name': '銀行名',
        'branch_name': '支店名',
        'account_id': '口座番号',
        'description': '摘要',
        'amount_out': '払戻',
        'amount_in': 'お預り',
        'balance': '残高',
        'category': '分類',
    }

    # 存在するカラムのみ抽出
    cols_to_export = [c for c in export_columns.keys() if c in df.columns]
    export_df = df[cols_to_export].copy()

    # 日付を和暦に変換
    if 'date' in export_df.columns:
        export_df['date'] = export_df['date'].apply(lambda d: wareki(d, 'short'))

    export_df.columns = [export_columns[c] for c in cols_to_export]

    # CSVレスポンスを作成
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    # BOM付きUTF-8で出力（Excelで文字化けしないように）
    export_df.to_csv(response, index=False, encoding='utf-8-sig')

    return response


class CaseListView(ListView):
    model = Case
    template_name = 'analyzer/case_list.html'
    context_object_name = 'cases'
    ordering = ['-created_at']

class CaseCreateView(CreateView):
    model = Case
    form_class = CaseForm
    template_name = 'analyzer/case_form.html'
    success_url = reverse_lazy('case-list')

    def form_valid(self, form):
        messages.success(self.request, "案件を作成しました。")
        return super().form_valid(form)

class CaseUpdateView(UpdateView):
    model = Case
    form_class = CaseForm
    template_name = 'analyzer/case_form.html'
    
    def get_success_url(self):
        messages.success(self.request, "案件を更新しました。")
        return reverse('case-detail', kwargs={'pk': self.object.pk})

class CaseDeleteView(DeleteView):
    model = Case
    template_name = 'analyzer/case_confirm_delete.html'
    success_url = reverse_lazy('case-list')

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, "案件を削除しました。")
        return super().delete(request, *args, **kwargs)

def case_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """案件詳細ビュー（ページネーション付き）"""
    case = get_object_or_404(Case, pk=pk)

    # POST処理（付箋トグル・取引更新）
    if request.method == 'POST':
        action = request.POST.get('action')
        tx_id = request.POST.get('tx_id')
        page = request.POST.get('page', 1)

        if action == 'toggle_flag' and tx_id:
            try:
                new_state = TransactionService.toggle_flag(case, int(tx_id))
                if new_state:
                    messages.success(request, "付箋を追加しました。")
                else:
                    messages.info(request, "付箋を外しました。")
            except Exception as e:
                logger.exception(f"フラグ更新エラー: tx_id={tx_id}, error={e}")
                messages.error(request, f"エラー: {e}")

        elif action == 'update_transaction' and tx_id:
            try:
                success = TransactionService.update_transaction(
                    case,
                    int(tx_id),
                    request.POST.get('date'),
                    request.POST.get('description'),
                    int(request.POST.get('amount_out') or 0),
                    int(request.POST.get('amount_in') or 0),
                    request.POST.get('category'),
                    request.POST.get('memo'),
                    request.POST.get('bank_name'),
                    request.POST.get('branch_name'),
                    request.POST.get('account_id')
                )
                if success:
                    messages.success(request, "取引データを更新しました。")
            except Exception as e:
                logger.exception(f"取引更新エラー: tx_id={tx_id}, error={e}")
                messages.error(request, f"更新エラー: {e}")

        return redirect(f"{reverse('case-detail', args=[pk])}?page={page}")

    transactions_list = case.transactions.all().order_by('date', 'id')

    # ページネーション（1ページあたり100件）
    paginator = Paginator(transactions_list, ITEMS_PER_PAGE)
    page = request.GET.get('page', 1)

    try:
        transactions = paginator.page(page)
    except PageNotAnInteger:
        transactions = paginator.page(1)
    except EmptyPage:
        transactions = paginator.page(paginator.num_pages)

    # セレクト用のユニークリストを取得
    all_txs = case.transactions.all()
    banks = sorted(set(all_txs.exclude(bank_name__isnull=True).exclude(bank_name='').values_list('bank_name', flat=True)))
    branches = sorted(set(all_txs.exclude(branch_name__isnull=True).exclude(branch_name='').values_list('branch_name', flat=True)))
    accounts = sorted(set(all_txs.exclude(account_id__isnull=True).exclude(account_id='').values_list('account_id', flat=True)))
    categories = AnalysisService.STANDARD_CATEGORIES

    context = {
        'case': case,
        'transactions': transactions,
        'total_count': transactions_list.count(),
        'banks': banks,
        'branches': branches,
        'accounts': accounts,
        'categories': categories,
    }
    return render(request, 'analyzer/case_detail.html', context)

def transaction_import(request: HttpRequest, pk: int) -> HttpResponse:
    """取引データのインポート"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        form = ImportForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES['csv_file']
            logger.info(f"ファイルインポート開始: case_id={pk}, filename={csv_file.name}, size={csv_file.size}")
            try:
                # 1. Load CSV and Validate Balance (Stage 1)
                df = importer.load_csv(csv_file)
                df = importer.validate_balance(df)
                
                # Prepare for session storage (JSON serializable)
                # Convert dates to strings
                df['date'] = df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)
                
                # Replace NumPy types with Python native types for JSON serialization
                # float('nan') is not valid JSON usually, replace with None or 0
                df = df.where(pd.notnull(df), None)
                
                import_data = df.to_dict(orient='records')
                
                request.session['import_data'] = import_data
                request.session['import_case_id'] = case.id
                
                return redirect('transaction-preview', pk=pk)

            except Exception as e:
                logger.exception(f"ファイルインポートエラー: case_id={pk}, error={e}")
                messages.error(request, f"エラーが発生しました: {e}")
    else:
        form = ImportForm()

    return render(request, 'analyzer/import_form.html', {'case': case, 'form': form})

def transaction_preview(request: HttpRequest, pk: int) -> HttpResponse:
    """インポートプレビューと確定"""
    case = get_object_or_404(Case, pk=pk)
    
    # Session check
    if request.session.get('import_case_id') != case.id or 'import_data' not in request.session:
        messages.error(request, "セッションが切れました。再度アップロードしてください。")
        return redirect('transaction-import', pk=pk)
    
    import_data = request.session['import_data']
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'recalculate':
            # Update data from form inputs
            updated_data = []
            validation_errors = []

            for i, row in enumerate(import_data):
                # Check for deletion flag
                if request.POST.get(f'form-{i}-DELETE'):
                    continue

                new_row = row.copy()
                new_row['date'] = request.POST.get(f'form-{i}-date', row.get('date'))
                new_row['description'] = request.POST.get(f'form-{i}-description', row.get('description'))

                # 金額フィールドのバリデーション
                amount_fields = [
                    ('amount_out', '出金額'),
                    ('amount_in', '入金額'),
                    ('balance', '残高'),
                ]
                for field_name, field_label in amount_fields:
                    value_str = request.POST.get(f'form-{i}-{field_name}', '0')
                    parsed_value, success = _parse_amount(value_str, row.get(field_name, 0))
                    new_row[field_name] = parsed_value
                    if not success:
                        validation_errors.append(f"行{i+1}: {field_label}が不正な値です")

                updated_data.append(new_row)

            if validation_errors:
                for error in validation_errors[:MAX_VALIDATION_ERRORS_DISPLAY]:
                    messages.warning(request, error)
                remaining = len(validation_errors) - MAX_VALIDATION_ERRORS_DISPLAY
                if remaining > 0:
                    messages.warning(request, f"他にも{remaining}件のエラーがあります")
            
            # Re-validate balance
            df = pd.DataFrame(updated_data)
            
            # Handle empty dataframe case (if all rows deleted)
            if df.empty:
                 request.session['import_data'] = []
                 import_data = []
                 messages.info(request, "全ての行が削除されました。")
            else:
                # Ensure types
                df['amount_out'] = df['amount_out'].astype(int)
                df['amount_in'] = df['amount_in'].astype(int)
                df['balance'] = df['balance'].astype(int)
                
                # Re-run logic
                df = importer.validate_balance(df)
                
                # Save back to session
                request.session['import_data'] = df.to_dict(orient='records')
                import_data = request.session['import_data']
                messages.info(request, "再計算しました（削除反映済み）。")

        elif action == 'commit':
            # Run Commit Logic
            try:
                # Filter out deleted rows (check DELETE flags from form)
                filtered_data = []
                for i, row in enumerate(import_data):
                    if not request.POST.get(f'form-{i}-DELETE'):
                        filtered_data.append(row)

                if not filtered_data:
                    messages.warning(request, "取り込むデータがありません。")
                    return redirect('transaction-import', pk=pk)

                # Load filtered staging data
                df = pd.DataFrame(filtered_data)
                # Convert dates back to datetime
                df['date'] = pd.to_datetime(df['date'])
                
                # 3. Classify
                df = llm_classifier.classify_transactions(df)
                
                # 4. Analyze (Large amounts)
                df = analyzer.analyze_large_amounts(df)
                
                with transaction.atomic():
                    new_transactions = []
                    for _, row in df.iterrows():
                        dt = row['date'] if pd.notna(row['date']) else None
                        
                        new_transactions.append(Transaction(
                            case=case,
                            date=dt,
                            description=row['description'],
                            amount_out=row.get('amount_out', 0),
                            amount_in=row.get('amount_in', 0),
                            balance=row.get('balance', 0) if pd.notna(row['balance']) else None,
                            account_id=str(row.get('account_number', 'unknown')),
                            is_large=row.get('is_large', False),
                            category=row.get('category'),
                            branch_name=row.get('branch_name'),
                            bank_name=row.get('bank_name'),
                        ))
                    
                    Transaction.objects.bulk_create(new_transactions)
                    
                    # 5. Re-analyze transfers
                    all_tx = pd.DataFrame(list(case.transactions.all().values()))
                    if not all_tx.empty:
                        analyzed_df = analyzer.analyze_transfers(all_tx)
                        updates = []
                        for _, row in analyzed_df.iterrows():
                             if row.get('is_transfer'):
                                 updates.append(Transaction(
                                     id=row['id'],
                                     is_transfer=True,
                                     transfer_to=row['transfer_to']
                                 ))
                        if updates:
                            Transaction.objects.bulk_update(updates, ['is_transfer', 'transfer_to'])
                
                # Cleanup
                del request.session['import_data']
                del request.session['import_case_id']
                
                logger.info(f"取引インポート完了: case_id={pk}, count={len(new_transactions)}")
                messages.success(request, f"{len(new_transactions)}件の取引を取り込みました。")
                return redirect('case-detail', pk=pk)

            except Exception as e:
                logger.exception(f"取引インポートエラー: case_id={pk}, error={e}")
                messages.error(request, f"取り込みエラー: {e}")
    
    return render(request, 'analyzer/import_confirm.html', {
        'case': case,
        'transactions': import_data
    })

def analysis_dashboard(request: HttpRequest, pk: int) -> HttpResponse:
    """分析・表示ダッシュボード"""
    case = get_object_or_404(Case, pk=pk)

    # POSTリクエストの処理
    if request.method == 'POST':
        return _handle_analysis_post(request, case, pk)

    # GETリクエスト: データ表示
    filter_state = {
        'bank': request.GET.getlist('bank'),
        'account': request.GET.getlist('account'),
        'category': request.GET.getlist('category'),
        'keyword': request.GET.get('keyword', '')
    }

    analysis_data = AnalysisService.get_analysis_data(case, filter_state)

    if analysis_data.get('no_data'):
        return render(request, 'analyzer/analysis.html', {'case': case, 'no_data': True})

    # 取引一覧のページネーション
    all_txs_queryset = analysis_data['all_txs']
    all_txs_count = all_txs_queryset.count()
    paginator = Paginator(all_txs_queryset, ITEMS_PER_PAGE)
    page = request.GET.get('page', 1)

    try:
        all_txs_page = paginator.page(page)
    except PageNotAnInteger:
        all_txs_page = paginator.page(1)
    except EmptyPage:
        all_txs_page = paginator.page(paginator.num_pages)

    context = {
        'case': case,
        'account_summary': analysis_data['account_summary'],
        'transfer_pairs_json': json.dumps(analysis_data['transfer_pairs']),
        'transfer_list': analysis_data['transfer_list'],
        'large_txs': analysis_data['large_txs'],
        'all_txs': all_txs_page,
        'all_txs_count': all_txs_count,
        'duplicate_txs': analysis_data['duplicate_txs'],
        'flagged_txs': analysis_data['flagged_txs'],
        'banks': analysis_data['banks'],
        'branches': analysis_data['branches'],
        'accounts': analysis_data['accounts'],
        'categories': analysis_data['categories'],
        'filter_state': filter_state,
    }
    return render(request, 'analyzer/analysis.html', context)


def _handle_analysis_post(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    """分析ダッシュボードのPOSTリクエストを処理"""
    action = request.POST.get('action')

    if action == 'run_classifier':
        count = TransactionService.run_classifier(case)
        if count == 0:
            messages.warning(request, "データがありません。")
        else:
            messages.success(request, "自動分類が完了しました。")
        return redirect('analysis-dashboard', pk=pk)

    elif action == 'delete_account':
        account_id = request.POST.get('account_id')
        if account_id:
            count = TransactionService.delete_account_transactions(case, account_id)
            messages.success(request, f"口座ID: {account_id} のデータ（{count}件）を削除しました。")
        return redirect('analysis-dashboard', pk=pk)

    elif action == 'update_category':
        tx_id = request.POST.get('tx_id')
        new_category = request.POST.get('new_category')
        apply_all = request.POST.get('apply_all') == 'true'

        if tx_id and new_category:
            count = TransactionService.update_transaction_category(
                case, int(tx_id), new_category, apply_all
            )
            if apply_all and count > 0:
                tx = case.transactions.filter(pk=tx_id).first()
                if tx:
                    messages.success(request, f"「{tx.description}」の取引 {count}件を「{new_category}」に変更しました。")
            else:
                messages.success(request, "分類を更新しました。")
        return redirect('analysis-dashboard', pk=pk)

    elif action == 'bulk_update_categories':
        source_tab = request.POST.get('source_tab', 'large')

        category_updates = {
            key.replace('cat-', ''): value
            for key, value in request.POST.items()
            if key.startswith('cat-')
        }

        count = TransactionService.bulk_update_categories(case, category_updates)
        if count > 0:
            messages.success(request, f"{count}件の分類を更新しました。")
        else:
            messages.info(request, "変更はありませんでした。")

        # フィルター状態を復元（allタブの場合）
        filters = None
        if source_tab == 'all':
            filters = {
                'bank': request.POST.getlist('filter_bank'),
                'account': request.POST.getlist('filter_account'),
                'category': request.POST.getlist('filter_category'),
                'keyword': request.POST.get('filter_keyword', ''),
                'page': request.POST.get('filter_page', ''),
            }

        return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab, filters))

    elif action == 'update_transaction':
        source_tab = request.POST.get('source_tab', '')
        tx_id = request.POST.get('tx_id')

        if tx_id:
            try:
                success = TransactionService.update_transaction(
                    case,
                    int(tx_id),
                    request.POST.get('date'),
                    request.POST.get('description'),
                    int(request.POST.get('amount_out') or 0),
                    int(request.POST.get('amount_in') or 0),
                    request.POST.get('category'),
                    request.POST.get('memo'),
                    request.POST.get('bank_name'),
                    request.POST.get('branch_name'),
                    request.POST.get('account_id')
                )
                if success:
                    messages.success(request, "取引データを更新しました。")
            except Exception as e:
                logger.exception(f"取引更新エラー: tx_id={tx_id}, error={e}")
                messages.error(request, f"更新エラー: {e}")

        return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))

    elif action == 'delete_duplicates':
        delete_ids = request.POST.getlist('delete_ids')
        count = TransactionService.delete_duplicates(case, delete_ids)
        if count > 0:
            messages.success(request, f"{count}件の重複データを削除しました。")
        else:
            messages.warning(request, "削除対象が選択されていません。")
        # データクレンジングタブに留まる
        return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    elif action == 'toggle_flag':
        tx_id = request.POST.get('tx_id')
        source_tab = request.POST.get('source_tab', '')
        if tx_id:
            try:
                new_state = TransactionService.toggle_flag(case, int(tx_id))
                if new_state:
                    messages.success(request, "付箋を追加しました。")
                else:
                    messages.info(request, "付箋を外しました。")
            except Exception as e:
                logger.exception(f"フラグ更新エラー: tx_id={tx_id}, error={e}")
                messages.error(request, f"エラー: {e}")
        return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))

    elif action == 'update_memo':
        tx_id = request.POST.get('tx_id')
        memo = request.POST.get('memo', '')
        source_tab = request.POST.get('source_tab', '')
        if tx_id:
            try:
                success = TransactionService.update_memo(case, int(tx_id), memo)
                if success:
                    messages.success(request, "メモを更新しました。")
            except Exception as e:
                logger.exception(f"メモ更新エラー: tx_id={tx_id}, error={e}")
                messages.error(request, f"エラー: {e}")
        return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))

    return redirect('analysis-dashboard', pk=pk)

def settings_view(request: HttpRequest) -> HttpResponse:
    """アプリケーション設定ビュー"""
    current_settings = config.load_user_settings()
    current_patterns = current_settings.get("CLASSIFICATION_PATTERNS", config.DEFAULT_PATTERNS)
    
    if request.method == 'POST':
        form = SettingsForm(request.POST) 
        if form.is_valid():
            new_settings = {
                "LARGE_AMOUNT_THRESHOLD": form.cleaned_data['large_amount_threshold'],
                "TRANSFER_DAYS_WINDOW": form.cleaned_data['transfer_days_window'],
                "TRANSFER_AMOUNT_TOLERANCE": form.cleaned_data['transfer_amount_tolerance'],
                "CLASSIFICATION_PATTERNS": {
                    "生活費": _parse_keywords(form.cleaned_data['cat_life']),
                    "給与": _parse_keywords(form.cleaned_data['cat_salary']),
                    "贈与": _parse_keywords(form.cleaned_data['cat_gift']),
                    "関連会社": _parse_keywords(form.cleaned_data['cat_related']),
                    "銀行": _parse_keywords(form.cleaned_data['cat_bank']),
                    "証券・株式": _parse_keywords(form.cleaned_data['cat_security']),
                    "保険会社": _parse_keywords(form.cleaned_data['cat_insurance']),
                    "その他": _parse_keywords(form.cleaned_data['cat_other']),
                }
            }

            config.save_user_settings(new_settings)
            messages.success(request, "設定を保存しました。")
            return redirect('settings')
    else:
        initial_data = {
            'large_amount_threshold': current_settings.get("LARGE_AMOUNT_THRESHOLD", 500000),
            'transfer_days_window': current_settings.get("TRANSFER_DAYS_WINDOW", 3),
            'transfer_amount_tolerance': current_settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000),
            'cat_life': ", ".join(current_patterns.get("生活費", [])),
            'cat_salary': ", ".join(current_patterns.get("給与", [])),
            'cat_gift': ", ".join(current_patterns.get("贈与", [])),
            'cat_related': ", ".join(current_patterns.get("関連会社", [])),
            'cat_bank': ", ".join(current_patterns.get("銀行", [])),
            'cat_security': ", ".join(current_patterns.get("証券・株式", [])),
            'cat_insurance': ", ".join(current_patterns.get("保険会社", [])),
            'cat_other': ", ".join(current_patterns.get("その他", [])),
        }
        form = SettingsForm(initial=initial_data)

    return render(request, 'analyzer/settings.html', {'form': form})
