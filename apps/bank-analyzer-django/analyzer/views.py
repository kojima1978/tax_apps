import json
import logging
from datetime import datetime
from typing import Optional

from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import transaction
from django.db.models import Q
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy, reverse
from django.views.decorators.http import require_POST
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
import pandas as pd

from .models import Case, Transaction
from .forms import CaseForm, ImportForm, SettingsForm
from .lib import importer, analyzer, llm_classifier, config
from .lib.exceptions import (
    CsvImportError, EncodingError, FormatError, DateParseError, AmountParseError,
    MultipleAccountError, MultipleBankError
)
from .services import TransactionService, AnalysisService
from .templatetags.japanese_date import wareki

logger = logging.getLogger(__name__)

# 定数
ITEMS_PER_PAGE = 100  # ページネーションの1ページあたりの件数
MAX_VALIDATION_ERRORS_DISPLAY = 5  # バリデーションエラーの最大表示件数


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


def export_json(request: HttpRequest, pk: int) -> HttpResponse:
    """案件データをJSONでバックアップエクスポート"""
    logger.info(f"JSONエクスポート開始: case_id={pk}")
    case = get_object_or_404(Case, pk=pk)
    transactions = case.transactions.all().order_by('date', 'id')

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('case-detail', pk=pk)

    # 取引データをシリアライズ（表示順: 日付,銀行名,支店名,種別,口座番号,摘要,出金,入金,残高）
    transactions_data = []
    for tx in transactions:
        transactions_data.append({
            # 基本情報（表示順）
            'date': tx.date.isoformat() if tx.date else None,
            'bank_name': tx.bank_name,
            'branch_name': tx.branch_name,
            'account_type': tx.account_type,
            'account_id': tx.account_id,
            'description': tx.description,
            'amount_out': tx.amount_out,
            'amount_in': tx.amount_in,
            'balance': tx.balance,
            # 復元用メタデータ
            'category': tx.category,
            'holder': tx.holder,
            'is_large': tx.is_large,
            'is_transfer': tx.is_transfer,
            'transfer_to': tx.transfer_to,
            'is_flagged': tx.is_flagged,
            'memo': tx.memo,
        })

    # 統計情報を計算
    total_in = sum(tx.amount_in for tx in transactions)
    total_out = sum(tx.amount_out for tx in transactions)

    # エクスポートデータを構築
    export_data = {
        'version': '1.0',
        'exported_at': datetime.now().isoformat(),
        'case': {
            'name': case.name,
            'created_at': case.created_at.isoformat() if case.created_at else None,
        },
        'transactions': transactions_data,
        'statistics': {
            'total_transactions': len(transactions_data),
            'total_in': total_in,
            'total_out': total_out,
        },
        'settings': config.load_user_settings(),
    }

    # JSONレスポンスを作成
    response = HttpResponse(
        json.dumps(export_data, ensure_ascii=False, indent=2),
        content_type='application/json; charset=utf-8'
    )
    filename = f"{case.name}_backup.json"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    logger.info(f"JSONエクスポート完了: case_id={pk}, transactions={len(transactions_data)}")
    return response


