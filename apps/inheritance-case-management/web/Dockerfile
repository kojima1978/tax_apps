# syntax=docker/dockerfile:1

# =============================================================================
# 相続税案件管理システム - Dockerfile
# Multi-stage build for development and production (standalone)
# Next.js + Prisma (API Routes内蔵)
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,id=npm-store-itcm-web,target=/root/.npm \
    npm ci && \
    # npm ci はロックファイルの os/cpu だけで絞り込む。lockfileVersion 3 には
    # libc フィールドが無く（npm 10.9 でも書き出さない）、musl 用と glibc 用の
    # ネイティブバイナリが両方入る。Alpine(musl) では glibc 用は使われないので消す。
    # 同じ RUN 層で消さないとイメージは縮まない。
    rm -rf node_modules/@next/swc-linux-x64-gnu \
           node_modules/@img/sharp-libvips-linux-x64 \
           node_modules/@img/sharp-linux-x64 && \
    # lucide-react の UMD は CDN 配信用（package.json の unpkg だけが指す）。
    # dist/cjs は main が指しており、vitest(vite) のパッケージ解決に必要なので残す。
    rm -rf node_modules/lucide-react/dist/umd

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM deps AS dev
# ポーリング設定は docker-compose.yml 側に集約する（理由はそちらのコメント参照）。
ENV NODE_ENV=development HOSTNAME=0.0.0.0 TZ=Asia/Tokyo
RUN npx prisma generate
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
# COPY の --chown は層を増やさない。next dev は起動時に tsconfig.json と
# next-env.d.ts を書き換えるので、root 所有のままだと EACCES で落ちる。
COPY --chown=node:node . .

# dev サーバも非 root で動かす（runner は元から USER nextjs）。
# /app に .next を作り、entrypoint の npx が $HOME/.npm を使う。
# node_modules を `chown -R` しないのはツリーがもう1層コピーされるため。
RUN chown node:node /app /app/node_modules
USER node

EXPOSE 3020
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# =============================================================================
# Prisma CLI stage - 本番イメージに同梱する CLI 専用の依存ツリー
# =============================================================================
# **バージョンを読む package.json を WORKDIR へ置かないこと**。その場所で
# `npm install <pkg>` を叩くと package.json の dependencies / devDependencies まで
# 一緒に入り、CLI 専用のはずのツリーがアプリ全部に膨らむ。
FROM base AS prisma-cli
COPY package.json /tmp/app-package.json
RUN --mount=type=cache,id=npm-store-itcm-web,target=/root/.npm \
    npm install --no-save --no-package-lock \
      prisma@$(node -p "require('/tmp/app-package.json').devDependencies.prisma")

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ARG NEXT_PUBLIC_API_URL=/itcm/api
ENV NODE_ENV=production \
    NODE_OPTIONS=${NODE_OPTIONS} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN --mount=type=cache,id=nextjs-itcm-web,target=/app/.next/cache \
    mkdir -p public && \
    npm run build

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="ITCM" \
      org.opencontainers.image.description="相続税案件管理システム" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3020 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo \
    HOME=/tmp \
    NPM_CONFIG_CACHE=/tmp/.npm

RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=1001:1001 --link /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 --link /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 --link /app/public ./public
COPY --from=builder --chown=1001:1001 --link /app/prisma ./prisma
# Prisma CLI をイメージに同梱（standalone 出力には含まれないため）。
# 隔離ディレクトリに置き、standalone 側の @prisma/client を上書きしない。
# これで起動時の `npx -y prisma@6` が不要になる ── あれは毎回レジストリから
# 372MB を書き込み層へ取り（実測10秒）、ネットが無い間は本番が起動できなかった。
COPY --from=prisma-cli --chown=1001:1001 --link /app/node_modules /app/prisma-cli/node_modules
COPY --from=builder --chown=1001:1001 --link /app/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

USER nextjs
EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3020/itcm/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
CMD ["node", "server.js"]
