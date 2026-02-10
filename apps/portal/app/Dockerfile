# syntax=docker/dockerfile:1

# ============================================
# Tax Apps Portal - Dockerfile
# Next.js 静的エクスポート → nginx で配信
# ============================================

# --- Build ---
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN --mount=type=cache,id=npm-portal,target=/root/.npm npm ci
COPY --link . .
RUN --mount=type=cache,id=next-portal,target=/app/.next/cache \
    npm run build

# --- Production ---
FROM nginx:alpine AS runner

LABEL org.opencontainers.image.title="Tax Apps Portal" \
      org.opencontainers.image.description="税理士業務支援アプリ ポータルサイト" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# タイムゾーン + デフォルトconf削除 + 非rootユーザー準備
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    rm /etc/nginx/conf.d/default.conf && \
    sed -i '/^user/d' /etc/nginx/nginx.conf && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid

COPY <<'EOF' /etc/nginx/conf.d/portal.conf
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;

    server_tokens off;
    access_log off;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }

    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /404.html;
}
EOF

COPY --from=builder --link /app/out /usr/share/nginx/html

USER nginx
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
