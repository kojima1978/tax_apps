# ベースイメージとしてNode.js 24を使用
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

# 依存関係のインストール用ステージ
FROM base AS deps
# python3とmake、g++をインストール（better-sqlite3のビルドに必要）
RUN apk add --no-cache libc6-compat python3 make g++ pkgconfig
RUN npm ci

# 開発用ステージ
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

# ビルド用ステージ
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# 本番環境用ステージ
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

# 最小限のランタイム依存のみインストール
RUN apk add --no-cache libc6-compat tini tzdata

# 必要なファイルのみをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# セキュリティのため非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3010/medical/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
