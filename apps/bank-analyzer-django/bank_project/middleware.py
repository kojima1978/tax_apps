from django.conf import settings


class DevCsrfTrustedOriginMiddleware:
    """開発環境でリクエストのOriginを自動的にCSRF信頼オリジンに追加する。

    ALLOWED_HOSTS に '*' が含まれる開発環境で、LAN IP等からのアクセス時に
    CSRF検証エラーを防止する。本番環境(DEBUG=False)では何もしない。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG and '*' in settings.ALLOWED_HOSTS:
            origin = request.META.get('HTTP_ORIGIN')
            if origin and origin not in settings.CSRF_TRUSTED_ORIGINS:
                settings.CSRF_TRUSTED_ORIGINS.append(origin)
        return self.get_response(request)
