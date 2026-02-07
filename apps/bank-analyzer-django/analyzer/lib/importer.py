import io
import re
import logging
from datetime import datetime as dt

import pandas as pd

from .exceptions import (
    EncodingError, FormatError, DateParseError, AmountParseError,
    MultipleAccountError, MultipleBankError
)

logger = logging.getLogger(__name__)

# 和暦マッピング
ERA_MAP = {
    'M': 1868,  # 明治
    'T': 1912,  # 大正
    'S': 1926,  # 昭和
    'H': 1989,  # 平成
    'R': 2019   # 令和
}

# カラム名マッピング（表記揺れ吸収）
COLUMN_RENAME_MAP = {
    "年月日": "date",
    "日付": "date",
    "摘要": "description",
    "払戻": "amount_out",
    "払戻額": "amount_out",
    "お預り": "amount_in",
    "お預り額": "amount_in",
    "差引残高": "balance",
    "残高": "balance",
    "銀行名": "bank_name",
    "支店名": "branch_name",
    "口座番号": "account_number",
    "種別": "account_type",
}

REQUIRED_COLUMNS = ["date", "description", "amount_out", "amount_in", "balance"]

EXPECTED_COLUMN_KEYWORDS = ("銀行名", "日付", "支店名")

COLUMNS_TO_KEEP = [
    "date", "description", "amount_out", "amount_in", "balance",
    "bank_name", "branch_name", "account_number", "account_type"
]


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
            date_candidate = f"{year_ad}-{int(month):02d}-{int(day):02d}"
            # 月日の妥当性を検証（例: 月>12、日>31 を防ぐ）
            try:
                dt.strptime(date_candidate, "%Y-%m-%d")
            except ValueError:
                return date_str  # 不正な日付はそのまま返す（後段で検出）
            return date_candidate

    return date_str


def _has_expected_columns(df: pd.DataFrame) -> bool:
    """DataFrameのカラム名に期待するキーワードが含まれるか判定"""
    cols_str = str(list(df.columns))
    return any(kw in cols_str for kw in EXPECTED_COLUMN_KEYWORDS)


def _try_read_csv_with_encoding(file_content: bytes, encoding: str) -> pd.DataFrame | None:
    """指定エンコーディングでCSVを読み込み、期待カラムがあればDataFrameを返す"""
    # header=0 で試行
    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
    if _has_expected_columns(df):
        logger.info(f"Pandas で {encoding} エンコーディングで読み込み成功 (header=0)")
        return df

    # header=1 で試行
    df_h1 = pd.read_csv(io.BytesIO(file_content), encoding=encoding, header=1)
    if _has_expected_columns(df_h1):
        logger.info(f"Pandas で {encoding} エンコーディングで読み込み成功 (header=1)")
        return df_h1

    return None


def _detect_and_read_file(file_content: bytes) -> tuple[pd.DataFrame, str]:
    """
    ファイル内容を読み込み、DataFrameとして返す。

    エンコーディング自動検出、Excel/CSV判定を行う。

    Returns:
        (DataFrame, file_head_hex) のタプル

    Raises:
        EncodingError: 読み込みに失敗した場合
    """
    encodings = ["utf-8-sig", "utf-8", "cp932", "shift_jis"]
    errors = {}

    # ファイルヘッダーからExcel判定
    file_head_hex = ""
    is_likely_excel = False
    try:
        head = file_content[:8]
        if isinstance(head, bytes):
            file_head_hex = head.hex().upper()
            if head.startswith(b'PK') or file_head_hex.startswith('D0CF11E0'):
                is_likely_excel = True
    except (IndexError, TypeError):
        pass

    # Excel形式の場合
    if is_likely_excel:
        logger.info(f"バイナリファイル(Excel等)として検出されました: {file_head_hex}")
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            logger.info("Excelファイルとして読み込み成功")
            return df, file_head_hex
        except Exception as e:
            errors["excel_binary_forced"] = str(e)
    else:
        # CSV: 各エンコーディングで試行
        for encoding in encodings:
            try:
                df = _try_read_csv_with_encoding(file_content, encoding)
                if df is not None:
                    return df, file_head_hex
                errors[encoding] = "Decoded but missing key columns"
            except Exception as e:
                errors[encoding] = str(e)
                logger.debug("%s で読み込み失敗: %s", encoding, e)

        # Excelフォールバック
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            logger.info("Excelファイルとして読み込み成功")
            return df, file_head_hex
        except Exception as e:
            errors["excel"] = str(e)

        # cp932 置換読み込みフォールバック
        try:
            df = _try_read_csv_with_encoding_replace(file_content)
            if df is not None:
                return df, file_head_hex
        except Exception as e:
            errors["cp932_replace"] = str(e)

    raise EncodingError(
        message="ファイルの読み込みに失敗しました。",
        tried_encodings=list(errors.keys()),
        file_header_hex=file_head_hex
    )


def _try_read_csv_with_encoding_replace(file_content: bytes) -> pd.DataFrame | None:
    """cp932の置換モードでCSVを読み込むフォールバック"""
    df = pd.read_csv(io.BytesIO(file_content), encoding="cp932", encoding_errors='replace')
    if _has_expected_columns(df):
        logger.info("Pandas で cp932 (replace) エンコーディングで読み込み成功")
        return df

    df_h1 = pd.read_csv(io.BytesIO(file_content), encoding="cp932", encoding_errors='replace', header=1)
    if _has_expected_columns(df_h1):
        logger.info("Pandas で cp932 (replace) エンコーディングで読み込み成功 (header=1)")
        return df_h1

    raise ValueError("Decoded columns do not match expected format (garbage)")


