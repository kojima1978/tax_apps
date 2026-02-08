"""ページネーションURL生成テンプレートタグ"""
from urllib.parse import urlencode

from django import template

register = template.Library()


@register.simple_tag
def pagination_url(tab, page, filter_state):
    """フィルター状態を保持したページネーションURLを生成

    使用例:
        {% load pagination_tags %}
        {% pagination_url "all" 1 filter_state as url %}
        <a href="{{ url }}">最初</a>
    """
    params = [('tab', tab), ('page', page)]

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

    if filter_state.get('large_only'):
        params.append(('large_only', filter_state['large_only']))

    return '?' + urlencode(params)
