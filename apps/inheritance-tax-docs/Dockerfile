# ============================================
# 相続税申告 資料準備ガイド - Dockerfile
# ============================================

# ベースイメージ
FROM node:24-alpine AS base
WORKDIR /app

# 依存関係のインストール用ステージ
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 開発用ステージ
FROM base AS dev
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 3003
CMD ["npm", "run", "dev", "--", "-p", "3003"]

# ビルド用ステージ
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 本番用ステージ
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# 最小限のランタイム依存関係をインストール
RUN apk add --no-cache curl tini tzdata

# ビルド成果物をコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3003

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3003/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
