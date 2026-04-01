"""案件管理ビュー"""
from django.contrib import messages
from django.shortcuts import render
from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.db.models import Count, Q

from ..models import Case
from ..forms import CaseForm
from ..lib.constants import UNCATEGORIZED


def customer_letter(request):
    """預金取引確認のご案内（お客様配布用）"""
    return render(request, 'analyzer/customer_letter.html')


class CaseListView(ListView):
    model = Case
    template_name = 'analyzer/case_list.html'
    context_object_name = 'cases'
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Case.objects.order_by('-created_at')
            .annotate(
                tx_count=Count('transactions', distinct=True),
                unclassified_count=Count(
                    'transactions',
                    filter=Q(transactions__category=UNCATEGORIZED),
                    distinct=True,
                ),
                account_count=Count(
                    'accounts',
                    distinct=True,
                ),
            )
        )


class CaseCreateView(CreateView):
    model = Case
    form_class = CaseForm
    template_name = 'analyzer/case_form.html'
    success_url = reverse_lazy('case-list')

    def form_valid(self, form):
        messages.success(self.request, "案件を作成しました。")
        return super().form_valid(form)


class CaseUpdateView(UpdateView):
    model = Case
    form_class = CaseForm
    template_name = 'analyzer/case_form.html'

    def get_success_url(self):
        messages.success(self.request, "案件を更新しました。")
        return reverse('case-list')


class CaseDeleteView(DeleteView):
    model = Case
    template_name = 'analyzer/case_confirm_delete.html'
    success_url = reverse_lazy('case-list')

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, "案件を削除しました。")
        return super().delete(request, *args, **kwargs)
