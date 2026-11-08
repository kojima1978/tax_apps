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
#
# 減価償却資産評価の案件JSONの正規化（normalize_asset_case）は asset-valuation の
# src/domain をそのまま使う（写しを持たない）。compose の additional_contexts で
# 渡し、リポジトリと同じ相対位置（/apps/asset-valuation/src/domain）へ置く ──
# src の相対 import（../../asset-valuation/...）がホストでも CI でもここでも同じ形で通る。
# =============================================================================

ARG NODE_VERSION=22

# =============================================================================
# 依存関係
# =============================================================================
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /apps/mcp-server
COPY package.json ./
RUN --mount=type=cache,id=npm-mcp-server,target=/root/.npm \
    npm install
COPY --from=asset-valuation-domain . /apps/asset-valuation/src/domain/
# ESM かどうかは一番近い package.json の "type" で決まる（tsc の NodeNext も node も同じ）。
# asset-valuation の package.json はここに無いので、置かないと domain だけ CommonJS で
# 出力され、node が「export が無い」で起動できない（実際に落ちた）。
RUN echo '{"type":"module"}' > /apps/asset-valuation/package.json

# =============================================================================
# 開発（manage.sh test / 手元での動作確認）
# =============================================================================
FROM deps AS dev
ENV NODE_ENV=development TZ=Asia/Tokyo
# COPY の --chown は層を増やさない。node_modules を chown -R しないのは
# ツリーがもう1層まるごとコピーされてイメージが膨らむため。
COPY --chown=node:node . .
# テストが取込サンプル（ダミー台帳を読んだ結果）を読む。本番には入れない。
COPY --from=asset-valuation-test-data . /apps/asset-valuation/test-data/
RUN chown node:node /apps/mcp-server /apps/mcp-server/node_modules
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
WORKDIR /apps/mcp-server

COPY package.json ./
RUN --mount=type=cache,id=npm-mcp-server-prod,target=/root/.npm \
    npm install --omit=dev
COPY --from=builder /apps/mcp-server/dist ./dist

# /apps 配下へは実行中に何も書かないので chown は要らない。
USER node

CMD ["node", "dist/mcp-server/src/index.js"]
