from django.conf import settings


class DevCsrfTrustedOriginMiddleware:
    """開発環境でリクエストのOriginを自動的にCSRF信頼オリジンに追加する。

    Django 4.0+ ではCSRF検証がポート番号まで厳密にチェックするため、
    ブラウザが送信する Origin（例: http://localhost:3007）が
    CSRF_TRUSTED_ORIGINS と一致しないとリクエストが拒否される。
    このミドルウェアは CsrfViewMiddleware の前に配置し、
    リクエストごとに Origin を動的に信頼リストに追加することで解決する。
    本番環境(DEBUG=False)では何もしない。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            origin = request.META.get('HTTP_ORIGIN')
            if origin and origin not in settings.CSRF_TRUSTED_ORIGINS:
                settings.CSRF_TRUSTED_ORIGINS.append(origin)
        return self.get_response(request)
