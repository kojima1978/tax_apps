"""共通ユーティリティ関数"""
import re
from typing import Optional
from urllib.parse import quote

from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
import pandas as pd

from ..handlers import FIELD_LABELS, safe_error_message, parse_amount, build_transaction_data
from ..services import TransactionService
from ..templatetags.japanese_date import wareki

ITEMS_PER_PAGE = 100
PER_PAGE_OPTIONS = [50, 100, 200, 500]


def get_per_page(request: HttpRequest) -> int:
    """GETパラメータからper_pageを取得（バリデーション付き）"""
    try:
        val = int(request.GET.get('per_page', ITEMS_PER_PAGE))
    except (ValueError, TypeError):
        return ITEMS_PER_PAGE
    return val if val in PER_PAGE_OPTIONS else ITEMS_PER_PAGE


def paginate(queryset, page, per_page=ITEMS_PER_PAGE):
    """ページネーション共通処理"""
    paginator = Paginator(queryset, per_page)
    try:
        return paginator.page(page)
    except PageNotAnInteger:
        return paginator.page(1)
    except EmptyPage:
        return paginator.page(paginator.num_pages)


def sanitize_filename(name: str) -> str:
    """ファイル名に使用できない文字を除去する"""
    sanitized = re.sub(r'[\\/:*?"<>|]', '_', name)
    return sanitized.strip('_. ') or 'export'


def set_download_filename(response: HttpResponse, filename: str) -> None:
    """Content-Disposition に attachment + RFC 5987 filename* を設定する"""
    ascii_name = filename.encode('ascii', 'replace').decode()
    response['Content-Disposition'] = (
        f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
    )


def handle_post_action(request, action_fn, error_context: str, **log_params) -> bool:
    """POST処理の共通例外ハンドリング。成功時True、失敗時Falseを返す。"""
    import logging
    logger = logging.getLogger(__name__)
    try:
        action_fn()
        return True
    except Exception as e:
        params_str = ", ".join(f"{k}={v}" for k, v in log_params.items())
        logger.exception(f"{error_context}エラー: {params_str}, error={e}")
        messages.error(request, safe_error_message(e, error_context))
        return False


VALID_SORT_FIELDS = {
    'date': ['date', 'id'],
    'amount_out': ['amount_out', 'id'],
    'amount_in': ['amount_in', 'id'],
}


def parse_sort(sort_param: str, default: str = 'date_asc') -> tuple[str, str]:
    """ソートパラメータを(フィールド, 方向)に分解する"""
    sort_param = sort_param or default
    parts = sort_param.rsplit('_', 1)
    if len(parts) == 2 and parts[1] in ('asc', 'desc'):
        field, direction = parts
        if field in VALID_SORT_FIELDS:
            return field, direction
    return 'date', 'asc'


def get_sort_order_by(sort_param: str, default: str = 'date_asc') -> list[str]:
    """ソートパラメータからDjango order_byリストを返す"""
    field, direction = parse_sort(sort_param, default)
    prefix = '-' if direction == 'desc' else ''
    return [f'{prefix}{f}' for f in VALID_SORT_FIELDS[field]]


def _get_attr(item, key):
    """dict/Modelどちらからでも属性を取得する"""
    if isinstance(item, dict):
        return item.get(key)
    return getattr(item, key, None)


def sort_dict_list(data: list, sort_param: str, default: str = 'date_asc') -> list:
    """辞書/Modelリストをソートパラメータで並び替える"""
    field, direction = parse_sort(sort_param, default)
    reverse = direction == 'desc'
    sort_key = VALID_SORT_FIELDS[field][0]
    return sorted(data, key=lambda x: (_get_attr(x, sort_key) is None, _get_attr(x, sort_key) or 0), reverse=reverse)


def build_filter_state(request: HttpRequest, include_tab_filters: bool = False) -> dict:
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
        'sort': request.GET.get('sort', ''),
        'per_page': str(get_per_page(request)),
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


def build_filtered_filename(
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
    sanitized = sanitize_filename(case_name)
    if filter_desc:
        return f"{sanitized}_絞込_{'-'.join(filter_desc)}.csv"
    return f"{sanitized}_全取引.csv"


def require_transactions(request: HttpRequest, transactions, pk: int, redirect_view: str = 'analysis-dashboard') -> Optional[HttpResponse]:
    """取引データ存在確認。不在時はwarning付きリダイレクトを返す"""
    if not transactions.exists():
        messages.warning(request, "エクスポートするデータがありません。")
        return redirect(redirect_view, pk=pk)
    return None


def prepare_export_df(df: pd.DataFrame, include_memo: bool = False) -> tuple[pd.DataFrame, list[str]]:
    """エクスポート用DataFrame準備: カラム選択 + 和暦変換 + ヘッダー日本語化"""
    export_columns = dict(FIELD_LABELS)
    if include_memo:
        export_columns['memo'] = 'メモ'

    cols_to_export = [c for c in export_columns.keys() if c in df.columns]
    export_df = df[cols_to_export].copy()

    if 'date' in export_df.columns:
        export_df['date'] = export_df['date'].apply(lambda d: wareki(d, 'short'))

    headers = [export_columns[c] for c in cols_to_export]
    export_df.columns = headers
    return export_df, headers


def build_csv_response(df: pd.DataFrame, filename: str, include_memo: bool = False) -> HttpResponse:
    """DataFrameからCSVレスポンスを生成する共通処理"""
    export_df, _ = prepare_export_df(df, include_memo)

    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    set_download_filename(response, filename)
    export_df.to_csv(response, index=False, encoding='utf-8-sig')

    return response


def extract_form_rows(request: HttpRequest, validate: bool = False) -> tuple[list[dict], list[str]]:
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
            # フォームからは account_number で送信される
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


def update_transaction_from_post(request: HttpRequest, case, tx_id: str) -> None:
    """POSTデータから取引を更新する共通処理"""
    def _do_update():
        data = build_transaction_data(request)
        success = TransactionService.update_transaction(case, int(tx_id), data)
        if success:
            messages.success(request, "取引データを更新しました。")

    handle_post_action(request, _do_update, "取引更新", tx_id=tx_id)
