"""
URL configuration for bank_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import path, include


def health_check(request):
    """軽量ヘルスチェックエンドポイント（DB接続確認のみ）"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "error"}, status=503)


urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('', include('analyzer.urls')),
]

# 開発環境: リバースプロキシ(Nginx)がFORCE_SCRIPT_NAMEプレフィックスを除去するため、
# Django が受け取る /static/... パスに対して明示的に静的ファイルを配信する
if settings.DEBUG:
    from django.contrib.staticfiles.views import serve as staticfiles_serve
    from django.urls import re_path
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', staticfiles_serve),
    ]
