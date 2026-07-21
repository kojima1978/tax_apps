# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,id=npm-store-private-banking,target=/root/.npm npm ci

FROM deps AS dev
ENV NODE_ENV=development WATCHPACK_POLLING=true HOSTNAME=0.0.0.0 TZ=Asia/Tokyo
COPY . .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
EXPOSE 3025
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# 本番イメージに同梱する Prisma CLI 専用の依存ツリー。
# アプリ本体の node_modules とは分離し、CLI の推移的依存(effect 等)も揃える。
FROM base AS prisma-cli
COPY package.json ./
RUN --mount=type=cache,id=npm-store-private-banking,target=/root/.npm \
    npm install --no-save --no-package-lock \
      prisma@$(node -p "require('./package.json').devDependencies.prisma")

FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3025 HOSTNAME=0.0.0.0 TZ=Asia/Tokyo \
    HOME=/tmp NPM_CONFIG_CACHE=/tmp/.npm
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat tini tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/public ./public
COPY --from=builder --chown=1001:1001 /app/prisma ./prisma
# Prisma CLI をイメージに同梱（standalone 出力には含まれないため）。
# 隔離ディレクトリに置き、standalone 側の @prisma/client を上書きしない。
# これにより起動時の npx によるネットワーク取得・キャッシュ書き込みが不要になり、
# read_only ルートFSでも migrate deploy が実行できる。
COPY --from=prisma-cli --chown=1001:1001 /app/node_modules /app/prisma-cli/node_modules
COPY --from=builder --chown=1001:1001 /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
USER nextjs
EXPOSE 3025
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3025/private-banking/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
CMD ["node", "server.js"]
