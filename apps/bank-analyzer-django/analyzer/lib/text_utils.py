"""
テキスト正規化ユーティリティ

半角/全角カタカナ・英数字を統一して検索するためのNFKC正規化を提供する。
"""
import unicodedata


def normalize_text(text: str) -> str:
    """NFKC正規化 + casefoldでテキストを正規化する

    半角カタカナ→全角カタカナ、全角英数字→半角英数字に統一し、
    大文字小文字も統一する。

    Examples:
        >>> normalize_text('ｶﾀｶﾅ')
        'カタカナ'
        >>> normalize_text('Ａｂｃ')
        'abc'
    """
    return unicodedata.normalize('NFKC', text).casefold()


def filter_by_keyword(items, keyword: str):
    """キーワードでdescriptionフィールドをNFKCフィルタリングする

    QuerySet・list[dict]・list[Model] いずれにも対応する。
    QuerySetの場合はlist化して返す。

    Args:
        items: QuerySet, list[dict], or list[Model]
        keyword: 検索キーワード（空文字の場合はそのまま返す）

    Returns:
        フィルタ適用後のlist（QuerySetの場合もlist化される）
    """
    if not keyword:
        return items

    normalized_keyword = normalize_text(keyword)

    # QuerySetの場合はlist化してからフィルタ
    if hasattr(items, 'model'):
        items = list(items)
        return [
            item for item in items
            if normalized_keyword in normalize_text(getattr(item, 'description', '') or '')
        ]

    # list[dict]の場合
    if items and isinstance(items[0], dict):
        return [
            item for item in items
            if normalized_keyword in normalize_text(item.get('description', '') or '')
        ]

    # list[Model]の場合
    return [
        item for item in items
        if normalized_keyword in normalize_text(getattr(item, 'description', '') or '')
    ]
