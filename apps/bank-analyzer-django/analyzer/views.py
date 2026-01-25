from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db import transaction
from django.http import HttpResponse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy, reverse
import pandas as pd
import json

from .models import Case, Transaction
from .forms import CaseForm, ImportForm, SettingsForm
from .lib import importer, analyzer, llm_classifier, config

# 標準分類カテゴリー
STANDARD_CATEGORIES = [
    "生活費", "贈与", "関連会社", "銀行", "証券会社", "保険会社", "その他", "未分類"
]


def _convert_amounts_to_int(df: pd.DataFrame) -> pd.DataFrame:
    """DataFrameの金額カラムをPython intに変換（NaN→0）"""
    for col in ['amount_out', 'amount_in']:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)
    return df


def _parse_keywords(text: str) -> list:
    """カンマまたは改行区切りのテキストをキーワードリストに変換"""
    return [k.strip() for k in text.replace('\n', ',').split(',') if k.strip()]


def _build_redirect_url(view_name: str, pk: int, tab: str = None) -> str:
    """タブパラメータ付きのリダイレクトURLを生成"""
    url = reverse(view_name, kwargs={'pk': pk})
    if tab:
        url += f'?tab={tab}'
    return url


def _get_duplicate_transactions(df: pd.DataFrame) -> list:
    """重複取引を検出してリストで返す"""
    dup_cols = ['date', 'amount_out', 'amount_in', 'description', 'account_id']
    if not all(col in df.columns for col in dup_cols):
        return []

    duplicates_mask = df.duplicated(subset=dup_cols, keep=False)
    dup_df = _convert_amounts_to_int(df[duplicates_mask].sort_values(by=dup_cols).copy())
    return dup_df.to_dict(orient='records')


def _get_transfer_chart_data(transfers_df: pd.DataFrame) -> list:
    """資金移動チャート用のデータを生成"""
    if transfers_df.empty:
        return []

    transfer_pairs = []
    out_txs = transfers_df[transfers_df['amount_out'] > 0]
    for _, row in out_txs.iterrows():
        transfer_to = row.get('transfer_to', '')
        label = f"{row['account_id']} → {transfer_to.split(' ')[0] if transfer_to else '?'}"
        transfer_pairs.append({
            'date': row['date'].strftime('%Y-%m-%d') if pd.notna(row['date']) else '',
            'amount': row['amount_out'],
            'label': label,
            'description': row['description']
        })
    return transfer_pairs


def export_csv(request, pk, export_type):
    """取引データをCSVでエクスポート"""
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

def case_detail(request, pk):
    case = get_object_or_404(Case, pk=pk)
    transactions = case.transactions.all().order_by('date', 'id')
    
    context = {
        'case': case,
        'transactions': transactions,
    }
    return render(request, 'analyzer/case_detail.html', context)

def transaction_import(request, pk):
    case = get_object_or_404(Case, pk=pk)
    
    if request.method == 'POST':
        form = ImportForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES['csv_file']
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
                messages.error(request, f"エラーが発生しました: {e}")
    else:
        form = ImportForm()

    return render(request, 'analyzer/import_form.html', {'case': case, 'form': form})

def transaction_preview(request, pk):
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
            for i, row in enumerate(import_data):
                # Check for deletion flag
                if request.POST.get(f'form-{i}-DELETE'):
                    continue

                # Retrieve fields by index (unsafe if order changes) or assume fixed list
                # Better: Form params like form-0-amount_in
                new_row = row.copy()
                new_row['date'] = request.POST.get(f'form-{i}-date')
                new_row['description'] = request.POST.get(f'form-{i}-description')
                try:
                    new_row['amount_out'] = int(request.POST.get(f'form-{i}-amount_out', 0) or 0)
                    new_row['amount_in'] = int(request.POST.get(f'form-{i}-amount_in', 0) or 0)
                    new_row['balance'] = int(request.POST.get(f'form-{i}-balance', 0) or 0)
                except ValueError:
                    pass # Keep original?
                
                updated_data.append(new_row)
            
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
                
                messages.success(request, f"{len(new_transactions)}件の取引を取り込みました。")
                return redirect('case-detail', pk=pk)
                
            except Exception as e:
                messages.error(request, f"取り込みエラー: {e}")
    
    return render(request, 'analyzer/import_confirm.html', {
        'case': case,
        'transactions': import_data
    })

