import logging

import pandas as pd
from . import config

logger = logging.getLogger(__name__)


def _validate_columns(df: pd.DataFrame, required: list[str], context: str) -> None:
    """必須カラムの存在チェック

    Args:
        df: チェック対象のDataFrame
        required: 必須カラム名のリスト
        context: エラーメッセージに含める文脈

    Raises:
        ValueError: 必須カラムが不足している場合
    """
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"{context}: 必須カラムが不足しています: {', '.join(missing)}")


def _load_analysis_settings(settings: dict | None = None) -> dict:
    """分析用の設定を一括読み込み + バリデーション

    Args:
        settings: 設定辞書（省略時はload_user_settingsから取得）

    Returns:
        バリデーション済みの設定辞書
    """
    if settings is None:
        settings = config.load_user_settings()

    threshold = int(settings.get("LARGE_AMOUNT_THRESHOLD", 500000))
    tolerance = int(settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000))
    days_window = int(settings.get("TRANSFER_DAYS_WINDOW", 3))

    # 負値防止
    if threshold < 0:
        logger.warning("LARGE_AMOUNT_THRESHOLD が負値(%d)のためデフォルト値を使用", threshold)
        threshold = 500000
    if tolerance < 0:
        logger.warning("TRANSFER_AMOUNT_TOLERANCE が負値(%d)のためデフォルト値を使用", tolerance)
        tolerance = 1000
    if days_window < 0:
        logger.warning("TRANSFER_DAYS_WINDOW が負値(%d)のためデフォルト値を使用", days_window)
        days_window = 3

    return {
        "threshold": threshold,
        "tolerance": tolerance,
        "days_window": days_window,
    }


def analyze_large_amounts(df: pd.DataFrame, *, settings: dict | None = None) -> pd.DataFrame:
    """
    多額出金・入金のフラグ付け

    設定された閾値以上の取引に is_large=True をセットする

    Args:
        df: 取引データのDataFrame
        settings: ユーザー設定辞書（省略時はload_user_settingsから取得）

    Returns:
        is_large カラムが追加されたDataFrame
    """
    _validate_columns(df, ["amount_out", "amount_in"], "analyze_large_amounts")

    analyzed = _load_analysis_settings(settings)
    threshold = analyzed["threshold"]

    df["is_large"] = (df["amount_out"] >= threshold) | (df["amount_in"] >= threshold)
    logger.debug("多額取引検出: 閾値=%d, 検出数=%d", threshold, df['is_large'].sum())
    return df


def analyze_transfers(df: pd.DataFrame, *, settings: dict | None = None) -> pd.DataFrame:
    """
    資金移動の自動ペアリング

    口座跨ぎの移動を検知する。
    同一案件内の全取引データフレームが渡される前提。

    判定条件:
    - 異なる口座間
    - 金額が許容誤差内で一致
    - 日付が指定日数以内

    Args:
        df: 取引データのDataFrame
        settings: ユーザー設定辞書（省略時はload_user_settingsから取得）

    Returns:
        is_transfer, transfer_to カラムが追加されたDataFrame
    """
    _validate_columns(df, ["date", "amount_out", "amount_in", "account_id"], "analyze_transfers")

    analyzed = _load_analysis_settings(settings)
    tolerance = analyzed["tolerance"]
    days_window = analyzed["days_window"]

    # 日付型に変換（DBから読み込むと文字列の可能性）
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])

    df = df.sort_values("date").reset_index(drop=True)

    df["is_transfer"] = False
    df["transfer_to"] = None

    # 出金データと入金データを分離（インデックスを保持）
    out_mask = df["amount_out"] > 0
    in_mask = df["amount_in"] > 0

    matched_in_indices = set()  # マッチ済みの入金インデックスを追跡

    # 出金レコード毎に、近接日付の入金を探索してマッチング
    for idx_out in df[out_mask].index:
        row_out = df.loc[idx_out]
        target_amount = row_out["amount_out"]
        target_date = row_out["date"]
        source_account = row_out["account_id"]

        # 候補検索: 口座が異なり、金額が近似、日付が近い、未マッチ
        candidates_mask = (
            in_mask &
            (df["account_id"] != source_account) &
            (df["amount_in"] >= target_amount - tolerance) &
            (df["amount_in"] <= target_amount + tolerance) &
            ((df["date"] - target_date).abs().dt.days <= days_window) &
            (~df.index.isin(matched_in_indices))
        )

        candidate_indices = df[candidates_mask].index

        if len(candidate_indices) > 0:
            # マッチした相手（最初の1件を採用）
            idx_in = candidate_indices[0]
            match = df.loc[idx_in]

            # 出金側にフラグをセット
            df.loc[idx_out, "is_transfer"] = True
            df.loc[idx_out, "transfer_to"] = f"{match['account_id']} ({match['date'].date()})"

            # 入金側にもフラグをセット
            df.loc[idx_in, "is_transfer"] = True
            df.loc[idx_in, "transfer_to"] = f"{source_account} ({target_date.date()})"

            # マッチ済みとして記録
            matched_in_indices.add(idx_in)

    transfer_count = df["is_transfer"].sum()
    logger.debug("資金移動検出: 許容誤差=%d, 期間=%d日, 検出数=%d", tolerance, days_window, transfer_count)
    return df
