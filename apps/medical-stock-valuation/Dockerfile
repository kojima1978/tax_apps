# syntax=docker/dockerfile:1

# =============================================================================
# 医療法人株式評価システム - Dockerfile
# Multi-stage build for development and production (standalone)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps

# better-sqlite3 のネイティブビルドに必要
RUN apk add --no-cache python3 make g++ pkgconfig

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-medical-stock-valuation,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development WATCHPACK_POLLING=true HOSTNAME=0.0.0.0 TZ=Asia/Tokyo
COPY . .
RUN mkdir -p /app/data
EXPOSE 3010
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN --mount=type=cache,id=nextjs-medical-stock-valuation,target=/app/.next/cache \
    mkdir -p public && \
    npm run build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Medical Stock Valuation" \
      org.opencontainers.image.description="出資持分の評価額試算（4ステップ入力・Excel/JSON出力・マスタ管理）" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3010 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=1001:1001 --link /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 --link /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 --link /app/public ./public

# データベースディレクトリを作成（書き込み権限）
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

VOLUME /app/data

USER nextjs
EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3010/medical/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
