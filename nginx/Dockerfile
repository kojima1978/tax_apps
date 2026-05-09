# syntax=docker/dockerfile:1

# ============================================
# Nginx Gateway Dockerfile
# Tax Apps Reverse Proxy
# ============================================

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Tax Apps Gateway" \
      org.opencontainers.image.description="Nginx リバースプロキシ - Tax Apps 統合ゲートウェイ" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

ENV TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    mkdir -p /tmp/nginx-cache /tmp/nginx-client-body /tmp/nginx-proxy-temp \
        /tmp/nginx-fastcgi-temp /tmp/nginx-uwsgi-temp /tmp/nginx-scgi-temp && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /tmp/nginx-cache \
        /tmp/nginx-client-body /tmp/nginx-proxy-temp /tmp/nginx-fastcgi-temp \
        /tmp/nginx-uwsgi-temp /tmp/nginx-scgi-temp

COPY --link html/ /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf
COPY --link includes/ /etc/nginx/includes/
COPY --link default.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1/health || exit 1

USER nginx

EXPOSE 80

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
