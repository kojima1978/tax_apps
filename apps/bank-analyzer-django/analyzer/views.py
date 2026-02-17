"""
Bank Analyzer ビュー

案件管理、取引インポート/エクスポート、分析ダッシュボードのビューを提供する。
ハンドラーロジックは analyzer.handlers モジュールに分離されている。
"""
import json
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import quote

from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Sum
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
import pandas as pd

from .models import Case
from .forms import CaseForm, ImportForm, SettingsForm
from .lib import importer, config
from .lib.exceptions import CsvImportError
from .lib.constants import UNCATEGORIZED, sort_categories, sort_patterns_dict
from .services import TransactionService, AnalysisService
from .lib.text_utils import filter_by_keyword, matches_all_keywords, split_keywords
from .templatetags.japanese_date import wareki

# ハンドラーモジュールからインポート
from .handlers import (
    FIELD_LABELS,
    safe_error_message,
    parse_amount,
    build_transaction_data,
    # Pattern handlers
    handle_add_pattern,
    handle_delete_pattern,
    handle_update_pattern,
    handle_move_pattern,
    handle_get_category_keywords,
    handle_bulk_pattern_changes,
    # AI handlers
    handle_run_classifier,
    handle_apply_rules,
    handle_apply_ai_suggestion,
    handle_bulk_apply_ai_suggestions,
    handle_run_auto_classify,
    # Transaction handlers
    handle_delete_account,
    handle_update_category,
    handle_bulk_update_categories,
    handle_bulk_update_categories_transfer,
    handle_update_transaction,
    handle_delete_duplicates,
    handle_delete_by_range,
    handle_toggle_flag,
    handle_update_memo,
    handle_bulk_replace_field,
    # Wizard
    import_wizard,
    # API endpoints
    api_toggle_flag,
    api_create_transaction,
    api_delete_transaction,
    api_get_field_values,
)
from .handlers import build_existing_keys, mark_duplicates

logger = logging.getLogger(__name__)

# 定数
ITEMS_PER_PAGE = 100


# =============================================================================
# ユーティリティ関数
# =============================================================================

def _paginate(queryset, page, per_page=ITEMS_PER_PAGE):
    """ページネーション共通処理"""
    paginator = Paginator(queryset, per_page)
    try:
        return paginator.page(page)
    except PageNotAnInteger:
        return paginator.page(1)
    except EmptyPage:
        return paginator.page(paginator.num_pages)


def _sanitize_filename(name: str) -> str:
    """ファイル名に使用できない文字を除去する"""
    sanitized = re.sub(r'[\\/:*?"<>|]', '_', name)
    return sanitized.strip('_. ') or 'export'


def _set_download_filename(response: HttpResponse, filename: str) -> None:
    """Content-Disposition に attachment + RFC 5987 filename* を設定する"""
    ascii_name = filename.encode('ascii', 'replace').decode()
    response['Content-Disposition'] = (
        f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
    )


def _handle_post_action(request, action_fn, error_context: str, **log_params) -> bool:
    """POST処理の共通例外ハンドリング。成功時True、失敗時Falseを返す。"""
    try:
        action_fn()
        return True
    except Exception as e:
        params_str = ", ".join(f"{k}={v}" for k, v in log_params.items())
        logger.exception(f"{error_context}エラー: {params_str}, error={e}")
        messages.error(request, safe_error_message(e, error_context))
        return False


def _build_filter_state(request: HttpRequest, include_tab_filters: bool = False) -> dict:
    """GETパラメータからフィルター条件辞書を構築する共通処理"""
    state = {
        'bank': request.GET.getlist('bank'),
        'account': request.GET.getlist('account'),
        'category': request.GET.getlist('category'),
        'category_mode': request.GET.get('category_mode', 'include'),
        'keyword': request.GET.get('keyword', ''),
        'amount_min': request.GET.get('amount_min', ''),
        'amount_max': request.GET.get('amount_max', ''),
        'amount_type': request.GET.get('amount_type', 'both'),
        'date_from': request.GET.get('date_from', ''),
        'date_to': request.GET.get('date_to', ''),
    }
    if include_tab_filters:
        state.update({
            'large_category': request.GET.getlist('large_category'),
            'large_category_mode': request.GET.get('large_category_mode', 'include'),
            'large_amount_threshold': request.GET.get('large_amount_threshold', ''),
            'transfer_category': request.GET.getlist('transfer_category'),
            'transfer_category_mode': request.GET.get('transfer_category_mode', 'include'),
        })
    return state


