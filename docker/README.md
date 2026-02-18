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
│  (nginx:alpine│         │  (Next.js/Vite) │         │(Hono/Express/     │
│   Port 3000)  │         │                 │         │ Django)           │
└───────────────┘         └─────────────────┘         └─────────┬─────────┘
                                                                │
                                                       ┌────────┴────────┐
                                                       │   Databases     │
                                                       │ (PostgreSQL/    │
                                                       │  SQLite)        │
                                                       └─────────────────┘
```

## 前提条件

以下のソフトウェアがインストールされている必要があります。

| ソフトウェア | 確認コマンド | 備考 |
|:-----------|:------------|:-----|
| [Git](https://git-scm.com/downloads) | `git --version` | ソースコードの取得・更新に使用 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | コンテナの実行環境 |

> Docker Desktop をインストールすると `docker compose` コマンドも一緒に入ります。

## 初回セットアップ（git clone〜起動まで）

### Step 1. リポジトリをクローン

コマンドプロンプトまたはターミナルを開き、任意のフォルダで以下を実行します。

```bash
git clone https://github.com/kojima1978/tax_apps.git
```

`tax_apps` フォルダが作成され、全ソースコードがダウンロードされます。

### Step 2. Docker Desktop を起動

タスクバーにクジラのアイコンが表示され、**"Docker Desktop is running"** になるまで待ちます。

### Step 3. start.bat を実行

```bash
cd tax_apps/docker
start.bat
```

**これだけで完了です。** 内部で以下が自動的に行われます:

| 順番 | 処理 | 説明 |
|:-----|:-----|:-----|
| 1 | Preflight Check | Docker起動確認、ポート競合検出、ディスク容量確認 |
| 2 | `.env` 自動生成 | パスワード・シークレットキーをランダム生成（手動編集不要） |
| 3 | データディレクトリ作成 | `data/` 配下の永続化フォルダを自動作成 |
| 4 | `docker compose up -d` | 全サービスのコンテナをビルド・起動 |

> 初回はDockerイメージのビルドがあるため、5〜15分ほどかかります。
> 2回目以降はキャッシュが効くため、数十秒で起動します。

### Step 4. ブラウザでアクセス

http://localhost を開くとポータル画面が表示されます。

### 停止するとき

```bash
cd tax_apps/docker
stop.bat
```

データは `data/` フォルダに保存されているため、停止してもデータは消えません。

### 完全削除（アンインストール）

すべてのコンテナ・イメージ・データを削除したい場合:

```bash
cd docker
clean.bat
```

二段階で確認されます:

| Step | 削除対象 | 確認 |
|:-----|:---------|:-----|
| Step 1 | コンテナ、Dockerイメージ、ネットワーク | Y/N |
| Step 2 | `data/` 内のデータベース・アップロードファイル | Y/N |

> Step 1 のみ実行して Step 2 をスキップすれば、データを残したままコンテナだけ削除できます。
> 削除後に `start.bat` を実行すれば、再セットアップされます。

ソースコードごと完全に削除する場合は、上記の後にフォルダを削除します:

```bash
cd ..\..\
rd /s /q tax_apps
```

## バッチスクリプト

すべて `tax_apps/docker/` フォルダ内にあります。実行前に `cd tax_apps/docker` で移動してください。

> **ヒント**: すべてのスクリプトで `--help` または `-h` オプションが使用可能です。

| スクリプト | 説明 | オプション |
|-----------|------|-----------|
| `start.bat` | Preflight + サービス起動 | `--build`, `--prod`, `--help` |
| `stop.bat` | サービス停止 | `--volumes`, `--prod`, `--help` |
| `restart.bat` | サービス再起動 | `--build`, `--prod`, `[service]`, `--help` |
| `status.bat` | 状態・リソース確認 | `--help` |
| `logs.bat` | ログ表示 | `--no-follow`, `--tail N`, `[service]`, `--help` |
| `preflight.bat` | 環境チェック（単独実行可） | `--help` |
| `backup.bat` | データバックアップ（4ステップ） | `--help` |
| `clean.bat` | 完全削除（二段階確認付き） | `--help` |

### コマンドプロンプトの開き方

バッチスクリプトはすべて `tax_apps\docker` フォルダで実行します。以下のいずれかの方法でコマンドプロンプトを開いてください。

| 方法 | 手順 |
|:-----|:-----|
| **アドレスバー** | エクスプローラーで `docker` フォルダを開き、アドレスバーに `cmd` と入力して Enter |
| **右クリック（Win11）** | フォルダ内の空白部分を右クリック →「ターミナルで開く」 |
| **Shift+右クリック（Win10）** | フォルダ内の空白部分を Shift + 右クリック →「コマンド ウィンドウをここで開く」 |

### 使用例

```bash
# ヘルプを表示
start.bat --help
logs.bat -h

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

