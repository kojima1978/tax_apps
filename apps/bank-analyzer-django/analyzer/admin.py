from django.contrib import admin
from .models import Case, Transaction


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """案件の管理画面設定"""
    list_display = ('name', 'transaction_count', 'created_at', 'updated_at')
    search_fields = ('name',)
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """取引の管理画面設定"""
    list_display = (
        'date', 'case', 'account_id', 'description',
        'amount_out', 'amount_in', 'balance', 'category',
        'is_large', 'is_transfer', 'is_flagged'
    )
    list_filter = ('case', 'category', 'is_large', 'is_transfer', 'is_flagged', 'bank_name')
    search_fields = ('description', 'account_id', 'holder', 'memo')
    date_hierarchy = 'date'
    raw_id_fields = ('case',)
    list_per_page = 100
    ordering = ('-date',)