def _build_filtered_filename(
    case_name: str,
    filter_state: dict,
    amount_min: Optional[int],
    amount_max: Optional[int],
) -> str:
    """フィルター条件を反映したCSVファイル名を生成"""
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
    if filter_state.get('date_from') or filter_state.get('date_to'):
        date_range = f"{filter_state.get('date_from') or ''}〜{filter_state.get('date_to') or ''}"
        filter_desc.append(f"期間_{date_range}")
    amount_type = filter_state.get('amount_type', 'both')
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
    sanitized = _sanitize_filename(case_name)
    if filter_desc:
        return f"{sanitized}_絞込_{'-'.join(filter_desc)}.csv"
    return f"{sanitized}_全取引.csv"


def _extract_form_rows(request: HttpRequest, validate: bool = False) -> tuple[list[dict], list[str]]:
    """フォームから取引行データを抽出する共通処理"""
    total_rows = int(request.POST.get('total_rows', 0))
    rows = []
    errors = []

    for i in range(total_rows):
        if request.POST.get(f'form-{i}-DELETE'):
            continue

        new_row = {
            'date': request.POST.get(f'form-{i}-date', ''),
            'description': request.POST.get(f'form-{i}-description', ''),
            'bank_name': request.POST.get(f'form-{i}-bank_name', ''),
            'branch_name': request.POST.get(f'form-{i}-branch_name', ''),
            'account_type': request.POST.get(f'form-{i}-account_type', ''),
            'account_number': request.POST.get(f'form-{i}-account_number', ''),
        }

        amount_fields = [
            ('amount_out', '出金額'),
            ('amount_in', '入金額'),
            ('balance', '残高'),
        ]
        for field_name, field_label in amount_fields:
            value_str = request.POST.get(f'form-{i}-{field_name}', '0')
            parsed_value, success = parse_amount(value_str, 0)
            new_row[field_name] = parsed_value
            if validate and not success:
                errors.append(f"行{i+1}: {field_label}が不正な値です")

        if new_row.get('date'):
            rows.append(new_row)

    return rows, errors


def _update_transaction_from_post(request: HttpRequest, case: Case, tx_id: str) -> None:
    """POSTデータから取引を更新する共通処理"""
    def _do_update():
        data = build_transaction_data(request)
        success = TransactionService.update_transaction(case, int(tx_id), data)
        if success:
            messages.success(request, "取引データを更新しました。")

    _handle_post_action(request, _do_update, "取引更新", tx_id=tx_id)


# =============================================================================
# エクスポートビュー
# =============================================================================

# エクスポートタイプ設定: (フィルタフィールド, ファイル名サフィックス)
_EXPORT_TYPE_CONFIG = {
    'large':     ('is_large',    '多額取引'),
    'transfers': ('is_transfer', '資金移動'),
    'flagged':   ('is_flagged',  '付箋付き取引'),
    'all':       (None,          '全取引'),
}


def _build_csv_response(df: pd.DataFrame, filename: str, include_memo: bool = False) -> HttpResponse:
    """DataFrameからCSVレスポンスを生成する共通処理"""
    export_columns = dict(FIELD_LABELS)
    if include_memo:
        export_columns['memo'] = 'メモ'

    # 存在するカラムのみ抽出
    cols_to_export = [c for c in export_columns.keys() if c in df.columns]
    export_df = df[cols_to_export].copy()

    # 日付を和暦に変換
    if 'date' in export_df.columns:
        export_df['date'] = export_df['date'].apply(lambda d: wareki(d, 'short'))

    export_df.columns = [export_columns[c] for c in cols_to_export]

    # BOM付きUTF-8でCSVレスポンスを作成（Excelで文字化けしないように）
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    _set_download_filename(response, filename)
    export_df.to_csv(response, index=False, encoding='utf-8-sig')

    return response


