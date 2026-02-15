"""
取引ハンドラー

取引の更新・削除・フラグ・メモ・一括置換などを処理する。
"""
import logging

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect

from ..services import TransactionService
from .base import is_ajax, json_error, count_message, build_redirect_url

logger = logging.getLogger(__name__)

# フィールドラベル定義（CSV出力・一括置換で共用）
FIELD_LABELS = {
    'date': '日付',
    'bank_name': '銀行名',
    'branch_name': '支店名',
    'account_type': '種別',
    'account_id': '口座番号',
    'description': '摘要',
    'amount_out': '払戻',
    'amount_in': 'お預り',
    'balance': '残高',
    'category': '分類',
}


def _parse_amount(value: str, default: int = 0) -> tuple[int, bool]:
    """金額文字列を整数に変換"""
    try:
        cleaned = (value or '0').replace(',', '')
        return int(cleaned), True
    except (ValueError, AttributeError):
        return default, False


def _extract_category_updates(request: HttpRequest, prefixes: list[str]) -> dict[str, str]:
    """POSTデータからカテゴリ更新辞書を構築する"""
    category_updates = {}
    for key, value in request.POST.items():
        for prefix in prefixes:
            if key.startswith(prefix):
                tx_id = key[len(prefix):]
                if tx_id:
                    category_updates[tx_id] = value
                break
    return category_updates


def handle_delete_account(request: HttpRequest, case, pk: int) -> HttpResponse:
    """口座の全取引を削除"""
    account_id = request.POST.get('account_id')
    if account_id:
        try:
            count = TransactionService.delete_account_transactions(case, account_id)
            messages.success(request, f"口座ID: {account_id} のデータ（{count}件）を削除しました。")
        except Exception as e:
            logger.exception(f"口座削除エラー: account_id={account_id}")
            messages.error(request, f"エラーが発生しました: {e}")

    return redirect('analysis-dashboard', pk=pk)


def handle_update_category(request: HttpRequest, case, pk: int) -> HttpResponse:
    """取引のカテゴリーを更新"""
    tx_id = request.POST.get('tx_id')
    new_category = request.POST.get('new_category') or request.POST.get('category')
    apply_all = request.POST.get('apply_all') == 'true'

    if not tx_id or not new_category:
        if is_ajax(request):
            return json_error('パラメータが不足しています')
        return redirect('analysis-dashboard', pk=pk)

    try:
        tx_id_int = int(tx_id)
    except (ValueError, TypeError):
        if is_ajax(request):
            return json_error('不正な取引IDです')
        messages.error(request, "不正な取引IDです。")
        return redirect('analysis-dashboard', pk=pk)

    count = TransactionService.update_transaction_category(case, tx_id_int, new_category, apply_all)

    if is_ajax(request):
        return JsonResponse({'success': True, 'count': count, 'category': new_category})

    if apply_all and count > 0:
        tx = case.transactions.filter(pk=tx_id_int).first()
        if tx:
            messages.success(request, f"「{tx.description}」の取引 {count}件を「{new_category}」に変更しました。")
    else:
        messages.success(request, "分類を更新しました。")

    return redirect('analysis-dashboard', pk=pk)


def handle_bulk_update_categories(request: HttpRequest, case, pk: int) -> HttpResponse:
    """複数取引のカテゴリーを一括更新"""
    source_tab = request.POST.get('source_tab', 'large')
    category_updates = _extract_category_updates(request, ['cat-'])

    count = TransactionService.bulk_update_categories(case, category_updates)
    count_message(request, count, f"{count}件の分類を更新しました。", "変更はありませんでした。", zero_level="info")

    # フィルター状態を復元（allタブの場合）
    filters = None
    if source_tab == 'all':
        filters = {
            'bank': request.POST.getlist('filter_bank'),
            'account': request.POST.getlist('filter_account'),
            'category': request.POST.getlist('filter_category'),
            'keyword': request.POST.get('filter_keyword', ''),
            'page': request.POST.get('filter_page', ''),
        }

    return redirect(build_redirect_url('analysis-dashboard', pk, source_tab, filters))


def handle_bulk_update_categories_transfer(request: HttpRequest, case, pk: int) -> HttpResponse:
    """資金移動タブのカテゴリー一括更新"""
    category_updates = _extract_category_updates(request, ['transfer-src-', 'transfer-dest-'])

    count = TransactionService.bulk_update_categories(case, category_updates)
    count_message(request, count, f"{count}件の分類を更新しました。", "変更はありませんでした。", zero_level="info")

    return redirect(build_redirect_url('analysis-dashboard', pk, 'transfers', None))