def analysis_dashboard(request, pk):
    """分析・表示ダッシュボード"""
    case = get_object_or_404(Case, pk=pk)
    
    # Action Handling
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'run_classifier':
            # Load all transactions
            txs = case.transactions.all()
            if not txs.exists():
                messages.warning(request, "データがありません。")
                return redirect('analysis-dashboard', pk=pk)
            
            df = pd.DataFrame(list(txs.values()))
            # Ensure dates
            df['date'] = pd.to_datetime(df['date'])
            
            # Run classifier
            df = llm_classifier.classify_transactions(df)
            
            # Save back (Bulk update category)
            # This is slow if many, but safe
            updates = []
            for _, row in df.iterrows():
                # Only update category if changed? Or just update all
                # We need PK map
                updates.append(Transaction(id=row['id'], category=row['category']))
                
            Transaction.objects.bulk_update(updates, ['category'])
            messages.success(request, "自動分類が完了しました。")
            return redirect('analysis-dashboard', pk=pk)
            
        elif action == 'delete_account':
            account_id = request.POST.get('account_id')
            if account_id:
                count, _ = case.transactions.filter(account_id=account_id).delete()
                messages.success(request, f"口座ID: {account_id} のデータ（{count}件）を削除しました。")
            return redirect('analysis-dashboard', pk=pk)
            
        elif action == 'update_category':
            tx_id = request.POST.get('tx_id')
            new_category = request.POST.get('new_category')
            apply_all = request.POST.get('apply_all') == 'true'
            
            if tx_id and new_category:
                tx = get_object_or_404(Transaction, pk=tx_id, case=case)
                
                if apply_all:
                    # Update all with same description
                    count = case.transactions.filter(description=tx.description).update(category=new_category)
                    messages.success(request, f"「{tx.description}」の取引 {count}件を「{new_category}」に変更しました。")
                else:
                    tx.category = new_category
                    tx.save()
                    messages.success(request, "分類を更新しました。")
            return redirect('analysis-dashboard', pk=pk)

        elif action == 'bulk_update_categories':
            # 多額取引の分類を一括更新
            source_tab = request.POST.get('source_tab', 'large')

            # POSTデータからカテゴリー変更を収集
            category_updates = {}
            for key, value in request.POST.items():
                if key.startswith('cat-'):
                    tx_id = key.replace('cat-', '')
                    category_updates[tx_id] = value

            # 対象の取引を一括取得
            tx_ids = list(category_updates.keys())
            transactions_to_update = list(
                case.transactions.filter(id__in=tx_ids).only('id', 'category')
            )

            # 変更があるもののみ更新対象に
            updates = []
            for tx in transactions_to_update:
                new_category = category_updates.get(str(tx.id))
                if new_category and tx.category != new_category:
                    tx.category = new_category
                    updates.append(tx)

            if updates:
                Transaction.objects.bulk_update(updates, ['category'])
                messages.success(request, f"{len(updates)}件の分類を更新しました。")
            else:
                messages.info(request, "変更はありませんでした。")

            return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))

        elif action == 'update_transaction':
            # 取引データの更新
            tx_id = request.POST.get('tx_id')
            source_tab = request.POST.get('source_tab', '')
            if tx_id:
                tx = get_object_or_404(Transaction, pk=tx_id, case=case)
                try:
                    date_str = request.POST.get('date')
                    if date_str:
                        tx.date = pd.to_datetime(date_str).date()
                    tx.description = request.POST.get('description')
                    tx.amount_out = int(request.POST.get('amount_out') or 0)
                    tx.amount_in = int(request.POST.get('amount_in') or 0)
                    tx.category = request.POST.get('category')
                    tx.save()
                    messages.success(request, "取引データを更新しました。")
                except Exception as e:
                    messages.error(request, f"更新エラー: {e}")

            return redirect(_build_redirect_url('analysis-dashboard', pk, source_tab))

        elif action == 'delete_duplicates':
            # Bulk delete selected IDs
            delete_ids = request.POST.getlist('delete_ids')
            if delete_ids:
                count, _ = case.transactions.filter(id__in=delete_ids).delete()
                messages.success(request, f"{count}件の重複データを削除しました。")
            else:
                messages.warning(request, "削除対象が選択されていません。")
            return redirect('analysis-dashboard', pk=pk)
    
    # Data Loading for Display
    transactions = case.transactions.all().order_by('date', 'id')
    
    if not transactions.exists():
        return render(request, 'analyzer/analysis.html', {'case': case, 'no_data': True})

    df = pd.DataFrame(list(transactions.values()))

    # 重複データ検出
    duplicate_txs = _get_duplicate_transactions(df)

    # 口座サマリー
    account_summary = df.groupby(['account_id', 'holder']).agg({
        'id': 'count',
        'date': 'max'
    }).reset_index().rename(columns={'id': 'count', 'date': 'last_date'})
    account_summary_list = account_summary.to_dict(orient='records')

    # 資金移動データ
    analyzed_df = analyzer.analyze_transfers(df.copy())
    transfers_df = _convert_amounts_to_int(analyzed_df[analyzed_df['is_transfer']].copy())
    transfer_pairs = _get_transfer_chart_data(transfers_df)

    # 多額取引
    large_df = _convert_amounts_to_int(df[df['is_large']].sort_values('date', ascending=True).copy())
    large_txs = large_df.to_dict(orient='records')
    
    # フィルター処理
    filter_state = {
        'bank': request.GET.getlist('bank'),
        'account': request.GET.getlist('account'),
        'category': request.GET.getlist('category'),
        'keyword': request.GET.get('keyword', '')
    }

    filtered_txs = transactions
    if filter_state['bank']:
        filtered_txs = filtered_txs.filter(bank_name__in=filter_state['bank'])
    if filter_state['account']:
        filtered_txs = filtered_txs.filter(account_id__in=filter_state['account'])
    if filter_state['category']:
        filtered_txs = filtered_txs.filter(category__in=filter_state['category'])
    if filter_state['keyword']:
        filtered_txs = filtered_txs.filter(description__icontains=filter_state['keyword'])

    # フィルタードロップダウン用のユニークリストを取得
    banks = sorted([b for b in df['bank_name'].dropna().unique() if b])
    accounts = df['account_id'].unique().tolist()
    existing_categories = df['category'].dropna().unique().tolist()
    categories = sorted(set(existing_categories + STANDARD_CATEGORIES))

    context = {
        'case': case,
        'account_summary': account_summary_list,
        'transfer_pairs_json': json.dumps(transfer_pairs),
        'transfer_list': transfers_df.to_dict(orient='records'),
        'large_txs': large_txs,
        'all_txs': filtered_txs,
        'duplicate_txs': duplicate_txs,
        'banks': banks,
        'accounts': accounts,
        'categories': categories,
        'filter_state': filter_state,
    }
    return render(request, 'analyzer/analysis.html', context)

def settings_view(request):
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
                    "贈与": _parse_keywords(form.cleaned_data['cat_gift']),
                    "関連会社": _parse_keywords(form.cleaned_data['cat_related']),
                    "銀行": _parse_keywords(form.cleaned_data['cat_bank']),
                    "証券会社": _parse_keywords(form.cleaned_data['cat_security']),
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
            'cat_gift': ", ".join(current_patterns.get("贈与", [])),
            'cat_related': ", ".join(current_patterns.get("関連会社", [])),
            'cat_bank': ", ".join(current_patterns.get("銀行", [])),
            'cat_security': ", ".join(current_patterns.get("証券会社", [])),
            'cat_insurance': ", ".join(current_patterns.get("保険会社", [])),
            'cat_other': ", ".join(current_patterns.get("その他", [])),
        }
        form = SettingsForm(initial=initial_data)

    return render(request, 'analyzer/settings.html', {'form': form})
