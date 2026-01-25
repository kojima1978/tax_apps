import pandas as pd
from . import config


def analyze_large_amounts(df: pd.DataFrame) -> pd.DataFrame:
    """
    多額出金・入金のフラグ付け

    設定された閾値以上の取引に is_large=True をセットする
    """
    settings = config.load_user_settings()
    threshold = int(settings.get("LARGE_AMOUNT_THRESHOLD", 500000))

    df["is_large"] = (df["amount_out"] >= threshold) | (df["amount_in"] >= threshold)
    return df


def analyze_transfers(df: pd.DataFrame) -> pd.DataFrame:
    """
    資金移動の自動ペアリング

    口座跨ぎの移動を検知する。
    同一案件内の全取引データフレームが渡される前提。

    判定条件:
    - 異なる口座間
    - 金額が許容誤差内で一致
    - 日付が指定日数以内
    """
    settings = config.load_user_settings()
    tolerance = int(settings.get("TRANSFER_AMOUNT_TOLERANCE", 1000))
    days_window = int(settings.get("TRANSFER_DAYS_WINDOW", 3))

    # 日付型に変換（DBから読み込むと文字列の可能性）
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])

    df = df.sort_values("date").reset_index(drop=True)

    df["is_transfer"] = False
    df["transfer_to"] = None

    # 出金データと入金データを分離
    out_df = df[df["amount_out"] > 0].copy()
    in_df = df[df["amount_in"] > 0].copy()

    # 出金レコード毎に、近接日付の入金を探索してマッチング
    for idx_out, row_out in out_df.iterrows():
        target_amount = row_out["amount_out"]
        target_date = row_out["date"]
        source_account = row_out["account_id"]

        # 候補検索: 口座が異なり、金額が近似、日付が近い
        candidates = in_df[
            (in_df["account_id"] != source_account) &
            (in_df["amount_in"] >= target_amount - tolerance) &
            (in_df["amount_in"] <= target_amount + tolerance) &
            ((in_df["date"] - target_date).abs().dt.days <= days_window)
        ]

        if not candidates.empty:
            # マッチした相手（最初の1件を採用）
            match = candidates.iloc[0]

            # 出金側にフラグをセット
            df.at[idx_out, "is_transfer"] = True
            df.at[idx_out, "transfer_to"] = f"{match['account_id']} ({match['date'].date()})"

            # 入金側にもフラグをセット
            df.at[match.name, "is_transfer"] = True
            df.at[match.name, "transfer_to"] = f"{source_account} ({target_date.date()})"

    return df
