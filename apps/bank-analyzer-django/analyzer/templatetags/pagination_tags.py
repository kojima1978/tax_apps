"""ページネーション・ソートURL生成テンプレートタグ"""
from urllib.parse import urlencode

from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()


def _build_filter_params(filter_state: dict) -> list[tuple]:
    """フィルター状態からURLパラメータリストを構築する共通処理"""
    params = []

    for key in ('bank', 'account', 'category'):
        for value in filter_state.get(key, []):
            params.append((key, value))

    if filter_state.get('category_mode') and filter_state['category_mode'] != 'include':
        params.append(('category_mode', filter_state['category_mode']))

    for key in ('keyword', 'date_from', 'date_to', 'amount_min', 'amount_max'):
        if filter_state.get(key):
            params.append((key, filter_state[key]))

    amount_type = filter_state.get('amount_type', 'both')
    if amount_type != 'both':
        params.append(('amount_type', amount_type))

    if filter_state.get('sort'):
        params.append(('sort', filter_state['sort']))

    per_page = filter_state.get('per_page', '100')
    if per_page and per_page != '100':
        params.append(('per_page', per_page))

    return params


@register.simple_tag
def pagination_url(tab, page, filter_state):
    """フィルター状態を保持したページネーションURLを生成

    使用例:
        {% load pagination_tags %}
        {% pagination_url "all" 1 filter_state as url %}
        <a href="{{ url }}">最初</a>
    """
    params = [('tab', tab), ('page', page)] + _build_filter_params(filter_state)
    return '?' + urlencode(params)


@register.simple_tag
def sort_header(tab, field, label, filter_state):
    """ソート可能なテーブルヘッダーを生成

    使用例:
        {% sort_header "all" "date" "日付" filter_state %}
    """
    current_sort = filter_state.get('sort', '')
    if current_sort == f'{field}_desc':
        next_sort = f'{field}_asc'
        icon = '<i class="bi bi-sort-down"></i>'
    elif current_sort == f'{field}_asc':
        next_sort = f'{field}_desc'
        icon = '<i class="bi bi-sort-up"></i>'
    else:
        next_sort = f'{field}_desc'
        icon = '<i class="bi bi-arrow-down-up text-muted opacity-50"></i>'

    # ソート値を差し替えたフィルターパラメータを構築
    modified_state = dict(filter_state)
    modified_state['sort'] = next_sort
    params = [('tab', tab)] + _build_filter_params(modified_state)
    url = '?' + urlencode(params)

    return mark_safe(
        f'<a href="{url}" class="text-decoration-none text-reset">'
        f'{label} {icon}</a>'
    )


@register.simple_tag
def per_page_selector(tab, filter_state, page_param='page'):
    """表示件数セレクターを生成

    使用例:
        {% per_page_selector "all" filter_state %}
    """
    from ..views._helpers import PER_PAGE_OPTIONS
    current = int(filter_state.get('per_page', 100))

    # per_pageを除外したベースパラメータ
    base_state = {k: v for k, v in filter_state.items() if k != 'per_page'}
    base_params = [('tab', tab)] + _build_filter_params(base_state)

    buttons = []
    for opt in PER_PAGE_OPTIONS:
        params = list(base_params)
        if opt != 100:
            params.append(('per_page', opt))
        url = '?' + urlencode(params)
        active = 'active' if opt == current else ''
        buttons.append(
            f'<a href="{escape(url)}" class="btn btn-sm btn-outline-secondary {active}">{opt}</a>'
        )

    html = (
        '<div class="d-flex align-items-center gap-1">'
        '<small class="text-muted me-1">表示件数:</small>'
        '<div class="btn-group btn-group-sm">'
        + ''.join(buttons)
        + '</div></div>'
    )
    return mark_safe(html)