def _normalize_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    カラム名を標準化し、必須カラムの存在を確認する。

    Returns:
        (標準化されたDataFrame, 元のカラム名リスト)

    Raises:
        FormatError: 必須カラムが不足している場合
    """
    original_columns = list(df.columns)
    df = df.rename(columns=COLUMN_RENAME_MAP)

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        reverse_map = {v: k for k, v in COLUMN_RENAME_MAP.items()}
        missing_japanese = [reverse_map.get(col, col) for col in missing_columns]
        raise FormatError(
            message="CSVに必要なカラムがありません。",
            missing_columns=missing_japanese,
            found_columns=original_columns
        )

    return df, original_columns


def _extract_metadata(df: pd.DataFrame) -> dict:
    """DataFrameからメタデータ（銀行名、支店名等）を抽出"""
    csv_metadata = {}
    metadata_cols = ["bank_name", "branch_name", "account_number", "account_type"]
    for col in metadata_cols:
        if col in df.columns and len(df) > 0:
            first_val = df[col].iloc[0]
            if pd.notna(first_val) and str(first_val).strip():
                csv_metadata[col] = str(first_val).strip()
    return csv_metadata


def _validate_uniqueness(df: pd.DataFrame) -> None:
    """
    銀行名と口座番号がファイル内で一意であることを確認する。

    Raises:
        MultipleBankError: 複数の銀行名が含まれる場合
        MultipleAccountError: 複数の口座番号が含まれる場合
    """
    if "bank_name" in df.columns:
        bank_names = df["bank_name"].dropna().astype(str).str.strip()
        bank_names = bank_names[bank_names != ""]
        unique_banks = bank_names.unique().tolist()
        if len(unique_banks) > 1:
            raise MultipleBankError(
                bank_names=unique_banks,
                row_counts=bank_names.value_counts().to_dict()
            )

    if "account_number" in df.columns:
        account_numbers = df["account_number"].dropna().astype(str).str.strip()
        account_numbers = account_numbers[account_numbers != ""]
        unique_accounts = account_numbers.unique().tolist()
        if len(unique_accounts) > 1:
            raise MultipleAccountError(
                account_numbers=unique_accounts,
                row_counts=account_numbers.value_counts().to_dict()
            )


def _convert_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    日付カラムを和暦→西暦→datetime型に変換する。

    Raises:
        DateParseError: 変換できない日付値がある場合
    """
    date_before_conversion = df["date"].copy()
    df["date"] = df["date"].apply(_convert_japanese_date)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    if df["date"].isna().any():
        invalid_mask = df["date"].isna()
        invalid_line_numbers = (df.index[invalid_mask] + 2).tolist()
        invalid_dates_original = date_before_conversion[invalid_mask].head(10).tolist()
        raise DateParseError(
            line_numbers=invalid_line_numbers[:10],
            invalid_values=[str(v) for v in invalid_dates_original]
        )

    return df


def _convert_amounts(df: pd.DataFrame) -> pd.DataFrame:
    """
    金額カラム（amount_out, amount_in, balance）を整数型に変換する。

    Raises:
        AmountParseError: 変換できない金額値がある場合
    """
    for col in ["amount_out", "amount_in", "balance"]:
        if col not in df.columns:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(0).astype(int)
            continue

        original_values = df[col].copy()
        try:
            cleaned = df[col].astype(str).str.replace(",", "").str.strip()
            cleaned = cleaned.replace('', '0').replace('nan', '0')

            numeric_result = pd.to_numeric(cleaned, errors='coerce')

            # 変換に失敗した行を特定
            invalid_mask = numeric_result.isna() & original_values.notna()
            original_str = original_values.astype(str)
            invalid_mask = invalid_mask & (original_str.str.strip() != '') & (original_str != 'nan')

            if invalid_mask.any():
                invalid_line_numbers = (df.index[invalid_mask] + 2).tolist()
                invalid_values = original_values[invalid_mask].head(10).tolist()
                raise AmountParseError(
                    column_name=col,
                    line_numbers=invalid_line_numbers[:10],
                    invalid_values=[str(v) for v in invalid_values]
                )

            df[col] = numeric_result.fillna(0).astype(int)
        except AmountParseError:
            raise
        except Exception as e:
            logger.warning(f"金額変換で予期しないエラー: col={col}, error={e}")
            raise AmountParseError(
                column_name=col,
                line_numbers=[],
                invalid_values=[str(e)]
            )

    return df


def load_csv(file) -> pd.DataFrame:
    """
    OCR済みCSVを読み込み、標準フォーマットに変換する。

    想定CSVカラム: 銀行名,年月日,摘要,払戻,お預り,差引残高
    または: 銀行名,支店名,口座番号,年月日,摘要,払戻,お預り,差引残高
    """
    # ファイルの内容をメモリに読み込む (Django UploadedFileによる副作用回避)
    if hasattr(file, 'seek'):
        file.seek(0)
    file_content = file.read()

    # 1. ファイル読み込み（エンコーディング自動検出）
    df, _ = _detect_and_read_file(file_content)

    # 2. カラム名標準化・必須チェック
    df, _ = _normalize_columns(df)

    # 3. メタデータ抽出
    csv_metadata = _extract_metadata(df)

    # 4. 一意性チェック（銀行名・口座番号）
    _validate_uniqueness(df)

    # 5. 日付変換
    df = _convert_dates(df)

    # 6. 金額変換
    df = _convert_amounts(df)

    # 7. メタデータからのバックフィル（カラムがない場合）
    for col in ["bank_name", "branch_name", "account_number"]:
        if col not in df.columns and csv_metadata.get(col):
            df[col] = csv_metadata[col]

    # 8. 必要なカラムのみ保持
    cols_to_drop = [col for col in df.columns if col not in COLUMNS_TO_KEEP]
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
