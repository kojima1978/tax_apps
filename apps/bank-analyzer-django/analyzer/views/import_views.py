"""インポートビュー"""
import json
import logging

from django.contrib import messages
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404

from ..models import Case, Transaction
from ..forms import JsonImportForm
from ..handlers import safe_error_message
from ..services import TransactionService
from ._helpers import extract_form_rows

logger = logging.getLogger(__name__)


def import_json(request: HttpRequest) -> HttpResponse:
    """JSONバックアップから新規案件を復元"""
    if request.method == 'POST':
        form = JsonImportForm(request.POST, request.FILES)
        if form.is_valid():
            json_file = request.FILES['json_file']
            logger.info(f"JSONインポート開始: filename={json_file.name}, size={json_file.size}")

            try:
                content = json_file.read().decode('utf-8')
                data = json.loads(content)
                restore_settings = form.cleaned_data.get('restore_settings', False)
                new_case, tx_count = TransactionService.import_from_json(data, restore_settings)
                messages.success(
                    request,
                    f"「{new_case.name}」として{tx_count}件の取引を復元しました。"
                )
                return redirect('analysis-dashboard', pk=new_case.pk)

            except Exception as e:
                logger.exception(f"JSONインポートエラー: {e}")
                messages.error(request, safe_error_message(e, "JSONインポート"))
    else:
        form = JsonImportForm()

    return render(request, 'analyzer/json_import.html', {'form': form})


def direct_input(request: HttpRequest, pk: int) -> HttpResponse:
    """取引データの直接入力（少数件向け）"""
    case = get_object_or_404(Case, pk=pk)

    if request.method == 'POST':
        filtered_data, _ = extract_form_rows(request)
        if not filtered_data:
            messages.warning(request, "登録するデータがありません。")
            return redirect('direct-input', pk=pk)

        try:
            count = TransactionService.commit_import(case, filtered_data)
            messages.success(request, f"{count}件の取引を登録しました。")
            return redirect('analysis-dashboard', pk=pk)
        except Exception as e:
            logger.exception(f"直接入力エラー: case_id={pk}, error={e}")
            messages.error(request, safe_error_message(e, "取引登録"))

    existing_accounts = list(
        Transaction.objects
        .filter(case=case)
        .values('bank_name', 'branch_name', 'account_type', 'account_id')
        .distinct()
        .order_by('bank_name', 'branch_name')
    )

    initial_rows = 5
    return render(request, 'analyzer/direct_input.html', {
        'case': case,
        'initial_rows': initial_rows,
        'initial_row_range': range(initial_rows),
        'existing_accounts': existing_accounts,
    })
