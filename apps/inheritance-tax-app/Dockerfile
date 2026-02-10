# syntax=docker/dockerfile:1

# ============================================
# 相続税早見表アプリケーション
# Multi-stage Dockerfile
# ============================================

# Base stage - 共通設定
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./

# ============================================
# Development stage
# ============================================
FROM base AS dev

RUN --mount=type=cache,id=npm-inheritance-tax-app,target=/root/.npm \
    npm ci --no-audit --no-fund

# 設定ファイルをコピー（src/はボリュームマウント）
COPY vite.config.ts tsconfig*.json tailwind.config.cjs postcss.config.cjs eslint.config.js index.html ./

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ============================================
# Build stage
# ============================================
FROM base AS builder

ENV NODE_ENV=production

# devDependenciesもビルドに必要なため --include=dev を指定
RUN --mount=type=cache,id=npm-inheritance-tax-app,target=/root/.npm \
    npm ci --include=dev

COPY . .
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM nginx:1.27-alpine AS runner

RUN apk upgrade --no-cache

LABEL org.opencontainers.image.title="相続税早見表アプリ" \
      org.opencontainers.image.description="相続税額シミュレーションツール" \
      org.opencontainers.image.vendor="税理士法人マスエージェント"

# nginx設定をコピー（メイン設定・サーバー設定・セキュリティヘッダー）
COPY --link nginx-main.conf /etc/nginx/nginx.conf
COPY --link nginx.conf /etc/nginx/conf.d/default.conf
COPY --link nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# ビルド成果物をコピー（nginx所有権で直接配置）
COPY --link --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html/inheritance-tax-app

# non-root実行の準備: デフォルトHTMLを削除、nginx作業ディレクトリの所有権変更
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx
STOPSIGNAL SIGQUIT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3013/inheritance-tax-app/ || exit 1

EXPOSE 3013
CMD ["nginx", "-g", "daemon off;"]
