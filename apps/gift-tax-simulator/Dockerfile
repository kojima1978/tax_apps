# syntax=docker/dockerfile:1

# =============================================================================
# Build Arguments
# =============================================================================
ARG NODE_VERSION=22

# =============================================================================
# Base stage - Common configuration
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates
RUN apk upgrade --no-cache

WORKDIR /app

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Dependencies stage - Install npm packages
# =============================================================================
FROM base AS deps

# Configure npm cache for BuildKit
RUN --mount=type=cache,target=/root/.npm \
    npm config set cache /root/.npm

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
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Clear any cached build files
RUN rm -rf .next

EXPOSE 3000

# Use exec form for proper signal handling
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - Build the production application
# =============================================================================
FROM base AS builder

# Build configuration
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production
ENV NODE_OPTIONS=${NODE_OPTIONS}

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Clear cache and build
RUN rm -rf .next node_modules/.cache && \
    npm run build && \
    rm -rf node_modules/.cache .next/cache

# =============================================================================
# Production runner stage - Minimal, secure production image
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

# OCI Image Labels
LABEL org.opencontainers.image.title="Gift Tax Simulator" \
      org.opencontainers.image.description="贈与税比較Webアプリケーション" \
      org.opencontainers.image.vendor="税理士法人マスエージェント" \
      org.opencontainers.image.licenses="Private" \
      org.opencontainers.image.source="https://github.com/kojima1978/tax_apps"

WORKDIR /app

# Environment configuration
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tokyo

# Install runtime dependencies and configure timezone
RUN apk upgrade --no-cache && \
    apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone && \
    apk del tzdata && \
    rm -rf /var/cache/apk/* /tmp/* /root/.npm

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy built assets with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3001

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3001/gift-tax-simulator/',r=>{process.exit(r.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1)})"

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
