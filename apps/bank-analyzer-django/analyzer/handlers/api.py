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
from ..services.transaction import get_or_create_account
from ..lib.constants import UNCATEGORIZED
from .base import json_error, json_api_error, build_transaction_data, serialize_transaction

logger = logging.getLogger(__name__)


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
        return json_api_error(e, f"フラグ更新APIエラー: tx_id={tx_id}")


@require_POST
def api_create_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """取引追加APIエンドポイント（AJAX用）"""
    case = get_object_or_404(Case, pk=pk)

    try:
        data = build_transaction_data(request)

        # 日付文字列をdate型に変換
        date_val = None
        if data['date']:
            try:
                date_val = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                pass

        # 口座を取得または作成
        account = get_or_create_account(
            case=case,
            account_number=data.get('account_number', '') or 'unknown',
            bank_name=data.get('bank_name', ''),
            branch_name=data.get('branch_name', ''),
            account_type=data.get('account_type', ''),
        )

        tx = Transaction.objects.create(
            case=case,
            account=account,
            date=date_val,
            description=data.get('description', ''),
            amount_out=data['amount_out'],
            amount_in=data['amount_in'],
            balance=data['balance'],
            category=data.get('category') or UNCATEGORIZED,
            memo=data.get('memo', ''),
        )

        logger.info(f"取引作成: case_id={pk}, tx_id={tx.id}")
        # account情報をtxに付与してシリアライズ
        tx.bank_name = account.bank_name
        tx.branch_name = account.branch_name
        tx.account_number = account.account_number
        tx.account_type = account.account_type
        return JsonResponse({
            'success': True,
            'transaction': serialize_transaction(tx),
            'message': '取引を追加しました'
        })
    except Exception as e:
        return json_api_error(e, f"取引作成APIエラー: case_id={pk}")


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
        return json_api_error(e, f"取引削除APIエラー: tx_id={tx_id}")


def api_get_transaction(request: HttpRequest, pk: int) -> JsonResponse:
    """取引データ取得APIエンドポイント（保存後の検証用）"""
    case = get_object_or_404(Case, pk=pk)
    tx_id = request.GET.get('tx_id')

    if not tx_id:
        return json_error('取引IDが指定されていません')

    try:
        tx = case.transactions.with_account_info().filter(pk=int(tx_id)).first()
        if not tx:
            return json_error('取引が見つかりません', status=404)
        return JsonResponse({
            'success': True,
            'transaction': serialize_transaction(tx)
        })
    except Exception as e:
        return json_api_error(e, f"取引取得APIエラー: tx_id={tx_id}")


@require_POST
def api_update_reference_date(request: HttpRequest, pk: int) -> JsonResponse:
    """基準日更新APIエンドポイント（AJAX用）"""
    case = get_object_or_404(Case, pk=pk)
    date_str = request.POST.get('reference_date', '').strip()

    try:
        if date_str:
            case.reference_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            case.reference_date = None
        case.save(update_fields=['reference_date'])

        logger.info(f"基準日更新: case_id={pk}, date={case.reference_date}")
        return JsonResponse({
            'success': True,
            'reference_date': case.reference_date.isoformat() if case.reference_date else None,
            'message': '基準日を更新しました' if case.reference_date else '基準日をクリアしました',
        })
    except ValueError:
        return json_error('日付の形式が正しくありません（YYYY-MM-DD）')
    except Exception as e:
        return json_api_error(e, f"基準日更新APIエラー: case_id={pk}")


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
        return json_api_error(e, f"フィールド値取得APIエラー: field_name={field_name}")
