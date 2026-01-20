# ベースイメージ（Node.js 24 LTS）
FROM node:24-slim AS base
WORKDIR /app

# 依存関係インストール用ステージ
FROM base AS deps

COPY package*.json ./
RUN npm ci

# 開発用ステージ
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
CMD ["npm", "run", "dev"]

# ビルドステージ
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ビルド時の環境変数（ビルド時にARGで上書き可能）
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# 本番ステージ
FROM base AS runner

ENV NODE_ENV=production

# セキュリティ: 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ビルド成果物をコピー（standalone出力）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
