# syntax=docker/dockerfile:1

# ============================================
# Tax Apps Portal - Dockerfile
# Next.js + Prisma + SQLite
# ============================================

# ===========================================
# Base stage - 共通設定
# ===========================================
FROM node:22-alpine AS base

# セキュリティ更新 + Alpine glibc互換レイヤー（Next.js推奨）
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ===========================================
# Dependencies stage - 依存関係インストール
# ===========================================
FROM base AS deps

# ネイティブモジュールのビルドに必要なパッケージ
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

# Docker用: libsql → better-sqlite3 に置き換え
# libsql関連パッケージを除外してインストール後、better-sqlite3を追加
RUN --mount=type=cache,target=/root/.npm \
    sed -i '/@prisma\/adapter-libsql/d' package.json && \
    sed -i '/@libsql\/client/d' package.json && \
    npm ci && \
    npm install @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3

# ===========================================
# Builder stage - アプリケーションビルド
# ===========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps --link /app/node_modules ./node_modules
COPY --link . .

# Prisma設定をDocker用に上書き（libsql → better-sqlite3）
# DB パスは環境変数 DATABASE_PATH で変更可能（デフォルト: /data/portal.db）
RUN <<'SCRIPT'
cat > prisma.config.ts <<'EOF'
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./build.db",
  },
});
EOF
cat > lib/prisma.ts <<'EOF'
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbPath = process.env.DATABASE_PATH || '/data/portal.db';

export function createAdapter() {
  return new PrismaBetterSqlite3({ url: dbPath });
}

const adapter = createAdapter();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
EOF
SCRIPT

# ビルド設定（ビルド時のみ使用）
ARG NODE_OPTIONS="--max-old-space-size=2048"

# Prismaセットアップ・シード・ビルド
ENV DATABASE_PATH=./build.db
RUN ./node_modules/.bin/prisma db push && \
    ./node_modules/.bin/prisma generate && \
    ./node_modules/.bin/tsx prisma/seed.ts && \
    npm run build

# ===========================================
# Runner stage - 本番実行環境
# ===========================================
FROM base AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="Tax Apps Portal" \
      org.opencontainers.image.description="税理士業務支援アプリ ポータルサイト" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    DATABASE_PATH="/data/portal.db" \
    TZ="Asia/Tokyo"

# ランタイム依存パッケージ + 非rootユーザー + データディレクトリ
RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /data && chown nextjs:nodejs /data

# ビルド成果物をコピー
COPY --from=builder --chown=nextjs:nodejs --link /app/public ./public
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/static ./.next/static

# ビルド時に作成したDBをデフォルトデータとしてコピー
# ボリュームマウントで上書き可能
COPY --from=builder --chown=nextjs:nodejs --link /app/build.db /data/portal.db

# データ永続化用ボリューム
VOLUME ["/data"]

USER nextjs

EXPOSE 3000

# ヘルスチェック（Node 22+ native fetch使用）
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3000/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

# グレースフルシャットダウン
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
