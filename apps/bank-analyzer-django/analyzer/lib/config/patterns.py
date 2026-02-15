"""
パターン管理

分類パターンの追加・削除・更新・移動を行う。
"""
import logging

from .defaults import DEFAULT_PATTERNS
from .settings import load_user_settings, save_user_settings, get_classification_patterns

logger = logging.getLogger(__name__)


def get_case_patterns(case) -> dict:
    """
    案件固有の分類パターンを取得

    Args:
        case: 対象の案件（Caseモデルインスタンス）

    Returns:
        案件固有の分類パターン辞書
    """
    return case.custom_patterns or {}


def get_merged_patterns(case=None) -> dict:
    """
    グローバルと案件固有のパターンをマージして取得

    Args:
        case: 対象の案件（Noneの場合はグローバルのみ）

    Returns:
        マージされた分類パターン
    """
    # グローバルパターンを取得
    global_patterns = get_classification_patterns()

    if case is None:
        return global_patterns

    # 案件固有パターンを取得
    case_patterns = case.custom_patterns or {}

    if not case_patterns:
        return global_patterns

    # マージ（案件固有のキーワードをグローバルに追加）
    merged = {k: list(v) for k, v in global_patterns.items()}

    for category, keywords in case_patterns.items():
        if category not in merged:
            merged[category] = []
        # 重複を避けて追加
        for kw in keywords:
            if kw not in merged[category]:
                merged[category].append(kw)

    return merged


# =============================================================================
# グローバルパターン操作
# =============================================================================

def add_pattern_keyword(category: str, keyword: str) -> bool:
    """
    分類パターンにキーワードを追加

    Args:
        category: カテゴリー名
        keyword: 追加するキーワード

    Returns:
        成功した場合True
    """
    if not keyword or not keyword.strip():
        return False

    keyword = keyword.strip()
    user_settings = load_user_settings()

    # 現在のパターンを取得（ユーザー設定 or デフォルト）
    patterns = user_settings.get("CLASSIFICATION_PATTERNS")
    if patterns is None:
        # デフォルトからコピー
        patterns = {k: list(v) for k, v in DEFAULT_PATTERNS.items()}

    # カテゴリーが存在しない場合は作成
    if category not in patterns:
        patterns[category] = []

    # 既に存在する場合はスキップ
    if keyword in patterns[category]:
        logger.info(f"キーワード '{keyword}' は既に '{category}' に存在します")
        return True

    # キーワードを追加
    patterns[category].append(keyword)

    # 設定を保存
    user_settings["CLASSIFICATION_PATTERNS"] = patterns
    save_user_settings(user_settings)

    logger.info(f"パターン追加（グローバル）: '{keyword}' -> '{category}'")
    return True


def delete_pattern_keyword(category: str, keyword: str) -> bool:
    """
    グローバルパターンからキーワードを削除

    Args:
        category: カテゴリー名
        keyword: 削除するキーワード

    Returns:
        成功した場合True
    """
    user_settings = load_user_settings()
    patterns = user_settings.get("CLASSIFICATION_PATTERNS")

    if patterns is None:
        patterns = {k: list(v) for k, v in DEFAULT_PATTERNS.items()}

    if category not in patterns or keyword not in patterns[category]:
        return False

    patterns[category].remove(keyword)

    # 空のカテゴリーは削除しない（デフォルトカテゴリーを維持）
    user_settings["CLASSIFICATION_PATTERNS"] = patterns
    save_user_settings(user_settings)

    logger.info(f"パターン削除（グローバル）: '{keyword}' <- '{category}'")
    return True


def update_pattern_keyword(category: str, old_keyword: str, new_keyword: str) -> bool:
    """
    グローバルパターンのキーワードを更新

    Args:
        category: カテゴリー名
        old_keyword: 古いキーワード
        new_keyword: 新しいキーワード

    Returns:
        成功した場合True
    """
    if not new_keyword or not new_keyword.strip():
        return False

    new_keyword = new_keyword.strip()
    user_settings = load_user_settings()
    patterns = user_settings.get("CLASSIFICATION_PATTERNS")

    if patterns is None:
        patterns = {k: list(v) for k, v in DEFAULT_PATTERNS.items()}

    if category not in patterns or old_keyword not in patterns[category]:
        return False

    # 新しいキーワードが既に存在する場合はスキップ
    if new_keyword in patterns[category] and new_keyword != old_keyword:
        return False

    idx = patterns[category].index(old_keyword)
    patterns[category][idx] = new_keyword

    user_settings["CLASSIFICATION_PATTERNS"] = patterns
    save_user_settings(user_settings)

    logger.info(f"パターン更新（グローバル）: '{old_keyword}' -> '{new_keyword}' ({category})")
    return True


