"""
共有定数モジュール

元号データ、カテゴリー名、マジック文字列の単一ソース。
"""
from datetime import date

# --- 元号データ（単一ソース） ---
# (開始日, 元号名, 略称, 元年の西暦)
ERA_DATA = [
    (date(2019, 5, 1), "令和", "R", 2019),
    (date(1989, 1, 8), "平成", "H", 1989),
    (date(1926, 12, 25), "昭和", "S", 1926),
    (date(1912, 7, 30), "大正", "T", 1912),
    (date(1868, 1, 25), "明治", "M", 1868),
]

# テンプレートタグ用: (開始日, 元号名, 略称)
ERAS = [(start, name, abbr) for start, name, abbr, _ in ERA_DATA]

# importer用: {略称: 元年の西暦}
ERA_MAP = {abbr: year for _, _, abbr, year in ERA_DATA}

# --- カテゴリー定数 ---
UNCATEGORIZED = "未分類"

CATEGORY_RENAMES = {
    "証券・株式": "証券・株式・配当",
    "銀行": "銀行・利息・手数料",
    "贈与": "贈与・教育費",
}

STANDARD_CATEGORIES = [
    "生活費", "給与", "年金", "贈与・教育費", "税金", "修繕・資本", "事業・不動産", "関連会社",
    "銀行・利息・手数料", "証券・株式・配当", "保険会社", "通帳間移動", "その他", UNCATEGORIZED,
]

# カテゴリーの固定順序（STANDARD_CATEGORIESの順序を使用）
# 未知のカテゴリーは末尾に追加される
CATEGORY_ORDER = {cat: idx for idx, cat in enumerate(STANDARD_CATEGORIES)}


def normalize_category(category: str | None) -> str | None:
    """古いカテゴリー名を現在の標準カテゴリー名に変換"""
    if category is None:
        return None
    return CATEGORY_RENAMES.get(category, category)


def normalize_patterns(patterns: dict | None) -> dict:
    """分類パターン辞書の古いカテゴリーキーを新カテゴリーへ統合"""
    if not patterns:
        return {}

    normalized = {}
    for category, keywords in patterns.items():
        new_category = normalize_category(category)
        if new_category not in normalized:
            normalized[new_category] = []
        for keyword in keywords or []:
            if keyword not in normalized[new_category]:
                normalized[new_category].append(keyword)
    return normalized


def sort_categories(categories: list | set) -> list:
    """
    カテゴリーを固定順序でソート

    STANDARD_CATEGORIESの順序に従ってソートし、
    未知のカテゴリーは末尾にアルファベット順で追加される。

    Args:
        categories: ソート対象のカテゴリーリストまたはセット

    Returns:
        固定順序でソートされたカテゴリーリスト
    """
    def sort_key(cat):
        if cat in CATEGORY_ORDER:
            return (0, CATEGORY_ORDER[cat], cat)
        return (1, 0, cat)  # 未知のカテゴリーは末尾にアルファベット順

    return sorted(categories, key=sort_key)


def sort_patterns_dict(patterns: dict) -> dict:
    """
    パターン辞書をカテゴリーの固定順序でソート

    Args:
        patterns: {カテゴリー: [キーワード, ...], ...} の辞書

    Returns:
        固定順序でソートされた辞書
    """
    sorted_keys = sort_categories(patterns.keys())
    return {k: patterns[k] for k in sorted_keys}
