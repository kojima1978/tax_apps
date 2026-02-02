import io
import re
import logging
import pandas as pd

from .exceptions import (
    EncodingError, FormatError, DateParseError, AmountParseError
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
    # 試すエンコーディングのリスト（UTF-8を先に試すことで、UTF-8ファイルをCP932として誤読するのを防ぐ）
    encodings = ["utf-8-sig", "utf-8", "cp932", "shift_jis"]

    df = None
    last_error = None
    errors = {}

    # ファイルの内容をメモリに読み込む (Django UploadedFileによる副作用回避)
    if hasattr(file, 'seek'):
        file.seek(0)
    file_content = file.read()
    
    # デバッグ用にファイルの先頭バイトを取得
    file_head_hex = ""
    is_likely_excel = False
    try:
        head = file_content[:8]
        if isinstance(head, bytes):
            file_head_hex = head.hex().upper()
            # PK.. (Limit checking to generic zip signature which xlsx uses)
            if head.startswith(b'PK'):
                is_likely_excel = True
            # D0 CF 11 E0 (Old Excel .xls)
            elif head.hex().upper().startswith('D0CF11E0'):
                is_likely_excel = True
    except Exception:
        pass

    # Excel or Binary File -> Force Excel read, skip CSV
    if is_likely_excel:
        logger.info(f"バイナリファイル(Excel等)として検出されました: {file_head_hex}")
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            logger.info("Excelファイルとして読み込み成功")
        except Exception as e:
            errors["excel_binary_forced"] = str(e)

    # Not Excel -> Try CSVs first, then Excel fallback (for non-standard files)
    else:
        # Polars removed due to loose encoding issues. Use Pandas Strict.
        for encoding in encodings:
            try:
                # First, try header=0
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                except UnicodeDecodeError:
                    raise # Go to outer except
                except Exception:
                    # Parse error or other, try next encoding? 
                    raise 

                # Check if columns match expected (Rough check using Japanese names)
                current_cols = str(list(df.columns))
                if "銀行名" in current_cols or "日付" in current_cols or "支店名" in current_cols:
                    logger.info(f"Pandas で {encoding} エンコーディングで読み込み成功 (header=0)")
                    break
                
                # If header=0 didn't yield expected columns, try header=1
                df_h1 = pd.read_csv(io.BytesIO(file_content), encoding=encoding, header=1)
                current_cols_h1 = str(list(df_h1.columns))
                
                if "銀行名" in current_cols_h1 or "日付" in current_cols_h1 or "支店名" in current_cols_h1:
                    df = df_h1
                    logger.info(f"Pandas で {encoding} エンコーディングで読み込み成功 (header=1)")
                    break
                
                errors[encoding] = "Decoded but missing key columns"
                df = None # Reset
                continue

            except Exception as e:
                errors[encoding] = str(e)
                logger.debug(f"{encoding} で読み込み失敗: {e}")
                continue

        # Excelとして読み込みを試行 (Pandas) - Fallback
        if df is None:
            try:
                df = pd.read_excel(io.BytesIO(file_content))
                logger.info("Excelファイルとして読み込み成功")
            except Exception as e:
                errors["excel"] = str(e)

        # 厳密な読み込みで失敗した場合、cp932で置換読み込みを試行
        if df is None:
            try:
                # Try header=0
                df_fallback = pd.read_csv(io.BytesIO(file_content), encoding="cp932", encoding_errors='replace')
                
                # Check header=0 columns
                cols_str = str(list(df_fallback.columns))
                if "銀行名" in cols_str or "日付" in cols_str or "支店名" in cols_str:
                    df = df_fallback
                else:
                    # Try header=1
                    df_h1 = pd.read_csv(io.BytesIO(file_content), encoding="cp932", encoding_errors='replace', header=1)
                    cols_h1_str = str(list(df_h1.columns))
                    if "銀行名" in cols_h1_str or "日付" in cols_h1_str or "支店名" in cols_h1_str:
                        df = df_h1
                    else:
                        raise ValueError("Decoded columns do not match expected format (garbage)")

                logger.info("Pandas で cp932 (replace) エンコーディングで読み込み成功")
            except Exception as e:
                errors["cp932_replace"] = str(e)

    if df is None:
        tried_encodings_list = list(errors.keys())
        raise EncodingError(
            message="ファイルの読み込みに失敗しました。",
            tried_encodings=tried_encodings_list,
            file_header_hex=file_head_hex
        )

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
        "残高": "balance",
        "銀行名": "bank_name",
        "支店名": "branch_name",
        "口座番号": "account_number",
        "種別": "account_type",
    }

    df = df.rename(columns=rename_map)

    # 必須カラムのチェック
    required_columns = ["date", "description", "amount_out", "amount_in", "balance"]
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        # 日本語カラム名に逆変換
        reverse_map = {v: k for k, v in rename_map.items()}
        missing_japanese = [reverse_map.get(col, col) for col in missing_columns]

        raise FormatError(
            message="CSVに必要なカラムがありません。",
            missing_columns=missing_japanese,
            found_columns=original_columns
        )

    # メタデータ抽出（リネーム後のカラム名を使用）
    csv_metadata = {}
    metadata_cols = ["bank_name", "branch_name", "account_number", "account_type"]
    for col in metadata_cols:
        if col in df.columns and len(df) > 0:
            first_val = df[col].iloc[0]
            if pd.notna(first_val) and str(first_val).strip():
                csv_metadata[col] = str(first_val).strip()

    # 日付変換
    date_before_conversion = df["date"].copy()
    df["date"] = df["date"].apply(_convert_japanese_date)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    if df["date"].isna().any():
        invalid_mask = df["date"].isna()
        # 行番号を計算（ヘッダー行 + 1始まりインデックス = +2）
        invalid_line_numbers = (df.index[invalid_mask] + 2).tolist()
        invalid_dates_original = date_before_conversion[invalid_mask].head(10).tolist()

        raise DateParseError(
            line_numbers=invalid_line_numbers[:10],
            invalid_values=[str(v) for v in invalid_dates_original]
        )

    # 金額カラムの変換（行番号追跡付き）
    for col in ["amount_out", "amount_in", "balance"]:
        if col in df.columns:
            # pandas 2.0+ではStringDtypeの場合もあるため、数値型以外は全て変換処理を行う
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            if not is_numeric:
                original_values = df[col].copy()
                try:
                    cleaned = df[col].astype(str).str.replace(",", "").str.strip()
                    # 空文字列を0に
                    cleaned = cleaned.replace('', '0').replace('nan', '0')

                    # 数値変換を試行
                    numeric_result = pd.to_numeric(cleaned, errors='coerce')

                    # 変換に失敗した行を特定
                    invalid_mask = numeric_result.isna() & original_values.notna()
                    # 元の値が空文字やNaNでないものだけ
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
                    raise  # Re-raise our custom exception
                except Exception as e:
                    # 予期しないエラーの場合もAmountParseErrorとして再送出
                    logger.warning(f"金額変換で予期しないエラー: col={col}, error={e}")
                    raise AmountParseError(
                        column_name=col,
                        line_numbers=[],
                        invalid_values=[str(e)]
                    )
            else:
                df[col] = df[col].fillna(0).astype(int)

    # メタデータからのバックフィル（カラムがない場合、メタデータの値を全行に適用）
    if "bank_name" not in df.columns and csv_metadata.get("bank_name"):
        df["bank_name"] = csv_metadata["bank_name"]
    if "branch_name" not in df.columns and csv_metadata.get("branch_name"):
        df["branch_name"] = csv_metadata["branch_name"]
    if "account_number" not in df.columns and csv_metadata.get("account_number"):
        df["account_number"] = csv_metadata["account_number"]

    # 必要なカラムのみ保持
    columns_to_keep = [
        "date", "description", "amount_out", "amount_in", "balance",
        "bank_name", "branch_name", "account_number", "account_type"
    ]
    cols_to_drop = [col for col in df.columns if col not in columns_to_keep]
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
