from django import forms
from django.core.validators import FileExtensionValidator
from .models import Case

# ファイルサイズ上限（10MB）
MAX_FILE_SIZE = 10 * 1024 * 1024


def _validate_file_size(file) -> None:
    """ファイルサイズのバリデーション共通処理"""
    if file.size == 0:
        raise forms.ValidationError("空のファイルはアップロードできません。")
    if file.size > MAX_FILE_SIZE:
        raise forms.ValidationError(
            f"ファイルサイズが大きすぎます（{file.size // (1024*1024)}MB）。"
            f"最大{MAX_FILE_SIZE // (1024*1024)}MBまでアップロード可能です。"
        )


class CaseForm(forms.ModelForm):
    """案件作成・編集フォーム"""

    class Meta:
        model = Case
        fields = ["name"]
        widgets = {
            "name": forms.TextInput(attrs={
                "class": "form-control",
                "placeholder": "案件名を入力（例: 山田太郎様 相続）"
            }),
        }


class ImportForm(forms.Form):
    """CSVインポートフォーム"""
    csv_file = forms.FileField(
        label="CSVファイル",
        help_text="銀行からダウンロードした入出金明細（CSV）※最大10MB",
        validators=[FileExtensionValidator(allowed_extensions=['csv'])],
        widget=forms.FileInput(attrs={
            "class": "form-control",
            "accept": ".csv"
        })
    )

    def clean_csv_file(self):
        """ファイルサイズとタイプのバリデーション"""
        file = self.cleaned_data.get('csv_file')
        if file:
            _validate_file_size(file)
        return file


class JsonImportForm(forms.Form):
    """JSONバックアップインポートフォーム"""
    json_file = forms.FileField(
        label="JSONバックアップファイル",
        help_text="エクスポートしたJSONファイルを選択してください ※最大10MB",
        validators=[FileExtensionValidator(allowed_extensions=['json'])],
        widget=forms.FileInput(attrs={
            "class": "form-control",
            "accept": ".json"
        })
    )
    restore_settings = forms.BooleanField(
        label="設定データも復元する",
        required=False,
        initial=False,
        help_text="チェックすると、バックアップに含まれる閾値・分類キーワード設定も復元します",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"})
    )

    def clean_json_file(self):
        """ファイルサイズとタイプのバリデーション"""
        file = self.cleaned_data.get('json_file')
        if file:
            _validate_file_size(file)
        return file


# カテゴリフィールド名 → 日本語カテゴリ名のマッピング（後方互換性のため維持）
CATEGORY_FIELD_MAP = {
    'cat_life': '生活費',
    'cat_salary': '給与',
    'cat_gift': '贈与',
    'cat_related': '関連会社',
    'cat_bank': '銀行',
    'cat_security': '証券・株式',
    'cat_insurance': '保険会社',
    'cat_other': 'その他',
}


class SettingsForm(forms.Form):
    """
    設定フォーム（分析パラメータのみ）

    分類パターンは _pattern_manager.html パーシャルで管理するため、
    このフォームでは分析パラメータのみを扱う。
    """
    large_amount_threshold = forms.IntegerField(
        label="多額取引の閾値（円）",
        min_value=0,
        max_value=1_000_000_000,  # 10億円まで
        initial=500000,
        help_text="この金額以上の取引を「多額取引」として検出します",
        widget=forms.NumberInput(attrs={"class": "form-control"})
    )
    transfer_days_window = forms.IntegerField(
        label="資金移動 検出期間（日）",
        min_value=0,
        max_value=30,
        initial=3,
        help_text="この期間内で出金と入金のペアを資金移動として検出します",
        widget=forms.NumberInput(attrs={"class": "form-control"})
    )
    transfer_amount_tolerance = forms.IntegerField(
        label="資金移動 金額許容誤差（円）",
        min_value=0,
        initial=1000,
        help_text="出金額と入金額の差がこの範囲内であれば資金移動として判定します",
        widget=forms.NumberInput(attrs={"class": "form-control"})
    )
