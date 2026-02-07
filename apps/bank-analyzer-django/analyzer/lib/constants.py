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

STANDARD_CATEGORIES = [
    "生活費", "給与", "贈与", "事業・不動産", "関連会社",
    "銀行", "証券・株式", "保険会社", "通帳間移動", "その他", UNCATEGORIZED,
]
