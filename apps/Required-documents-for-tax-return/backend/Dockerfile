# syntax=docker/dockerfile:1

# =============================================================================
# 確定申告 必要書類管理システム API - Dockerfile
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
# Native build stage - better-sqlite3 requires build tools
# =============================================================================
FROM base AS native-build
RUN apk add --no-cache python3 make g++

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM native-build AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/utils/package.json ./packages/utils/
COPY apps/Required-documents-for-tax-return/backend/package.json ./apps/Required-documents-for-tax-return/backend/
RUN --mount=type=cache,id=pnpm-store-tax-docs-backend,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM native-build AS dev
ENV NODE_ENV=development \
    PORT=3001 \
    TZ=Asia/Tokyo
RUN apk add --no-cache tzdata
COPY --from=deps --link /app ./
COPY packages/utils/ ./packages/utils/
COPY apps/Required-documents-for-tax-return/backend/ ./apps/Required-documents-for-tax-return/backend/
RUN cd packages/utils && pnpm build
RUN mkdir -p /app/apps/Required-documents-for-tax-return/backend/data
WORKDIR /app/apps/Required-documents-for-tax-return/backend
EXPOSE 3001
CMD ["pnpm", "dev"]

# =============================================================================
# Builder stage - Compile TypeScript
# =============================================================================
FROM deps AS builder
COPY packages/utils/src ./packages/utils/src
COPY packages/utils/tsconfig.json ./packages/utils/
COPY apps/Required-documents-for-tax-return/backend/ ./apps/Required-documents-for-tax-return/backend/
RUN cd packages/utils && pnpm build && \
    cd ../../apps/Required-documents-for-tax-return/backend && \
    pnpm build && \
    find dist \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js.map' \) -delete

# =============================================================================
# Production dependencies stage - devDependencies excluded
# =============================================================================
FROM native-build AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/utils/package.json ./packages/utils/
COPY apps/Required-documents-for-tax-return/backend/package.json ./apps/Required-documents-for-tax-return/backend/
RUN --mount=type=cache,id=pnpm-store-tax-docs-backend,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

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
    PORT=3001 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata

# 本番用依存関係をコピー（ビルド済みネイティブモジュール含む）
COPY --from=prod-deps --link /app/node_modules ./node_modules
COPY --from=prod-deps --link /app/apps/Required-documents-for-tax-return/backend/node_modules ./apps/Required-documents-for-tax-return/backend/node_modules

# ビルド済み utils パッケージ
COPY --from=builder --link /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --link /app/packages/utils/package.json ./packages/utils/

# ビルド成果物をコピー
COPY --from=builder --link /app/apps/Required-documents-for-tax-return/backend/dist ./apps/Required-documents-for-tax-return/backend/dist
COPY --from=builder --link /app/apps/Required-documents-for-tax-return/backend/package.json ./apps/Required-documents-for-tax-return/backend/

# ワークスペース設定
COPY pnpm-workspace.yaml package.json ./

# データベースディレクトリを作成（データ領域のみ書き込み権限付与）
RUN mkdir -p /app/apps/Required-documents-for-tax-return/backend/data && \
    chown node:node /app/apps/Required-documents-for-tax-return/backend/data

VOLUME ["/app/apps/Required-documents-for-tax-return/backend/data"]

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3001/api/health');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/Required-documents-for-tax-return/backend/dist/index.js"]