def import_json(request: HttpRequest) -> HttpResponse:
    """JSONバックアップから新規案件を復元"""
    from .forms import JsonImportForm

    if request.method == 'POST':
        form = JsonImportForm(request.POST, request.FILES)
        if form.is_valid():
            json_file = request.FILES['json_file']
            logger.info(f"JSONインポート開始: filename={json_file.name}, size={json_file.size}")

            try:
                # JSONを読み込み
                content = json_file.read().decode('utf-8')
                data = json.loads(content)

                # バージョンチェック
                version = data.get('version', '1.0')
                if version not in ['1.0']:
                    raise ValueError(f"未対応のバージョン: {version}")

                # 案件データを取得
                case_data = data.get('case', {})
                original_name = case_data.get('name', 'インポート案件')

                # 案件名の重複チェック・自動リネーム
                case_name = original_name
                counter = 1
                while Case.objects.filter(name=case_name).exists():
                    case_name = f"{original_name}_復元{counter}"
                    counter += 1

                # トランザクション内で案件と取引を作成
                with transaction.atomic():
                    # 案件を作成
                    new_case = Case.objects.create(name=case_name)

                    # 取引データをインポート
                    transactions_data = data.get('transactions', [])
                    new_transactions = []

                    for tx_data in transactions_data:
                        # 日付をパース
                        date_val = None
                        if tx_data.get('date'):
                            try:
                                date_val = datetime.fromisoformat(tx_data['date']).date()
                            except (ValueError, TypeError):
                                pass

                        new_transactions.append(Transaction(
                            case=new_case,
                            date=date_val,
                            description=tx_data.get('description'),
                            amount_out=tx_data.get('amount_out', 0),
                            amount_in=tx_data.get('amount_in', 0),
                            balance=tx_data.get('balance'),
                            account_id=tx_data.get('account_id'),
                            holder=tx_data.get('holder'),
                            bank_name=tx_data.get('bank_name'),
                            branch_name=tx_data.get('branch_name'),
                            account_type=tx_data.get('account_type'),
                            is_large=tx_data.get('is_large', False),
                            is_transfer=tx_data.get('is_transfer', False),
                            transfer_to=tx_data.get('transfer_to'),
                            category=tx_data.get('category', '未分類'),
                            is_flagged=tx_data.get('is_flagged', False),
                            memo=tx_data.get('memo'),
                        ))

                    if new_transactions:
                        Transaction.objects.bulk_create(new_transactions)

                    # 設定データを復元（オプション）
                    restore_settings = form.cleaned_data.get('restore_settings', False)
                    if restore_settings and 'settings' in data:
                        config.save_user_settings(data['settings'])
                        logger.info("設定データを復元しました")

                logger.info(f"JSONインポート完了: case_id={new_case.pk}, name={case_name}, transactions={len(new_transactions)}")
                messages.success(
                    request,
                    f"「{case_name}」として{len(new_transactions)}件の取引を復元しました。"
                )
                return redirect('case-detail', pk=new_case.pk)

            except json.JSONDecodeError as e:
                logger.exception(f"JSONパースエラー: {e}")
                messages.error(request, f"JSONファイルの形式が不正です: {e}")
            except Exception as e:
                logger.exception(f"JSONインポートエラー: {e}")
                messages.error(request, f"インポートエラー: {e}")
    else:
        form = JsonImportForm()

    return render(request, 'analyzer/json_import.html', {'form': form})


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
    elif export_type == 'flagged':
        df = df[df['is_flagged'] == True].copy()
        filename = f"{case.name}_付箋付き取引.csv"
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

    # 付箋付き取引の場合はメモカラムも含める
    if export_type == 'flagged':
        export_columns['memo'] = 'メモ'

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


