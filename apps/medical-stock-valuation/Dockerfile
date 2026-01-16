# ベースイメージとしてNode.js 20を使用
FROM node:20-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS deps
# python3とmake、g++をインストール（better-sqlite3のビルドに必要）
RUN apk add --no-cache libc6-compat python3 make g++ pkgconfig

WORKDIR /app

# package.jsonとpackage-lock.json（またはyarn.lock、pnpm-lock.yaml）をコピー
COPY package.json package-lock.json* ./

# 依存関係をインストール
RUN npm ci --omit=dev || npm ci

# ビルド用ステージ
FROM base AS builder
# python3とmake、g++をインストール（better-sqlite3のビルドに必要）
RUN apk add --no-cache libc6-compat python3 make g++ pkgconfig

WORKDIR /app

# package.jsonをコピーして全依存関係をインストール（devDependenciesを含む）
COPY package.json package-lock.json* ./
RUN npm ci

# ソースコードをコピー
COPY . .

# Next.jsのテレメトリーを無効化
ENV NEXT_TELEMETRY_DISABLED=1

# Next.jsアプリケーションをビルド
RUN npm run build

# 本番環境用ステージ
FROM base AS runner
# better-sqlite3の実行に必要なライブラリをインストール
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティのため非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルのみをコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3010

ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

# サーバーを起動
CMD ["node", "server.js"]
