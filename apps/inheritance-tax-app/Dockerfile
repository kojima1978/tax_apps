# syntax=docker/dockerfile:1

# =============================================================================
# 相続税シミュレーター - Dockerfile
# Multi-stage build for development and production
# =============================================================================

# =============================================================================
# Build Arguments
# =============================================================================
ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates
RUN apk upgrade --no-cache

WORKDIR /app

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps

# Copy only package files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies with caching (id= prevents collision with other apps)
RUN --mount=type=cache,id=npm-inheritance-tax-app,target=/root/.npm \
    npm ci --no-audit --no-fund

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM base AS dev

ENV NODE_ENV=development

# Copy dependencies from deps stage
COPY --from=deps --link /app/node_modules ./node_modules

# Copy source code
COPY --link . .

EXPOSE 5173

# Port is controlled by docker-compose command override
CMD ["npm", "run", "dev", "--", "--host"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM base AS builder

# Build configuration
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production \
    NODE_OPTIONS=${NODE_OPTIONS}

# Copy dependencies (devDependencies included via deps stage)
COPY --from=deps --link /app/node_modules ./node_modules

# Copy source files
COPY --link . .

# Build
RUN npm run build && \
    rm -rf node_modules/.cache

# =============================================================================
# Production stage - Minimal nginx image serving static files
# =============================================================================
FROM nginx:1.27-alpine AS runner

RUN apk upgrade --no-cache

# OCI Image Labels
LABEL org.opencontainers.image.title="相続税シミュレーター" \
      org.opencontainers.image.description="相続税額シミュレーション（早見表＋計算）" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# nginx設定をコピー（メイン設定・サーバー設定・セキュリティヘッダー）
COPY --link nginx-main.conf /etc/nginx/nginx.conf
COPY --link nginx.conf /etc/nginx/conf.d/default.conf
COPY --link nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# ビルド成果物をコピー（nginx所有権で直接配置）
COPY --link --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html/inheritance-tax-app

# non-root実行の準備: デフォルトHTMLを削除、nginx作業ディレクトリの所有権変更
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173/inheritance-tax-app/ || exit 1

STOPSIGNAL SIGQUIT

EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
