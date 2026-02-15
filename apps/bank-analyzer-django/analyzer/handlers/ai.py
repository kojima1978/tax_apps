"""
AI分類ハンドラー

AI分類提案の適用・一括適用・自動分類実行を処理する。
"""
import logging

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect

from ..services import TransactionService
from .base import is_ajax, json_error, count_message

logger = logging.getLogger(__name__)


def handle_run_classifier(request: HttpRequest, case, pk: int) -> HttpResponse:
    """自動分類を実行"""
    try:
        count = TransactionService.run_classifier(case)
        count_message(request, count, "自動分類が完了しました。", "データがありません。")
    except Exception as e:
        logger.exception(f"自動分類エラー: case_id={pk}")
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)


def handle_apply_rules(request: HttpRequest, case, pk: int) -> HttpResponse:
    """キーワードルールを適用"""
    try:
        count = TransactionService.apply_classification_rules(case)
        count_message(
            request, count,
            f"キーワードルールを適用し、{count}件を分類しました。",
            "未分類の取引がないか、マッチするルールがありませんでした。",
            zero_level="info",
        )
    except Exception as e:
        logger.exception(f"ルール適用エラー: case_id={pk}")
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)


def handle_apply_ai_suggestion(request: HttpRequest, case, pk: int) -> HttpResponse:
    """AI分類提案を単一の取引に適用"""
    tx_id = request.POST.get('tx_id')
    category = request.POST.get('category')

    if not tx_id or not category:
        if is_ajax(request):
            return json_error('パラメータが不足しています')
        messages.error(request, "パラメータが不足しています。")
        return redirect('analysis-dashboard', pk=pk)

    try:
        tx_id_int = int(tx_id)
        count = TransactionService.apply_ai_suggestion(case, tx_id_int, category)

        if is_ajax(request):
            return JsonResponse({'success': True, 'count': count, 'category': category})

        messages.success(request, f"「{category}」に分類しました。")

    except ValueError:
        if is_ajax(request):
            return json_error('不正な取引IDです')
        messages.error(request, "不正な取引IDです。")

    except Exception as e:
        logger.exception(f"AI提案適用エラー: tx_id={tx_id}")
        if is_ajax(request):
            return json_error(str(e))
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)


def handle_bulk_apply_ai_suggestions(request: HttpRequest, case, pk: int) -> HttpResponse:
    """AI分類提案を一括適用（信頼度閾値以上のもの）"""
    min_score = request.POST.get('min_score', 95)

    try:
        min_score_int = int(min_score)
        count = TransactionService.bulk_apply_ai_suggestions(case, min_score_int)

        if is_ajax(request):
            return JsonResponse({'success': True, 'count': count})

        messages.success(request, f"信頼度{min_score_int}%以上の{count}件にAI分類を適用しました。")

    except Exception as e:
        logger.exception(f"AI提案一括適用エラー: case_id={pk}")
        if is_ajax(request):
            return json_error(str(e))
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)


def handle_run_auto_classify(request: HttpRequest, case, pk: int) -> HttpResponse:
    """パターンに基づく自動分類を実行（AJAX対応）"""
    try:
        count = TransactionService.apply_classification_rules(case)

        if is_ajax(request):
            if count > 0:
                return JsonResponse({
                    'success': True,
                    'count': count,
                    'message': f'{count}件の取引を自動分類しました。'
                })
            else:
                return JsonResponse({
                    'success': True,
                    'count': 0,
                    'message': '分類対象の取引がありませんでした。'
                })

        if count > 0:
            messages.success(request, f"{count}件の取引を自動分類しました。")
        else:
            messages.info(request, "分類対象の取引がありませんでした。")

    except Exception as e:
        logger.exception(f"自動分類エラー: case_id={pk}")
        if is_ajax(request):
            return json_error(str(e))
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)