def export_csv_filtered(request: HttpRequest, pk: int) -> HttpResponse:
    """絞り込み条件付きでCSVエクスポート"""
    logger.info(f"絞り込みCSVエクスポート開始: case_id={pk}")
    case = get_object_or_404(Case, pk=pk)

    # フィルター条件を取得
    filter_state = {
        'bank': request.GET.getlist('bank'),
        'account': request.GET.getlist('account'),
        'category': request.GET.getlist('category'),
        'category_mode': request.GET.get('category_mode', 'include'),
        'keyword': request.GET.get('keyword', ''),
        'amount_min': request.GET.get('amount_min', ''),
        'amount_max': request.GET.get('amount_max', ''),
        'amount_type': request.GET.get('amount_type', 'both'),
        'large_only': request.GET.get('large_only', ''),
        'date_from': request.GET.get('date_from', ''),
        'date_to': request.GET.get('date_to', ''),
    }

    # 基本クエリ
    transactions = case.transactions.all().order_by('date', 'id')

    # フィルター適用
    if filter_state['bank']:
        transactions = transactions.filter(bank_name__in=filter_state['bank'])
    if filter_state['account']:
        transactions = transactions.filter(account_id__in=filter_state['account'])
    if filter_state['category']:
        if filter_state['category_mode'] == 'exclude':
            transactions = transactions.exclude(category__in=filter_state['category'])
        else:
            transactions = transactions.filter(category__in=filter_state['category'])
    if filter_state['keyword']:
        transactions = transactions.filter(description__icontains=filter_state['keyword'])

    # 日付フィルター
    if filter_state['date_from']:
        transactions = transactions.filter(date__gte=filter_state['date_from'])
    if filter_state['date_to']:
        transactions = transactions.filter(date__lte=filter_state['date_to'])

    # 金額フィルター
    amount_type = filter_state['amount_type']
    try:
        amount_min = int(filter_state['amount_min'].replace(',', '')) if filter_state['amount_min'] else None
    except (ValueError, AttributeError):
        amount_min = None
    try:
        amount_max = int(filter_state['amount_max'].replace(',', '')) if filter_state['amount_max'] else None
    except (ValueError, AttributeError):
        amount_max = None

    if amount_type == 'out':
        transactions = transactions.filter(amount_out__gt=0)
    elif amount_type == 'in':
        transactions = transactions.filter(amount_in__gt=0)

    if amount_min is not None or amount_max is not None:
        if amount_type == 'out':
            if amount_min is not None:
                transactions = transactions.filter(amount_out__gte=amount_min)
            if amount_max is not None:
                transactions = transactions.filter(amount_out__lte=amount_max)
        elif amount_type == 'in':
            if amount_min is not None:
                transactions = transactions.filter(amount_in__gte=amount_min)
            if amount_max is not None:
                transactions = transactions.filter(amount_in__lte=amount_max)
        else:
            if amount_min is not None and amount_max is not None:
                transactions = transactions.filter(
                    Q(amount_out__gte=amount_min, amount_out__lte=amount_max) |
                    Q(amount_in__gte=amount_min, amount_in__lte=amount_max)
                )
            elif amount_min is not None:
                transactions = transactions.filter(
                    Q(amount_out__gte=amount_min) | Q(amount_in__gte=amount_min)
                )
            elif amount_max is not None:
                transactions = transactions.filter(
                    Q(amount_out__gt=0, amount_out__lte=amount_max) |
                    Q(amount_in__gt=0, amount_in__lte=amount_max)
                )

    if filter_state['large_only']:
        transactions = transactions.filter(is_large=True)

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    df = pd.DataFrame(list(transactions.values()))

    # ファイル名を生成（フィルター条件を反映）
    filter_desc = []
    if filter_state['bank']:
        filter_desc.append(f"銀行_{'-'.join(filter_state['bank'][:2])}")
    if filter_state['account']:
        filter_desc.append(f"口座_{'-'.join(filter_state['account'][:2])}")
    if filter_state['category']:
        mode = "除外" if filter_state['category_mode'] == 'exclude' else ""
        filter_desc.append(f"分類{mode}_{'-'.join(filter_state['category'][:2])}")
    if filter_state['keyword']:
        filter_desc.append(f"検索_{filter_state['keyword'][:10]}")
    # 日付フィルターの説明を追加
    if filter_state['date_from'] or filter_state['date_to']:
        date_range = f"{filter_state['date_from'] or ''}〜{filter_state['date_to'] or ''}"
        filter_desc.append(f"期間_{date_range}")
    # 金額フィルターの説明を追加
    if amount_type != 'both':
        type_name = "出金" if amount_type == 'out' else "入金"
        filter_desc.append(type_name)
    if amount_min is not None or amount_max is not None:
        if amount_min and amount_max:
            filter_desc.append(f"{amount_min}〜{amount_max}円")
        elif amount_min:
            filter_desc.append(f"{amount_min}円以上")
        elif amount_max:
            filter_desc.append(f"{amount_max}円以下")
    if filter_state['large_only']:
        filter_desc.append("多額取引")

    if filter_desc:
        filename = f"{case.name}_絞込_{'-'.join(filter_desc)}.csv"
    else:
        filename = f"{case.name}_全取引.csv"

    # 出力カラムを選択・整形
    export_columns = {
        'date': '日付',
        'bank_name': '銀行名',
        'branch_name': '支店名',
        'account_type': '種別',
        'account_id': '口座番号',
        'description': '摘要',
        'amount_out': '払戻',
        'amount_in': 'お預り',
        'balance': '残高',
        'category': '分類',
        'memo': 'メモ',
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

    logger.info(f"絞り込みCSVエクスポート完了: case_id={pk}, count={len(df)}")
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
                balance_str = request.POST.get('balance')
                balance_val = int(balance_str) if balance_str else None
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
                    request.POST.get('account_id'),
                    request.POST.get('account_type'),
                    balance_val
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

            except EncodingError as e:
                logger.warning(f"エンコーディングエラー: case_id={pk}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'encoding'
                })

            except FormatError as e:
                logger.warning(f"フォーマットエラー: case_id={pk}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'format'
                })

            except DateParseError as e:
                logger.warning(f"日付パースエラー: case_id={pk}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'data'
                })

            except AmountParseError as e:
                logger.warning(f"金額パースエラー: case_id={pk}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'data'
                })

            except MultipleAccountError as e:
                logger.warning(f"複数口座番号エラー: case_id={pk}, accounts={e.account_numbers}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'validation'
                })

            except MultipleBankError as e:
                logger.warning(f"複数銀行名エラー: case_id={pk}, banks={e.bank_names}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': 'validation'
                })

            except CsvImportError as e:
                # その他のインポートエラー
                logger.warning(f"インポートエラー: case_id={pk}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': e.error_type.value
                })

            except Exception as e:
                # 予期しないエラー（既存の動作を維持）
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
            # フォーム送信前にJavaScriptで再インデックスされるため、
            # 全ての行を連番のインデックス（0, 1, 2, ...）で取得
            updated_data = []
            validation_errors = []

            total_rows = int(request.POST.get('total_rows', 0))

            for i in range(total_rows):
                # Check for deletion flag (再インデックス後は基本的にない)
                if request.POST.get(f'form-{i}-DELETE'):
                    continue

                # 全ての行をフォームから直接取得（再インデックス後は視覚順）
                new_row = {}

                # 全フィールドをフォームから取得
                new_row['date'] = request.POST.get(f'form-{i}-date', '')
                new_row['description'] = request.POST.get(f'form-{i}-description', '')
                new_row['bank_name'] = request.POST.get(f'form-{i}-bank_name', '')
                new_row['branch_name'] = request.POST.get(f'form-{i}-branch_name', '')
                new_row['account_type'] = request.POST.get(f'form-{i}-account_type', '')
                new_row['account_number'] = request.POST.get(f'form-{i}-account_number', '')

                # 金額フィールドのバリデーション
                amount_fields = [
                    ('amount_out', '出金額'),
                    ('amount_in', '入金額'),
                    ('balance', '残高'),
                ]
                for field_name, field_label in amount_fields:
                    value_str = request.POST.get(f'form-{i}-{field_name}', '0')
                    parsed_value, success = _parse_amount(value_str, 0)
                    new_row[field_name] = parsed_value
                    if not success:
                        validation_errors.append(f"行{i+1}: {field_label}が不正な値です")

                # 日付が空でない行のみ追加
                if new_row.get('date'):
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
            # フォーム送信前にJavaScriptで再インデックスされるため、
            # 全ての行を連番のインデックス（0, 1, 2, ...）で取得
            try:
                total_rows = int(request.POST.get('total_rows', 0))

                # フォームから全データを収集（視覚順で再インデックス済み）
                filtered_data = []
                for i in range(total_rows):
                    # Check for deletion flag (再インデックス後は基本的にない)
                    if request.POST.get(f'form-{i}-DELETE'):
                        continue

                    # 全ての行をフォームから直接取得
                    new_row = {}

                    # 全フィールドをフォームから取得
                    new_row['date'] = request.POST.get(f'form-{i}-date', '')
                    new_row['description'] = request.POST.get(f'form-{i}-description', '')
                    new_row['bank_name'] = request.POST.get(f'form-{i}-bank_name', '')
                    new_row['branch_name'] = request.POST.get(f'form-{i}-branch_name', '')
                    new_row['account_type'] = request.POST.get(f'form-{i}-account_type', '')
                    new_row['account_number'] = request.POST.get(f'form-{i}-account_number', '')

                    # 金額フィールド
                    for field_name in ['amount_out', 'amount_in', 'balance']:
                        value_str = request.POST.get(f'form-{i}-{field_name}', '0')
                        parsed_value, _ = _parse_amount(value_str, 0)
                        new_row[field_name] = parsed_value

                    # 日付が空でない行のみ追加
                    if new_row.get('date'):
                        filtered_data.append(new_row)

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
                            account_type=row.get('account_type'),
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
        'category_mode': request.GET.get('category_mode', 'include'),
        'keyword': request.GET.get('keyword', ''),
        'large_category': request.GET.getlist('large_category'),
        'large_category_mode': request.GET.get('large_category_mode', 'include'),
        'transfer_category': request.GET.getlist('transfer_category'),
        'transfer_category_mode': request.GET.get('transfer_category_mode', 'include'),
        # 金額フィルター
        'amount_min': request.GET.get('amount_min', ''),
        'amount_max': request.GET.get('amount_max', ''),
        'amount_type': request.GET.get('amount_type', 'both'),  # 'out', 'in', 'both'
        'large_only': request.GET.get('large_only', ''),  # 多額取引のみ
        # 日付フィルター
        'date_from': request.GET.get('date_from', ''),
        'date_to': request.GET.get('date_to', ''),
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
        'transfer_pairs': analysis_data['transfer_pairs'],
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

    handlers = {
        'run_classifier': _handle_run_classifier,
        'apply_rules': _handle_apply_rules,
        'delete_account': _handle_delete_account,
        'update_category': _handle_update_category,
        'bulk_update_categories': _handle_bulk_update_categories,
        'bulk_update_transfer_categories': _handle_bulk_update_categories_transfer,
        'update_transaction': _handle_update_transaction,
        'delete_duplicates': _handle_delete_duplicates,
        'delete_by_range': _handle_delete_by_range,
        'toggle_flag': _handle_toggle_flag,
        'update_memo': _handle_update_memo,
        'bulk_replace_field': _handle_bulk_replace_field,
    }

    handler = handlers.get(action)
    if handler:
        return handler(request, case, pk)

    return redirect('analysis-dashboard', pk=pk)


