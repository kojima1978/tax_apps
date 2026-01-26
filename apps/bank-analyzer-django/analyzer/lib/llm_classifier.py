import logging
import pandas as pd

from .config import get_classification_patterns

logger = logging.getLogger(__name__)


def classify_by_rules(text: str, amount_out: int, amount_in: int) -> str:
    """ルールベースで取引を分類"""
    patterns = get_classification_patterns()

    if not text:
        return "その他"

    # 優先順位: 給与 -> 生活費 -> 証券/保険/銀行/関連会社 -> 贈与 -> その他
    priority_categories = ["給与", "生活費", "証券・株式", "保険会社", "銀行", "関連会社"]

    for category in priority_categories:
        keywords = patterns.get(category, [])
        for keyword in keywords:
            if keyword in text:
                return category

    # 贈与判定（振込など）- 100万円以上の場合のみ
    gift_keywords = patterns.get("贈与", [])
    if any(kw in text for kw in gift_keywords):
        if amount_out >= 1_000_000:
            return "贈与"
        else:
            return "その他"

    # その他キーワード
    other_keywords = patterns.get("その他", [])
    for kw in other_keywords:
        if kw in text:
            return "その他"

    return "その他"


def classify_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """取引データフレームを分類する（ルールベース）"""
    if df.empty or "description" not in df.columns:
        return df

    if "category" not in df.columns:
        df["category"] = None

    # 分類対象: 摘要があり、まだ分類されていないもの
    target_mask = (
        df["description"].notna() &
        (df["description"] != "") &
        df["category"].isna()
    )
    target_df = df[target_mask]

    if target_df.empty:
        return df

    logger.info(f"ルールベース分類を実行中... (対象: {len(target_df)}件)")

    # 同じ摘要は同じ分類結果になるのでキャッシュ
    classification_cache = {}

    for idx in target_df.index:
        row = target_df.loc[idx]
        description = str(row["description"])

        if description not in classification_cache:
            classification_cache[description] = classify_by_rules(
                description,
                row.get("amount_out", 0) or 0,
                row.get("amount_in", 0) or 0
            )

    df.loc[target_mask, "category"] = df.loc[target_mask, "description"].map(classification_cache)

    logger.info(f"分類完了: {len(target_df)}件を処理")

    return df
