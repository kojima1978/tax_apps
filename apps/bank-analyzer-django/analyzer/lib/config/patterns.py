"""
パターン管理

分類パターンの追加・削除・更新・移動を行う。
"""
import logging

from .defaults import DEFAULT_PATTERNS
from .settings import load_user_settings, save_user_settings, get_classification_patterns

logger = logging.getLogger(__name__)


def get_case_patterns(case) -> dict:
    """案件固有の分類パターンを取得"""
    return case.custom_patterns or {}


def get_merged_patterns(case=None) -> dict:
    """グローバルと案件固有のパターンをマージして取得"""
    global_patterns = get_classification_patterns()

    if case is None:
        return global_patterns

    case_patterns = case.custom_patterns or {}
    if not case_patterns:
        return global_patterns

    merged = {k: list(v) for k, v in global_patterns.items()}
    for category, keywords in case_patterns.items():
        if category not in merged:
            merged[category] = []
        for kw in keywords:
            if kw not in merged[category]:
                merged[category].append(kw)

    return merged


# =============================================================================
# パターン変更の内部ヘルパー
# =============================================================================

def _modify_patterns(case, modify_fn, log_msg: str) -> bool:
    """パターンをロード→変更→保存する共通処理。変更がない場合は保存をスキップ。"""
    if case is None:
        settings = load_user_settings()
        patterns = settings.get("CLASSIFICATION_PATTERNS")
        if patterns is None:
            patterns = {k: list(v) for k, v in DEFAULT_PATTERNS.items()}
    else:
        patterns = case.custom_patterns or {}

    result, changed = modify_fn(patterns)

    if changed:
        if case is None:
            settings["CLASSIFICATION_PATTERNS"] = patterns
            save_user_settings(settings)
        else:
            case.custom_patterns = patterns
            case.save(update_fields=['custom_patterns'])
        logger.info(log_msg)

    return result


def _add_keyword(patterns: dict, category: str, keyword: str) -> tuple[bool, bool]:
    """キーワード追加。戻り値: (成功, 変更あり)"""
    if category not in patterns:
        patterns[category] = []
    if keyword in patterns[category]:
        return True, False
    patterns[category].append(keyword)
    return True, True


def _delete_keyword(patterns: dict, category: str, keyword: str, remove_empty: bool = False) -> tuple[bool, bool]:
    """キーワード削除。remove_empty=Trueで空カテゴリーも削除。戻り値: (成功, 変更あり)"""
    if category not in patterns or keyword not in patterns[category]:
        return False, False
    patterns[category].remove(keyword)
    if remove_empty and not patterns[category]:
        del patterns[category]
    return True, True


def _update_keyword(patterns: dict, category: str, old_keyword: str, new_keyword: str) -> tuple[bool, bool]:
    """キーワード更新。戻り値: (成功, 変更あり)"""
    if category not in patterns or old_keyword not in patterns[category]:
        return False, False
    if new_keyword in patterns[category] and new_keyword != old_keyword:
        return False, False
    idx = patterns[category].index(old_keyword)
    patterns[category][idx] = new_keyword
    return True, True


# =============================================================================
# グローバルパターン操作
# =============================================================================

def add_pattern_keyword(category: str, keyword: str) -> bool:
    """グローバルパターンにキーワードを追加"""
    if not keyword or not keyword.strip():
        return False
    keyword = keyword.strip()
    return _modify_patterns(
        None, lambda p: _add_keyword(p, category, keyword),
        f"パターン追加（グローバル）: '{keyword}' -> '{category}'",
    )


def delete_pattern_keyword(category: str, keyword: str) -> bool:
    """グローバルパターンからキーワードを削除（空カテゴリーは維持）"""
    return _modify_patterns(
        None, lambda p: _delete_keyword(p, category, keyword),
        f"パターン削除（グローバル）: '{keyword}' <- '{category}'",
    )


def update_pattern_keyword(category: str, old_keyword: str, new_keyword: str) -> bool:
    """グローバルパターンのキーワードを更新"""
    if not new_keyword or not new_keyword.strip():
        return False
    new_keyword = new_keyword.strip()
    return _modify_patterns(
        None, lambda p: _update_keyword(p, category, old_keyword, new_keyword),
        f"パターン更新（グローバル）: '{old_keyword}' -> '{new_keyword}' ({category})",
    )


# =============================================================================
# 案件固有パターン操作
# =============================================================================

def add_case_pattern_keyword(case, category: str, keyword: str) -> bool:
    """案件固有パターンにキーワードを追加"""
    if not keyword or not keyword.strip():
        return False
    keyword = keyword.strip()
    return _modify_patterns(
        case, lambda p: _add_keyword(p, category, keyword),
        f"パターン追加（案件固有）: '{keyword}' -> '{category}' (case={case.name})",
    )


def delete_case_pattern_keyword(case, category: str, keyword: str) -> bool:
    """案件固有パターンからキーワードを削除（空カテゴリーも削除）"""
    return _modify_patterns(
        case, lambda p: _delete_keyword(p, category, keyword, remove_empty=True),
        f"パターン削除（案件固有）: '{keyword}' <- '{category}' (case={case.name})",
    )


def update_case_pattern_keyword(case, category: str, old_keyword: str, new_keyword: str) -> bool:
    """案件固有パターンのキーワードを更新"""
    if not new_keyword or not new_keyword.strip():
        return False
    new_keyword = new_keyword.strip()
    return _modify_patterns(
        case, lambda p: _update_keyword(p, category, old_keyword, new_keyword),
        f"パターン更新（案件固有）: '{old_keyword}' -> '{new_keyword}' ({category}, case={case.name})",
    )


# =============================================================================
# パターン移動
# =============================================================================

def move_pattern_to_case(case, category: str, keyword: str) -> bool:
    """グローバルパターンから案件固有パターンにキーワードを移動"""
    if not delete_pattern_keyword(category, keyword):
        return False
    return add_case_pattern_keyword(case, category, keyword)


def move_pattern_to_global(case, category: str, keyword: str) -> bool:
    """案件固有パターンからグローバルパターンにキーワードを移動"""
    if not delete_case_pattern_keyword(case, category, keyword):
        return False
    return add_pattern_keyword(category, keyword)
