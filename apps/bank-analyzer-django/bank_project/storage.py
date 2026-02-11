"""
FORCE_SCRIPT_NAME 対応の静的ファイルストレージ

リバースプロキシ（Nginx）がプレフィックスを除去する環境では、
STATIC_URL をプレフィックスなし（/static/）に設定し、
テンプレートの {% static %} URL 生成時にのみ FORCE_SCRIPT_NAME を付与する。
"""

from django.conf import settings
from django.contrib.staticfiles.storage import StaticFilesStorage


class ScriptNameStaticFilesStorage(StaticFilesStorage):
    """{% static %} タグの出力に FORCE_SCRIPT_NAME を自動付与"""

    def url(self, name):
        url = super().url(name)
        prefix = getattr(settings, 'FORCE_SCRIPT_NAME', None)
        if prefix and not url.startswith(prefix):
            return prefix.rstrip('/') + url
        return url
