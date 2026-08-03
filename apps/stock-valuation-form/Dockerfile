# syntax=docker/dockerfile:1

# =============================================================================
# 取引相場のない株式の評価明細書 — Vite フロントエンド + Hono/Prisma バックエンド
#
# dev    : Vite(3014) と API サーバ(3114) を並走させる。API だけ Vite がプロキシする。
# runner : ビルド済みの dist と API を Node が 3014 でまとめて配信する。
#          （以前は nginx で静的配信していたが、API を同居させるため Node に寄せた）
# =============================================================================

ARG NODE_VERSION=22
ARG APP_PORT=3014

# =============================================================================
# 依存関係 + Prisma Client 生成
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,id=npm-stock-valuation-form,target=/root/.npm \
    npm install
COPY prisma ./prisma
RUN npx prisma generate

# =============================================================================
# 開発
# =============================================================================
FROM deps AS dev
ARG APP_PORT
ENV NODE_ENV=development TZ=Asia/Tokyo PORT=3114
COPY . .
EXPOSE ${APP_PORT}
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["npm", "run", "dev:all"]

# =============================================================================
# ビルド（フロント + サーバ）
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN --mount=type=cache,id=vite-stock-valuation-form,target=/app/node_modules/.vite \
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
RUN --mount=type=cache,id=npm-stock-valuation-form-prod,target=/root/.npm \
    npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
# 初回取込のもとになる公表データ。Phase 2 でフロントが API 駆動になっても
# seed の入力としてサーバ側が読み続ける。
COPY src/data ./src/data
COPY docker-entrypoint.sh ./

EXPOSE ${APP_PORT}
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist-server/index.js"]
