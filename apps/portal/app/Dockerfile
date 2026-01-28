# Base stage
FROM node:22-alpine AS base
WORKDIR /app


# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
COPY package*.json ./
# Remove libsql adapter to use sqlite
RUN sed -i '/@prisma\/adapter-libsql/d' package.json
RUN sed -i '/@libsql\/client/d' package.json
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client for Docker
RUN printf 'import { defineConfig } from "prisma/config";\n\nexport default defineConfig({\n  schema: "prisma/schema.prisma",\n  migrations: {\n    path: "prisma/migrations",\n  },\n  datasource: {\n    url: "file:./dev.db",\n  },\n});\n' > prisma.config.ts

# Install adapter for better-sqlite3
RUN npm install @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3
RUN printf "import { PrismaClient } from '../app/generated/prisma/client';\nimport { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';\n\nconst adapter = new PrismaBetterSqlite3({ url: './dev.db' });\n\nconst globalForPrisma = global as unknown as { prisma: PrismaClient };\n\nexport const prisma =\n  globalForPrisma.prisma ||\n  new PrismaClient({ adapter });\n\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;\n" > lib/prisma.ts

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx prisma db push
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install minimal runtime dependencies
RUN apk add --no-cache curl tini tzdata openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
