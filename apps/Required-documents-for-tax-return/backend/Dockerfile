# syntax=docker/dockerfile:1
# ============================================
# Backend Dockerfile - Express + SQLite API
# ============================================

# ベースイメージ（Node.js 22 LTS - Alpine for smaller size）
FROM node:22-alpine AS base

RUN apk upgrade --no-cache

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
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ============================================
# 開発用ステージ
# ============================================
FROM native-build AS dev

RUN apk add --no-cache tzdata

COPY --from=deps --link /app/node_modules ./node_modules
COPY --link . .

ENV NODE_ENV=development \
    PORT=3001 \
    TZ=Asia/Tokyo

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ============================================
# ビルドステージ
# ============================================
FROM native-build AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ビルド後、本番に不要な型定義・ソースマップを除去
RUN npm run build && \
    find dist \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js.map' \) -delete

# ============================================
# 本番用依存関係ステージ（devDependencies除外）
# ============================================
FROM native-build AS prod-deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# ============================================
# 本番ステージ（ビルドツール不要 → クリーンなalpineイメージ）
# ============================================
FROM base AS runner

LABEL org.opencontainers.image.title="Tax Documents Backend" \
      org.opencontainers.image.description="Express + SQLite API for tax document management"

# ランタイム依存パッケージ + タイムゾーン設定
RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del --no-cache tzdata

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=Asia/Tokyo

# 本番用依存関係をコピー（ビルド済みネイティブモジュール含む）
COPY --from=prod-deps --link /app/node_modules ./node_modules
COPY --link package*.json ./

# ビルド成果物をコピー
COPY --from=builder --link /app/dist ./dist

# データベースディレクトリを作成（データ領域のみ書き込み権限付与）
RUN mkdir -p /app/data && chown node:node /app/data

# データ永続化用ボリューム
VOLUME ["/app/data"]

# セキュリティ: 非rootユーザーで実行
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3001/api/health');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

# シグナル処理
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
