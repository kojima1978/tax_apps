"""
サービス層共通ユーティリティ

日付変換、ID変換などの共通処理を提供する。
"""
from datetime import date, datetime
from typing import Optional

import pandas as pd

from ..models import Case, Transaction


def parse_date_value(date_input) -> date | None:
    """様々な形式の日付入力をdate型に変換する共通処理"""
    if date_input is None or (isinstance(date_input, float) and pd.isna(date_input)):
        return None
    if isinstance(date_input, str):
        try:
            return datetime.fromisoformat(date_input).date()
        except (ValueError, TypeError):
            try:
                return pd.to_datetime(date_input).date()
            except (ValueError, TypeError):
                return None
    if hasattr(date_input, 'date'):
        return date_input.date() if pd.notna(date_input) else None
    return None


def parse_int_ids(ids: list[str]) -> list[int] | None:
    """
    文字列IDリストを整数リストに変換

    Args:
        ids: 文字列のIDリスト

    Returns:
        整数のIDリスト、変換失敗時はNone
    """
    try:
        return [int(id_str) for id_str in ids]
    except (ValueError, TypeError):
        return None


def get_transaction(case: Case, tx_id: int) -> Optional[Transaction]:
    """案件内の取引をIDで取得（見つからない場合はNone）"""
    return case.transactions.filter(pk=tx_id).first()


def parse_amount_str(value: str) -> int | None:
    """金額文字列を整数に変換（変換失敗時はNone）"""
    try:
        return int(value.replace(',', '')) if value else None
    except (ValueError, AttributeError):
        return None


def convert_amounts_to_int(df: 'pd.DataFrame') -> 'pd.DataFrame':
    """DataFrameの金額カラムをPython intに変換（NaN→0）。dfをin-placeで変更する。"""
    for col in ['amount_out', 'amount_in']:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)
    return df
