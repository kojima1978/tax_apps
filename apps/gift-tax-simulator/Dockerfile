# syntax=docker/dockerfile:1

# =============================================================================
# 贈与税計算シミュレーター - Dockerfile
# Multi-stage build for development and production
# =============================================================================

# =============================================================================
# Build Arguments
# =============================================================================
ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates + Alpine glibc compatibility layer (Next.js recommended)
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat

WORKDIR /app

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps

# Copy only package files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# =============================================================================
# Development stage - For local development with hot reload
# =============================================================================
FROM base AS dev

ENV NODE_ENV=development

# Copy dependencies from deps stage
COPY --from=deps --link /app/node_modules ./node_modules

# Copy source code
COPY --link . .

EXPOSE 3000

# Use exec form for proper signal handling
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM base AS builder

# Build configuration
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production \
    NODE_OPTIONS=${NODE_OPTIONS}

# Copy dependencies
COPY --from=deps --link /app/node_modules ./node_modules

# Copy source files
COPY --link . .

# Build with persistent cache for faster rebuilds
RUN --mount=type=cache,target=/app/.next/cache \
    mkdir -p public && \
    npm run build && \
    rm -rf node_modules/.cache

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM base AS runner

# OCI Image Labels
LABEL org.opencontainers.image.title="Gift Tax Simulator" \
      org.opencontainers.image.description="贈与税計算シミュレーター" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

# Environment configuration (WORKDIR, NEXT_TELEMETRY_DISABLED inherited from base)
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

# Install runtime dependencies, configure timezone, create non-root user
RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy built assets with correct ownership (--link enables independent layer caching)
COPY --from=builder --chown=nextjs:nodejs --link /app/public ./public
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3001

# Health check for container orchestration (uses Node 22+ native fetch)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "(async()=>{try{const r=await fetch('http://127.0.0.1:3001/gift-tax-simulator/');process.exit(r.ok?0:1)}catch{process.exit(1)}})()"

# Graceful shutdown signal
STOPSIGNAL SIGTERM

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
