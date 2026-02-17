"""
ハンドラー共通ヘルパー

ビューのPOST処理で使用する共通ユーティリティを提供する。
"""
import logging
from functools import wraps
from typing import Callable, Optional

from django.conf import settings as django_settings
from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect

logger = logging.getLogger(__name__)


def json_error(message: str, status: int = 400) -> JsonResponse:
    """JSON APIのエラーレスポンスを生成"""
    return JsonResponse({'success': False, 'error': message}, status=status)


def safe_error_message(e: Exception, context: str = "") -> str:
    """DEBUGモード以外ではエラー詳細を隠蔽する"""
    if django_settings.DEBUG:
        prefix = f'{context}: ' if context else ''
        return f'{prefix}エラー: {e}'
    return 'サーバーエラーが発生しました'


def is_ajax(request: HttpRequest) -> bool:
    """リクエストがAJAXかどうかを判定"""
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def handle_ajax_error(
    request: HttpRequest,
    pk: int,
    error: Exception,
    context: str,
    redirect_url: str = 'analysis-dashboard'
) -> HttpResponse:
    """
    エラー時のAJAX/非AJAXレスポンス

    Args:
        request: HTTPリクエスト
        pk: 案件ID
        error: 発生した例外
        context: エラーコンテキスト
        redirect_url: リダイレクト先

    Returns:
        JsonResponse または HttpResponseRedirect
    """
    logger.exception(f"{context}: {error}")

    if is_ajax(request):
        return json_error(str(error))

    messages.error(request, safe_error_message(error, context))
    return redirect(redirect_url, pk=pk)


def require_params(*param_names):
    """
    必須パラメータをチェックするデコレータ

    Args:
        param_names: 必須パラメータ名のリスト

    使用例:
        @require_params('category', 'keyword')
        def _handle_add_pattern(request, case, pk):
            ...
    """
    def decorator(handler_func: Callable) -> Callable:
        @wraps(handler_func)
        def wrapper(request: HttpRequest, case, pk: int) -> HttpResponse:
            missing = []
            params = {}
            for name in param_names:
                value = request.POST.get(name)
                if not value:
                    missing.append(name)
                params[name] = value

            if missing:
                error_msg = f"パラメータが不足しています: {', '.join(missing)}"
                if is_ajax(request):
                    return json_error(error_msg)
                messages.error(request, error_msg)
                return redirect('analysis-dashboard', pk=pk)

            # パラメータを引数として渡す
            return handler_func(request, case, pk, **params)
        return wrapper
    return decorator


def count_message(request: HttpRequest, count: int, success_msg: str, zero_msg: str, zero_level: str = "warning"):
    """件数に応じたメッセージを表示"""
    if count > 0:
        messages.success(request, success_msg)
    else:
        getattr(messages, zero_level)(request, zero_msg)


def parse_amount(value: str, default: int = 0) -> tuple[int, bool]:
    """金額文字列を整数に変換"""
    try:
        cleaned = (value or '0').replace(',', '')
        return int(cleaned), True
    except (ValueError, AttributeError):
        return default, False


def build_transaction_data(request: HttpRequest) -> dict:
    """POSTデータから取引更新用のデータ辞書を構築"""
    amount_out, _ = parse_amount(request.POST.get('amount_out', '0'))
    amount_in, _ = parse_amount(request.POST.get('amount_in', '0'))
    balance_str = request.POST.get('balance')
    balance_val, _ = parse_amount(balance_str) if balance_str else (None, True)
    return {
        'date': request.POST.get('date'),
        'description': request.POST.get('description'),
        'amount_out': amount_out,
        'amount_in': amount_in,
        'category': request.POST.get('category'),
        'memo': request.POST.get('memo'),
        'bank_name': request.POST.get('bank_name'),
        'branch_name': request.POST.get('branch_name'),
        'account_id': request.POST.get('account_id'),
        'account_type': request.POST.get('account_type'),
        'balance': balance_val,
    }


def build_redirect_url(view_name: str, pk: int, tab: Optional[str] = None, filters: Optional[dict] = None) -> str:
    """タブパラメータとフィルター付きのリダイレクトURLを生成"""
    from urllib.parse import urlencode
    from django.urls import reverse

    url = reverse(view_name, kwargs={'pk': pk})
    params = []

    if tab:
        params.append(('tab', tab))

    if filters:
        for key, values in filters.items():
            if isinstance(values, list):
                for v in values:
                    params.append((key, v))
            elif values:
                params.append((key, values))

    if params:
        url += '?' + urlencode(params)

    return url
