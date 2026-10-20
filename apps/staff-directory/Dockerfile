# syntax=docker/dockerfile:1

# =============================================================================
# staff-directory（社員台帳）- Vite frontend + Express backend
# Multi-stage build for development and production
# =============================================================================

ARG NODE_VERSION=22
ARG APP_PORT=3031

# =============================================================================
# Base
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# =============================================================================
# Dependencies
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-staff-directory,target=/root/.npm \
    npm ci && \
    # npm ci はロックファイルの os/cpu だけで絞り込む。lockfileVersion 3 には
    # libc フィールドが無く（npm 10.9 でも書き出さない）、musl 用と glibc 用の
    # ネイティブバイナリが両方入る。Alpine(musl) では glibc 用は使われないので消す。
    # 同じ RUN 層で消さないとイメージは縮まない。
    rm -rf node_modules/@rollup/rollup-linux-x64-gnu \
           node_modules/lightningcss-linux-x64-gnu \
           node_modules/@tailwindcss/oxide-linux-x64-gnu

# =============================================================================
# Development - Express（tsx watch）に Vite をミドルウェアとして組み込む
# =============================================================================
FROM deps AS dev
ARG APP_PORT
ENV NODE_ENV=development TZ=Asia/Tokyo PORT=${APP_PORT}
# Windows の bind mount ではホスト側の変更が inotify として届かないので、
# Vite の監視をポーリングへ切り替える（docker/Dockerfile.vite-static と同じ理由）。
ENV CHOKIDAR_USEPOLLING=true CHOKIDAR_INTERVAL=300
# dev サーバも非 root で動かす（runner は元から USER node）。
# COPY の --chown は層を増やさない。node_modules を丸ごと chown すると
# ツリーがもう1層コピーされるので、Vite が .vite を作るディレクトリだけ渡す。
# /app/data は空のボリュームがイメージ側の所有者を引き継ぐための入れ物。
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app /app/node_modules /app/data
USER node
EXPOSE ${APP_PORT}
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder - Build both frontend and backend
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN npm run build && npm run build:server

# =============================================================================
# Production - Node.js server serving API + static files
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

ARG APP_PORT

RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat python3 make g++

ENV NODE_ENV=production TZ=Asia/Tokyo PORT=${APP_PORT}

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-staff-directory-prod,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${APP_PORT}/staff-directory/api/health || exit 1

EXPOSE ${APP_PORT}
CMD ["node", "dist-server/index.js"]
