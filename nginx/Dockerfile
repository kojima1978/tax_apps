# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================

FROM nginx:1.27-alpine

# ラベル
LABEL org.opencontainers.image.title="Tax Apps Gateway"
LABEL org.opencontainers.image.description="Nginx reverse proxy for Tax Apps"

# タイムゾーン設定
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
    && echo "Asia/Tokyo" > /etc/timezone \
    && apk del tzdata

# キャッシュディレクトリ作成
RUN mkdir -p /var/cache/nginx/proxy \
    && chown -R nginx:nginx /var/cache/nginx

# カスタムエラーページ作成
RUN mkdir -p /usr/share/nginx/html

# 429エラーページ
RUN echo '<!DOCTYPE html>\n\
    <html lang="ja">\n\
    <head>\n\
    <meta charset="UTF-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
    <title>429 Too Many Requests</title>\n\
    <style>\n\
    body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }\n\
    h1 { color: #e74c3c; }\n\
    p { color: #666; }\n\
    </style>\n\
    </head>\n\
    <body>\n\
    <h1>429 Too Many Requests</h1>\n\
    <p>リクエストが多すぎます。しばらく待ってから再試行してください。</p>\n\
    </body>\n\
    </html>' > /usr/share/nginx/html/429.html

# 50xエラーページ
RUN echo '<!DOCTYPE html>\n\
    <html lang="ja">\n\
    <head>\n\
    <meta charset="UTF-8">\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
    <title>Server Error</title>\n\
    <style>\n\
    body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }\n\
    h1 { color: #e74c3c; }\n\
    p { color: #666; }\n\
    </style>\n\
    </head>\n\
    <body>\n\
    <h1>サーバーエラー</h1>\n\
    <p>申し訳ございません。サーバーで問題が発生しました。</p>\n\
    <p>しばらく待ってから再試行してください。</p>\n\
    </body>\n\
    </html>' > /usr/share/nginx/html/50x.html

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

CMD ["nginx", "-g", "daemon off;"]
