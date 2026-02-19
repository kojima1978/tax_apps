# syntax=docker/dockerfile:1

# =============================================================================
# 退職金税額計算シミュレーター - Dockerfile
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
RUN --mount=type=cache,id=npm-store-retirement-tax-calc,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development WATCHPACK_POLLING=true HOSTNAME=0.0.0.0 TZ=Asia/Tokyo
COPY . .
EXPOSE 3013
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN --mount=type=cache,id=nextjs-retirement-tax-calc,target=/app/.next/cache \
    mkdir -p public && \
    npm run build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Retirement Tax Calculator" \
      org.opencontainers.image.description="退職金税額計算シミュレーター" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3013 \
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

USER nextjs
EXPOSE 3013

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3013/retirement-tax-calc/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
