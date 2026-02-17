"""
テキスト正規化ユーティリティ

半角/全角カタカナ・英数字を統一し、ひらがな↔カタカナ横断検索を可能にする。
スペース区切りの複数キーワードAND検索にも対応。
"""
import unicodedata

# カタカナ→ひらがな変換テーブル（NFKC後の全角カタカナに適用）
_KATAKANA_TO_HIRAGANA = str.maketrans(
    'アイウエオカキクケコサシスセソタチツテト'
    'ナニヌネノハヒフヘホマミムメモヤユヨ'
    'ラリルレロワヲンァィゥェォッャュョヮヴ'
    'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ',
    'あいうえおかきくけこさしすせそたちつてと'
    'なにぬねのはひふへほまみむめもやゆよ'
    'らりるれろわをんぁぃぅぇぉっゃゅょゎゔ'
    'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
)


def normalize_text(text: str) -> str:
    """NFKC正規化 + casefold + カタカナ→ひらがな変換

    半角カタカナ→全角カタカナ→ひらがな、全角英数字→半角英数字に統一し、
    大文字小文字も統一する。ひらがな↔カタカナの横断検索を実現する。

    Examples:
        >>> normalize_text('ｶﾀｶﾅ')
        'かたかな'
        >>> normalize_text('イオン')
        'いおん'
        >>> normalize_text('いおん')
        'いおん'
        >>> normalize_text('Ａｂｃ')
        'abc'
    """
    return unicodedata.normalize('NFKC', text).casefold().translate(_KATAKANA_TO_HIRAGANA)


def split_keywords(keyword: str) -> list[str]:
    """スペース区切りのキーワードを正規化して分割する

    Args:
        keyword: 検索文字列（スペース区切りでAND検索）

    Returns:
        正規化済みキーワードのリスト（空文字は除外）
    """
    return [normalize_text(k) for k in keyword.split() if k.strip()]


def matches_all_keywords(text: str, keywords: list[str]) -> bool:
    """テキストが全キーワードを含むか判定する（AND検索）"""
    normalized = normalize_text(text or '')
    return all(kw in normalized for kw in keywords)


def filter_by_keyword(items, keyword: str):
    """キーワードでdescriptionフィールドをフィルタリングする

    NFKC正規化+ひらがな統一により、半角/全角カタカナ・ひらがな↔カタカナの
    横断検索に対応。スペース区切りで複数キーワードAND検索も可能。

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

    keywords = split_keywords(keyword)
    if not keywords:
        return items

    # QuerySetの場合はlist化してからフィルタ
    if hasattr(items, 'model'):
        items = list(items)
        return [
            item for item in items
            if matches_all_keywords(getattr(item, 'description', ''), keywords)
        ]

    # list[dict]の場合
    if items and isinstance(items[0], dict):
        return [
            item for item in items
            if matches_all_keywords(item.get('description', ''), keywords)
        ]

    # list[Model]の場合
    return [
        item for item in items
        if matches_all_keywords(getattr(item, 'description', ''), keywords)
    ]
