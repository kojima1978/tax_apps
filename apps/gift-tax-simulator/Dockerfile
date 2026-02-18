# syntax=docker/dockerfile:1

# =============================================================================
# 贈与税計算シミュレーター - Dockerfile
# Multi-stage build for development and production (pnpm monorepo)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Dependencies stage - Install pnpm packages
# =============================================================================
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/utils/package.json ./packages/utils/
COPY apps/gift-tax-simulator/package.json ./apps/gift-tax-simulator/
RUN --mount=type=cache,id=pnpm-store-gift-tax-simulator,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development
COPY packages/utils/ ./packages/utils/
COPY apps/gift-tax-simulator/ ./apps/gift-tax-simulator/
RUN cd packages/utils && pnpm build
WORKDIR /app/apps/gift-tax-simulator
EXPOSE 3001
CMD ["pnpm", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY packages/utils/src ./packages/utils/src
COPY packages/utils/tsconfig.json ./packages/utils/
COPY apps/gift-tax-simulator/ ./apps/gift-tax-simulator/
RUN --mount=type=cache,id=nextjs-gift-tax-simulator,target=/app/apps/gift-tax-simulator/.next/cache \
    cd packages/utils && pnpm build && \
    cd ../../apps/gift-tax-simulator && \
    mkdir -p public && \
    pnpm next build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Gift Tax Simulator" \
    org.opencontainers.image.description="贈与税計算シミュレーター" \
    org.opencontainers.image.vendor="税理士法人マスエージェント" \
    org.opencontainers.image.licenses="Private" \
    org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=1001:1001 --link /app/apps/gift-tax-simulator/.next/standalone ./
COPY --from=builder --chown=1001:1001 --link /app/apps/gift-tax-simulator/.next/static ./apps/gift-tax-simulator/.next/static
COPY --from=builder --chown=1001:1001 --link /app/apps/gift-tax-simulator/public ./apps/gift-tax-simulator/public

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3001/gift-tax-simulator/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/gift-tax-simulator/server.js"]
