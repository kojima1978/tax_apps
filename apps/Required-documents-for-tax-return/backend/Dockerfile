# syntax=docker/dockerfile:1

# =============================================================================
# 確定申告 必要書類管理システム API - Dockerfile
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
# Native build stage - better-sqlite3 requires build tools
# =============================================================================
FROM base AS native-build
RUN apk add --no-cache python3 make g++

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM native-build AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-tax-docs-backend,target=/root/.npm \
    npm ci

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development \
    PORT=3006 \
    TZ=Asia/Tokyo
RUN apk add --no-cache tzdata
COPY . .
RUN mkdir -p data
EXPOSE 3006
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Compile TypeScript
# =============================================================================
FROM deps AS builder
COPY . .
RUN npm run build && \
    find dist \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js.map' \) -delete

# =============================================================================
# Production dependencies stage - devDependencies excluded
# =============================================================================
FROM native-build AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-tax-docs-backend-prod,target=/root/.npm \
    npm ci --omit=dev

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Tax Documents Backend" \
      org.opencontainers.image.description="確定申告 必要書類管理システム API" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3006 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata

COPY --from=prod-deps --link /app/node_modules ./node_modules
COPY --from=builder --link /app/dist ./dist
COPY --from=builder --link /app/package.json ./

RUN mkdir -p /app/data && \
    chown node:node /app/data

VOLUME ["/app/data"]

USER node
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3006/api/health');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
