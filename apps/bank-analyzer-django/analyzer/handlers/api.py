"""
APIエンドポイントハンドラー

AJAX用のJSONレスポンスを返すAPIエンドポイントを提供する。
"""
import logging
from datetime import datetime

from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from ..models import Case, Transaction
from ..services import TransactionService
from ..lib.constants import UNCATEGORIZED
from .base import json_error, safe_error_message

logger = logging.getLogger(__name__)


def _parse_amount(value: str, default: int = 0) -> tuple[int, bool]:
    """金額文字列を整数に変換"""
    try:
        cleaned = (value or '0').replace(',', '')
        return int(cleaned), True
    except (ValueError, AttributeError):
        return default, False


def _json_api_error(e: Exception, error_context: str) -> JsonResponse:
    """JSON APIの例外エラーレスポンスを生成（ログ出力付き）"""
    logger.exception(f"{error_context}: error={e}")
    return json_error(safe_error_message(e), status=500)


@require_POST
def api_toggle_flag(request: HttpRequest, pk: int) -> JsonResponse:
    """付箋トグルAPIエンドポイント（AJAX用）"""
    case = get_object_or_404(Case, pk=pk)
    tx_id = request.POST.get('tx_id')

    if not tx_id:
        return json_error('取引IDが指定されていません')

    try:
        new_state = TransactionService.toggle_flag(case, int(tx_id))
        if new_state is None:
            return json_error('取引が見つかりません', status=404)
        return JsonResponse({
            'success': True,
            'is_flagged': new_state,
            'message': '付箋を追加しました' if new_state else '付箋を外しました'
        })
    except Exception as e:
        return _json_api_error(e, f"フラグ更新APIエラー: tx_id={tx_id}")


@require_POST
def api_create_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """取引追加APIエンドポイント（AJAX用）"""
    case = get_object_or_404(Case, pk=pk)

    try:
        date_str = request.POST.get('date')
        date_val = None
        if date_str:
            try:
                date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        amount_out, _ = _parse_amount(request.POST.get('amount_out', '0'))
        amount_in, _ = _parse_amount(request.POST.get('amount_in', '0'))
        balance_str = request.POST.get('balance', '')
        balance_val = None
        if balance_str:
            balance_val, _ = _parse_amount(balance_str)

        tx = Transaction.objects.create(
            case=case,
            date=date_val,
            description=request.POST.get('description', ''),
            amount_out=amount_out,
            amount_in=amount_in,
            balance=balance_val,
            bank_name=request.POST.get('bank_name', ''),
            branch_name=request.POST.get('branch_name', ''),
            account_id=request.POST.get('account_id', ''),
            account_type=request.POST.get('account_type', ''),
            category=request.POST.get('category', UNCATEGORIZED),
            memo=request.POST.get('memo', ''),
        )

        logger.info(f"取引作成: case_id={pk}, tx_id={tx.id}")
        return JsonResponse({
            'success': True,
            'transaction': {
                'id': tx.id,
                'date': tx.date.isoformat() if tx.date else None,
                'description': tx.description,
                'amount_out': tx.amount_out,
                'amount_in': tx.amount_in,
                'balance': tx.balance,
                'bank_name': tx.bank_name,
                'branch_name': tx.branch_name,
                'account_id': tx.account_id,
                'account_type': tx.account_type,
                'category': tx.category,
                'memo': tx.memo,
            },
            'message': '取引を追加しました'
        })
    except Exception as e:
        return _json_api_error(e, f"取引作成APIエラー: case_id={pk}")


@require_POST
def api_delete_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """取引削除APIエンドポイント（AJAX用）"""
    case = get_object_or_404(Case, pk=pk)
    tx_id = request.POST.get('tx_id')

    if not tx_id:
        return json_error('取引IDが指定されていません')

    try:
        tx = case.transactions.get(pk=int(tx_id))
        tx.delete()

        logger.info(f"取引削除: case_id={pk}, tx_id={tx_id}")
        return JsonResponse({
            'success': True,
            'message': '取引を削除しました'
        })
    except Transaction.DoesNotExist:
        return json_error('取引が見つかりません', status=404)
    except Exception as e:
        return _json_api_error(e, f"取引削除APIエラー: tx_id={tx_id}")


def api_get_field_values(request: HttpRequest, pk: int) -> JsonResponse:
    """フィールドのユニーク値を取得するAPIエンドポイント"""
    case = get_object_or_404(Case, pk=pk)
    field_name = request.GET.get('field_name', '')

    if not field_name:
        return json_error('フィールド名が指定されていません')

    try:
        values = TransactionService.get_unique_field_values(case, field_name)
        return JsonResponse({
            'success': True,
            'values': values
        })
    except Exception as e:
        return _json_api_error(e, f"フィールド値取得APIエラー: field_name={field_name}")
