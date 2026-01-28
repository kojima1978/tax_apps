# Tax Apps - Docker Environment

税理士業務支援アプリケーション統合プラットフォーム

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。
Docker Composeを使用して、すべてのアプリケーションを一元的に起動・管理し、Nginx Gatewayを通じてアクセスします。

## アーキテクチャ

```
                         ┌─────────────────────┐
                         │    Nginx Gateway    │
                         │      (Port 80)      │
                         │  - Reverse Proxy    │
                         │  - Rate Limiting    │
                         │  - Gzip Compression │
                         └──────────┬──────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Portal App   │         │   Frontend Apps │         │  Backend APIs   │
│  (Port 3000)  │         │  (Next.js/Vite) │         │ (Express/Django)│
└───────────────┘         └─────────────────┘         └────────┬────────┘
                                                               │
                                                      ┌────────┴────────┐
                                                      │   Databases     │
                                                      │ (PostgreSQL/    │
                                                      │  SQLite)        │
                                                      └─────────────────┘
```

## クイックスタート

### 1. 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env

# .env を編集してパスワードを設定
# POSTGRES_PASSWORD=your_secure_password
```

### 2. 起動

```bash
# Windowsの場合
start.bat

# または直接実行
docker compose up -d
```

### 3. アクセス

ブラウザで http://localhost にアクセス

### 4. 停止

```bash
# Windowsの場合
stop.bat

# または直接実行
docker compose down
```

## バッチスクリプト

| スクリプト | 説明 | オプション |
|-----------|------|-----------|
| `start.bat` | サービス起動 | `--build`, `--prod` |
| `stop.bat` | サービス停止 | `--volumes` |
| `restart.bat` | サービス再起動 | `--build`, `--prod`, `[service]` |
| `status.bat` | 状態確認 | - |
| `logs.bat` | ログ表示 | `--no-follow`, `--tail N`, `[service]` |

### 使用例

```bash
# 開発モードで起動（ビルド付き）
start.bat --build

# 本番モードで起動
start.bat --prod

# 特定サービスのみ再起動
restart.bat tax-docs-backend

# ログを確認（最新100行）
logs.bat --tail 100 gateway

# ボリュームも含めて停止（データ削除）
stop.bat --volumes
```

## サービス一覧

### フロントエンド

| アプリケーション | Gateway URL | 直接Port | 説明 |
|:----------------|:------------|:---------|:-----|
| Portal | http://localhost/ | 3000 | メインポータル |
| Tax Docs | http://localhost/tax-docs/ | 3005 | 確定申告 必要書類 |
| Gift Tax Simulator | http://localhost/gift-tax-simulator/ | 3001 | 贈与税計算 |
| Gift Tax Docs | http://localhost/gift-tax-docs/ | 3002 | 贈与税 必要書類 |
| Inheritance Tax Docs | http://localhost/inheritance-tax-docs/ | 3003 | 相続税 資料ガイド |
| Real Estate Tax | http://localhost/real-estate-tax/ | 3004 | 不動産取得税 |
| Inheritance Tax App | http://localhost/inheritance-tax-app/ | 5173 | 相続税計算 (Vite) |
| Medical Stock | http://localhost/medical/ | 3010 | 医療法人株式評価 |
| Shares Valuation | http://localhost/shares/ | 3012 | 非上場株式評価 |
| ITCM | http://localhost/itcm/ | 3020 | 案件管理システム |
| Bank Analyzer | http://localhost/bank-analyzer/ | 8000 | 銀行分析 (Django) |

### バックエンド

| サービス | Port | 説明 |
|:--------|:-----|:-----|
| tax-docs-backend | 3006 | 確定申告書類 API |
| itcm-backend | 3021 | 案件管理 API |
| itcm-postgres | 3022 | PostgreSQL |

## ディレクトリ構造

```
tax_apps/
├── apps/                       # アプリケーションコード
│   ├── portal/                 # ポータルサイト
│   ├── Required-documents-for-tax-return/  # 確定申告書類
│   ├── gift-tax-simulator/     # 贈与税計算
│   ├── gift-tax-docs/          # 贈与税書類
│   ├── inheritance-tax-docs/   # 相続税資料ガイド
│   ├── inheritance-tax-app/    # 相続税計算
│   ├── inheritance-case-management/  # 案件管理
│   ├── medical-stock-valuation/# 医療法人株式
│   ├── shares-valuation/       # 非上場株式
│   ├── real-estate-tax/        # 不動産取得税
│   └── bank-analyzer-django/   # 銀行分析
├── docker/                     # Docker設定
│   ├── docker-compose.yml      # メイン設定
│   ├── docker-compose.prod.yml # 本番用オーバーライド
│   ├── .env                    # 環境変数
│   ├── .env.example            # 環境変数テンプレート
│   ├── start.bat               # 起動スクリプト
│   ├── stop.bat                # 停止スクリプト
│   ├── restart.bat             # 再起動スクリプト
│   ├── status.bat              # 状態確認スクリプト
│   ├── logs.bat                # ログ表示スクリプト
│   └── README.md               # このファイル
└── nginx/                      # Nginx設定
    ├── Dockerfile              # Nginxイメージ
    ├── nginx.conf              # グローバル設定
    ├── default.conf            # ルーティング設定
    └── readme.md               # Nginx説明
