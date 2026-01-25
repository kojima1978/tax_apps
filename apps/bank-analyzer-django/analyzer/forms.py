from django import forms
from .models import Case


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
    """CSV/Excelインポートフォーム"""
    csv_file = forms.FileField(
        label="CSV/Excelファイル",
        help_text="銀行からダウンロードした入出金明細（CSVまたはExcel）",
        widget=forms.FileInput(attrs={
            "class": "form-control",
            "accept": ".csv,.xlsx,.xls"
        })
    )


class SettingsForm(forms.Form):
    """設定フォーム"""
    large_amount_threshold = forms.IntegerField(
        label="多額取引の閾値（円）",
        min_value=0,
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

    # 分類パターン設定
    cat_life = forms.CharField(
        label="生活費 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_gift = forms.CharField(
        label="贈与 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_related = forms.CharField(
        label="関連会社 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_bank = forms.CharField(
        label="銀行 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_security = forms.CharField(
        label="証券会社 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_insurance = forms.CharField(
        label="保険会社 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
    cat_other = forms.CharField(
        label="その他 キーワード",
        required=False,
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        help_text="カンマ区切りでキーワードを入力"
    )
