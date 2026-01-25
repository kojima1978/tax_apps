"""和暦変換用テンプレートフィルター"""
from datetime import date, datetime
from django import template

register = template.Library()

# 元号データ（開始日, 元号名, 略称）
ERAS = [
    (date(2019, 5, 1), "令和", "R"),
    (date(1989, 1, 8), "平成", "H"),
    (date(1926, 12, 25), "昭和", "S"),
    (date(1912, 7, 30), "大正", "T"),
    (date(1868, 1, 25), "明治", "M"),
]


def get_japanese_era(d: date) -> tuple[str, int]:
    """
    日付から元号と年を取得

    Args:
        d: 日付

    Returns:
        (元号名, 和暦年) のタプル
    """
    for era_start, era_name, _ in ERAS:
        if d >= era_start:
            year = d.year - era_start.year + 1
            return era_name, year
    # 明治以前は西暦を返す
    return "", d.year


@register.filter(name='wareki')
def wareki(value, format_type='full'):
    """
    日付を和暦に変換するテンプレートフィルター

    使用例:
        {{ tx.date|wareki }}         -> "令和6年1月26日"
        {{ tx.date|wareki:"short" }} -> "R6.1.26"
        {{ tx.date|wareki:"year" }}  -> "令和6年"

    Args:
        value: 日付（date, datetime, または文字列）
        format_type: 'full'（デフォルト）, 'short', 'year'

    Returns:
        和暦文字列
    """
    if value is None:
        return "-"

    # 文字列の場合はパース
    if isinstance(value, str):
        try:
            value = datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError:
            return value

    # datetimeの場合はdateに変換
    if isinstance(value, datetime):
        value = value.date()

    if not isinstance(value, date):
        return str(value)

    era_name, era_year = get_japanese_era(value)

    if not era_name:
        # 明治以前
        if format_type == 'short':
            return f"{value.year}.{value.month}.{value.day}"
        elif format_type == 'year':
            return f"{value.year}年"
        return f"{value.year}年{value.month}月{value.day}日"

    # 元年表記
    year_str = "元" if era_year == 1 else str(era_year)

    if format_type == 'short':
        # 略称形式: R6.1.26
        for era_start, _, era_abbr in ERAS:
            if value >= era_start:
                return f"{era_abbr}{era_year}.{value.month}.{value.day}"

    elif format_type == 'year':
        # 年のみ: 令和6年
        return f"{era_name}{year_str}年"

    # フル形式: 令和6年1月26日
    return f"{era_name}{year_str}年{value.month}月{value.day}日"


@register.filter(name='wareki_short')
def wareki_short(value):
    """短縮形式の和暦（R6.1.26）"""
    return wareki(value, 'short')


@register.filter(name='wareki_year')
def wareki_year(value):
    """年のみの和暦（令和6年）"""
    return wareki(value, 'year')
