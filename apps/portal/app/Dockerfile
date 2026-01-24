# ビルドステージ
FROM node:22 AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール（libsqlを除外してsqliteを使用）
RUN sed -i '/@prisma\/adapter-libsql/d' package.json
RUN sed -i '/@libsql\/client/d' package.json
RUN npm install

# アプリファイルをコピー
COPY . .

# Docker用のPrisma設定を作成
RUN printf 'import { defineConfig } from "prisma/config";\n\nexport default defineConfig({\n  schema: "prisma/schema.prisma",\n  migrations: {\n    path: "prisma/migrations",\n  },\n  datasource: {\n    url: "file:./dev.db",\n  },\n});\n' > prisma.config.ts

# Docker用のprisma.tsを作成（better-sqlite3ドライバを使用）
RUN npm install @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3
RUN printf "import { PrismaClient } from '../app/generated/prisma/client';\nimport { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';\n\nconst adapter = new PrismaBetterSqlite3({ url: './dev.db' });\n\nconst globalForPrisma = global as unknown as { prisma: PrismaClient };\n\nexport const prisma =\n  globalForPrisma.prisma ||\n  new PrismaClient({ adapter });\n\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;\n" > lib/prisma.ts

# 本番用にビルド
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma db push
RUN npx prisma generate
RUN npm run build

# 本番ステージ
FROM node:22 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
