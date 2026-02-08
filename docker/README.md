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
┌───────────────┐         ┌─────────────────┐         ┌───────────────────┐
│  Portal App   │         │   Frontend Apps │         │   Backend APIs    │
│  (Port 3000)  │         │  (Next.js/Vite) │         │(Hono/Express/     │
│               │         │                 │         │ Django)           │
└───────────────┘         └─────────────────┘         └─────────┬─────────┘
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
| `stop.bat` | サービス停止 | `--volumes`, `--prod` |
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

# 特定サービスをリビルドして再起動
restart.bat --build tax-docs-backend

# ログを確認（最新100行）
logs.bat --tail 100 gateway

# 本番モードで停止
stop.bat --prod

# ボリュームも含めて停止（データ削除）
stop.bat --volumes
```

## サービス一覧

### フロントエンド

| アプリケーション | Gateway URL | 直接Port | 説明 |
|:----------------|:------------|:---------|:-----|
| Portal | http://localhost/ | 3000 | メインポータル |
| Tax Docs | http://localhost/tax-docs/ | 3005 | 確定申告 必要書類 |
| Gift Tax Simulator | http://localhost/gift-tax-simulator/ | 3001 | 贈与税計算・間接税シミュレーター |
| - 間接税 | http://localhost/gift-tax-simulator/real-estate | - | 土地・建物取得税計算 |
| Gift Tax Docs | http://localhost/gift-tax-docs/ | 3002 | 贈与税 必要書類 |
| Inheritance Tax Docs | http://localhost/inheritance-tax-docs/ | 3003 | 相続税 資料ガイド |
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
│   └── bank-analyzer-django/   # 銀行分析
├── docker/                     # Docker設定
│   ├── docker-compose.yml      # メイン設定
│   ├── docker-compose.prod.yml # 本番用オーバーライド
│   ├── .env                    # 環境変数
│   ├── .env.example            # 環境変数テンプレート
│   ├── _parse_args.bat          # 共通引数パーサー
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
    ├── includes/               # 共通設定ファイル
    │   ├── proxy_params.conf       # プロキシ共通パラメータ
    │   ├── upstreams.conf          # アップストリーム定義
    │   ├── maps.conf               # Map定義
    │   ├── rate_limit_general.conf # 一般レート制限
    │   └── rate_limit_api.conf     # APIレート制限
    ├── html/                   # カスタムエラーページ
    │   ├── 429.html            # Rate Limit超過
    │   ├── 50x.html            # サーバーエラー
    │   └── 503.html            # メンテナンス
    ├── .dockerignore           # ビルド除外ファイル
    └── readme.md               # Nginx説明
```

## 主な機能

### Gateway (Nginx)

- **Gzip圧縮**: CSS, JS, JSON等を自動圧縮
- **レート制限**: API 300req/s, 一般 1000req/s
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Keep-Alive**: コネクション再利用
- **ヘルスチェック**: `/health` エンドポイント

### Docker Compose

- **ログローテーション**: 10MB × 3ファイル
- **リソース制限**: YAMLアンカーによるティア管理（下表参照）
- **ヘルスチェック**: 全サービスに設定
- **依存関係管理**: service_healthy条件
- **名前付きボリューム**: データ永続化

#### リソースティア

| ティア | 開発 (limit/reservation) | 本番 (limit/reservation) | 対象サービス |
|:------|:------------------------|:------------------------|:------------|
| Gateway | 128M / 32M | 64M / 16M | gateway |
| Small | — | 128M / 32M | inheritance-tax-app, tax-docs-backend |
| Medium | 256M / 64M | — | itcm-postgres, tax-docs-backend |
| Default | 512M / 128M | 256M / 64M | その他全サービス |
| Postgres | — | 512M / 128M | itcm-postgres |

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
- ボリュームマウント無効化（ビルド済みイメージを使用）
- 内部サービスのポート非公開（Gateway経由のみアクセス可）
- リソース制限の最適化（メモリ使用量を削減）
- `init: false`（runner ステージの tini ENTRYPOINT と Docker init の二重起動を防止）
- Djangoの `DJANGO_DEBUG=False` + `gunicorn` 起動
- `DJANGO_SECRET_KEY` の必須化

## 技術スタック

- **Frontend**: Next.js 16, React 19, Vite
- **Backend**: Hono, Express, Django 5.x
- **Database**: PostgreSQL 16, SQLite
- **Infrastructure**: Docker, Nginx 1.27
- **Node.js**: v22 LTS (Frontend) / v24 (Backend)
- **Python**: 3.12 (Django)

### Prisma & OpenSSL (Alpine vs Debian)

Alpine Linux (musl) と OpenSSL 3.x の組み合わせで Prisma Client の初期化に失敗する場合（特に `node:24-alpine`）、以下の対応を行ってください：

1. ベースイメージを `node:24-slim` (Debian bookworm) に変更
2. `openssl` を明示的にインストール
3. `schema.prisma` の `binaryTargets` に `debian-openssl-3.0.x` を追加

### ヘルスチェックエラー

コンテナが "Unhealthy" になる場合、ヘルスチェックコマンドを確認してください。
本プロジェクトでは `curl` に依存せず、各言語の組み込み機能を使用しています：

- **Nginx (Gateway)**: `wget --spider http://127.0.0.1/health`
- **Node.js**: `node -e "(async()=>{...fetch('http://127.0.0.1:PORT/...')...})()"`
- **Python (Django)**: `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/')"`
- **PostgreSQL**: `pg_isready -U <user> -d <db>`

## 更新履歴

### 2026-02 (後半)

- **docker-compose**: デプロイリソース定義をYAMLアンカー化してDRY化（7箇所のインライン定義→アンカー参照）
- **docker-compose.yml**: gift-tax-docsの冗長な`build.args.NODE_VERSION`を削除
- **全Dockerfile改善**: OCIラベル統一(vendor/licenses/source)、libc6-compat追加、コメント整備
- **docker-compose.yml**: ヘルスチェックURLを`localhost`→`127.0.0.1`に統一（DNS解決回避）
- **icm/api Dockerfile**: runner stageにタイムゾーン設定(tzdata)追加
- **portal Dockerfile**: libc6-compat追加、HEALTHCHECKのr.ok判定統一
- **nginx Dockerfile**: RUNレイヤー集約、COPY --link追加
- **shares-valuation**: R7-R8リファクタリング（parseNumericInput/calculateOwnDataComplete/useValuationData/MedicalCorporationBadge）
- **inheritance-case-management**: R2リファクタリング（formatCurrency統一/SortableHeader/UI re-export/RankingTable/P2025 catch）

### 2026-02 (前半)

- **Gift Tax Simulator**: 間接税シミュレーター（不動産取得税）を統合、早見表機能追加
- **real-estate-tax**: 独立アプリを廃止、gift-tax-simulatorに統合
- **Bank Analyzer**: 取引追加/削除機能、日付範囲フィルター追加
- **Dockerfile改善**: 重複コード削除、nginx設定検証の有効化
- **docker-compose.prod.yml**: gunicornのwsgiパス修正、タイムアウト設定追加
- **batファイル**: `_parse_args.bat`共通パーサー抽出、if/else分岐を削除して簡素化
- **docker-compose.prod.yml**: Node.jsサービスに`init: false`追加（tini二重起動防止）
- **Required-docs**: R1リファクタリング（ListPage/FormErrorDisplay共通化、handler grouping、Excel helper）

