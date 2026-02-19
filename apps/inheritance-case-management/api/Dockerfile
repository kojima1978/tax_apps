# syntax=docker/dockerfile:1

# =============================================================================
# 相続税案件管理システム API - Dockerfile
# Multi-stage build for development and production (standalone)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache
WORKDIR /app

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-itcm-api,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development TZ=Asia/Tokyo
COPY . .
RUN npx prisma generate
COPY docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Compile TypeScript
# =============================================================================
FROM deps AS builder
COPY . .
RUN npx prisma generate && \
    npm run build

# =============================================================================
# Production dependencies stage - devDependencies excluded
# =============================================================================
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,id=npm-store-itcm-api-prod,target=/root/.npm \
    npm ci --omit=dev && \
    npx prisma generate

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="ITCM Backend" \
      org.opencontainers.image.description="相続税案件管理システム API" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs hono

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3021 \
    TZ=Asia/Tokyo

COPY --from=prod-deps --link /app/node_modules ./node_modules
COPY --from=builder --link /app/dist ./dist
COPY --from=builder --link /app/package.json ./
COPY --from=builder --link /app/prisma ./prisma

COPY docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

USER hono
EXPOSE 3021

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3021/health');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
