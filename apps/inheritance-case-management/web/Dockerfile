# syntax=docker/dockerfile:1

# =============================================================================
# 相続税案件管理システム フロントエンド - Dockerfile
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
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-itcm-web,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development WATCHPACK_POLLING=true HOSTNAME=0.0.0.0 TZ=Asia/Tokyo
COPY . .
EXPOSE 3020
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ARG NEXT_PUBLIC_API_URL=http://localhost:3021/api
ENV NODE_ENV=production \
    NODE_OPTIONS=${NODE_OPTIONS} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN --mount=type=cache,id=nextjs-itcm-web,target=/app/.next/cache \
    mkdir -p public && \
    npm run build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="ITCM Frontend" \
      org.opencontainers.image.description="相続税案件管理システム フロントエンド" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3020 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=1001:1001 --link /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 --link /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 --link /app/public ./public

USER nextjs
EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3020/itcm/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
