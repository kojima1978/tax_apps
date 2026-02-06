# Nginx Gateway Configuration

Tax Apps プロジェクトのゲートウェイ（リバースプロキシ）として機能する Nginx の設定ファイルです。

## 概要

この Nginx サービスは、外部からの HTTP リクエスト (`port 80`) を受け取り、URL パスに基づいて適切なバックエンドサービス（コンテナ）にリクエストを振り分けます。

## ファイル構成

```
nginx/
├── Dockerfile      # カスタムNginxイメージ
├── nginx.conf      # グローバル設定（ワーカー、Gzip、セキュリティ等）
├── default.conf    # サーバーブロック設定（ルーティングルール）
├── includes/       # 共通設定ディレクトリ
│   └── proxy_params # 共通プロキシヘッダー設定
└── readme.md       # このファイル
```

## 主な機能

### パフォーマンス最適化

- **Gzip圧縮**: テキスト、CSS、JS、JSONなどを自動圧縮
- **Keep-Alive**: コネクション再利用で高速化
- **静的ファイルキャッシュ**: 画像、CSS、JSを1ヶ月キャッシュ
- **プロキシキャッシュ**: バックエンド負荷軽減

### セキュリティ

- **レート制限**: API 30req/s、一般 50req/s
- **接続数制限**: 1IPあたり50接続
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options等
- **サーバー情報非表示**: server_tokens off

### 監視・トレーシング

- **ヘルスチェック**: `/health` エンドポイント
- **Nginx Status**: `/nginx-status` (内部ネットワークのみ)
- **詳細ログ**: レスポンスタイム、アップストリーム時間
- **リクエストトレーシング**: X-Request-ID, X-Request-Start ヘッダー

### エラーページ

- **429**: レート制限超過（日本語メッセージ）
- **50x**: サーバーエラー（日本語メッセージ）
- **503**: メンテナンス中（日本語メッセージ）

### 構成のモジュール化

- **共通プロキシ設定**: `includes/proxy_params` に共通のヘッダー設定（Host, X-Real-IP等）を分離し、`default.conf` から include しています。これにより設定の重複を排除し、メンテナンス性を向上させています。

## ルーティング一覧

| URL Path | 宛先サービス | 説明 |
|:---------|:-------------|:-----|
| `/` | `portal-app:3000` | ポータルサイト (Next.js) |
| `/tax-docs/` | `tax-docs-frontend:3000` | 確定申告 必要書類 (Front) |
| `/tax-docs-api/` | `tax-docs-backend:3001` | 確定申告 必要書類 (API) |
| `/itcm/` | `itcm-frontend:3020` | 相続税案件管理 (Front) |
| `/itcm-api/` | `itcm-backend:3021` | 相続税案件管理 (API) |
| `/medical/` | `medical-stock-valuation:3010` | 医療法人株式評価 |
| `/shares/` | `shares-valuation:3012` | 非上場株式評価 |
| `/inheritance-tax-app/` | `inheritance-tax-app:5173` | 相続税計算 (Vite) |
| `/bank-analyzer/` | `bank-analyzer:8000` | 銀行分析 (Django) |
| `/gift-tax-simulator/` | `gift-tax-simulator:3001` | 贈与税・間接税シミュレーター |
| `/gift-tax-docs/` | `gift-tax-docs:3002` | 贈与税 必要書類 |
| `/inheritance-tax-docs/` | `inheritance-tax-docs:3003` | 相続税 資料準備ガイド |
| `/real-estate-tax/` | → `/gift-tax-simulator/real-estate` | 301リダイレクト |

## Docker Compose 設定例

```yaml
services:
  gateway:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: tax-apps-gateway
    ports:
      - "80:80"
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - portal-app
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

または、ボリュームマウントで設定ファイルを使用する場合:

```yaml
services:
  gateway:
    image: nginx:1.27-alpine
    container_name: tax-apps-gateway
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - app-network
    restart: unless-stopped
```

## 設定のカスタマイズ

### レート制限の調整

`nginx.conf` の以下の部分を変更:

```nginx
# APIエンドポイント: 30リクエスト/秒
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;

# 一般ページ: 50リクエスト/秒
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;
```

### タイムアウトの調整

`default.conf` の以下の部分を変更:

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 新しいアプリの追加

1. `nginx.conf` にアップストリーム追加:

```nginx
upstream new-app {
    server new-app:3000;
    keepalive 8;
}
```

2. `default.conf` にロケーション追加:

```nginx
location /new-app/ {
    limit_req zone=general_limit burst=20 nodelay;
    proxy_pass http://new-app;
}
```

## トラブルシューティング

### 設定の検証

```bash
docker exec tax-apps-gateway nginx -t
```

### 設定のリロード

```bash
docker exec tax-apps-gateway nginx -s reload
```

### ログの確認

```bash
# アクセスログ
docker exec tax-apps-gateway tail -f /var/log/nginx/access.log

# エラーログ
docker exec tax-apps-gateway tail -f /var/log/nginx/error.log
```

### 接続状況の確認

```bash
curl http://localhost/nginx-status
```
