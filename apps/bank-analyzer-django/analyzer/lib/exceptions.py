"""
カスタム例外クラス

CSVインポート時のエラーを分類し、ユーザーに分かりやすいメッセージを提供する。
"""
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class ImportErrorType(Enum):
    """エラー種別"""
    ENCODING = "encoding"      # 文字コードエラー
    FORMAT = "format"          # ファイル形式エラー
    DATA = "data"              # データエラー（行単位）
    VALIDATION = "validation"  # バリデーションエラー


@dataclass
class ErrorDetail:
    """エラー詳細情報"""
    line_number: Optional[int] = None      # 行番号（1始まり、ヘッダー含む）
    column_name: Optional[str] = None      # カラム名
    expected_value: Optional[str] = None   # 期待される値/形式
    actual_value: Optional[str] = None     # 実際の値
    sample_values: list[str] = field(default_factory=list)  # サンプル値（複数）


class CsvImportError(Exception):
    """インポートエラーの基底クラス"""

    error_type: ImportErrorType = ImportErrorType.FORMAT

    def __init__(
        self,
        message: str,
        suggestion: str = "",
        details: Optional[ErrorDetail] = None,
        tried_encodings: Optional[list[str]] = None
    ):
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion
        self.details = details or ErrorDetail()
        self.tried_encodings = tried_encodings or []

    def to_dict(self) -> dict:
        """テンプレート用に辞書に変換"""
        return {
            "type": self.error_type.value,
            "type_label": self._get_type_label(),
            "message": self.message,
            "suggestion": self.suggestion,
            "line_number": self.details.line_number,
            "column_name": self.details.column_name,
            "expected_value": self.details.expected_value,
            "actual_value": self.details.actual_value,
            "sample_values": self.details.sample_values,
            "tried_encodings": self.tried_encodings,
        }

    def _get_type_label(self) -> str:
        """エラー種別の日本語ラベル"""
        labels = {
            ImportErrorType.ENCODING: "文字コードエラー",
            ImportErrorType.FORMAT: "ファイル形式エラー",
            ImportErrorType.DATA: "データエラー",
            ImportErrorType.VALIDATION: "検証エラー",
        }
        return labels.get(self.error_type, "エラー")


class EncodingError(CsvImportError):
    """文字コードエラー"""
    error_type = ImportErrorType.ENCODING

    def __init__(
        self,
        message: str = "ファイルの文字コードを認識できませんでした。",
        tried_encodings: Optional[list[str]] = None,
        file_header_hex: str = ""
    ):
        suggestion = (
            "以下の対処法をお試しください:\n"
            "1. Excelで開き、「名前を付けて保存」で「CSV UTF-8」形式を選択\n"
            "2. テキストエディタで開き、UTF-8またはShift-JISで保存し直す\n"
            "3. ファイルが破損していないか確認する"
        )
        details = ErrorDetail()
        if file_header_hex:
            details.actual_value = f"ファイルヘッダ: {file_header_hex}"

        super().__init__(
            message=message,
            suggestion=suggestion,
            details=details,
            tried_encodings=tried_encodings or []
        )


class FormatError(CsvImportError):
    """ファイル形式エラー"""
    error_type = ImportErrorType.FORMAT

    def __init__(
        self,
        message: str,
        suggestion: str = "",
        missing_columns: Optional[list[str]] = None,
        found_columns: Optional[list[str]] = None
    ):
        details = ErrorDetail()
        if missing_columns:
            details.expected_value = f"必須カラム: {', '.join(missing_columns)}"
        if found_columns:
            details.actual_value = f"検出されたカラム: {', '.join(str(c) for c in found_columns)}"

        if not suggestion:
            suggestion = (
                "CSVファイルに以下のカラムが含まれているか確認してください:\n"
                "- 年月日（または日付）\n"
                "- 摘要\n"
                "- 払戻（または払戻額）\n"
                "- お預り（またはお預り額）\n"
                "- 差引残高（または残高）"
            )

        super().__init__(
            message=message,
            suggestion=suggestion,
            details=details
        )


def _format_error_examples(line_numbers: list[int], values: list[str], limit: int = 5) -> list[str]:
    """エラー行と値のペアをフォーマットする"""
    return [f"  行{ln}: {val}" for ln, val in zip(line_numbers[:limit], values[:limit])]


class DataError(CsvImportError):
    """データエラー（行単位）"""
    error_type = ImportErrorType.DATA

    def __init__(
        self,
        message: str,
        line_number: Optional[int] = None,
        column_name: Optional[str] = None,
        expected_format: Optional[str] = None,
        actual_value: Optional[str] = None,
        sample_values: Optional[list[str]] = None,
        suggestion: str = ""
    ):
        details = ErrorDetail(
            line_number=line_number,
            column_name=column_name,
            expected_value=expected_format,
            actual_value=actual_value,
            sample_values=sample_values or []
        )

        super().__init__(
            message=message,
            suggestion=suggestion,
            details=details
        )


