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


def json_success(data: dict = None, **kwargs) -> JsonResponse:
    """JSON APIの成功レスポンスを生成"""
    response = {'success': True}
    if data:
        response.update(data)
    response.update(kwargs)
    return response


def safe_error_message(e: Exception, context: str = "") -> str:
    """DEBUGモード以外ではエラー詳細を隠蔽する"""
    if django_settings.DEBUG:
        prefix = f'{context}: ' if context else ''
        return f'{prefix}エラー: {e}'
    return 'サーバーエラーが発生しました'


def is_ajax(request: HttpRequest) -> bool:
    """リクエストがAJAXかどうかを判定"""
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def ajax_or_redirect(
    request: HttpRequest,
    pk: int,
    success_data: dict = None,
    success_message: str = None,
    redirect_url: str = 'analysis-dashboard',
    tab: str = None
) -> HttpResponse:
    """
    AJAXならJSONレスポンス、そうでなければリダイレクト

    Args:
        request: HTTPリクエスト
        pk: 案件ID
        success_data: AJAX成功時のデータ
        success_message: 非AJAX時のメッセージ
        redirect_url: リダイレクト先のURL名
        tab: リダイレクト先のタブ

    Returns:
        JsonResponse または HttpResponseRedirect
    """
    if is_ajax(request):
        return JsonResponse({'success': True, **(success_data or {})})

    if success_message:
        messages.success(request, success_message)

    url = redirect(redirect_url, pk=pk).url
    if tab:
        url += f'?tab={tab}'
    return redirect(url)


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
