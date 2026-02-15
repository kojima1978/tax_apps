# Nginx Gateway Configuration

Tax Apps プロジェクトのゲートウェイ（リバースプロキシ）として機能する Nginx の設定ファイルです。

## 概要

この Nginx サービスは、外部からの HTTP リクエスト (`port 80`) を受け取り、URL パスに基づいて適切なバックエンドサービス（コンテナ）にリクエストを振り分けます。

## ファイル構成

```
nginx/
├── Dockerfile      # カスタムNginxイメージ（curl付き、non-root実行）
├── nginx.conf      # グローバル設定（ワーカー、Gzip、セキュリティ、Real IP等）
├── default.conf    # サーバーブロック設定（ルーティングルール）
├── html/           # カスタムエラーページ
│   ├── 404.html    # Not Foundページ
│   ├── 429.html    # レート制限超過ページ
│   ├── 50x.html    # サーバーエラーページ
│   └── 503.html    # メンテナンスページ
├── includes/       # 共通設定ディレクトリ
│   ├── proxy_params.conf       # 共通プロキシヘッダー設定
│   ├── upstreams.conf          # アップストリーム定義（13サービス）
│   ├── maps.conf               # map定義（WebSocket Upgrade, Font Routing）
│   ├── rate_limit_general.conf # 一般レート制限（burst=20）
│   └── rate_limit_api.conf     # APIレート制限（burst=10）
├── .dockerignore   # Dockerビルド除外設定
└── readme.md       # このファイル
```

## 主な機能

### パフォーマンス最適化

- **Gzip圧縮**: テキスト、CSS、JS、JSON、WASMなどを自動圧縮
- **Keep-Alive**: コネクション再利用で高速化（サービス種別に応じた keepalive 値）
- **静的ファイルキャッシュ**: Next.js/Vite のハッシュ付き静的ファイルは1年キャッシュ
- **アップストリーム障害リトライ**: `proxy_next_upstream` による自動リカバリ

### セキュリティ

- **レート制限**: API 300req/s、一般 1000req/s（超過時は 429 を返却）
- **接続数制限**: 1IPあたり50接続（全ロケーション共通）
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **サーバー情報非表示**: server_tokens off, proxy_hide_header (X-Powered-By, Server)
- **Real IP対応**: Docker内部ネットワークからの X-Forwarded-For を信頼

### 監視・トレーシング

- **ヘルスチェック**: `/health` エンドポイント（curlベース）
- **Nginx Status**: `/nginx-status` (内部ネットワークのみ)
- **詳細ログ**: レスポンスタイム、アップストリーム時間（main形式 + JSON形式）
- **リクエストトレーシング**: X-Request-ID, X-Request-Start ヘッダー

### エラーページ

- **404**: ページが見つかりません（日本語メッセージ）
- **429**: レート制限超過（日本語メッセージ）
- **50x**: サーバーエラー（日本語メッセージ）
- **503**: メンテナンス中（日本語メッセージ）

### 構成のモジュール化

- **共通プロキシ設定**: `includes/proxy_params.conf` に共通のヘッダー設定（Host, X-Real-IP, WebSocket Upgrade等）を集約
- **アップストリーム定義**: `includes/upstreams.conf` に全サービスの upstream を分離
- **Map定義**: `includes/maps.conf` に WebSocket Upgrade と Next.js Font Routing の map を分離
- **レート制限**: `includes/rate_limit_general.conf` / `rate_limit_api.conf` で burst 値を一元管理

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
| `/inheritance-tax-docs/` | `inheritance-tax-docs:3003` | 相続税 資料準備ガイド |
| `/gift-tax-simulator/` | `gift-tax-simulator:3001` | 贈与税・間接税シミュレーター |
| `/gift-tax-docs/` | `gift-tax-docs:3002` | 贈与税 必要書類 |
| `/retirement-tax-calc/` | `retirement-tax-calc:3013` | 退職金税額計算 |
| `/bank-analyzer/` | `bank-analyzer:8000` | 銀行分析 (Django + PostgreSQL) |
| `/bank-analyzer/api/` | `bank-analyzer:8000` | 銀行分析 API |
| `/bank-analyzer/static/` | `bank-analyzer:8000` | 銀行分析 静的ファイル |
| `/real-estate-tax/` | → `/gift-tax-simulator/real-estate` | 301リダイレクト |

## Docker Compose 設定例

### カスタムイメージビルド（推奨）

```yaml
services:
  gateway:
    build:
      context: ./nginx
      dockerfile: Dockerfile
      args:
        APP_VERSION: "1.0.0"
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
    security_opt:
      - no-new-privileges:true
```

### ボリュームマウント（開発用）

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
      - ./nginx/includes:/etc/nginx/includes:ro
      - ./nginx/html:/usr/share/nginx/html:ro
    networks:
      - app-network
    restart: unless-stopped
```

## 設定のカスタマイズ

### レート制限の調整

`nginx.conf` の以下の部分を変更:

```nginx
# APIエンドポイント: 300リクエスト/秒
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=300r/s;

# 一般ページ: 1000リクエスト/秒
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=1000r/s;
```

### タイムアウトの調整

`default.conf` の以下の部分を変更:

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

**注意**: `bank-analyzer` は CSV解析・RapidFuzz分類処理のため `proxy_read_timeout 300s` に設定済み

### 新しいアプリの追加

1. `includes/upstreams.conf` にアップストリーム追加:

```nginx
upstream new-app {
    server new-app:3000;
    keepalive 8;
}
```

2. `default.conf` にロケーション追加:

```nginx
location /new-app/ {
    include /etc/nginx/includes/rate_limit_general.conf;
    proxy_pass http://new-app;
}
```

3. （フォント対応が必要な場合）`includes/maps.conf` の `$nextjs_font_backend` に追加:

```nginx
~*/new-app/ new-app;
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

# レート制限超過ログ（429エラー）
docker exec tax-apps-gateway grep "limiting requests" /var/log/nginx/error.log
```

### 接続状況の確認

```bash
curl http://localhost/nginx-status
```

### アップストリーム応答確認

```bash
# ヘルスチェック
curl -I http://localhost/health

# 各サービスへの疎通確認
curl -I http://localhost/bank-analyzer/
curl -I http://localhost/itcm/
```

### よくある問題

| 症状 | 原因 | 対処 |
|------|------|------|
| 502 Bad Gateway | アップストリームが起動していない | `docker ps` で対象サービスの状態確認 |
| 504 Gateway Timeout | 処理時間超過 | `proxy_read_timeout` を延長 |
| 429 Too Many Requests | レート制限超過 | rate 値または burst 値を調整 |
| 413 Request Entity Too Large | アップロードサイズ超過 | `client_max_body_size` を調整 |