# =============================================================================
# 案件固有パターン操作
# =============================================================================

def add_case_pattern_keyword(case, category: str, keyword: str) -> bool:
    """
    案件固有の分類パターンにキーワードを追加

    Args:
        case: 対象の案件（Caseモデルインスタンス）
        category: カテゴリー名
        keyword: 追加するキーワード

    Returns:
        成功した場合True
    """
    if not keyword or not keyword.strip():
        return False

    keyword = keyword.strip()

    # 現在のカスタムパターンを取得
    patterns = case.custom_patterns or {}

    # カテゴリーが存在しない場合は作成
    if category not in patterns:
        patterns[category] = []

    # 既に存在する場合はスキップ
    if keyword in patterns[category]:
        logger.info(f"キーワード '{keyword}' は既に案件 '{case.name}' の '{category}' に存在します")
        return True

    # キーワードを追加
    patterns[category].append(keyword)

    # 案件を保存
    case.custom_patterns = patterns
    case.save(update_fields=['custom_patterns'])

    logger.info(f"パターン追加（案件固有）: '{keyword}' -> '{category}' (case={case.name})")
    return True


def delete_case_pattern_keyword(case, category: str, keyword: str) -> bool:
    """
    案件固有パターンからキーワードを削除

    Args:
        case: 対象の案件
        category: カテゴリー名
        keyword: 削除するキーワード

    Returns:
        成功した場合True
    """
    patterns = case.custom_patterns or {}

    if category not in patterns or keyword not in patterns[category]:
        return False

    patterns[category].remove(keyword)

    # 空のカテゴリーは削除
    if not patterns[category]:
        del patterns[category]

    case.custom_patterns = patterns
    case.save(update_fields=['custom_patterns'])

    logger.info(f"パターン削除（案件固有）: '{keyword}' <- '{category}' (case={case.name})")
    return True


def update_case_pattern_keyword(case, category: str, old_keyword: str, new_keyword: str) -> bool:
    """
    案件固有パターンのキーワードを更新

    Args:
        case: 対象の案件
        category: カテゴリー名
        old_keyword: 古いキーワード
        new_keyword: 新しいキーワード

    Returns:
        成功した場合True
    """
    if not new_keyword or not new_keyword.strip():
        return False

    new_keyword = new_keyword.strip()
    patterns = case.custom_patterns or {}

    if category not in patterns or old_keyword not in patterns[category]:
        return False

    # 新しいキーワードが既に存在する場合はスキップ
    if new_keyword in patterns[category] and new_keyword != old_keyword:
        return False

    idx = patterns[category].index(old_keyword)
    patterns[category][idx] = new_keyword

    case.custom_patterns = patterns
    case.save(update_fields=['custom_patterns'])

    logger.info(f"パターン更新（案件固有）: '{old_keyword}' -> '{new_keyword}' ({category}, case={case.name})")
    return True


# =============================================================================
# パターン移動
# =============================================================================

def move_pattern_to_case(case, category: str, keyword: str) -> bool:
    """
    グローバルパターンから案件固有パターンにキーワードを移動

    Args:
        case: 対象の案件
        category: カテゴリー名
        keyword: 移動するキーワード

    Returns:
        成功した場合True
    """
    # グローバルから削除
    if not delete_pattern_keyword(category, keyword):
        return False

    # 案件固有に追加
    return add_case_pattern_keyword(case, category, keyword)


def move_pattern_to_global(case, category: str, keyword: str) -> bool:
    """
    案件固有パターンからグローバルパターンにキーワードを移動

    Args:
        case: 対象の案件
        category: カテゴリー名
        keyword: 移動するキーワード

    Returns:
        成功した場合True
    """
    # 案件固有から削除
    if not delete_case_pattern_keyword(case, category, keyword):
        return False

    # グローバルに追加
    return add_pattern_keyword(category, keyword)
