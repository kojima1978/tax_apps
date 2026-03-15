from django.contrib import admin
from django.db.models import Count

from .models import Account, Case, Transaction


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """案件の管理画面設定"""
    list_display = ('name', 'get_transaction_count', 'created_at', 'updated_at')
    search_fields = ('name',)
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(_transaction_count=Count('transactions'))

    @admin.display(description='取引件数', ordering='_transaction_count')
    def get_transaction_count(self, obj):
        return obj._transaction_count


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    """口座の管理画面設定"""
    list_display = ('account_number', 'bank_name', 'branch_name', 'account_type', 'holder', 'case', 'get_tx_count')
    list_filter = ('case', 'bank_name')
    search_fields = ('account_number', 'bank_name', 'branch_name', 'holder')
    raw_id_fields = ('case',)
    list_per_page = 50

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(_tx_count=Count('transactions'))

    @admin.display(description='取引件数', ordering='_tx_count')
    def get_tx_count(self, obj):
        return obj._tx_count


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """取引の管理画面設定"""
    list_display = (
        'date', 'case', 'get_account_number', 'description',
        'amount_out', 'amount_in', 'balance', 'category',
        'is_large', 'is_transfer', 'is_flagged'
    )
    list_filter = ('case', 'category', 'is_large', 'is_transfer', 'is_flagged', 'account__bank_name')
    search_fields = ('description', 'account__account_number', 'account__holder', 'memo')
    date_hierarchy = 'date'
    raw_id_fields = ('case', 'account')
    list_per_page = 100
    ordering = ('-date',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('account')

    @admin.display(description='口座番号', ordering='account__account_number')
    def get_account_number(self, obj):
        return obj.account.account_number if obj.account else '-'
