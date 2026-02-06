# ============================================
# Tax Apps Portal - Dockerfile
# Next.js + Prisma + SQLite
# ============================================

# ===========================================
# Base stage - 共通設定
# ===========================================
FROM node:22-alpine AS base
WORKDIR /app

LABEL org.opencontainers.image.title="Tax Apps Portal"
LABEL org.opencontainers.image.description="税理士業務支援アプリ ポータルサイト"

# ===========================================
# Dependencies stage - 依存関係インストール
# ===========================================
FROM base AS deps

# ビルドに必要なパッケージ
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

# Docker用にlibsqlをsqliteに置き換え
RUN sed -i '/@prisma\/adapter-libsql/d' package.json && \
    sed -i '/@libsql\/client/d' package.json && \
    npm ci

# ===========================================
# Builder stage - アプリケーションビルド
# ===========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma設定をDocker用に生成
RUN printf 'import { defineConfig } from "prisma/config";\n\nexport default defineConfig({\n  schema: "prisma/schema.prisma",\n  migrations: {\n    path: "prisma/migrations",\n  },\n  datasource: {\n    url: "file:./dev.db",\n  },\n});\n' > prisma.config.ts

# better-sqlite3アダプターをインストール
RUN npm install @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3

# Prismaクライアント設定を生成
RUN printf "import { PrismaClient } from '../app/generated/prisma/client';\nimport { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';\n\nconst adapter = new PrismaBetterSqlite3({ url: './dev.db' });\n\nconst globalForPrisma = global as unknown as { prisma: PrismaClient };\n\nexport const prisma =\n  globalForPrisma.prisma ||\n  new PrismaClient({ adapter });\n\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;\n" > lib/prisma.ts

# ビルド設定
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Prismaセットアップとビルド
RUN npx prisma db push && \
    npx prisma generate && \
    npm run build

# ===========================================
# Runner stage - 本番実行環境
# ===========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ランタイム依存パッケージ
RUN apk add --no-cache curl tini tzdata openssl && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

# セキュリティ: 非rootユーザー
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ビルド成果物をコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# シグナル処理
STOPSIGNAL SIGTERM

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
