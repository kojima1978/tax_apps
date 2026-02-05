# ============================================
# Frontend Dockerfile - Next.js Application
# ============================================

# ベースイメージ（Node.js 22 LTS - Alpine for smaller size）
FROM node:22-alpine AS base
WORKDIR /app

# ============================================
# 依存関係インストール用ステージ
# ============================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ============================================
# 開発用ステージ
# ============================================
FROM base AS dev

RUN apk add --no-cache libc6-compat tzdata

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================
# ビルドステージ
# ============================================
FROM base AS builder

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ============================================
# 本番ステージ
# ============================================
FROM base AS runner

LABEL org.opencontainers.image.title="Tax Documents Frontend"
LABEL org.opencontainers.image.description="Next.js frontend for tax document management"

RUN apk add --no-cache libc6-compat tini tzdata

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/tax-docs/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
