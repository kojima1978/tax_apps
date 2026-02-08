# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk upgrade --no-cache && \
    corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── deps ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/inheritance-case-management/api/package.json ./apps/inheritance-case-management/api/
RUN --mount=type=cache,id=pnpm-store-icm-api,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── development ─────────────────────────────────────────
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
RUN pnpm --filter @tax-apps/shared build && \
    pnpm --filter @tax-apps/validation build && \
    pnpm --filter @inheritance-case-management/api exec prisma generate
COPY apps/inheritance-case-management/api/docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh
WORKDIR /app/apps/inheritance-case-management/api
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "dev"]

# ── builder ─────────────────────────────────────────────
FROM deps AS builder

# ソースを選択的にコピー（pnpmシンボリックリンク保持）
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/validation/src ./packages/validation/src
COPY packages/validation/tsconfig.json ./packages/validation/
COPY apps/inheritance-case-management/api/src ./apps/inheritance-case-management/api/src
COPY apps/inheritance-case-management/api/tsconfig.json ./apps/inheritance-case-management/api/
COPY apps/inheritance-case-management/api/prisma ./apps/inheritance-case-management/api/prisma

# Prisma generate → 共有パッケージ → API ビルド（1つのRUNにまとめてレイヤー削減）
RUN pnpm --filter @inheritance-case-management/api exec prisma generate && \
    cd packages/shared && ../../node_modules/.bin/tsc && \
    cd ../validation && ../../node_modules/.bin/tsc && \
    cd ../../apps/inheritance-case-management/api && \
    ../../../node_modules/.bin/tsc -p tsconfig.json

# ── production deps ─────────────────────────────────────
FROM base AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/inheritance-case-management/api/package.json ./apps/inheritance-case-management/api/
COPY apps/inheritance-case-management/api/prisma ./apps/inheritance-case-management/api/prisma
RUN --mount=type=cache,id=pnpm-store-icm-api,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod && \
    npx -y prisma@6 generate --schema=apps/inheritance-case-management/api/prisma/schema.prisma

# ── production ──────────────────────────────────────────
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="ITCM Backend" \
      org.opencontainers.image.description="相続税案件管理システム API" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# セキュリティ更新 + ランタイム依存 + タイムゾーン設定 + 非rootユーザー
RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs hono

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3021 \
    TZ=Asia/Tokyo

# 本番依存のみコピー（prod-depsから）
COPY --from=prod-deps --link /app/node_modules ./node_modules
COPY --from=prod-deps --link /app/packages/validation/node_modules ./packages/validation/node_modules
COPY --from=prod-deps --link /app/apps/inheritance-case-management/api/node_modules ./apps/inheritance-case-management/api/node_modules

# ビルド成果物コピー
COPY --from=builder --link /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --link /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --link /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder --link /app/packages/validation/package.json ./packages/validation/

COPY --from=builder --link /app/apps/inheritance-case-management/api/dist ./apps/inheritance-case-management/api/dist
COPY --from=builder --link /app/apps/inheritance-case-management/api/package.json ./apps/inheritance-case-management/api/

# Prisma マイグレーション用ファイル
COPY --from=builder --link /app/apps/inheritance-case-management/api/prisma ./apps/inheritance-case-management/api/prisma

# ワークスペース設定
COPY pnpm-workspace.yaml package.json ./

# エントリーポイント
COPY apps/inheritance-case-management/api/docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/apps/inheritance-case-management/api

USER hono
EXPOSE 3021

# ヘルスチェック（Node 22+ native fetch使用）
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3021/health');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

# グレースフルシャットダウン
STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
