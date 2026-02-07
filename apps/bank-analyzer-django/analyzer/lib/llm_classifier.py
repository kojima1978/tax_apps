import logging
import pandas as pd

from .config import get_classification_patterns, get_gift_threshold
from .constants import UNCATEGORIZED

logger = logging.getLogger(__name__)


def classify_by_rules(
    text: str,
    amount_out: int,
    amount_in: int,
    *,
    patterns: dict | None = None,
    gift_threshold: int | None = None,
) -> str:
    """ルールベースで取引を分類

    Args:
        text: 摘要テキスト
        amount_out: 出金額
        amount_in: 入金額
        patterns: 分類パターン（省略時はload_user_settingsから取得）
        gift_threshold: 贈与判定閾値（省略時はload_user_settingsから取得）
    """
    if patterns is None:
        patterns = get_classification_patterns()
    if gift_threshold is None:
        gift_threshold = get_gift_threshold()

    if not text:
        return UNCATEGORIZED

    text_lower = text.lower()

    # 優先順位: 給与 -> 生活費 -> 証券/保険/銀行/関連会社/通帳間移動 -> 贈与 -> その他
    priority_categories = ["給与", "生活費", "証券・株式", "保険会社", "銀行", "関連会社", "通帳間移動"]

    for category in priority_categories:
        keywords = patterns.get(category, [])
        for keyword in keywords:
            if keyword.lower() in text_lower:
                return category

    # 贈与判定（振込など）- 閾値以上の場合のみ
    gift_keywords = patterns.get("贈与", [])
    if any(kw.lower() in text_lower for kw in gift_keywords):
        if amount_out >= gift_threshold:
            return "贈与"
        else:
            return UNCATEGORIZED

    # その他キーワード
    other_keywords = patterns.get("その他", [])
    for kw in other_keywords:
        if kw.lower() in text_lower:
            return "その他"

    return UNCATEGORIZED


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

    # 設定を1回だけ読み込み、ループ内で使い回す
    patterns = get_classification_patterns()
    gift_threshold = get_gift_threshold()

    # 同じ摘要は同じ分類結果になるのでキャッシュ
    classification_cache = {}

    for idx in target_df.index:
        row = target_df.loc[idx]
        description = str(row["description"])

        if description not in classification_cache:
            classification_cache[description] = classify_by_rules(
                description,
                row.get("amount_out", 0) or 0,
                row.get("amount_in", 0) or 0,
                patterns=patterns,
                gift_threshold=gift_threshold,
            )

    df.loc[target_mask, "category"] = df.loc[target_mask, "description"].map(classification_cache)

    logger.info(f"分類完了: {len(target_df)}件を処理")

    return df
