# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-inheritance-tax-app,target=/root/.npm npm ci

FROM deps AS dev
ENV NODE_ENV=development TZ=Asia/Tokyo APP_PORT=3004
COPY . .
EXPOSE 3004
CMD ["npm", "run", "dev"]

FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM base AS runner-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-store-inheritance-tax-app-prod,target=/root/.npm npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production TZ=Asia/Tokyo APP_PORT=3004
COPY --from=runner-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY package.json ./
USER node
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3004/inheritance-tax-app/api/health || exit 1
CMD ["node", "dist-server/index.js"]