# コンテナ＋ネットワーク削除（data/ のデータはホストに残る）
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
| Retirement Tax | http://localhost/retirement-tax-calc/ | 3013 | 退職金税額計算 |
| ITCM | http://localhost/itcm/ | 3020 | 案件管理システム |
| Bank Analyzer | http://localhost/bank-analyzer/ | 8000 | 銀行分析 (Django) |

### バックエンド

| サービス | Port | 説明 |
|:--------|:-----|:-----|
| tax-docs-backend | 3006 | 確定申告書類 API |
| itcm-backend | 3021 | 案件管理 API |
| itcm-postgres | 3022 | ITCM用 PostgreSQL |
| bank-analyzer-db | 5432 (内部) | 銀行分析用 PostgreSQL + pgvector |

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
│   ├── medical-stock-valuation/ # 医療法人株式
│   ├── shares-valuation/       # 非上場株式
│   ├── retirement-tax-calc/   # 退職金税額計算
│   └── bank-analyzer-django/   # 銀行分析
├── docker/                     # Docker設定
│   ├── docker-compose.yml      # メイン設定
│   ├── docker-compose.prod.yml # 本番用オーバーライド
│   ├── .env                    # 環境変数（自動生成、git管理外）
│   ├── .env.example            # 環境変数テンプレート
│   ├── data/                   # 永続データ（ホストバインドマウント）
│   │   ├── postgres/           # ITCM用 PostgreSQL データ
│   │   ├── tax-docs/           # 確定申告書類 SQLite
│   │   ├── medical-stock/      # 医療法人株式 SQLite
│   │   └── bank-analyzer/      # 銀行分析データ
│   │       ├── data/           # アップロードファイル
│   │       ├── db/             # SQLite（レガシー/移行用）
│   │       └── postgres/       # PostgreSQL + pgvector
│   ├── postgres/               # PostgreSQL 初期化スクリプト
│   │   └── init-pgvector.sql   # pgvector 拡張有効化
│   ├── backups/                # バックアップ保存先（git管理外）
│   ├── preflight.bat           # 環境チェック（start.batから自動呼出）
│   ├── _parse_args.bat         # 共通引数パーサー
│   ├── start.bat               # 起動スクリプト
│   ├── stop.bat                # 停止スクリプト
│   ├── restart.bat             # 再起動スクリプト
│   ├── status.bat              # 状態確認スクリプト
│   ├── logs.bat                # ログ表示スクリプト
│   ├── backup.bat              # データバックアップ
│   ├── clean.bat               # 完全削除（二段階確認付き）
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
- **ホストバインドマウント**: `data/` ディレクトリへのデータ永続化

#### リソースティア

| ティア | 開発 (limit/reservation) | 本番 (limit/reservation) | 対象サービス |
|:------|:------------------------|:------------------------|:------------|
| Gateway | 128M / 32M | 64M / 16M | gateway, portal |
| Small | — | 128M / 32M | inheritance-tax-app, tax-docs-backend |
| Medium | 256M / 64M | — | itcm-postgres, bank-analyzer-db, tax-docs-backend |
| Default | 512M / 128M | 256M / 64M | その他全サービス |
| Postgres | — | 512M / 128M | itcm-postgres, bank-analyzer-db |

## Preflight Check

`preflight.bat` は `start.bat` から自動呼出されますが、単独でも実行できます。

