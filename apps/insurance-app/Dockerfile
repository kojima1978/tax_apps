# syntax=docker/dockerfile:1

# =============================================================================
# Insurance App - Next.js + SQLite
# Multi-stage build for development and production
# =============================================================================

ARG NODE_VERSION=22
ARG APP_PORT=3030

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
RUN --mount=type=cache,id=npm-store-insurance,target=/root/.npm \
    npm ci

# =============================================================================
# Development - hot reload
# =============================================================================
FROM deps AS dev
ARG APP_PORT
ENV NODE_ENV=development TZ=Asia/Tokyo DATABASE_PATH=/app/data/insurance.sqlite

# --chown を付けるのは next dev が tsconfig.json と next-env.d.ts を
# 起動時に書き換えるため（root 所有のままだと EACCES で即落ちる）。
# COPY の --chown は層を増やさないので、ここは丸ごと node 所有で持ち込む。
COPY --chown=node:node . .

# dev サーバも非 root で動かす（runner は元から USER node）。
# dev だけ root のままだと、この後 /app/data のボリュームを node 所有に直しても
# 開発モードで一度起動しただけで root 所有のファイルが混ざって元に戻る。
#
# node_modules を `chown -R` しないのは、ツリー全体がもう1層まるごと
# コピーされてイメージが倍近くに膨らむため。書き込みが要るのは
# 「/app に .next を作る」「node_modules 配下にキャッシュを作る」の2つだけなので
# ディレクトリのパーミッションだけを渡す。
#
# /app/data は空のボリュームが作られたときの雛形。Docker は新規ボリュームへ
# イメージ側の中身と所有者をコピーするので、ここで node 所有にしておかないと
# 真っ新な環境で DB を作れない。
RUN mkdir -p /app/data && \
    chown node:node /app /app/node_modules /app/data
USER node

EXPOSE ${APP_PORT}
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder - production build
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN npm run build

# =============================================================================
# Production - Next.js standalone server
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

ARG APP_PORT

RUN apk upgrade --no-cache
ENV NODE_ENV=production TZ=Asia/Tokyo PORT=${APP_PORT} HOSTNAME=0.0.0.0 DATABASE_PATH=/app/data/insurance.sqlite

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

# standalone サーバが実際に書き込む場所は2つだけ。
# .next/cache はビルド成果物には含まれない（画像最適化やキャッシュで実行時に作られる）ので、
# ここで先に作って node に渡しておかないと USER node で EACCES になる。
# .next 自体をディレクトリだけ node 所有にするのは、cache を消して作り直す経路があるため
# （static は root 所有のままで読めればよい）。
RUN mkdir -p /app/data /app/.next/cache && \
    chown -R node:node /app/data /app/.next/cache && \
    chown node:node /app/.next

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/insurance/api/health/ || exit 1

EXPOSE ${APP_PORT}
CMD ["node", "server.js"]