def _handle_run_classifier(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    count = TransactionService.run_classifier(case)
    if count == 0:
        messages.warning(request, "データがありません。")
    else:
        messages.success(request, "自動分類が完了しました。")
    return redirect('analysis-dashboard', pk=pk)


def _handle_apply_rules(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    count = TransactionService.apply_classification_rules(case)
    if count == 0:
        messages.info(request, "未分類の取引がないか、マッチするルールがありませんでした。")
    else:
        messages.success(request, f"キーワードルールを適用し、{count}件を分類しました。")
    return redirect('analysis-dashboard', pk=pk)


def _handle_delete_account(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    account_id = request.POST.get('account_id')
    if account_id:
        count = TransactionService.delete_account_transactions(case, account_id)
        messages.success(request, f"口座ID: {account_id} のデータ（{count}件）を削除しました。")
    return redirect('analysis-dashboard', pk=pk)


def _handle_update_category(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
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


def _handle_bulk_update_categories(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
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


def _handle_bulk_update_categories_transfer(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    # transfer-src-{id} と transfer-dest-{id} 形式のパラメータを処理
    category_updates = {}
    for key, value in request.POST.items():
        if key.startswith('transfer-src-'):
            tx_id = key.replace('transfer-src-', '')
            if tx_id:
                category_updates[tx_id] = value
        elif key.startswith('transfer-dest-'):
            tx_id = key.replace('transfer-dest-', '')
            if tx_id:
                category_updates[tx_id] = value

    count = TransactionService.bulk_update_categories(case, category_updates)
    if count > 0:
        messages.success(request, f"{count}件の分類を更新しました。")
    else:
        messages.info(request, "変更はありませんでした。")

    return redirect(_build_redirect_url('analysis-dashboard', pk, 'transfers', None))


def _handle_update_transaction(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    source_tab = request.POST.get('source_tab', '')
    tx_id = request.POST.get('tx_id')

    if tx_id:
        try:
            balance_str = request.POST.get('balance')
            balance_val = int(balance_str) if balance_str else None
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
                request.POST.get('account_id'),
                request.POST.get('account_type'),
                balance_val
            )
            if success:
                messages.success(request, "取引データを更新しました。")
        except Exception as e:
            logger.exception(f"取引更新エラー: tx_id={tx_id}, error={e}")
            messages.error(request, f"更新エラー: {e}")

    return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))


def _handle_delete_duplicates(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    delete_ids = request.POST.getlist('delete_ids')
    count = TransactionService.delete_duplicates(case, delete_ids)
    if count > 0:
        messages.success(request, f"{count}件の重複データを削除しました。")
    else:
        messages.warning(request, "削除対象が選択されていません。")
    # データクレンジングタブに留まる
    return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))


def _handle_delete_by_range(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    start_id = request.POST.get('start_id')
    end_id = request.POST.get('end_id')
    try:
        start_id_int = int(start_id)
        end_id_int = int(end_id)
        count = TransactionService.delete_by_range(case, start_id_int, end_id_int)
        if count > 0:
            messages.success(request, f"ID {start_id_int}〜{end_id_int} の範囲で {count}件の取引を削除しました。")
        else:
            messages.warning(request, "指定した範囲に削除対象の取引がありませんでした。")
    except (ValueError, TypeError):
        messages.error(request, "IDは整数で入力してください。")
    # データクレンジングタブに留まる
    return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))


def _handle_toggle_flag(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
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


def _handle_update_memo(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
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


def _handle_bulk_replace_field(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    """フィールド値の一括置換を処理"""
    field_name = request.POST.get('field_name')
    old_value = request.POST.get('old_value', '').strip()
    new_value = request.POST.get('new_value', '').strip()

    field_labels = {
        'bank_name': '銀行名',
        'branch_name': '支店名',
        'account_id': '口座番号',
    }

    if not field_name or field_name not in field_labels:
        messages.error(request, "不正なフィールドが指定されました。")
        return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if not old_value:
        messages.warning(request, "置換前の値を選択してください。")
        return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if not new_value:
        messages.warning(request, "置換後の値を入力してください。")
        return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if old_value == new_value:
        messages.warning(request, "置換前と置換後の値が同じです。")
        return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    try:
        count = TransactionService.bulk_replace_field_value(case, field_name, old_value, new_value)
        if count > 0:
            field_label = field_labels.get(field_name, field_name)
            messages.success(request, f"{field_label}「{old_value}」を「{new_value}」に置換しました（{count}件）。")
        else:
            messages.warning(request, "該当するデータがありませんでした。")
    except Exception as e:
        logger.exception(f"一括置換エラー: field={field_name}, old={old_value}, new={new_value}, error={e}")
        messages.error(request, f"置換エラー: {e}")

    return redirect(_build_redirect_url('analysis-dashboard', pk, 'cleanup'))


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


# =============================================================================
# API Endpoints (AJAX)
# =============================================================================

@require_POST
def api_toggle_flag(request: HttpRequest, pk: int) -> JsonResponse:
    """
    付箋トグルAPIエンドポイント（AJAX用）

    Returns:
        JSON: {success: bool, is_flagged: bool, message: str}
    """
    case = get_object_or_404(Case, pk=pk)
    tx_id = request.POST.get('tx_id')

    if not tx_id:
        return JsonResponse({
            'success': False,
            'message': '取引IDが指定されていません'
        }, status=400)

    try:
        new_state = TransactionService.toggle_flag(case, int(tx_id))
        return JsonResponse({
            'success': True,
            'is_flagged': new_state,
            'message': '付箋を追加しました' if new_state else '付箋を外しました'
        })
    except Exception as e:
        logger.exception(f"フラグ更新APIエラー: tx_id={tx_id}, error={e}")
        return JsonResponse({
            'success': False,
            'message': f'エラー: {e}'
        }, status=500)


@require_POST
def api_create_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """
    取引追加APIエンドポイント（AJAX用）

    Returns:
        JSON: {success: bool, transaction: dict, message: str}
    """
    case = get_object_or_404(Case, pk=pk)

    try:
        # フォームデータを取得
        date_str = request.POST.get('date')
        date_val = None
        if date_str:
            try:
                date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        # 金額をパース
        amount_out, _ = _parse_amount(request.POST.get('amount_out', '0'))
        amount_in, _ = _parse_amount(request.POST.get('amount_in', '0'))
        balance_str = request.POST.get('balance', '')
        balance_val = None
        if balance_str:
            balance_val, _ = _parse_amount(balance_str)

        # 取引を作成
        tx = Transaction.objects.create(
            case=case,
            date=date_val,
            description=request.POST.get('description', ''),
            amount_out=amount_out,
            amount_in=amount_in,
            balance=balance_val,
            bank_name=request.POST.get('bank_name', ''),
            branch_name=request.POST.get('branch_name', ''),
            account_id=request.POST.get('account_id', ''),
            account_type=request.POST.get('account_type', ''),
            category=request.POST.get('category', '未分類'),
            memo=request.POST.get('memo', ''),
        )

        logger.info(f"取引作成: case_id={pk}, tx_id={tx.id}")
        return JsonResponse({
            'success': True,
            'transaction': {
                'id': tx.id,
                'date': tx.date.isoformat() if tx.date else None,
                'description': tx.description,
                'amount_out': tx.amount_out,
                'amount_in': tx.amount_in,
                'balance': tx.balance,
                'bank_name': tx.bank_name,
                'branch_name': tx.branch_name,
                'account_id': tx.account_id,
                'account_type': tx.account_type,
                'category': tx.category,
                'memo': tx.memo,
            },
            'message': '取引を追加しました'
        })
    except Exception as e:
        logger.exception(f"取引作成APIエラー: case_id={pk}, error={e}")
        return JsonResponse({
            'success': False,
            'message': f'エラー: {e}'
        }, status=500)


@require_POST
def api_delete_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """
    取引削除APIエンドポイント（AJAX用）

    Returns:
        JSON: {success: bool, message: str}
    """
    case = get_object_or_404(Case, pk=pk)
    tx_id = request.POST.get('tx_id')

    if not tx_id:
        return JsonResponse({
            'success': False,
            'message': '取引IDが指定されていません'
        }, status=400)

    try:
        tx = case.transactions.get(pk=int(tx_id))
        tx.delete()

        logger.info(f"取引削除: case_id={pk}, tx_id={tx_id}")
        return JsonResponse({
            'success': True,
            'message': '取引を削除しました'
        })
    except Transaction.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': '取引が見つかりません'
        }, status=404)
    except Exception as e:
        logger.exception(f"取引削除APIエラー: tx_id={tx_id}, error={e}")
        return JsonResponse({
            'success': False,
            'message': f'エラー: {e}'
        }, status=500)


def api_get_field_values(request: HttpRequest, pk: int) -> JsonResponse:
    """
    フィールドのユニーク値を取得するAPIエンドポイント

    Args:
        pk: 案件ID
        field_name (GET param): 対象フィールド名

    Returns:
        JSON: {success: bool, values: [{value: str, count: int}, ...]}
    """
    case = get_object_or_404(Case, pk=pk)
    field_name = request.GET.get('field_name', '')

    if not field_name:
        return JsonResponse({
            'success': False,
            'message': 'フィールド名が指定されていません',
            'values': []
        }, status=400)

    try:
        values = TransactionService.get_unique_field_values(case, field_name)
        return JsonResponse({
            'success': True,
            'values': values
        })
    except Exception as e:
        logger.exception(f"フィールド値取得APIエラー: field_name={field_name}, error={e}")
        return JsonResponse({
            'success': False,
            'message': f'エラー: {e}',
            'values': []
        }, status=500)