class DateParseError(DataError):
    """日付パースエラー"""

    def __init__(
        self,
        line_numbers: list[int],
        invalid_values: list[str]
    ):
        error_count = len(line_numbers)
        message = f"日付の変換に失敗しました（{error_count}件）"

        suggestion = (
            "日付は以下の形式で入力してください:\n"
            "- 西暦: 2024-01-01, 2024/01/01\n"
            "- 和暦: H28.6.3, R5/4/1\n"
            "\n変換できない値の例:\n" +
            "\n".join(_format_error_examples(line_numbers, invalid_values))
        )

        super().__init__(
            message=message,
            line_number=line_numbers[0] if line_numbers else None,
            column_name="日付",
            expected_format="YYYY-MM-DD, YYYY/MM/DD, H○○.○.○",
            actual_value=invalid_values[0] if invalid_values else None,
            sample_values=invalid_values[:5],
            suggestion=suggestion
        )
        self.line_numbers = line_numbers
        self.invalid_values = invalid_values


class AmountParseError(DataError):
    """金額パースエラー"""

    def __init__(
        self,
        column_name: str,
        line_numbers: list[int],
        invalid_values: list[str]
    ):
        column_label = {
            "amount_out": "払戻額",
            "amount_in": "お預り額",
            "balance": "残高"
        }.get(column_name, column_name)

        error_count = len(line_numbers)
        message = f"{column_label}の変換に失敗しました（{error_count}件）"

        suggestion = (
            f"{column_label}は数値で入力してください:\n"
            "- カンマ区切りは自動的に除去されます（例: 1,234,567）\n"
            "- 空欄は0として扱われます\n"
            "- 文字列や記号が含まれていないか確認してください\n"
            "\n変換できない値の例:\n" +
            "\n".join(_format_error_examples(line_numbers, invalid_values))
        )

        super().__init__(
            message=message,
            line_number=line_numbers[0] if line_numbers else None,
            column_name=column_label,
            expected_format="数値（例: 12345 または 1,234,567）",
            actual_value=invalid_values[0] if invalid_values else None,
            sample_values=invalid_values[:5],
            suggestion=suggestion
        )
        self.line_numbers = line_numbers
        self.invalid_values = invalid_values


class MultipleValueError(CsvImportError):
    """複数値検出エラーの基底クラス"""
    error_type = ImportErrorType.VALIDATION

    def __init__(
        self,
        values: list[str],
        row_counts: dict[str, int] | None = None,
        *,
        value_label: str,       # 例: "口座番号", "銀行名"
        unit_label: str,        # 例: "1つの口座番号", "1つの銀行名"
        split_instruction: str, # 例: "口座番号ごとにCSVファイルを分割して..."
        detected_label: str,    # 例: "検出された口座番号:", "検出された銀行名:"
    ):
        count = len(values)
        display_list = values[:5]
        if count > 5:
            display_list.append(f"...他{count - 5}件")

        message = f"このファイルには{count}種類の{value_label}が含まれています"

        details_lines = []
        if row_counts:
            for val in values[:5]:
                cnt = row_counts.get(val, 0)
                details_lines.append(f"  - {val}: {cnt}件")

        suggestion = (
            f"{split_instruction}\n"
            f"\n{detected_label}\n" +
            "\n".join(details_lines if details_lines else [f"  - {v}" for v in display_list])
        )

        details = ErrorDetail(
            expected_value=unit_label,
            actual_value=f"{count}種類の{value_label}",
            sample_values=values[:5]
        )

        super().__init__(message=message, suggestion=suggestion, details=details)
        self.values = values
        self.row_counts = row_counts or {}


class MultipleAccountError(MultipleValueError):
    """複数口座番号エラー"""

    def __init__(self, account_numbers: list[str], row_counts: dict[str, int] | None = None):
        super().__init__(
            values=account_numbers,
            row_counts=row_counts,
            value_label="口座番号",
            unit_label="1つの口座番号",
            split_instruction="1回のインポートでは1つの口座番号のみ取り込み可能です。\n口座番号ごとにCSVファイルを分割してアップロードしてください。",
            detected_label="検出された口座番号:",
        )
        self.account_numbers = account_numbers


class MultipleBankError(MultipleValueError):
    """複数銀行名エラー"""

    def __init__(self, bank_names: list[str], row_counts: dict[str, int] | None = None):
        super().__init__(
            values=bank_names,
            row_counts=row_counts,
            value_label="銀行名",
            unit_label="1つの銀行名",
            split_instruction="1回のインポートでは1つの銀行のデータのみ取り込み可能です。\n銀行ごとにCSVファイルを分割してアップロードしてください。",
            detected_label="検出された銀行名:",
        )
        self.bank_names = bank_names
