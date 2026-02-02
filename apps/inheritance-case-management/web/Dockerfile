# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/ui/package.json ./packages/ui/
COPY apps/inheritance-case-management/web/package.json ./apps/inheritance-case-management/web/
RUN pnpm install --frozen-lockfile

# Development image
FROM deps AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# Build shared packages for dev
RUN pnpm --filter @tax-apps/shared build
RUN pnpm --filter @tax-apps/validation build
RUN pnpm --filter @tax-apps/ui build

CMD ["pnpm", "--filter", "@inheritance-case-management/web", "dev"]

# Build
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3021/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Copy source files selectively to preserve pnpm symlinks
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/validation/src ./packages/validation/src
COPY packages/validation/tsconfig.json ./packages/validation/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/tsconfig.json ./packages/ui/
COPY apps/inheritance-case-management/web/src ./apps/inheritance-case-management/web/src
COPY apps/inheritance-case-management/web/public ./apps/inheritance-case-management/web/public
COPY apps/inheritance-case-management/web/tsconfig.json ./apps/inheritance-case-management/web/
COPY apps/inheritance-case-management/web/next.config.ts ./apps/inheritance-case-management/web/
COPY apps/inheritance-case-management/web/postcss.config.mjs ./apps/inheritance-case-management/web/
COPY apps/inheritance-case-management/web/eslint.config.mjs ./apps/inheritance-case-management/web/

# Build shared packages first
RUN cd packages/shared && ../../node_modules/.bin/tsc
RUN cd packages/validation && ../../node_modules/.bin/tsc
RUN cd packages/ui && ../../node_modules/.bin/tsc

# Build Next.js app
RUN pnpm --filter @inheritance-case-management/web build

# Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3020

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the build output
COPY --from=builder /app/apps/inheritance-case-management/web/.next ./.next
COPY --from=builder /app/apps/inheritance-case-management/web/public ./public
COPY --from=builder /app/apps/inheritance-case-management/web/package.json ./
COPY --from=builder /app/apps/inheritance-case-management/web/next.config.ts ./

# Copy node_modules for runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/inheritance-case-management/web/node_modules ./apps_node_modules

USER nextjs

EXPOSE 3020

CMD ["npx", "next", "start", "-p", "3020"]
