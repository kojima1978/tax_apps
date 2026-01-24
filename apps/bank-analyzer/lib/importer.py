import re
import logging
import pandas as pd
import polars as pl

logger = logging.getLogger(__name__)

# 和暦マッピング
ERA_MAP = {
    'M': 1868,  # 明治
    'T': 1912,  # 大正
    'S': 1926,  # 昭和
    'H': 1989,  # 平成
    'R': 2019   # 令和
}


def _convert_japanese_date(date_str) -> str | None:
    """和暦（H28.6.3など）を西暦に変換"""
    if pd.isna(date_str):
        return None

    date_str = str(date_str).strip()

    # H28.6.3 や H28/6/3 形式
    match = re.match(r'([MTSHR])(\d+)[./](\d+)[./](\d+)', date_str)
    if match:
        era, year, month, day = match.groups()
        if era in ERA_MAP:
            year_ad = ERA_MAP[era] + int(year) - 1
            return f"{year_ad}-{int(month):02d}-{int(day):02d}"

    return date_str


def load_csv(file) -> pd.DataFrame:
    """
    OCR済みCSVを読み込み、標準フォーマットに変換する
    想定CSVカラム: 銀行名,年月日,摘要,払戻,お預り,差引残高
    または: 銀行名,支店名,口座番号,年月日,摘要,払戻,お預り,差引残高
    """
    # Polarsで高速読み込み
    try:
        df_pl = pl.read_csv(file, encoding="utf-8-sig")
        df = df_pl.to_pandas()
    except pl.exceptions.ComputeError as e:
        logger.warning(f"Polars読み込み失敗、pandasにフォールバック: {e}")
        df = pd.read_csv(file)

    original_columns = list(df.columns)

    # カラム名マッピング（表記揺れ吸収）
    rename_map = {
        "年月日": "date",
        "日付": "date",
        "摘要": "description",
        "払戻": "amount_out",
        "払戻額": "amount_out",
        "お預り": "amount_in",
        "お預り額": "amount_in",
        "差引残高": "balance",
        "支店名": "branch_name",
        "口座番号": "account_number"
    }

    df = df.rename(columns=rename_map)

    # 必須カラムのチェック
    required_columns = ["date", "description", "amount_out", "amount_in", "balance"]
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        raise ValueError(
            f"CSVに必要なカラムがありません。\n"
            f"不足: {missing_columns}\n"
            f"CSVのカラム（元データ）: {original_columns}\n"
            f"想定フォーマット: 銀行名,年月日,摘要,払戻,お預り,差引残高"
        )

    # メタデータ抽出
    csv_metadata = {}
    if "銀行名" in df.columns:
        csv_metadata["bank_name"] = str(df["銀行名"].iloc[0]) if len(df) > 0 else ""
    if "branch_name" in df.columns:
        csv_metadata["branch_name"] = str(df["branch_name"].iloc[0]) if len(df) > 0 else ""
    if "account_number" in df.columns:
        csv_metadata["account_number"] = str(df["account_number"].iloc[0]) if len(df) > 0 else ""
    if "種別" in df.columns:
        csv_metadata["account_type"] = str(df["種別"].iloc[0]) if len(df) > 0 else ""

    # 日付変換
    date_before_conversion = df["date"].copy()
    df["date"] = df["date"].apply(_convert_japanese_date)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    if df["date"].isna().any():
        invalid_mask = df["date"].isna()
        invalid_dates_original = date_before_conversion[invalid_mask].head(5).tolist()
        raise ValueError(
            f"日付の変換に失敗しました。\n"
            f"変換できない日付の例（元データ）: {invalid_dates_original}\n"
            f"日付形式を確認してください（例: 2024-01-01, 2024/01/01, H28.6.3）"
        )

    # 金額カラムの変換
    for col in ["amount_out", "amount_in", "balance"]:
        if col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(",", "").astype(float).fillna(0).astype(int)
            else:
                df[col] = df[col].fillna(0).astype(int)

    # 必須カラムのみ保持
    required_keep = ["date", "description", "amount_out", "amount_in", "balance"]
    cols_to_drop = [col for col in df.columns if col not in required_keep]
    df = df.drop(columns=cols_to_drop)

    if csv_metadata:
        df.attrs["csv_metadata"] = csv_metadata

    return df


def validate_balance(df: pd.DataFrame) -> pd.DataFrame:
    """
    残高不整合チェック
    前行残高 + 入金 - 出金 = 今回残高
    """
    df = df.reset_index(drop=True)
    df["_original_order"] = df.index

    df = df.sort_values(["date", "_original_order"]).reset_index(drop=True)

    df["calc_balance"] = 0
    df["is_balance_error"] = False

    if len(df) > 0:
        prev_balance = df.iloc[0]["balance"]
        df.at[0, "calc_balance"] = prev_balance

        for i in range(1, len(df)):
            current = df.iloc[i]
            expected = prev_balance + current["amount_in"] - current["amount_out"]

            df.at[i, "calc_balance"] = expected

            if expected != current["balance"]:
                df.at[i, "is_balance_error"] = True
                prev_balance = current["balance"]
            else:
                prev_balance = expected

    if "_original_order" in df.columns:
        df = df.drop(columns=["_original_order"])

    return df
