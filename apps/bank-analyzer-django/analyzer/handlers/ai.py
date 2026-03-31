"""
AI分類ハンドラー

AI分類提案の適用・一括適用・自動分類実行を処理する。
"""
from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect

from ..services import TransactionService
from .base import is_ajax, json_error, count_message, handle_ajax_error, redirect_on_error, require_params


@redirect_on_error('自動分類エラー')
def handle_run_classifier(request: HttpRequest, case, pk: int) -> HttpResponse:
    """自動分類を実行"""
    count = TransactionService.run_classifier(case)
    count_message(request, count, "自動分類が完了しました。", "データがありません。")
    return redirect('analysis-dashboard', pk=pk)


@redirect_on_error('ルール適用エラー')
def handle_apply_rules(request: HttpRequest, case, pk: int) -> HttpResponse:
    """キーワードルールを適用"""
    count = TransactionService.apply_classification_rules(case)
    count_message(
        request, count,
        f"キーワードルールを適用し、{count}件を分類しました。",
        "未分類の取引がないか、マッチするルールがありませんでした。",
        zero_level="info",
    )
    return redirect('analysis-dashboard', pk=pk)


@require_params('tx_id', 'category')
@redirect_on_error('AI提案適用エラー')
def handle_apply_ai_suggestion(request: HttpRequest, case, pk: int, tx_id: str, category: str) -> HttpResponse:
    """AI分類提案を単一の取引に適用"""
    try:
        count = TransactionService.apply_ai_suggestion(case, int(tx_id), category)
    except ValueError:
        if is_ajax(request):
            return json_error('不正な取引IDです')
        messages.error(request, "不正な取引IDです。")
        return redirect('analysis-dashboard', pk=pk)

    if is_ajax(request):
        return JsonResponse({'success': True, 'count': count, 'category': category})

    messages.success(request, f"「{category}」に分類しました。")
    return redirect('analysis-dashboard', pk=pk)


@redirect_on_error('AI提案一括適用エラー')
def handle_bulk_apply_ai_suggestions(request: HttpRequest, case, pk: int) -> HttpResponse:
    """AI分類提案を一括適用（信頼度閾値以上のもの）"""
    min_score_int = int(request.POST.get('min_score', 95))
    count = TransactionService.bulk_apply_ai_suggestions(case, min_score_int)

    if is_ajax(request):
        return JsonResponse({'success': True, 'count': count})

    messages.success(request, f"信頼度{min_score_int}%以上の{count}件にAI分類を適用しました。")
    return redirect('analysis-dashboard', pk=pk)


@redirect_on_error('自動分類エラー')
def handle_run_auto_classify(request: HttpRequest, case, pk: int) -> HttpResponse:
    """パターンに基づく自動分類を実行（AJAX対応）"""
    count = TransactionService.apply_classification_rules(case)

    if is_ajax(request):
        msg = f'{count}件の取引を自動分類しました。' if count > 0 else '分類対象の取引がありませんでした。'
        return JsonResponse({'success': True, 'count': count, 'message': msg})

    count_message(
        request, count,
        f"{count}件の取引を自動分類しました。",
        "分類対象の取引がありませんでした。",
        zero_level="info",
    )
    return redirect('analysis-dashboard', pk=pk)
