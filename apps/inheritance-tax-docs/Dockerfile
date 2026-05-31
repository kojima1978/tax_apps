# syntax=docker/dockerfile:1

# =============================================================================
# inheritance-tax-docs - Vite frontend + Express backend
# Multi-stage build for development and production
# =============================================================================

ARG NODE_VERSION=22
ARG APP_PORT=3003

# =============================================================================
# Base
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# =============================================================================
# Dependencies
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-inheritance-tax-docs,target=/root/.npm \
    npm ci

# =============================================================================
# Development - Vite dev server + ts-node for backend
# =============================================================================
FROM deps AS dev
ARG APP_PORT
ENV NODE_ENV=development TZ=Asia/Tokyo PORT=${APP_PORT}
COPY . .
EXPOSE ${APP_PORT}
CMD ["npm", "run", "dev:server"]

# =============================================================================
# Builder - Build both frontend and backend
# =============================================================================
FROM deps AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production NODE_OPTIONS=${NODE_OPTIONS}
COPY . .
RUN npm run build && npm run build:server

# =============================================================================
# Production - Node.js server serving API + static files
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner

ARG APP_PORT

RUN apk upgrade --no-cache && \
    apk add --no-cache libc6-compat python3 make g++

ENV NODE_ENV=production TZ=Asia/Tokyo PORT=${APP_PORT}

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-inheritance-tax-docs-prod,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY public/files ./public/files

RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${APP_PORT}/inheritance-tax-docs/api/health || exit 1

EXPOSE ${APP_PORT}
CMD ["node", "dist-server/index.js"]