def export_json(request: HttpRequest, pk: int) -> HttpResponse:
    """案件データをJSONでバックアップエクスポート"""
    logger.info(f"JSONエクスポート開始: case_id={pk}")
    case = get_object_or_404(Case, pk=pk)
    transactions = case.transactions.all().order_by('date', 'id')

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('case-detail', pk=pk)

    totals = transactions.aggregate(total_in=Sum('amount_in'), total_out=Sum('amount_out'))

    export_fields = [
        'date', 'bank_name', 'branch_name', 'account_type', 'account_id',
        'description', 'amount_out', 'amount_in', 'balance',
        'category', 'holder', 'is_large', 'is_transfer', 'transfer_to',
        'is_flagged', 'memo',
    ]
    transactions_data = []
    for tx_dict in transactions.values(*export_fields):
        if tx_dict['date']:
            tx_dict['date'] = tx_dict['date'].isoformat()
        transactions_data.append(tx_dict)

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
            'total_in': totals['total_in'] or 0,
            'total_out': totals['total_out'] or 0,
        },
        'settings': config.load_user_settings(),
    }

    response = HttpResponse(
        json.dumps(export_data, ensure_ascii=False, indent=2),
        content_type='application/json; charset=utf-8'
    )
    filename = f"{_sanitize_filename(case.name)}_backup.json"
    _set_download_filename(response, filename)

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
                content = json_file.read().decode('utf-8')
                data = json.loads(content)
                restore_settings = form.cleaned_data.get('restore_settings', False)
                new_case, tx_count = TransactionService.import_from_json(data, restore_settings)
                messages.success(
                    request,
                    f"「{new_case.name}」として{tx_count}件の取引を復元しました。"
                )
                return redirect('case-detail', pk=new_case.pk)

            except Exception as e:
                logger.exception(f"JSONインポートエラー: {e}")
                messages.error(request, safe_error_message(e, "JSONインポート"))
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

    config_entry = _EXPORT_TYPE_CONFIG.get(export_type)
    if config_entry:
        filter_field, suffix = config_entry
        if filter_field:
            df = df[df[filter_field]].copy()
        filename = f"{_sanitize_filename(case.name)}_{suffix}.csv"
    else:
        filename = f"{_sanitize_filename(case.name)}_取引データ.csv"

    if df.empty:
        messages.warning(request, "該当するデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    return _build_csv_response(df, filename, include_memo=(export_type == 'flagged'))


def export_csv_filtered(request: HttpRequest, pk: int) -> HttpResponse:
    """絞り込み条件付きでCSVエクスポート"""
    logger.info(f"絞り込みCSVエクスポート開始: case_id={pk}")
    case = get_object_or_404(Case, pk=pk)

    filter_state = _build_filter_state(request)
    transactions = case.transactions.all().order_by('date', 'id')
    transactions = AnalysisService.apply_filters(transactions, filter_state)

    amount_min_val, amount_min_ok = parse_amount(filter_state['amount_min']) if filter_state['amount_min'] else (None, True)
    amount_max_val, amount_max_ok = parse_amount(filter_state['amount_max']) if filter_state['amount_max'] else (None, True)
    amount_min = amount_min_val if amount_min_ok and amount_min_val else None
    amount_max = amount_max_val if amount_max_ok and amount_max_val else None

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    df = pd.DataFrame(list(transactions.values()))

    # キーワードフィルタ（NFKC + ひらがな/カタカナ横断 + AND検索）
    keyword = filter_state.get('keyword', '')
    if keyword:
        kws = split_keywords(keyword)
        df = df[df['description'].fillna('').apply(lambda d: matches_all_keywords(d, kws))].copy()
        if df.empty:
            messages.warning(request, "エクスポートするデータがありません。")
            return redirect('analysis-dashboard', pk=pk)

    filename = _build_filtered_filename(case.name, filter_state, amount_min, amount_max)

    logger.info(f"絞り込みCSVエクスポート完了: case_id={pk}, count={len(df)}")
    return _build_csv_response(df, filename, include_memo=True)


def export_xlsx_by_category(request: HttpRequest, pk: int) -> HttpResponse:
    """分類別にシート分けしたExcelファイルをエクスポート"""
    from io import BytesIO
    from openpyxl import Workbook

    case = get_object_or_404(Case, pk=pk)
    transactions = case.transactions.all().order_by('date', 'id')

    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect('analysis-dashboard', pk=pk)

    df = pd.DataFrame(list(transactions.values()))

    export_columns = dict(FIELD_LABELS)
    export_columns['memo'] = 'メモ'
    cols_to_export = [c for c in export_columns.keys() if c in df.columns]
    headers = [export_columns[c] for c in cols_to_export]

    # 日付を和暦に変換
    if 'date' in df.columns:
        df['date'] = df['date'].apply(lambda d: wareki(d, 'short'))

    # 分類ごとにグループ化し、sort_categories順にシート作成
    grouped = df.groupby('category')
    sorted_cats = sort_categories(grouped.groups.keys())

    wb = Workbook()
    wb.remove(wb.active)

    for cat in sorted_cats:
        cat_df = grouped.get_group(cat)
        ws = wb.create_sheet(title=str(cat)[:31])
        ws.append(headers)
        for _, row in cat_df[cols_to_export].iterrows():
            ws.append([row[c] for c in cols_to_export])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    response = HttpResponse(
        buf.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    filename = f"{_sanitize_filename(case.name)}_分類別取引.xlsx"
    _set_download_filename(response, filename)
    return response


# =============================================================================
# 案件管理ビュー
# =============================================================================

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

    if request.method == 'POST':
        action = request.POST.get('action')
        tx_id = request.POST.get('tx_id')
        page = request.POST.get('page', 1)

        if action == 'toggle_flag' and tx_id:
            def _toggle():
                new_state = TransactionService.toggle_flag(case, int(tx_id))
                if new_state is None:
                    messages.warning(request, "取引が見つかりません。")
                elif new_state:
                    messages.success(request, "付箋を追加しました。")
                else:
                    messages.info(request, "付箋を外しました。")
            _handle_post_action(request, _toggle, "フラグ更新", tx_id=tx_id)

        elif action == 'update_transaction' and tx_id:
            _update_transaction_from_post(request, case, tx_id)

        return redirect(f"{reverse('case-detail', args=[pk])}?page={page}")

    transactions_list = case.transactions.all().order_by('date', 'id')
    transactions = _paginate(transactions_list, request.GET.get('page', 1))

    field_values = case.transactions.values_list('bank_name', 'branch_name', 'account_id')
    banks_set, branches_set, accounts_set = set(), set(), set()
    for bank, branch, account in field_values:
        if bank:
            banks_set.add(bank)
        if branch:
            branches_set.add(branch)
        if account:
            accounts_set.add(account)
    banks = sorted(banks_set)
    branches = sorted(branches_set)
    accounts = sorted(accounts_set)
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


# =============================================================================
# インポートビュー
# =============================================================================

def transaction_import(request: HttpRequest, pk: int) -> HttpResponse:
    """取引データのインポート"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        form = ImportForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES['csv_file']
            logger.info(f"ファイルインポート開始: case_id={pk}, filename={csv_file.name}, size={csv_file.size}")
            try:
                df = importer.load_csv(csv_file)
                df = importer.validate_balance(df)

                df['date'] = df['date'].dt.strftime('%Y-%m-%d').replace('NaT', None)
                df = df.where(pd.notnull(df), None)

                request.session['import_data'] = df.to_dict(orient='records')
                request.session['import_case_id'] = case.id

                return redirect('transaction-preview', pk=pk)

            except CsvImportError as e:
                logger.warning(f"インポートエラー: case_id={pk}, type={e.error_type.value}, error={e}")
                return render(request, 'analyzer/import_form.html', {
                    'case': case,
                    'form': form,
                    'import_error': e.to_dict(),
                    'error_type': e.error_type.value
                })

            except Exception as e:
                logger.exception(f"ファイルインポートエラー: case_id={pk}, error={e}")
                messages.error(request, safe_error_message(e, "ファイルインポート"))
    else:
        form = ImportForm()

    return render(request, 'analyzer/import_form.html', {'case': case, 'form': form})


def transaction_preview(request: HttpRequest, pk: int) -> HttpResponse:
    """インポートプレビューと確定"""
    case = get_object_or_404(Case, pk=pk)

    if request.session.get('import_case_id') != case.id or 'import_data' not in request.session:
        messages.error(request, "セッションが切れました。再度アップロードしてください。")
        return redirect('transaction-import', pk=pk)

    import_data = request.session['import_data']

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'commit':
            try:
                filtered_data, _ = _extract_form_rows(request)

                if not filtered_data:
                    messages.warning(request, "取り込むデータがありません。")
                    return redirect('transaction-import', pk=pk)

                count = TransactionService.commit_import(case, filtered_data)

                del request.session['import_data']
                del request.session['import_case_id']

                messages.success(request, f"{count}件の取引を取り込みました。")
                return redirect('case-detail', pk=pk)

            except Exception as e:
                logger.exception(f"取引インポートエラー: case_id={pk}, error={e}")
                messages.error(request, safe_error_message(e, "取り込み"))

    # 既存DBとの重複チェック
    existing_keys = build_existing_keys(case)

    duplicate_count = mark_duplicates(import_data, existing_keys)

    return render(request, 'analyzer/import_confirm.html', {
        'case': case,
        'transactions': import_data,
        'duplicate_count': duplicate_count,
    })


# =============================================================================
# 分析ダッシュボード
# =============================================================================

def analysis_dashboard(request: HttpRequest, pk: int) -> HttpResponse:
    """分析・表示ダッシュボード"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        return _handle_analysis_post(request, case, pk)

    filter_state = _build_filter_state(request, include_tab_filters=True)
    analysis_data = AnalysisService.get_analysis_data(case, filter_state)

    if analysis_data.get('no_data'):
        return render(request, 'analyzer/analysis.html', {'case': case, 'no_data': True})

    keyword = filter_state.get('keyword', '')

    all_txs_queryset = analysis_data['all_txs']
    if keyword:
        all_txs_filtered = filter_by_keyword(all_txs_queryset, keyword)
        all_txs_count = len(all_txs_filtered)
        all_txs_page = _paginate(all_txs_filtered, request.GET.get('page', 1))
    else:
        all_txs_count = all_txs_queryset.count()
        all_txs_page = _paginate(all_txs_queryset, request.GET.get('page', 1))

    unclassified_txs = case.transactions.filter(category=UNCATEGORIZED).order_by('-date', '-id')
    if keyword:
        unclassified_filtered = filter_by_keyword(unclassified_txs, keyword)
        unclassified_page = _paginate(unclassified_filtered, request.GET.get('unclassified_page', 1))
    else:
        unclassified_page = _paginate(unclassified_txs, request.GET.get('unclassified_page', 1))

    flagged_txs = filter_by_keyword(analysis_data['flagged_txs'], keyword)

    context = {
        'case': case,
        'account_summary': analysis_data['account_summary'],
        'transfer_pairs': analysis_data['transfer_pairs'],
        'large_txs': analysis_data['large_txs'],
        'all_txs': all_txs_page,
        'all_txs_count': all_txs_count,
        'unclassified_txs': unclassified_page,
        'duplicate_txs': analysis_data['duplicate_txs'],
        'flagged_txs': flagged_txs,
        'banks': analysis_data['banks'],
        'branches': analysis_data['branches'],
        'accounts': analysis_data['accounts'],
        'categories': analysis_data['categories'],
        'filter_state': filter_state,
        'fuzzy_threshold': analysis_data.get('fuzzy_threshold', 90),
        'unclassified_count': analysis_data.get('unclassified_count', 0),
        'suggestions_count': analysis_data.get('suggestions_count', 0),
        'ai_suggestions': analysis_data.get('ai_suggestions', []),
        'global_patterns': sort_patterns_dict(config.get_classification_patterns()),
        'case_patterns': sort_patterns_dict(case.custom_patterns or {}),
    }
    return render(request, 'analyzer/analysis.html', context)


def _handle_analysis_post(request: HttpRequest, case: Case, pk: int) -> HttpResponse:
    """分析ダッシュボードのPOSTリクエストを処理"""
    action = request.POST.get('action')

    handlers = {
        'run_classifier': handle_run_classifier,
        'apply_rules': handle_apply_rules,
        'delete_account': handle_delete_account,
        'update_category': handle_update_category,
        'bulk_update_categories': handle_bulk_update_categories,
        'bulk_update_transfer_categories': handle_bulk_update_categories_transfer,
        'update_transaction': handle_update_transaction,
        'delete_duplicates': handle_delete_duplicates,
        'delete_by_range': handle_delete_by_range,
        'toggle_flag': handle_toggle_flag,
        'update_memo': handle_update_memo,
        'bulk_replace_field': handle_bulk_replace_field,
        'apply_ai_suggestion': handle_apply_ai_suggestion,
        'bulk_apply_ai_suggestions': handle_bulk_apply_ai_suggestions,
        'add_pattern': handle_add_pattern,
        'delete_pattern': handle_delete_pattern,
        'update_pattern': handle_update_pattern,
        'move_pattern': handle_move_pattern,
        'get_category_keywords': handle_get_category_keywords,
        'bulk_pattern_changes': handle_bulk_pattern_changes,
        'run_auto_classify': handle_run_auto_classify,
    }

    handler = handlers.get(action)
    if handler:
        return handler(request, case, pk)

    return redirect('analysis-dashboard', pk=pk)


def classify_preview(request: HttpRequest, pk: int) -> HttpResponse:
    """自動分類プレビューページ"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        selected_ids_str = request.POST.get('selected_ids', '')
        if selected_ids_str:
            try:
                selected_ids = [int(x) for x in selected_ids_str.split(',') if x.strip()]
                count = TransactionService.apply_selected_classifications(case, selected_ids)
                messages.success(request, f"{count}件の取引を分類しました。")
            except (ValueError, TypeError) as e:
                messages.error(request, f"エラーが発生しました: {e}")
        else:
            messages.warning(request, "適用する取引が選択されていません。")

        return redirect('analysis-dashboard', pk=pk)

    preview_data = TransactionService.get_classification_preview(case)
    categories = sorted(set(item['proposed_category'] for item in preview_data))
    high_confidence = sum(1 for item in preview_data if item['score'] >= 90)
    total_count = len(preview_data)

    context = {
        'case': case,
        'preview_data': preview_data,
        'categories': categories,
        'high_confidence_count': high_confidence,
        'total_count': total_count,
    }
    return render(request, 'analyzer/classify_preview.html', context)


# =============================================================================
# 設定ビュー
# =============================================================================

def settings_view(request: HttpRequest) -> HttpResponse:
    """アプリケーション設定ビュー"""
    current_settings = config.load_user_settings()
    current_patterns = current_settings.get("CLASSIFICATION_PATTERNS", config.DEFAULT_PATTERNS)

    # AJAX: パターン一括変更
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        action = request.POST.get('action')
        if action == 'bulk_pattern_changes':
            return _handle_settings_bulk_pattern_changes(request, current_settings, current_patterns)

    # 通常のフォーム送信
    if request.method == 'POST':
        form = SettingsForm(request.POST)
        if form.is_valid():
            new_settings = {
                "LARGE_AMOUNT_THRESHOLD": form.cleaned_data['large_amount_threshold'],
                "TRANSFER_DAYS_WINDOW": form.cleaned_data['transfer_days_window'],
                "TRANSFER_AMOUNT_TOLERANCE": form.cleaned_data['transfer_amount_tolerance'],
                "CLASSIFICATION_PATTERNS": current_patterns,
            }

            config.save_user_settings(new_settings)
            messages.success(request, "分析パラメータを保存しました。")
            return redirect('settings')
    else:
        initial_data = {
            'large_amount_threshold': current_settings.get("LARGE_AMOUNT_THRESHOLD", 500000),
            'transfer_days_window': current_settings.get("TRANSFER_DAYS_WINDOW", 3),
            'transfer_amount_tolerance': current_settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000),
        }
        form = SettingsForm(initial=initial_data)

    sorted_patterns = sort_patterns_dict(current_patterns)

    return render(request, 'analyzer/settings.html', {
        'form': form,
        'global_patterns': sorted_patterns,
    })


def _handle_settings_bulk_pattern_changes(
    request: HttpRequest, current_settings: dict, current_patterns: dict
) -> JsonResponse:
    """設定ページでのパターン一括変更を処理"""
    try:
        changes = json.loads(request.POST.get('changes', '[]'))
        if not changes:
            return JsonResponse({'success': False, 'error': '変更がありません'})

        new_patterns = {k: list(v) for k, v in current_patterns.items()}
        saved_count = 0

        for change in changes:
            action = change.get('action')
            category = change.get('category')
            keyword = change.get('keyword')
            scope = change.get('scope', 'global')

            if scope != 'global':
                continue

            if action == 'add':
                if category not in new_patterns:
                    new_patterns[category] = []
                if keyword and keyword not in new_patterns[category]:
                    new_patterns[category].append(keyword)
                    saved_count += 1

            elif action == 'delete':
                if category in new_patterns and keyword in new_patterns[category]:
                    new_patterns[category].remove(keyword)
                    saved_count += 1
                    if not new_patterns[category]:
                        del new_patterns[category]

        new_settings = {
            **current_settings,
            "CLASSIFICATION_PATTERNS": new_patterns,
        }
        config.save_user_settings(new_settings)

        return JsonResponse({'success': True, 'saved_count': saved_count})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSONパースエラー'})
    except Exception as e:
        logger.exception("パターン一括変更エラー")
        return JsonResponse({'success': False, 'error': str(e)})
