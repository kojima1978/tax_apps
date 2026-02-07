from django.db import models

from .lib.constants import UNCATEGORIZED


class Case(models.Model):
    """案件モデル - 相続案件を管理"""
    name = models.CharField(max_length=255, unique=True, verbose_name="案件名")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    def __str__(self):
        return self.name

    @property
    def transaction_count(self):
        """取引件数を返す"""
        return self.transactions.count()

    class Meta:
        verbose_name = "案件"
        verbose_name_plural = "案件一覧"
        ordering = ["-created_at"]


class Transaction(models.Model):
    """取引モデル - 銀行取引明細を管理"""
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="案件"
    )
    date = models.DateField(null=True, blank=True, verbose_name="取引日")
    description = models.CharField(max_length=255, null=True, blank=True, verbose_name="摘要")
    amount_out = models.IntegerField(default=0, verbose_name="出金")
    amount_in = models.IntegerField(default=0, verbose_name="入金")
    balance = models.IntegerField(null=True, blank=True, verbose_name="残高")
    account_id = models.CharField(max_length=255, null=True, blank=True, verbose_name="口座ID")
    holder = models.CharField(max_length=255, null=True, blank=True, verbose_name="名義人")
    bank_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="銀行名")
    branch_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="支店名")
    account_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="種別")

    # 分析結果フラグ
    is_large = models.BooleanField(default=False, verbose_name="多額取引")
    is_transfer = models.BooleanField(default=False, verbose_name="資金移動")
    transfer_to = models.CharField(max_length=255, null=True, blank=True, verbose_name="移動先推定")
    category = models.CharField(max_length=100, default=UNCATEGORIZED, verbose_name="分類")

    # 付箋・メモ機能
    is_flagged = models.BooleanField(default=False, verbose_name="要確認フラグ")
    memo = models.TextField(null=True, blank=True, verbose_name="メモ")

    def __str__(self):
        return f"{self.date} - {self.description}"

    @property
    def net_amount(self):
        """純額（入金 - 出金）を返す"""
        return self.amount_in - self.amount_out

    class Meta:
        verbose_name = "取引"
        verbose_name_plural = "取引一覧"
        ordering = ["date", "id"]
        indexes = [
            models.Index(fields=["case", "date"]),
            models.Index(fields=["case", "account_id"]),
            models.Index(fields=["category"]),
            models.Index(fields=["case", "is_flagged"]),
            models.Index(fields=["case", "category"]),
            models.Index(fields=["case", "is_large"]),
            models.Index(fields=["case", "is_transfer"]),
        ]
