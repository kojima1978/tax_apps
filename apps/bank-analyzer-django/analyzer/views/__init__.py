"""
Bank Analyzer ビュー

views.py を責務別モジュールに分割。
urls.py からは従来通り `from . import views` → `views.xxx` で参照可能。
"""
# 案件管理
from .case import (
    customer_letter,
    CaseListView,
    CaseCreateView,
    CaseUpdateView,
    CaseDeleteView,
)

# エクスポート
from .export import (
    export_json,
    export_csv,
    export_csv_filtered,
    export_xlsx_by_category,
)

# インポート
from .import_views import (
    import_json,
    direct_input,
)

# 分析ダッシュボード
from .dashboard import (
    analysis_dashboard,
    classify_preview,
)

# 設定
from .settings import settings_view

# ユーティリティ（テスト等から参照）
from ._helpers import sanitize_filename

# ハンドラー（urls.py から直接参照されるもの）
from ..handlers import (
    import_wizard,
    api_toggle_flag,
    api_create_transaction,
    api_delete_transaction,
    api_get_transaction,
    api_get_field_values,
)
