# syntax=docker/dockerfile:1

# =============================================================================
# 退職金税額計算シミュレーター - Dockerfile
# Multi-stage build for development and production (nginx static)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat
WORKDIR /app

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-retirement-tax-calc,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development TZ=Asia/Tokyo
COPY . .
EXPOSE 3013
CMD ["npm", "run", "dev", "--", "--host", "--port", "3013"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN npm run build

# =============================================================================
# Production stage - Minimal nginx image serving static files
# =============================================================================
FROM nginx:1.27-alpine AS runner

RUN apk upgrade --no-cache

LABEL org.opencontainers.image.title="Retirement Tax Calculator" \
      org.opencontainers.image.description="退職金税額計算シミュレーター" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# nginx設定をコピー
COPY --link nginx-main.conf /etc/nginx/nginx.conf
COPY --link nginx.conf /etc/nginx/conf.d/default.conf
COPY --link nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# ビルド成果物をコピー
COPY --link --chown=101:101 --from=builder /app/dist /usr/share/nginx/html/retirement-tax-calc

# non-root実行の準備
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3013/retirement-tax-calc/ || exit 1

STOPSIGNAL SIGQUIT

EXPOSE 3013
CMD ["nginx", "-g", "daemon off;"]