| # | チェック項目 | 判定 |
|:--|:------------|:-----|
| 1 | Docker Desktop 起動確認 | ERROR（致命的） |
| 2 | `docker compose` コマンド確認 | ERROR（致命的） |
| 3 | `.env` 存在確認・自動作成・シークレット自動生成 | OK / WARN |
| 4a | Dockerfile 14件 + Nginx設定ファイル存在確認 | OK / ERROR |
| 4b | データディレクトリ自動作成（`data/` 配下） | OK / ERROR |
| 5 | ポート競合検出（15ポート） | OK / WARN |
| 6 | ディスク空き容量（5GB未満で警告） | OK / WARN |
| 7 | 結果サマリー + エラー時 Y/N プロンプト | — |

### シークレット自動生成

初回起動時、`.env` が存在しない場合:

1. `.env.example` → `.env` にコピー
2. `POSTGRES_PASSWORD` と `DJANGO_SECRET_KEY` のプレースホルダーを PowerShell で生成した44文字のランダム英数字に自動置換
3. 手動編集不要でそのまま起動可能

既存の `.env` にプレースホルダーが残っている場合も自動検出・置換されます。

## データ永続化

全データはホストの `data/` ディレクトリにバインドマウントされます。`docker compose down` や `docker compose down -v` を実行してもデータは消えません。

| ディレクトリ | サービス | 内容 |
|:------------|:---------|:-----|
| `data/postgres/` | itcm-postgres | ITCM用 PostgreSQL データファイル |
| `data/bank-analyzer/postgres/` | bank-analyzer-db | 銀行分析用 PostgreSQL + pgvector |
| `data/bank-analyzer/data/` | bank-analyzer | アップロードデータ |
| `data/bank-analyzer/db/` | bank-analyzer | 銀行分析 SQLite（レガシー/移行用） |
| `data/tax-docs/` | tax-docs-backend | 確定申告書類 SQLite |
| `data/medical-stock/` | medical-stock-valuation | 医療法人株式 SQLite |

データを完全に削除したい場合は、`clean.bat` の Step 2 を実行するか、ホスト上の `data/` 配下を手動で削除してください。

## バックアップとリストア

### バックアップ

```bash
cd tax_apps/docker
backup.bat
```

`backups/2026-02-12_153000/` のようなタイムスタンプ付きフォルダにバックアップされます。

| データ | 方式 | 備考 |
|:------|:-----|:-----|
| PostgreSQL | `pg_dump`（SQLダンプ） | コンテナ起動中に整合性を保って取得 |
| SQLite（tax-docs, medical-stock, bank-analyzer） | ファイルコピー | |
| アップロードデータ（bank-analyzer） | ファイルコピー | |

> PostgreSQL コンテナが停止中の場合は、自動的にファイルコピーにフォールバックします。

### リストア

```bash
# PostgreSQL
docker exec -i itcm-postgres psql -U postgres -d inheritance_tax_db < backups\[日時]\postgres.sql

# SQLite・アップロードデータ
# backups\[日時]\ 配下のフォルダを data\ にコピー
```

## コード更新時の対応（git pull）

他のメンバーが変更をプッシュした場合や、最新版に更新したい場合の手順です。

### Step 1. 最新コードを取得

```bash
cd tax_apps
git pull
```

> `git pull` は GitHub から最新の変更をダウンロードしてローカルに反映します。

### Step 2. 変更内容に応じて再起動

変更された内容によって対応が異なります。

#### ソースコードのみの変更（`.ts`, `.tsx`, `.py` 等）

開発モードではソースコードがホストからコンテナにマウントされているため、**多くの場合は自動で反映されます**（ホットリロード）。反映されない場合:

```bash
cd docker
restart.bat [service-name]
```

> `[service-name]` は対象のサービス名（例: `gift-tax-docs`, `bank-analyzer`）に置き換えてください。
> サービス名は `status.bat` で確認できます。

#### 依存関係・Dockerfile の変更を含む場合

`package.json`、`requirements.txt`、`Dockerfile` 等が変更された場合は**リビルドが必要**です。

