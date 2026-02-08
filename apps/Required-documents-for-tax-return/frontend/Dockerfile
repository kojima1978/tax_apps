# syntax=docker/dockerfile:1
# ============================================
# Frontend Dockerfile - Next.js Application
# ============================================

# ベースイメージ（Node.js 22 LTS - Alpine for smaller size）
FROM node:22-alpine AS base

RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# 依存関係インストール用ステージ
# ============================================
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ============================================
# 開発用ステージ
# ============================================
FROM base AS dev

RUN apk add --no-cache tzdata

COPY --from=deps --link /app/node_modules ./node_modules
COPY --link . .

ENV NODE_ENV=development \
    NEXT_PUBLIC_API_URL=http://localhost:3001 \
    NEXT_TELEMETRY_DISABLED=1 \
    WATCHPACK_POLLING=true \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================
# ビルドステージ
# ============================================
FROM base AS builder

COPY --from=deps --link /app/node_modules ./node_modules
COPY --link . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1

# ビルド時のみ使用（イメージに残さない）
ARG NODE_OPTIONS="--max-old-space-size=4096"

# .next/cache をキャッシュマウントし、増分ビルドを高速化
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ============================================
# 本番ステージ
# ============================================
FROM base AS runner

LABEL org.opencontainers.image.title="Tax Documents Frontend" \
      org.opencontainers.image.description="Next.js frontend for tax document management"

# ランタイム依存パッケージ + タイムゾーン設定 + 非rootユーザー
RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del --no-cache tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    TZ=Asia/Tokyo

COPY --from=builder --chown=nextjs:nodejs --link /app/public ./public
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3000/tax-docs/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

# シグナル処理
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
