# syntax=docker/dockerfile:1

# =============================================================================
# tax-apps MCP サーバー（stdio）
#
# 常駐しない。Claude Desktop などの MCP クライアントが必要なときだけ
# `docker run -i --rm --network tax-apps-network` で起動し、終われば消える。
# 通信は stdin/stdout なので EXPOSE も healthcheck も無い。
#
# dev    : tsx でそのまま走らせる（型チェックもテストもこのステージで行う）
# runner : tsc でビルドした dist を node が走らせる
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# 依存関係
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json ./
RUN --mount=type=cache,id=npm-mcp-server,target=/root/.npm \
    npm install

# =============================================================================
# 開発（manage.sh test / 手元での動作確認）
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development TZ=Asia/Tokyo
# COPY の --chown は層を増やさない。node_modules を chown -R しないのは
# ツリーがもう1層まるごとコピーされてイメージが膨らむため。
COPY --chown=node:node . .
RUN chown node:node /app /app/node_modules
USER node
CMD ["npm", "run", "dev"]

# =============================================================================
# ビルド
# =============================================================================
FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

# =============================================================================
# 本番（MCP クライアントから起動されるのはこちら）
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

ENV NODE_ENV=production TZ=Asia/Tokyo
WORKDIR /app

COPY package.json ./
RUN --mount=type=cache,id=npm-mcp-server-prod,target=/root/.npm \
    npm install --omit=dev
COPY --from=builder /app/dist ./dist

# /app 配下へは実行中に何も書かないので chown は要らない。
USER node

CMD ["node", "dist/index.js"]
