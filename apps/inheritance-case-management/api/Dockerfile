# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/inheritance-case-management/api/package.json ./apps/inheritance-case-management/api/
RUN pnpm install --frozen-lockfile

# Development image
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
# Build shared packages for dev
RUN pnpm --filter @tax-apps/shared build
RUN pnpm --filter @tax-apps/validation build
# Generate Prisma client for dev
RUN pnpm --filter @inheritance-case-management/api exec prisma generate
# Copy and setup entrypoint script (convert CRLF to LF for Windows compatibility)
COPY apps/inheritance-case-management/api/docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh
WORKDIR /app/apps/inheritance-case-management/api
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "dev"]

# Build shared packages
FROM deps AS builder

# Copy source files selectively to preserve pnpm symlinks
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/validation/src ./packages/validation/src
COPY packages/validation/tsconfig.json ./packages/validation/
COPY apps/inheritance-case-management/api/src ./apps/inheritance-case-management/api/src
COPY apps/inheritance-case-management/api/tsconfig.json ./apps/inheritance-case-management/api/
COPY apps/inheritance-case-management/api/prisma ./apps/inheritance-case-management/api/prisma

# Generate Prisma client first (needed for TypeScript types)
RUN pnpm --filter @inheritance-case-management/api exec prisma generate

# Build packages
RUN cd packages/shared && ../../node_modules/.bin/tsc
RUN cd packages/validation && ../../node_modules/.bin/tsc
RUN pnpm --filter @inheritance-case-management/api build

# Production image
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/validation/package.json ./packages/validation/
COPY --from=builder /app/apps/inheritance-case-management/api/dist ./apps/inheritance-case-management/api/dist
COPY --from=builder /app/apps/inheritance-case-management/api/package.json ./apps/inheritance-case-management/api/
COPY --from=builder /app/apps/inheritance-case-management/api/prisma ./apps/inheritance-case-management/api/prisma

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Install all dependencies first (devDeps needed for prisma generate)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/inheritance-case-management/api
RUN pnpm exec prisma generate

# Now set production mode and prune devDependencies
WORKDIR /app
ENV NODE_ENV=production
RUN pnpm prune --prod

WORKDIR /app/apps/inheritance-case-management/api
ENV PORT=3021

# Copy entrypoint script (convert CRLF to LF for Windows compatibility)
COPY apps/inheritance-case-management/api/docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3021

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
