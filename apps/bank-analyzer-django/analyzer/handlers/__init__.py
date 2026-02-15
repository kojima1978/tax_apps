"""
ハンドラーモジュール

ビューのPOST処理を機能別に分離したハンドラー群を提供する。
"""

from .base import (
    json_error,
    json_success,
    safe_error_message,
    is_ajax,
    ajax_or_redirect,
    handle_ajax_error,
    require_params,
    count_message,
    build_redirect_url,
)

from .pattern import (
    handle_add_pattern,
    handle_delete_pattern,
    handle_update_pattern,
    handle_move_pattern,
    handle_get_category_keywords,
    handle_bulk_pattern_changes,
)

from .ai import (
    handle_run_classifier,
    handle_apply_rules,
    handle_apply_ai_suggestion,
    handle_bulk_apply_ai_suggestions,
    handle_run_auto_classify,
)

from .transaction import (
    FIELD_LABELS,
    handle_delete_account,
    handle_update_category,
    handle_bulk_update_categories,
    handle_bulk_update_categories_transfer,
    handle_update_transaction,
    handle_delete_duplicates,
    handle_delete_by_range,
    handle_toggle_flag,
    handle_update_memo,
    handle_bulk_replace_field,
)

from .wizard import (
    import_wizard,
)

from .api import (
    api_toggle_flag,
    api_create_transaction,
    api_delete_transaction,
    api_get_field_values,
)

__all__ = [
    # Base utilities
    'json_error',
    'json_success',
    'safe_error_message',
    'is_ajax',
    'ajax_or_redirect',
    'handle_ajax_error',
    'require_params',
    'count_message',
    'build_redirect_url',
    'FIELD_LABELS',

    # Pattern handlers
    'handle_add_pattern',
    'handle_delete_pattern',
    'handle_update_pattern',
    'handle_move_pattern',
    'handle_get_category_keywords',
    'handle_bulk_pattern_changes',

    # AI handlers
    'handle_run_classifier',
    'handle_apply_rules',
    'handle_apply_ai_suggestion',
    'handle_bulk_apply_ai_suggestions',
    'handle_run_auto_classify',

    # Transaction handlers
    'handle_delete_account',
    'handle_update_category',
    'handle_bulk_update_categories',
    'handle_bulk_update_categories_transfer',
    'handle_update_transaction',
    'handle_delete_duplicates',
    'handle_delete_by_range',
    'handle_toggle_flag',
    'handle_update_memo',
    'handle_bulk_replace_field',

    # Wizard
    'import_wizard',

    # API endpoints
    'api_toggle_flag',
    'api_create_transaction',
    'api_delete_transaction',
    'api_get_field_values',
]
