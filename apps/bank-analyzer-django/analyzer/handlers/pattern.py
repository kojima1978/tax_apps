"""
パターン管理ハンドラー

分類パターン（グローバル/案件固有）の追加・削除・更新・移動を処理する。
"""
import json
import logging

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect

from ..lib import config
from .base import handle_ajax_error, is_ajax, json_error, require_params

logger = logging.getLogger(__name__)


def _pattern_response(
    request: HttpRequest,
    pk: int,
    success: bool,
    success_msg: str,
    fail_msg: str,
    **extra_data
) -> HttpResponse:
    """パターン操作の結果レスポンスを生成"""
    if is_ajax(request):
        return JsonResponse({'success': success, **extra_data})

    from django.contrib import messages
    if success:
        messages.success(request, success_msg)
    else:
        messages.warning(request, fail_msg)
    return redirect('analysis-dashboard', pk=pk)


def _get_scope_label(scope: str, case) -> str:
    """スコープに応じたラベルを返す"""
    return f"案件「{case.name}」" if scope == 'case' else "グローバル"


@require_params('category', 'keyword')
def handle_add_pattern(request: HttpRequest, case, pk: int, category: str, keyword: str) -> HttpResponse:
    """分類パターンにキーワードを追加（グローバルまたは案件固有）"""
    scope = request.POST.get('scope', 'global')

    try:
        if scope == 'case':
            success = config.add_case_pattern_keyword(case, category, keyword)
        else:
            success = config.add_pattern_keyword(category, keyword)

        scope_label = _get_scope_label(scope, case)
        return _pattern_response(
            request, pk, success,
            success_msg=f"キーワード「{keyword}」を「{category}」に追加しました（{scope_label}）。",
            fail_msg=f"キーワード「{keyword}」は既に登録されています。",
            category=category, keyword=keyword, scope=scope
        )
    except Exception as e:
        return handle_ajax_error(request, pk, e, "パターン追加エラー")


@require_params('category', 'keyword')
def handle_delete_pattern(request: HttpRequest, case, pk: int, category: str, keyword: str) -> HttpResponse:
    """分類パターンからキーワードを削除"""
    scope = request.POST.get('scope', 'global')

    try:
        if scope == 'case':
            success = config.delete_case_pattern_keyword(case, category, keyword)
        else:
            success = config.delete_pattern_keyword(category, keyword)

        scope_label = _get_scope_label(scope, case)
        return _pattern_response(
            request, pk, success,
            success_msg=f"キーワード「{keyword}」を削除しました（{scope_label}）。",
            fail_msg=f"キーワード「{keyword}」が見つかりません。",
            category=category, keyword=keyword
        )
    except Exception as e:
        return handle_ajax_error(request, pk, e, "パターン削除エラー")


@require_params('category', 'old_keyword', 'new_keyword')
def handle_update_pattern(
    request: HttpRequest, case, pk: int,
    category: str, old_keyword: str, new_keyword: str
) -> HttpResponse:
    """分類パターンのキーワードを更新"""
    scope = request.POST.get('scope', 'global')

    try:
        if scope == 'case':
            success = config.update_case_pattern_keyword(case, category, old_keyword, new_keyword)
        else:
            success = config.update_pattern_keyword(category, old_keyword, new_keyword)

        scope_label = _get_scope_label(scope, case)
        return _pattern_response(
            request, pk, success,
            success_msg=f"キーワードを「{old_keyword}」→「{new_keyword}」に更新しました（{scope_label}）。",
            fail_msg=f"キーワード「{old_keyword}」が見つからないか、更新できません。",
            category=category, old_keyword=old_keyword, new_keyword=new_keyword
        )
    except Exception as e:
        return handle_ajax_error(request, pk, e, "パターン更新エラー")


@require_params('category', 'keyword', 'from_scope', 'to_scope')
def handle_move_pattern(
    request: HttpRequest, case, pk: int,
    category: str, keyword: str, from_scope: str, to_scope: str
) -> HttpResponse:
    """パターンをグローバル⇔案件固有間で移動"""
    if from_scope == to_scope:
        if is_ajax(request):
            return json_error('移動元と移動先が同じです')
        from django.contrib import messages
        messages.warning(request, "移動元と移動先が同じです。")
        return redirect('analysis-dashboard', pk=pk)

    try:
        if from_scope == 'global' and to_scope == 'case':
            success = config.move_pattern_to_case(case, category, keyword)
            direction = "グローバル → 案件固有"
        elif from_scope == 'case' and to_scope == 'global':
            success = config.move_pattern_to_global(case, category, keyword)
            direction = "案件固有 → グローバル"
        else:
            success = False
            direction = ""

        return _pattern_response(
            request, pk, success,
            success_msg=f"キーワード「{keyword}」を移動しました（{direction}）。",
            fail_msg=f"キーワード「{keyword}」の移動に失敗しました。",
            category=category, keyword=keyword, direction=direction
        )
    except Exception as e:
        return handle_ajax_error(request, pk, e, "パターン移動エラー")


def handle_get_category_keywords(request: HttpRequest, case, pk: int) -> JsonResponse:
    """指定カテゴリーの既存キーワードを取得（AJAX専用）"""
    category = request.POST.get('category')

    if not category:
        return json_error('カテゴリーが指定されていません')

    try:
        global_patterns = config.get_classification_patterns()
        global_keywords = global_patterns.get(category, [])

        case_patterns = case.custom_patterns or {}
        case_keywords = case_patterns.get(category, [])

        return JsonResponse({
            'success': True,
            'category': category,
            'global_keywords': global_keywords,
            'case_keywords': case_keywords,
        })
    except Exception as e:
        return json_error(str(e))


def handle_bulk_pattern_changes(request: HttpRequest, case, pk: int) -> JsonResponse:
    """パターン変更を一括適用（AJAX専用）"""
    changes_json = request.POST.get('changes', '[]')

    try:
        changes = json.loads(changes_json)

        if not changes:
            return json_error('変更がありません')

        saved_count = 0
        errors = []

        for change in changes:
            action = change.get('action')
            category = change.get('category')
            keyword = change.get('keyword')
            scope = change.get('scope')

            try:
                success = _apply_single_change(case, action, category, keyword, scope, change)
                if success:
                    saved_count += 1
            except Exception as e:
                errors.append(f"{action} {category}/{keyword}: {str(e)}")

        return JsonResponse({
            'success': True,
            'saved_count': saved_count,
            'total_count': len(changes),
            'errors': errors if errors else None
        })

    except json.JSONDecodeError:
        return json_error('JSONの解析に失敗しました')
    except Exception as e:
        return json_error(str(e))


def _apply_single_change(case, action: str, category: str, keyword: str, scope: str, change: dict) -> bool:
    """単一のパターン変更を適用"""
    if action == 'add':
        if scope == 'case':
            return config.add_case_pattern_keyword(case, category, keyword)
        else:
            return config.add_pattern_keyword(category, keyword)

    elif action == 'delete':
        if scope == 'case':
            return config.delete_case_pattern_keyword(case, category, keyword)
        else:
            return config.delete_pattern_keyword(category, keyword)

    elif action == 'move':
        from_scope = change.get('fromScope')
        to_scope = change.get('toScope')
        if from_scope == 'global' and to_scope == 'case':
            return config.move_pattern_to_case(case, category, keyword)
        elif from_scope == 'case' and to_scope == 'global':
            return config.move_pattern_to_global(case, category, keyword)
        return False

    return False
