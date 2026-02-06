# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================

FROM nginx:1.27-alpine

# ラベル
LABEL org.opencontainers.image.title="Tax Apps Gateway"
LABEL org.opencontainers.image.description="Nginx reverse proxy for Tax Apps"
LABEL org.opencontainers.image.version="1.1.0"

# タイムゾーン設定 & 必要なパッケージ
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
    && echo "Asia/Tokyo" > /etc/timezone \
    && apk del tzdata

# キャッシュ・ログディレクトリ作成
RUN mkdir -p /var/cache/nginx/proxy /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# カスタムエラーページ作成
COPY <<'EOF' /usr/share/nginx/html/429.html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>429 Too Many Requests</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e74c3c; font-size: 24px; margin-bottom: 16px; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">⚠️</div>
        <h1>429 Too Many Requests</h1>
        <p>リクエストが多すぎます。<br>しばらく待ってから再試行してください。</p>
    </div>
</body>
</html>
EOF

COPY <<'EOF' /usr/share/nginx/html/50x.html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Error</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e74c3c; font-size: 24px; margin-bottom: 16px; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>サーバーエラー</h1>
        <p>申し訳ございません。サーバーで問題が発生しました。<br>しばらく待ってから再試行してください。</p>
    </div>
</body>
</html>
EOF

# 503 メンテナンスページ
COPY <<'EOF' /usr/share/nginx/html/503.html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Unavailable</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #f39c12; font-size: 24px; margin-bottom: 16px; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔄</div>
        <h1>メンテナンス中</h1>
        <p>現在システムメンテナンスを実施しております。<br>しばらくお待ちください。</p>
    </div>
</body>
</html>
EOF

# 設定ファイルをコピー
COPY nginx.conf /etc/nginx/nginx.conf
COPY includes /etc/nginx/includes
COPY default.conf /etc/nginx/conf.d/default.conf

# 設定ファイルの検証
RUN nginx -t

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

# シグナル処理のためstopsignal設定
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
