import json
import logging
import pandas as pd
from . import config

logger = logging.getLogger(__name__)


def load_classification_patterns() -> dict:
    """設定ファイルから分類パターンを読み込む"""
    default_patterns = {
        "生活費": [
            "イオン", "セブン", "ローソン", "ファミマ", "スーパー", "マート",
            "電気", "ガス", "水道", "東京電力", "東電", "関西電力", "関電",
            "NTT", "ドコモ", "DOCOMO", "ソフトバンク", "au", "通信", "電話",
            "NHK", "薬局", "ドラッグ", "病院", "医院", "クリニック", "介護",
            "ガソリン", "ENEOS", "出光", "昭和シェル",
            "マクドナルド", "スターバックス", "スタバ", "コンビニ"
        ],
        "証券会社": [
            "証券", "野村", "大和", "SMBC", "みずほ証券", "楽天証券", "SBI",
            "投資信託", "株式", "債券", "ファンド"
        ],
        "保険会社": [
            "生命保険", "損保", "保険", "共済", "かんぽ", "日本生命", "第一生命"
        ],
        "銀行": [
            "定期預金", "定期", "積立"
        ],
        "関連会社": [
            "商事", "物産", "興業", "実業", "有限会社", "株式会社"
        ],
        "贈与": [
            "フリコミ", "振込", "送金"
        ],
        "その他": [
            "手数料", "利息", "ATM", "時間外", "引出", "預入"
        ]
    }

    if hasattr(config, 'CONFIG_FILE') and config.CONFIG_FILE.exists():
        try:
            with open(config.CONFIG_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                return settings.get("CLASSIFICATION_PATTERNS", default_patterns)
        except json.JSONDecodeError as e:
            logger.warning(f"分類パターン設定の解析に失敗しました: {e}")
        except OSError as e:
            logger.warning(f"分類パターン設定の読み込みに失敗しました: {e}")

    return default_patterns


def classify_by_rules(text: str, amount_out: int, amount_in: int) -> str:
    """ルールベースで分類"""
    patterns = load_classification_patterns()

    # 優先順位: 生活費 -> 証券/保険/銀行/関連会社 -> 贈与 -> その他
    for cat in ["生活費", "証券会社", "保険会社", "銀行", "関連会社"]:
        keywords = patterns.get(cat, [])
        for kw in keywords:
            if kw in text:
                return cat

    # 贈与判定（振込など）
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
    """取引を分類する（ルールベース分類）"""
    if df.empty or "description" not in df.columns:
        return df

    if "category" not in df.columns:
        df["category"] = None

    target_mask = (df["description"].notna()) & (df["description"] != "") & (df["category"].isna())
    target_df = df[target_mask]

    if target_df.empty:
        return df

    logger.info(f"ルールベース分類を実行中... (対象: {len(target_df)}件)")
    classification_map = {}

    for idx in target_df.index:
        row = target_df.loc[idx]
        category = classify_by_rules(
            row["description"],
            row["amount_out"],
            row["amount_in"]
        )
        classification_map[row["description"]] = category

    df.loc[target_mask, "category"] = df.loc[target_mask, "description"].map(classification_map)

    return df
