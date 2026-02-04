# ============================================
# 贈与税申告 必要書類案内 - Dockerfile
# Multi-stage build for development and production
# ============================================

# Base image with Node.js
FROM node:22-alpine AS base
WORKDIR /app

# Common dependencies for Alpine
RUN apk add --no-cache libc6-compat

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# ============================================
# Development stage
# ============================================
FROM base AS dev
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3002

CMD ["npm", "run", "dev", "--", "-p", "3002"]

# ============================================
# Builder stage (for production)
# ============================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# ============================================
# Production runner stage
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache \
    tini \
    tzdata \
    curl \
    && rm -rf /var/cache/apk/*

# Environment configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
ENV TZ=Asia/Tokyo

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Set correct permissions for .next cache
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy standalone build (requires output: 'standalone' in next.config)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/gift-tax-docs/ || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
