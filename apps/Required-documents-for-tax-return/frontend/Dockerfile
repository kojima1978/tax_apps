# syntax=docker/dockerfile:1

# =============================================================================
# 確定申告 必要書類管理システム フロントエンド - Dockerfile
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
COPY apps/Required-documents-for-tax-return/frontend/package.json ./apps/Required-documents-for-tax-return/frontend/
RUN --mount=type=cache,id=pnpm-store-tax-docs-frontend,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development \
    NEXT_PUBLIC_API_URL=http://localhost:3001 \
    WATCHPACK_POLLING=true \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo
COPY packages/utils/ ./packages/utils/
COPY apps/Required-documents-for-tax-return/frontend/ ./apps/Required-documents-for-tax-return/frontend/
RUN cd packages/utils && pnpm build
WORKDIR /app/apps/Required-documents-for-tax-return/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NODE_ENV=production \
    NODE_OPTIONS=${NODE_OPTIONS} \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages/utils/src ./packages/utils/src
COPY packages/utils/tsconfig.json ./packages/utils/
COPY apps/Required-documents-for-tax-return/frontend/ ./apps/Required-documents-for-tax-return/frontend/
RUN --mount=type=cache,id=nextjs-tax-docs-frontend,target=/app/apps/Required-documents-for-tax-return/frontend/.next/cache \
    cd packages/utils && pnpm build && \
    cd ../../apps/Required-documents-for-tax-return/frontend && \
    mkdir -p public && \
    pnpm next build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Tax Documents Frontend" \
      org.opencontainers.image.description="確定申告 必要書類管理システム フロントエンド" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs --link /app/apps/Required-documents-for-tax-return/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/Required-documents-for-tax-return/frontend/.next/static ./apps/Required-documents-for-tax-return/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/Required-documents-for-tax-return/frontend/public ./apps/Required-documents-for-tax-return/frontend/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3000/tax-docs/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/Required-documents-for-tax-return/frontend/server.js"]
