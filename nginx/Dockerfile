# syntax=docker/dockerfile:1

# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================
#
# Build examples:
#   docker build -t tax-apps-gateway:latest .
#   docker build --build-arg APP_VERSION=1.2.0 -t tax-apps-gateway:1.2.0 .
#
# ============================================

# ------------------------------------------
# Build Arguments
# ------------------------------------------
ARG NGINX_VERSION=1.27
ARG APP_VERSION=1.0.0
ARG BUILD_DATE=""
ARG VCS_REF=""

FROM nginx:${NGINX_VERSION}-alpine

# Re-declare ARGs after FROM
ARG APP_VERSION
ARG BUILD_DATE
ARG VCS_REF

# OCI Image Specification labels
LABEL org.opencontainers.image.title="Tax Apps Gateway" \
      org.opencontainers.image.description="Nginx リバースプロキシ - Tax Apps 統合ゲートウェイ" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# タイムゾーン設定
ENV TZ=Asia/Tokyo

# セキュリティ更新 + タイムゾーン + non-root 準備
RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    # non-root ユーザー用のディレクトリ権限設定
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

# カスタムエラーページ + 設定ファイル
COPY --link html/ /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf
COPY --link includes/ /etc/nginx/includes/
COPY --link default.conf /etc/nginx/conf.d/default.conf

# ヘルスチェック（Alpine BusyBox内蔵のwgetを使用）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1/health || exit 1

# non-root ユーザーで実行
USER nginx

EXPOSE 80

# グレースフルシャットダウン（NginxはSIGQUITで graceful stop）
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