```bash
cd docker

# 全サービスをリビルドして起動
start.bat --build

# 特定のサービスだけリビルドしたい場合
restart.bat --build [service-name]
```

> `--build` を付けると Docker イメージを再構築してから起動します。
> どれが変更されたかわからない場合は `start.bat --build` で全体をリビルドすれば安全です。

#### 本番モードの場合

本番モードではソースコードがイメージ内にビルドされるため、**全ての変更でリビルドが必要**です。

```bash
cd docker
start.bat --prod --build
```

#### Nginx 設定の変更

Nginx 設定ファイル（`nginx.conf`, `default.conf`, `includes/`）はコンテナにマウントされているため、リビルド不要でリロードできます。

```bash
docker exec tax-apps-gateway nginx -s reload
```

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

### 本番ビルドで pnpm install が失敗する

多数のサービスを同時にビルドすると `pnpm install --frozen-lockfile` がネットワークタイムアウトで失敗することがあります。`start.bat --prod` はグループ分割ビルドで対策済みですが、手動で `docker compose build` を実行する場合は一度にビルドするサービス数を制限してください。

```bash
# 手動でグループ分けしてビルド
docker compose -f docker-compose.yml -f docker-compose.prod.yml build gateway portal-app bank-analyzer
docker compose -f docker-compose.yml -f docker-compose.prod.yml build itcm-backend tax-docs-backend
# ...
```

### COPY --link で invalid user index エラー

Dockerfile で `COPY --link --chown=username:groupname` を使用すると `invalid user index: -1` エラーが発生します。`--link` フラグは独立レイヤーを生成するため、前段で作成したユーザー名を参照できません。数値 UID:GID を使用してください。

