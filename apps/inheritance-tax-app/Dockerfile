# syntax=docker/dockerfile:1

# =============================================================================
# 相続税シミュレーター - Dockerfile
# Multi-stage build for development and production (pnpm monorepo)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# =============================================================================
# Dependencies stage - Install pnpm packages
# =============================================================================
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/utils/package.json ./packages/utils/
COPY apps/inheritance-tax-app/package.json ./apps/inheritance-tax-app/
RUN --mount=type=cache,id=pnpm-store-inheritance-tax-app,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development
COPY packages/utils/ ./packages/utils/
COPY apps/inheritance-tax-app/ ./apps/inheritance-tax-app/
RUN cd packages/utils && pnpm build
WORKDIR /app/apps/inheritance-tax-app
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY packages/utils/src ./packages/utils/src
COPY packages/utils/tsconfig.json ./packages/utils/
COPY apps/inheritance-tax-app/ ./apps/inheritance-tax-app/
RUN cd packages/utils && pnpm build && \
    cd ../../apps/inheritance-tax-app && \
    pnpm build

# =============================================================================
# Production stage - Minimal nginx image serving static files
# =============================================================================
FROM nginx:1.27-alpine AS runner

RUN apk upgrade --no-cache

LABEL org.opencontainers.image.title="相続税シミュレーター" \
      org.opencontainers.image.description="相続税額シミュレーション（早見表＋計算）" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# nginx設定をコピー
COPY --link apps/inheritance-tax-app/nginx-main.conf /etc/nginx/nginx.conf
COPY --link apps/inheritance-tax-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --link apps/inheritance-tax-app/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# ビルド成果物をコピー
COPY --link --chown=nginx:nginx --from=builder /app/apps/inheritance-tax-app/dist /usr/share/nginx/html/inheritance-tax-app

# non-root実行の準備
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
