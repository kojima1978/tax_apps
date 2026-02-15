# syntax=docker/dockerfile:1

# =============================================================================
# 贈与税申告 必要書類案内 - Dockerfile
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
COPY apps/gift-tax-docs/package.json ./apps/gift-tax-docs/
RUN --mount=type=cache,id=pnpm-store-gift-tax-docs,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development
COPY packages/utils/ ./packages/utils/
COPY apps/gift-tax-docs/ ./apps/gift-tax-docs/
RUN cd packages/utils && pnpm build
WORKDIR /app/apps/gift-tax-docs
EXPOSE 3002
CMD ["pnpm", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY packages/utils/src ./packages/utils/src
COPY packages/utils/tsconfig.json ./packages/utils/
COPY apps/gift-tax-docs/ ./apps/gift-tax-docs/
RUN --mount=type=cache,id=nextjs-gift-tax-docs,target=/app/apps/gift-tax-docs/.next/cache \
    cd packages/utils && pnpm build && \
    cd ../../apps/gift-tax-docs && \
    mkdir -p public && \
    pnpm next build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Gift Tax Docs" \
      org.opencontainers.image.description="贈与税申告 必要書類案内システム" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3002 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs --link /app/apps/gift-tax-docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/gift-tax-docs/.next/static ./apps/gift-tax-docs/.next/static
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/gift-tax-docs/public ./apps/gift-tax-docs/public

USER nextjs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3002/gift-tax-docs/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/gift-tax-docs/server.js"]
