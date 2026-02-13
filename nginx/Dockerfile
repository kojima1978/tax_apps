# syntax=docker/dockerfile:1

# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Tax Apps Gateway" \
      org.opencontainers.image.description="Nginx リバースプロキシ" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# セキュリティ更新 + タイムゾーン設定 + non-root 準備
RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

# カスタムエラーページ + 設定ファイル
COPY --link html/ /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf
COPY --link includes/ /etc/nginx/includes/
COPY --link default.conf /etc/nginx/conf.d/default.conf

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

USER nginx

EXPOSE 80

# グレースフルシャットダウン（NginxはSIGQUITで graceful stop）
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
