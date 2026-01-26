# ============================================
# Backend Dockerfile - Express + SQLite API
# ============================================

# ベースイメージ（Node.js 22 LTS - Alpine for smaller size）
FROM node:22-alpine AS base
WORKDIR /app

# better-sqlite3のビルドに必要なパッケージ
RUN apk add --no-cache python3 make g++

# ============================================
# 依存関係インストール用ステージ
# ============================================
FROM base AS deps
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ============================================
# 開発用ステージ
# ============================================
FROM base AS dev

# 開発用ツール
RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV PORT=3001

# データディレクトリ作成
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ============================================
# ビルドステージ
# ============================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============================================
# 本番用依存関係ステージ（ビルドツール付き）
# ============================================
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============================================
# 本番ステージ
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

# ラベル（メタデータ）
LABEL org.opencontainers.image.title="Tax Documents Backend"
LABEL org.opencontainers.image.description="Express + SQLite API for tax document management"

# 実行時に必要な最小限のパッケージ
RUN apk add --no-cache curl tini

ENV NODE_ENV=production
ENV PORT=3001

# 本番用依存関係をコピー（ネイティブモジュール含む）
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown -R node:node /app /app/data

# セキュリティ: 非rootユーザーで実行
USER node

EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# tiniをエントリーポイントに使用（ゾンビプロセス防止）
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
