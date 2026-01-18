FROM node:20-slim AS base

# 依存関係インストール用ステージ
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ビルドステージ
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 環境変数を設定（ビルド時に必要）
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

RUN npm run build

# 本番ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ビルド成果物をコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