```

## 主な機能

### Gateway (Nginx)

- **Gzip圧縮**: CSS, JS, JSON等を自動圧縮
- **レート制限**: API 30req/s, 一般 50req/s
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options等
- **Keep-Alive**: コネクション再利用
- **ヘルスチェック**: `/health` エンドポイント

### Docker Compose

- **ログローテーション**: 10MB × 3ファイル
- **リソース制限**: メモリ上限設定
- **ヘルスチェック**: 全サービスに設定
- **依存関係管理**: service_healthy条件
- **名前付きボリューム**: データ永続化

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose logs [service-name]

# 全コンテナの状態を確認
docker compose ps -a
```

### 502 Bad Gateway

```bash
# Gatewayのログを確認
docker compose logs gateway

# バックエンドサービスの状態を確認
status.bat

# Nginxをリロード
docker exec tax-apps-gateway nginx -s reload
```

### データベース接続エラー

```bash
# PostgreSQLの状態を確認
docker compose logs itcm-postgres

# 直接接続テスト
docker exec -it itcm-postgres psql -U postgres -d inheritance_tax_db
```

### ホットリロードが効かない

Windows + Docker Desktop環境では、ボリュームマウントでファイル監視が正常に動作しないことがあります。
`WATCHPACK_POLLING=true` が設定済みですが、変更が反映されない場合はコンテナを再起動してください。

```bash
restart.bat [service-name]
```

## 本番環境

```bash
# 本番用設定で起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# または
start.bat --prod
```

本番環境では以下が変更されます:

- `NODE_ENV=production`
- ボリュームマウント無効化
- リソース制限の最適化
- Djangoの `DJANGO_DEBUG=False`

## 技術スタック

- **Frontend**: Next.js 16, React 19, Vite
- **Backend**: Express, Django, FastAPI
- **Database**: PostgreSQL 16, SQLite
- **Infrastructure**: Docker, Nginx 1.27
- **Node.js**: v22 LTS (Frontend) / v24 (Backend)

### Prisma & OpenSSL (Alpine vs Debian)

Alpine Linux (musl) と OpenSSL 3.x の組み合わせで Prisma Client の初期化に失敗する場合（特に `node:24-alpine`）、以下の対応を行ってください：

1. ベースイメージを `node:24-slim` (Debian bookworm) に変更
2. `openssl` を明示的にインストール
3. `schema.prisma` の `binaryTargets` に `debian-openssl-3.0.x` を追加

### ヘルスチェックエラー (curl missing)

コンテナが "Unhealthy" になる場合、ヘルスチェックで使用している `curl` がインストールされていない可能性があります。
特に `node:*-alpine` や `node:*-slim` などの軽量イメージではデフォルトで含まれていません。

Dockerfile に以下を追加してください：

```dockerfile
RUN apt-get update && apt-get install -y curl  # Debian/Slim
# または
RUN apk add --no-cache curl                    # Alpine
```

