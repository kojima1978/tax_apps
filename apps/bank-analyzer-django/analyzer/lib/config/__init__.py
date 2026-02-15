"""
設定モジュール

ユーザー設定、分類パターン、デフォルト値の管理を行う。
"""

from .defaults import (
    DEFAULT_PATTERNS,
    DEFAULT_GIFT_THRESHOLD,
    DEFAULT_FUZZY_CONFIG,
)

from .settings import (
    BASE_DIR,
    DATA_DIR,
    CONFIG_FILE,
    ensure_data_dir,
    load_user_settings,
    save_user_settings,
    get_fuzzy_config,
    get_classification_patterns,
    get_gift_threshold,
)

from .patterns import (
    get_case_patterns,
    get_merged_patterns,
    add_pattern_keyword,
    delete_pattern_keyword,
    update_pattern_keyword,
    add_case_pattern_keyword,
    delete_case_pattern_keyword,
    update_case_pattern_keyword,
    move_pattern_to_case,
    move_pattern_to_global,
)

__all__ = [
    # Defaults
    'DEFAULT_PATTERNS',
    'DEFAULT_GIFT_THRESHOLD',
    'DEFAULT_FUZZY_CONFIG',

    # Settings
    'BASE_DIR',
    'DATA_DIR',
    'CONFIG_FILE',
    'ensure_data_dir',
    'load_user_settings',
    'save_user_settings',
    'get_fuzzy_config',
    'get_classification_patterns',
    'get_gift_threshold',

    # Patterns
    'get_case_patterns',
    'get_merged_patterns',
    'add_pattern_keyword',
    'delete_pattern_keyword',
    'update_pattern_keyword',
    'add_case_pattern_keyword',
    'delete_case_pattern_keyword',
    'update_case_pattern_keyword',
    'move_pattern_to_case',
    'move_pattern_to_global',
]