```dockerfile
# NG: --link と名前指定の組み合わせ
COPY --from=builder --chown=nextjs:nodejs --link /app/.next/standalone ./

# OK: 数値 UID:GID を使用
COPY --from=builder --chown=1001:1001 --link /app/.next/standalone ./
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
- ソースコードのボリュームマウント無効化（ビルド済みイメージを使用、データボリュームは維持）
- 内部サービスのポート非公開（Gateway経由のみアクセス可）
- リソース制限の最適化（メモリ使用量を削減）
- `init: false`（runner ステージの tini ENTRYPOINT と Docker init の二重起動を防止）
- Djangoの `DJANGO_DEBUG=False` + `gunicorn` 起動
- `DJANGO_SECRET_KEY` の必須化

### 本番ビルドのグループ分割

`start.bat --prod` では、BuildKit のリソース枯渇を防ぐためにイメージビルドを4グループに分割して順次実行します。14サービスが同時に `pnpm install` を実行するとネットワークタイムアウトが発生するため、3〜4サービスずつビルドします。

| グループ | サービス | 内容 |
|:---------|:---------|:-----|
| 1/4 | gateway, portal-app, bank-analyzer | インフラ・Gateway |
| 2/4 | itcm-backend, tax-docs-backend, inheritance-tax-app | バックエンド |
| 3/4 | itcm-frontend, tax-docs-frontend, gift-tax-simulator, gift-tax-docs | フロントエンドA |
| 4/4 | inheritance-tax-docs, shares-valuation, medical-stock-valuation, retirement-tax-calc | フロントエンドB |

全グループのビルド完了後、`docker compose up -d` で全サービスを一括起動します。開発モード（`start.bat`）では従来通り `docker compose up -d --build` で一括実行します。

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
コンテナ内で使用可能なツールに応じて使い分けています：

| 対象 | ヘルスチェック方式 | 備考 |
|:-----|:------------------|:-----|
| Gateway | `curl --fail` | nginx Dockerfile に curl 追加 |
| Portal, inheritance-tax-app (prod) | `wget --spider` | Alpine BusyBox / nginx:alpine 内蔵 |
| Next.js / Hono / Express 系 (dev) | `node -e "fetch(...)"` | Node.js 内蔵 |
| bank-analyzer (Django) | `python urllib.request` | Python 内蔵 |
| PostgreSQL | `pg_isready -U <user> -d <db>` | PostgreSQL 内蔵 |

## 更新履歴

### 2026-02 (Dockerfile --link 修正・本番ビルド安定化)

- **全Dockerfile `COPY --link --chown` 修正**: `--link` フラグは独立レイヤーを生成するため、前段の `/etc/passwd` から名前付きユーザーを解決できず `invalid user index: -1` エラーが発生。10ファイルで名前指定を数値 UID:GID に変更
  - Next.js 系 8ファイル: `--chown=nextjs:nodejs` → `--chown=1001:1001`
  - nginx 系 1ファイル (inheritance-tax-app): `--chown=nginx:nginx` → `--chown=101:101`
  - Django 系 1ファイル (bank-analyzer): `--chown=appuser:appgroup` → `--chown=1001:1001`
- **start.bat 本番ビルド安定化**: 14サービス同時ビルドで `pnpm install --frozen-lockfile` がネットワークタイムアウトする問題を修正。本番モード時は4グループ（各3〜4サービス）に分割して順次ビルド後、全サービスを一括起動

### 2026-02 (bank-analyzer PostgreSQL + pgvector 対応・バッチ改善)

- **bank-analyzer-db**: PostgreSQL 16 + pgvector サービス新規追加（意味検索 Phase 2 準備）
- **bank-analyzer**: PostgreSQL/SQLite 切り替え対応（`DB_ENGINE` 環境変数）
- **docker-compose.yml**: セキュリティオプション追加（`no-new-privileges:true`）
- **docker-compose.yml**: gateway healthcheck を `wget` → `curl` に変更（信頼性向上）
- **docker-compose.yml**: サービス一覧コメント追加（17サービス）
- **docker-compose.prod.yml**: bank-analyzer-db 本番設定追加
- **.env.example**: bank-analyzer PostgreSQL 設定・AI分類設定追加
- **postgres/init-pgvector.sql**: pgvector 拡張初期化スクリプト新規追加
- **全batファイル**: `--help` / `-h` オプション追加（9ファイル）
- **status.bat**: サービス数カウント、ヘルス列、ネットワークI/O列追加
- **backup.bat**: bank-analyzer PostgreSQL バックアップ追加（4ステップ）
- **preflight.bat**: bank-analyzer/postgres ディレクトリ自動作成、init-pgvector.sql チェック追加

### 2026-02 (inheritance-tax-docs 機能追加・bank-analyzer 修正)

- **inheritance-tax-docs**: 初期化ボタン追加（書類カスタマイズを標準状態に戻す、確認ダイアログ付き、基本情報保持）
- **inheritance-tax-docs**: 具体名の連続入力対応（Enter後に入力欄維持）、テキストクリック編集、編集/削除アイコン視認性向上
- **bank-analyzer**: `runserver --nostatic` 追加（`FORCE_SCRIPT_NAME` と `StaticFilesHandler` の競合で静的ファイルが404になる問題を修正、WhiteNoise middleware に配信を委譲）

### 2026-02 (medical-stock-valuation 機能追加・Docker改善)

- **medical-stock-valuation**: JSON個別エクスポート/インポート、Excel出力（ExcelJS）、印刷機能（A4縦3ページ）追加
- **medical-stock-valuation**: リファクタリングR1-R4（useMasterSettings汎用hook、SimpleMasterSettingsPage共通化、CalculationDetailsModal分割、useFormData hook抽出、PrintHeader抽出、savedRecordToFormData DRY、formatSen統一、CalculationProcessButton抽出）
- **medical-stock-valuation**: 死コード削除（solidFill/THIN_BORDER dead export、CompanySize dead type export、useExcelExport dead error state、print-page2-header dead className）
- **medical-stock-valuation Dockerfile**: `VOLUME /app/data` 宣言追加、`serverExternalPackages: ['better-sqlite3']` 追加
- **docker-compose.yml**: portal-app に `build.target: runner` 明示（dev ステージなしを明確化）
- **docker-compose.prod.yml**: inheritance-tax-app healthcheck `localhost` → `127.0.0.1` 統一

### 2026-02 (Prod Override・アクセシビリティ)

- **docker-compose.prod.yml `!reset`/`!override` 修正**: Docker Compose のファイルマージではリスト型（ports, volumes）が結合されるため、`ports: []` / `volumes: []` ではベース定義を消せない問題を修正。`!reset []` で完全クリア、`!override [...]` で値の置き換え。YAML アンカー(`<<:`)経由では `!reset` タグが保持されないため各サービスに明示
- **inheritance-tax-app ポート統一**: prod nginx の listen ポートを 3013→5173 に変更（upstream 定義と一致させ、dev/prod で統一）
- **本番ポート非公開**: Gateway（ポート80）のみホストに公開、他の全サービスはコンテナ内部ポートのみ
- **本番ボリューム最適化**: dev のソースコードマウントを除去、データボリューム（PostgreSQL, SQLite, アップロード）のみ維持
- **アクセシビリティ改善**: 全6アプリで `transition-all` → `transition-colors` / `transition-shadow`（prefers-reduced-motion 対応）、`aria-label` 追加
- **clean.bat `.gitkeep` 復元**: データディレクトリ削除後に `.gitkeep` を再作成（git 管理のディレクトリ構造を維持）

### 2026-02 (Preflight・データ永続化)

- **preflight.bat新規作成**: Docker起動・compose確認・.env・Dockerfile・ポート競合・ディスク容量の7段階チェック
- **シークレット自動生成**: `.env` 未作成時に `.env.example` からコピーし、`POSTGRES_PASSWORD`/`DJANGO_SECRET_KEY` を PowerShell でランダム生成・自動置換
- **データ永続化**: Named volume → ホストバインドマウント（`data/` ディレクトリ）に移行、`docker compose down -v` でもデータ保持
- **データディレクトリ自動作成**: preflight.bat 内で `data/` 配下の5ディレクトリを自動作成
- **セキュリティ強化**: `DJANGO_SECRET_KEY` のデフォルト値を廃止、`POSTGRES_PASSWORD` と同様に必須化（Public リポジトリ対応）
- **start.bat簡素化**: `.env` チェックを preflight.bat に移動、`call preflight.bat` に統合
- **docker-compose.prod.yml**: Named volume 参照をホストバインドマウントに統一

### 2026-02 (ポータル全面刷新)

- **portal全面簡素化**: 管理画面(/admin)・API・Prisma/SQLite全廃、TypeScript静的定数化（30+ファイル削除、-1,572行）
- **portal Dockerfile**: standalone→export、node:22-alpine→nginx:alpine（~235MB→~45MB）、非rootユーザー、nginx設定heredocインライン化
- **docker-compose.yml**: 全12サービスのヘルスチェックをwget統一、NEXT_TELEMETRY_DISABLEDをnextjs-dev-envに移動、start_period 120s→60s、portal deploy small-deploy化、冗長dockerfile指定12件削除
- **docker-compose.prod.yml**: portal init:false削除（tini不使用）、deploy→prod-gateway-deploy（64M/16M）

### 2026-02 (後半)

- **Docker基盤改善**: Dockerfile app-specific cache mount IDs、standalone docker-compose.yml作成（shares-valuation/inheritance-tax-app）、.dockerignore Pattern A標準化
- **docker-compose.prod.yml**: `command: []` 追加（medical-stock-valuation/shares-valuation/gift-tax-docs）、bank-analyzer `build.target: production`
- **docker-compose.yml**: 不足volume mount追加（public/:ro, hooks/:ro）、bank-analyzer `target: dev`/`:ro`/healthcheck URL修正、itcm-postgres `shm_size`
- **Dockerfile修正**: gift-tax-docs/gift-tax-simulator EXPOSE ポート修正、icm Dockerfile.dev `--frozen-lockfile`/`pnpm-lock.yaml`追加
- **PostgreSQL統一**: 全standalone composeをpostgres:16-alpineに統一、pg_isready `-d`フラグ追加
- **README/env整備**: medical-stock-valuation `docker-compose`→`docker compose`、bank-analyzer `--profile`削除、.env.example不足変数追加
- **retirement-tax-calc**: 退職金税額計算シミュレーター新規追加（3パターン比較・役員限度額・参照表・印刷対応）
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

