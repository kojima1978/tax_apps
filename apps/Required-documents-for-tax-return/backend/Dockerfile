FROM node:20-slim

WORKDIR /app

# better-sqlite3のビルドに必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のインストール
COPY package*.json ./
RUN npm install

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# データベースディレクトリを作成
RUN mkdir -p /app/data

# ポートを公開
EXPOSE 3001

# 環境変数
ENV NODE_ENV=production
ENV PORT=3001

# アプリケーションを起動
CMD ["npm", "start"]
