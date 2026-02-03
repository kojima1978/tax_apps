# ============================================
# 相続税早見表アプリケーション
# Multi-stage Dockerfile
# ============================================

# Base stage - 共通設定
FROM node:24-slim AS base
WORKDIR /app

# package.jsonのみコピー（キャッシュ効率化）
COPY package*.json ./

# ============================================
# Development stage
# ============================================
FROM base AS dev

# 開発用依存関係をインストール
RUN --mount=type=cache,target=/root/.npm \
    npm install

# 設定ファイルをコピー（src/はボリュームマウント）
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.cjs ./
COPY postcss.config.cjs ./
COPY index.html ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]

# ============================================
# Build stage
# ============================================
FROM base AS builder

# 本番用依存関係をインストール（キャッシュ活用）
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ソースコードをコピー
COPY . .

# TypeScriptビルド
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM nginx:alpine AS runner

# セキュリティ: 不要なファイルを削除
RUN rm -rf /usr/share/nginx/html/*

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# セキュリティ: non-rootユーザーで実行
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3013/ || exit 1

# メタデータ
LABEL org.opencontainers.image.title="相続税早見表アプリ" \
      org.opencontainers.image.description="相続税額シミュレーションツール" \
      org.opencontainers.image.vendor="税理士法人マスエージェント"

EXPOSE 3013

CMD ["nginx", "-g", "daemon off;"]
