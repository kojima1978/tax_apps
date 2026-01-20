# ビルドステージ（Node.js 24 LTS）
FROM node:24-slim AS builder

WORKDIR /app

# better-sqlite3のビルドに必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のインストール
# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# 開発用ステージ
FROM node:24-slim AS dev
WORKDIR /app
# better-sqlite3のビルドに必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# ソースコードをコピーしてビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM node:24-slim AS runner

WORKDIR /app

# better-sqlite3の実行に必要なライブラリのみインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 本番用依存関係のみインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown -R node:node /app/data

# セキュリティ: 非rootユーザーで実行
USER node

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
