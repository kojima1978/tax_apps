# syntax=docker/dockerfile:1

# =============================================================================
# 銀行取引分析 — Vite フロントエンド + Hono/Prisma バックエンド
# （構成は stock-valuation-form と同じ）
#
# dev    : Vite(3007) と API サーバ(3107) を並走させる。API だけ Vite がプロキシする。
# runner : ビルド済みの dist と API を Node が 3007 でまとめて配信する。
# =============================================================================

ARG NODE_VERSION=22
ARG APP_PORT=3007

# =============================================================================
# 依存関係 + Prisma Client 生成
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,id=npm-bank-analyzer,target=/root/.npm \
    npm install
COPY prisma ./prisma
RUN npx prisma generate

# =============================================================================
# 開発（テスト用サービス bank-analyzer-test はこの上の test ステージ）
# =============================================================================
FROM deps AS dev
ARG APP_PORT
ENV NODE_ENV=development TZ=Asia/Tokyo PORT=3107
# COPY の --chown は層を増やさないので、丸ごと node 所有で持ち込む。
# test-data/golden（Django 版の正解の記録）もここで入る。テストが毎回読むため
# .dockerignore では落とさない。
COPY --chown=node:node . .
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# dev サーバも非 root で動かす。node_modules を `chown -R` しないのは
# ツリーがもう1層まるごとコピーされるため。Vite が .vite を作れるように、
# `tsc -b` が .tsbuildinfo を書けるように、ディレクトリの所有者だけ渡す。
RUN chown node:node /app /app/node_modules
USER node

EXPOSE ${APP_PORT}
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "dev:all"]

# =============================================================================
# テスト（bank-analyzer-test）: dev に PostgreSQL を足したもの
#
# DB を伴うテストは本物の PostgreSQL で回す（server/__tests__/setup/postgres.ts が
# 走るたびに initdb して終わったら消す）。dev の本体や本番には入れない。
# contrib は pg_trgm（摘要の部分一致検索のインデックス）がマイグレーションに要るため。
# =============================================================================
FROM dev AS test
USER root
RUN apk add --no-cache postgresql16 postgresql16-contrib
USER node

# =============================================================================
# ビルド（フロント + サーバ）
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN --mount=type=cache,id=vite-bank-analyzer,target=/app/node_modules/.vite \
    npm run build && npm run build:server

# =============================================================================
# 本番（Node が API と静的ファイルの両方を配信）
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner
ARG APP_PORT

RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

ENV NODE_ENV=production TZ=Asia/Tokyo PORT=${APP_PORT}
WORKDIR /app

COPY package.json ./
RUN --mount=type=cache,id=npm-bank-analyzer-prod,target=/root/.npm \
    npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY docker-entrypoint.sh ./
# Windows のチェックアウトで CRLF になっていても Linux の entrypoint として動くように。
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# 本番も非 root。/app 配下へは実行中に何も書かないので chown は要らない。
# entrypoint の prisma は npx ではなく node_modules を直接叩くため、
# $HOME/.npm を用意する必要もない。
USER node

EXPOSE ${APP_PORT}
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist-server/index.js"]
