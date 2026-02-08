# syntax=docker/dockerfile:1

# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================

FROM nginx:1.27-alpine

# セキュリティ更新
RUN apk upgrade --no-cache

# ラベル
LABEL org.opencontainers.image.title="Tax Apps Gateway" \
      org.opencontainers.image.description="Nginx reverse proxy for Tax Apps" \
      org.opencontainers.image.version="1.2.0"

# タイムゾーン設定 & ログディレクトリ作成
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
    && echo "Asia/Tokyo" > /etc/timezone \
    && apk del tzdata \
    && mkdir -p /var/log/nginx \
    && chown -R nginx:nginx /var/log/nginx

# カスタムエラーページ
COPY html/ /usr/share/nginx/html/

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
