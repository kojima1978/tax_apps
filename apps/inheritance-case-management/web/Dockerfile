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
COPY packages/ui/package.json ./packages/ui/
COPY apps/inheritance-case-management/web/package.json ./apps/inheritance-case-management/web/
RUN --mount=type=cache,id=pnpm-store-icm-web,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── development ─────────────────────────────────────────
FROM deps AS dev
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter @tax-apps/shared build && \
    pnpm --filter @tax-apps/validation build && \
    pnpm --filter @tax-apps/ui build
CMD ["pnpm", "--filter", "@inheritance-case-management/web", "dev"]

# ── builder ─────────────────────────────────────────────
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3021/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1

# ソースを選択的にコピー（pnpmシンボリックリンク保持）
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/validation/src ./packages/validation/src
COPY packages/validation/tsconfig.json ./packages/validation/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/tsconfig.json ./packages/ui/
COPY apps/inheritance-case-management/web/src ./apps/inheritance-case-management/web/src
COPY apps/inheritance-case-management/web/public ./apps/inheritance-case-management/web/public
COPY apps/inheritance-case-management/web/tsconfig.json ./apps/inheritance-case-management/web/
COPY apps/inheritance-case-management/web/next.config.ts ./apps/inheritance-case-management/web/
COPY apps/inheritance-case-management/web/postcss.config.mjs ./apps/inheritance-case-management/web/

# 共有パッケージ → Next.js ビルド（1つのRUNにまとめてレイヤー削減）
RUN cd packages/shared && ../../node_modules/.bin/tsc && \
    cd ../validation && ../../node_modules/.bin/tsc && \
    cd ../ui && ../../node_modules/.bin/tsc && \
    cd ../../apps/inheritance-case-management/web && \
    ./node_modules/.bin/next build

# ── production ──────────────────────────────────────────
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="ITCM Frontend" \
      org.opencontainers.image.description="相続税案件管理システム フロントエンド" \
      org.opencontainers.image.vendor="税理士法人マスエージェント"

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3020 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# standalone ビルド成果物をコピー
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/inheritance-case-management/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/inheritance-case-management/web/.next/static ./apps/inheritance-case-management/web/.next/static
COPY --from=builder --chown=nextjs:nodejs --link /app/apps/inheritance-case-management/web/public ./apps/inheritance-case-management/web/public

USER nextjs
EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3020/itcm/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/inheritance-case-management/web/server.js"]
