from django.db import models
from django.db.models import F

from .lib.constants import UNCATEGORIZED


# Transaction.objects.with_account_info() で口座フィールドをアノテーションするための定義
ACCOUNT_ANNOTATIONS = {
    'bank_name': F('account__bank_name'),
    'branch_name': F('account__branch_name'),
    'account_number': F('account__account_number'),
    'account_type': F('account__account_type'),
    'holder': F('account__holder'),
}


class Case(models.Model):
    """案件モデル - 相続案件を管理"""
    name = models.CharField(max_length=255, unique=True, verbose_name="案件名")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    reference_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="基準日",
        help_text="この日付を基準に取引を前/当日/後に分類"
    )

    # 案件固有の分類パターン（グローバル設定に追加して適用）
    custom_patterns = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="カスタム分類パターン",
        help_text="案件固有のキーワードパターン"
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "案件"
        verbose_name_plural = "案件一覧"
        ordering = ["-created_at"]


class Account(models.Model):
    """口座モデル - 銀行口座情報を管理"""
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="accounts",
        verbose_name="案件"
    )
    account_number = models.CharField(max_length=255, verbose_name="口座番号")
    bank_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="銀行名")
    branch_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="支店名")
    account_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="種別")
    holder = models.CharField(max_length=255, null=True, blank=True, verbose_name="名義人")

    def __str__(self):
        parts = [self.bank_name or '', self.branch_name or '', self.account_number]
        return ' '.join(p for p in parts if p)

    class Meta:
        verbose_name = "口座"
        verbose_name_plural = "口座一覧"
        constraints = [
            models.UniqueConstraint(fields=['case', 'account_number'], name='unique_case_account'),
        ]
        ordering = ['bank_name', 'branch_name']


class TransactionQuerySet(models.QuerySet):
    """口座情報をアノテーションするカスタムQuerySet"""

    def with_account_info(self):
        """口座フィールドをアノテーションして返す（DataFrame用）"""
        return self.select_related('account').annotate(**ACCOUNT_ANNOTATIONS)


class Transaction(models.Model):
    """取引モデル - 銀行取引明細を管理"""
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="案件"
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="口座",
        null=True,
        blank=True,
    )
    date = models.DateField(null=True, blank=True, verbose_name="取引日")
    description = models.CharField(max_length=255, null=True, blank=True, verbose_name="摘要")
    amount_out = models.IntegerField(default=0, verbose_name="出金")
    amount_in = models.IntegerField(default=0, verbose_name="入金")
    balance = models.IntegerField(null=True, blank=True, verbose_name="残高")

    # 分析結果フラグ
    is_large = models.BooleanField(default=False, verbose_name="多額取引")
    is_transfer = models.BooleanField(default=False, verbose_name="資金移動")
    transfer_to = models.CharField(max_length=255, null=True, blank=True, verbose_name="移動先推定")
    category = models.CharField(max_length=100, default=UNCATEGORIZED, verbose_name="分類")

    # AI分類の信頼度（0-100）
    classification_score = models.IntegerField(
        default=0,
        verbose_name="分類信頼度",
        help_text="0: 未分類, 100: 完全一致, 90+: ファジーマッチ"
    )

    # 付箋・メモ機能
    is_flagged = models.BooleanField(default=False, verbose_name="要確認フラグ")
    memo = models.TextField(null=True, blank=True, verbose_name="メモ")

    objects = TransactionQuerySet.as_manager()

    def __str__(self):
        return f"{self.date} - {self.description}"

    class Meta:
        verbose_name = "取引"
        verbose_name_plural = "取引一覧"
        ordering = ["date", "id"]
        indexes = [
            models.Index(fields=["case", "date"]),
            models.Index(fields=["case", "account"]),
            models.Index(fields=["category"]),
            models.Index(fields=["case", "is_flagged"]),
            models.Index(fields=["case", "category"]),
            models.Index(fields=["case", "is_large"]),
            models.Index(fields=["case", "is_transfer"]),
        ]