def handle_update_transaction(request: HttpRequest, case, pk: int) -> HttpResponse:
    """取引データを更新"""
    source_tab = request.POST.get('source_tab', '')
    tx_id = request.POST.get('tx_id')

    if tx_id:
        try:
            amount_out, _ = _parse_amount(request.POST.get('amount_out', '0'))
            amount_in, _ = _parse_amount(request.POST.get('amount_in', '0'))
            balance_str = request.POST.get('balance')
            balance_val, _ = _parse_amount(balance_str) if balance_str else (None, True)

            data = {
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
            success = TransactionService.update_transaction(case, int(tx_id), data)
            if success:
                messages.success(request, "取引データを更新しました。")
        except Exception as e:
            logger.exception(f"取引更新エラー: tx_id={tx_id}")
            messages.error(request, f"エラーが発生しました: {e}")

    return redirect(build_redirect_url('analysis-dashboard', pk, source_tab))


def handle_delete_duplicates(request: HttpRequest, case, pk: int) -> HttpResponse:
    """重複取引を削除"""
    delete_ids = request.POST.getlist('delete_ids')
    count = TransactionService.delete_duplicates(case, delete_ids)
    count_message(request, count, f"{count}件の重複データを削除しました。", "削除対象が選択されていません。")
    return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))


def handle_delete_by_range(request: HttpRequest, case, pk: int) -> HttpResponse:
    """ID範囲で取引を削除"""
    start_id = request.POST.get('start_id')
    end_id = request.POST.get('end_id')

    try:
        start_id_int = int(start_id)
        end_id_int = int(end_id)
        count = TransactionService.delete_by_range(case, start_id_int, end_id_int)
        count_message(
            request, count,
            f"ID {start_id_int}〜{end_id_int} の範囲で {count}件の取引を削除しました。",
            "指定した範囲に削除対象の取引がありませんでした。",
        )
    except (ValueError, TypeError):
        messages.error(request, "IDは整数で入力してください。")

    return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))


def handle_toggle_flag(request: HttpRequest, case, pk: int) -> HttpResponse:
    """取引の付箋をトグル"""
    tx_id = request.POST.get('tx_id')
    source_tab = request.POST.get('source_tab', '')

    if tx_id:
        try:
            new_state = TransactionService.toggle_flag(case, int(tx_id))
            if new_state is None:
                messages.warning(request, "取引が見つかりません。")
            elif new_state:
                messages.success(request, "付箋を追加しました。")
            else:
                messages.info(request, "付箋を外しました。")
        except Exception as e:
            logger.exception(f"フラグ更新エラー: tx_id={tx_id}")
            messages.error(request, f"エラーが発生しました: {e}")

    return redirect(build_redirect_url('analysis-dashboard', pk, source_tab))


def handle_update_memo(request: HttpRequest, case, pk: int) -> HttpResponse:
    """取引のメモを更新"""
    tx_id = request.POST.get('tx_id')
    memo = request.POST.get('memo', '')
    source_tab = request.POST.get('source_tab', '')

    if tx_id:
        try:
            success = TransactionService.update_memo(case, int(tx_id), memo)
            if success:
                messages.success(request, "メモを更新しました。")
        except Exception as e:
            logger.exception(f"メモ更新エラー: tx_id={tx_id}")
            messages.error(request, f"エラーが発生しました: {e}")

    return redirect(build_redirect_url('analysis-dashboard', pk, source_tab))


def handle_bulk_replace_field(request: HttpRequest, case, pk: int) -> HttpResponse:
    """フィールド値の一括置換を処理"""
    field_name = request.POST.get('field_name')
    old_value = request.POST.get('old_value', '').strip()
    new_value = request.POST.get('new_value', '').strip()

    if not field_name or field_name not in TransactionService.REPLACEABLE_FIELDS:
        messages.error(request, "不正なフィールドが指定されました。")
        return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if not old_value:
        messages.warning(request, "置換前の値を選択してください。")
        return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if not new_value:
        messages.warning(request, "置換後の値を入力してください。")
        return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    if old_value == new_value:
        messages.warning(request, "置換前と置換後の値が同じです。")
        return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))

    try:
        count = TransactionService.bulk_replace_field_value(case, field_name, old_value, new_value)
        field_label = FIELD_LABELS.get(field_name, field_name)
        count_message(
            request, count,
            f"{field_label}「{old_value}」を「{new_value}」に置換しました（{count}件）。",
            "該当するデータがありませんでした。",
        )
    except Exception as e:
        logger.exception(f"一括置換エラー: field={field_name}")
        messages.error(request, f"エラーが発生しました: {e}")

    return redirect(build_redirect_url('analysis-dashboard', pk, 'cleanup'))
