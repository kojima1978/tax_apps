# ============================================
# Backend Dockerfile - Express + SQLite API
# ============================================

# ベースイメージ（Node.js 22 LTS - Alpine for smaller size）
FROM node:22-alpine AS base
WORKDIR /app

# ============================================
# ネイティブモジュールビルド用ステージ
# better-sqlite3のビルドに python3/make/g++ が必要
# ============================================
FROM base AS native-build
RUN apk add --no-cache python3 make g++

# ============================================
# 依存関係インストール用ステージ（全依存）
# ============================================
FROM native-build AS deps
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ============================================
# 開発用ステージ
# ============================================
FROM native-build AS dev

RUN apk add --no-cache tzdata

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV PORT=3001

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ============================================
# ビルドステージ
# ============================================
FROM native-build AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============================================
# 本番用依存関係ステージ（devDependencies除外）
# ============================================
FROM native-build AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============================================
# 本番ステージ（ビルドツール不要 → クリーンなalpineイメージ）
# ============================================
FROM base AS runner

LABEL org.opencontainers.image.title="Tax Documents Backend"
LABEL org.opencontainers.image.description="Express + SQLite API for tax document management"

RUN apk add --no-cache tini tzdata

ENV NODE_ENV=production
ENV PORT=3001

# 本番用依存関係をコピー（ビルド済みネイティブモジュール含む）
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown -R node:node /app /app/data

# セキュリティ: 非rootユーザーで実行
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
