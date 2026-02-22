# Tax Apps - Docker Environment

税理士業務支援アプリケーション統合プラットフォーム

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。
各アプリケーションは独立した Docker Compose プロジェクトとして運用され、共有ネットワーク (`tax-apps-network`) を通じて Nginx Gateway 経由でアクセスします。

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
                           tax-apps-network（外部ネットワーク）
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

※ 各ボックスはそれぞれ独立した docker-compose プロジェクト
※ DB依存アプリ（ITCM, bank-analyzer, tax-docs）は同一プロジェクト内にDBを含む
```

### 個別コンテナ方式

各アプリケーションが独立した Docker Compose プロジェクトとして動作します。

| 特徴 | 説明 |
|:-----|:-----|
| **障害分離** | 1つのアプリがクラッシュしても他のアプリに影響しない |
| **個別操作** | アプリ単位で起動・停止・リビルドが可能 |
| **共有ネットワーク** | `tax-apps-network`（外部ネットワーク）で全コンテナが通信 |
| **統一アクセス** | Nginx Gateway がリバースプロキシとして全アプリへルーティング |

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

### Step 3. manage.bat start を実行

```bash
cd tax_apps\docker\scripts
manage.bat start
```

**これだけで完了です。** 内部で以下が自動的に行われます:

| 順番 | 処理 | 説明 |
|:-----|:-----|:-----|
| 1 | Docker 起動確認 | Docker Desktop が起動しているか確認 |
| 2 | ネットワーク作成 | `tax-apps-network` を自動作成（未作成時のみ） |
| 3 | 順次起動 | Gateway → DB依存アプリ → フロントエンドアプリの順に起動 |
| 4 | 状態表示 | 全コンテナの状態を一覧表示 |

> 初回はDockerイメージのビルドがあるため、5〜15分ほどかかります。
> 2回目以降はキャッシュが効くため、数十秒で起動します。

### Step 4. ブラウザでアクセス

http://localhost を開くとポータル画面が表示されます。

### 停止するとき

```bash
manage.bat stop
```

データは Docker ボリュームに保存されているため、停止してもデータは消えません。

### 完全削除（アンインストール）

すべてのコンテナ・イメージ・データを削除したい場合:

```bash
manage.bat clean
```

二段階で確認されます:

| Step | 削除対象 | 確認 |
|:-----|:---------|:-----|
| Step 1 | コンテナ、Docker イメージ、ネットワーク | Y/N |
| Step 2 | Docker ボリューム（PostgreSQL, SQLite データ） | Y/N |

> Step 1 のみ実行して Step 2 をスキップすれば、データを残したままコンテナだけ削除できます。
> 削除後に `manage.bat start` を実行すれば、再セットアップされます。

ソースコードごと完全に削除する場合は、上記の後にフォルダを削除します:

```bash
cd ..\..\..\
rd /s /q tax_apps
```

## 管理スクリプト

`tax_apps\docker\scripts\` フォルダにあります。

| スクリプト | 環境 | 説明 |
|-----------|------|------|
| `manage.bat` | Windows (CMD) | 全機能搭載の管理スクリプト |
| `manage.sh` | Linux / Git Bash | 基本コマンド（start/stop/down/restart/build/logs/status） |

### コマンド一覧

#### 基本コマンド

| コマンド | 説明 |
|---------|------|
| `manage.bat start` | 全アプリを起動（ネットワーク自動作成） |
| `manage.bat stop` | 全アプリを停止（逆順） |
| `manage.bat down` | 全アプリを停止してコンテナ削除（逆順） |
| `manage.bat restart <app>` | 指定アプリのみ再起動 |
| `manage.bat build <app>` | 指定アプリを再ビルドして起動 |
| `manage.bat logs <app>` | 指定アプリのログ表示 |
| `manage.bat status` | 全アプリの状態表示 |

#### 運用コマンド

| コマンド | 説明 |
|---------|------|
| `manage.bat backup` | 全データベース・データをバックアップ |
| `manage.bat restore [dir]` | バックアップからリストア |
| `manage.bat clean` | コンテナ・イメージ・ボリュームのクリーンアップ |
| `manage.bat preflight` | 起動前環境チェック |

### アプリ名の指定

`restart`, `build`, `logs` コマンドではアプリ名を部分一致で指定できます:

```bash
# フルネーム
manage.bat restart bank-analyzer-django

# 部分一致
manage.bat restart bank-analyzer
manage.bat logs gift-tax-sim
manage.bat build retirement
```

### コマンドプロンプトの開き方

管理スクリプトは `tax_apps\docker\scripts` フォルダで実行します。

| 方法 | 手順 |
|:-----|:-----|
| **アドレスバー** | エクスプローラーで `docker\scripts` フォルダを開き、アドレスバーに `cmd` と入力して Enter |
| **右クリック（Win11）** | フォルダ内の空白部分を右クリック →「ターミナルで開く」 |
| **Shift+右クリック（Win10）** | フォルダ内の空白部分を Shift + 右クリック →「コマンド ウィンドウをここで開く」 |

### 使用例

```bash
# 全アプリを起動
manage.bat start

# 状態確認
manage.bat status

# 特定アプリを再ビルドして起動
manage.bat build bank-analyzer

# 特定アプリのログを確認
manage.bat logs gift-tax-docs

# 特定アプリを再起動
manage.bat restart retirement-tax-calc

# バックアップ
manage.bat backup

# 起動前チェック
manage.bat preflight
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
| Inheritance Tax App | http://localhost/inheritance-tax-app/ | 3004 | 相続税計算 (Vite) |
| Medical Stock | http://localhost/medical/ | 3010 | 医療法人株式評価 |
| Shares Valuation | http://localhost/shares/ | 3012 | 非上場株式評価 |
| Retirement Tax | http://localhost/retirement-tax-calc/ | 3013 | 退職金税額計算 |
| ITCM | http://localhost/itcm/ | 3020 | 案件管理システム |
| Bank Analyzer | http://localhost/bank-analyzer/ | 3007 | 銀行分析 (Django) |

### バックエンド

| サービス | Port | 説明 |
|:--------|:-----|:-----|
| tax-docs-backend | 3006 | 確定申告書類 API |
| itcm-postgres | 3022 | ITCM用 PostgreSQL |
| bank-analyzer-postgres | 5432 (内部) | 銀行分析用 PostgreSQL + pgvector |

### 起動順序

manage.bat/sh は以下の順序でアプリを起動します（停止は逆順）:

| # | アプリ | 備考 |
|:--|:------|:-----|
| 1 | gateway | Nginx + Portal |
| 2 | inheritance-case-management | PostgreSQL + Next.js |
| 3 | bank-analyzer-django | PostgreSQL + Django |
| 4 | Required-documents-for-tax-return | SQLite + Express + Vite |
| 5 | medical-stock-valuation | SQLite + Next.js |
| 6 | shares-valuation | Next.js |
| 7 | inheritance-tax-app | Vite |
| 8 | gift-tax-simulator | Vite |
| 9 | gift-tax-docs | Next.js |
| 10 | inheritance-tax-docs | Next.js |
| 11 | retirement-tax-calc | Vite |

## ディレクトリ構造

```
tax_apps/
├── apps/                       # アプリケーションコード
│   ├── portal/                 # ポータルサイト
│   ├── Required-documents-for-tax-return/  # 確定申告書類
│   │   ├── frontend/           #   Vite フロントエンド
│   │   ├── backend/            #   Express API
│   │   └── docker-compose.yml  #   独立 Compose
│   ├── gift-tax-simulator/     # 贈与税計算
│   │   └── docker-compose.yml
│   ├── gift-tax-docs/          # 贈与税書類
│   │   └── docker-compose.yml
│   ├── inheritance-tax-docs/   # 相続税資料ガイド
│   │   └── docker-compose.yml
│   ├── inheritance-tax-app/    # 相続税計算
│   │   └── docker-compose.yml
│   ├── inheritance-case-management/  # 案件管理
│   │   ├── web/                #   Next.js + Prisma
│   │   ├── .env                #   PostgreSQL認証情報
│   │   └── docker-compose.yml  #   PostgreSQL + Web
│   ├── medical-stock-valuation/ # 医療法人株式
│   │   └── docker-compose.yml
│   ├── shares-valuation/       # 非上場株式
│   │   └── docker-compose.yml
│   ├── retirement-tax-calc/    # 退職金税額計算
│   │   └── docker-compose.yml
│   └── bank-analyzer-django/   # 銀行分析
│       ├── data/               #   アップロードデータ（バインドマウント）
│       └── docker-compose.yml  #   PostgreSQL + Django + テスト
├── docker/                     # Docker 管理
│   ├── gateway/                # Gateway Compose プロジェクト
│   │   └── docker-compose.yml  #   Nginx + Portal
│   ├── scripts/                # 管理スクリプト
│   │   ├── manage.bat          #   Windows 管理スクリプト
│   │   └── manage.sh           #   Linux/Bash 管理スクリプト
│   ├── backups/                # バックアップ保存先（git管理外）
│   └── README.md               # このファイル
└── nginx/                      # Nginx 設定
    ├── Dockerfile              # Nginx イメージ
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
    └── readme.md               # Nginx説明
```

## 主な機能

### Gateway (Nginx)

- **Gzip圧縮**: CSS, JS, JSON等を自動圧縮
- **レート制限**: API 300req/s, 一般 1000req/s
- **セキュリティヘッダー**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Keep-Alive**: コネクション再利用
- **ヘルスチェック**: `/health` エンドポイント

### Docker Compose（各プロジェクト共通）

- **ログローテーション**: 10MB × 3ファイル
- **リソース制限**: deploy.resources による memory limit/reservation
- **ヘルスチェック**: 全サービスに設定
- **依存関係管理**: service_healthy 条件
- **外部ネットワーク**: `tax-apps-network` で全コンテナ間通信

## Preflight Check

`manage.bat preflight` で起動前の環境チェックを実行できます。`start` コマンドからも Docker 起動確認が自動実行されます。

| # | チェック項目 | 判定 |
|:--|:------------|:-----|
| 1 | Docker Desktop 起動確認 | ERROR（致命的） |
| 2 | `docker compose` コマンド確認 | ERROR（致命的） |
| 3 | docker-compose.yml ファイル存在確認（11個） | OK / WARN |
| 4 | Nginx 設定ファイル存在確認 | OK / WARN |
| 5 | ITCM `.env` ファイル存在確認 | OK / WARN |
| 6 | ポート競合検出（15ポート） | OK / WARN |
| 7 | ディスク空き容量（5GB未満で警告） | OK / WARN |

## データ永続化

各アプリケーションのデータは Docker Named Volume に保存されます。`manage.bat stop` や `manage.bat down` を実行してもデータは消えません。

| ボリューム名 | サービス | 内容 |
|:------------|:---------|:-----|
| `inheritance-case-management_postgres_data` | itcm-postgres | ITCM用 PostgreSQL データ |
| `bank-analyzer-postgres` | bank-analyzer-postgres | 銀行分析用 PostgreSQL + pgvector |
| `bank-analyzer-sqlite` | bank-analyzer | 銀行分析 SQLite（レガシー） |
| `tax-docs-data` | tax-docs-backend | 確定申告書類 SQLite |
| `medical-stock-valuation-data` | medical-stock-valuation | 医療法人株式 SQLite |

> `bank-analyzer-django/data/` のみバインドマウント（アップロードファイル用）

データを完全に削除したい場合は、`manage.bat clean` の Step 2 を実行してください。

## バックアップとリストア

### バックアップ

```bash
manage.bat backup
```

`docker\backups\2026-02-22_153000\` のようなタイムスタンプ付きフォルダにバックアップされます。

| # | データ | 方式 | 備考 |
|:--|:------|:-----|:-----|
| 1 | ITCM PostgreSQL | `pg_dump`（SQLダンプ） | コンテナ停止中はボリューム tar バックアップ |
| 2 | Bank Analyzer PostgreSQL | `pg_dump`（SQLダンプ） | 同上 |
| 3 | SQLite ボリューム（3つ） | `docker run alpine tar` | bank-analyzer-sqlite, tax-docs-data, medical-stock-data |
| 4 | アップロードデータ | `robocopy` | bank-analyzer/data/ |
| 5 | 設定ファイル | `copy` | ITCM .env |

### リストア

```bash
# 一覧から選択
manage.bat restore

# 直接指定
manage.bat restore 2026-02-22_153000
```

PostgreSQL はコンテナ起動中に `psql` でリストア、SQLite はボリュームに `tar` で復元します。

リストア後はアプリの再起動が必要です:
```bash
manage.bat restart inheritance-case-management
manage.bat restart bank-analyzer-django
```

## コード更新時の対応（git pull）

### Step 1. 最新コードを取得

```bash
cd tax_apps
git pull
```

### Step 2. 変更内容に応じて再起動

#### ソースコードのみの変更（`.ts`, `.tsx`, `.py` 等）

開発モードではソースコードがホストからコンテナにマウントされているため、**多くの場合は自動で反映されます**（ホットリロード）。反映されない場合:

```bash
manage.bat restart <app-name>
```

#### 依存関係・Dockerfile の変更を含む場合

`package.json`、`requirements.txt`、`Dockerfile` 等が変更された場合は**リビルドが必要**です。

```bash
# 特定アプリをリビルド
manage.bat build <app-name>
```

> どのアプリが変更されたかわからない場合は、変更されたアプリを個別に `build` してください。

#### Nginx 設定の変更

Nginx 設定ファイル（`nginx.conf`, `default.conf`, `includes/`）はコンテナにマウントされているため、リビルド不要でリロードできます。

```bash
docker exec tax-apps-gateway nginx -s reload
```

## トラブルシューティング

### コンテナが起動しない

```bash
# 特定アプリのログを確認
manage.bat logs <app-name>

# 全コンテナの状態を確認
manage.bat status
```

### 502 Bad Gateway

```bash
# Gateway のログを確認
manage.bat logs gateway

# バックエンドサービスの状態を確認
manage.bat status

# Nginx をリロード
docker exec tax-apps-gateway nginx -s reload
```

### データベース接続エラー

```bash
# ITCM PostgreSQL のログを確認
manage.bat logs inheritance-case-management

# Bank Analyzer のログを確認
manage.bat logs bank-analyzer

# 直接接続テスト
docker exec -it itcm-postgres psql -U postgres -d inheritance_tax_db
docker exec -it bank-analyzer-postgres psql -U bankuser -d bank_analyzer
```

### ホットリロードが効かない

Windows + Docker Desktop環境では、ボリュームマウントでファイル監視が正常に動作しないことがあります。変更が反映されない場合はコンテナを再起動してください。

```bash
manage.bat restart <app-name>
```

### 特定アプリだけ起動したい

全アプリを起動する必要はありません。個別の docker-compose.yml を直接使用できます:

```bash
# ネットワークを先に作成
docker network create tax-apps-network

# Gateway を起動
docker compose -f docker\gateway\docker-compose.yml up -d

# 必要なアプリだけ起動
docker compose -f apps\gift-tax-docs\docker-compose.yml up -d
```

### ネットワークエラー

全コンテナは `tax-apps-network` という外部ネットワークで通信します。ネットワークが存在しない場合:

```bash
docker network create tax-apps-network
```

## ポートマップ

| Port | サービス | Compose プロジェクト |
|:-----|:---------|:-------------------|
| 80 | Nginx Gateway | docker/gateway |
| 3000 | Portal | docker/gateway |
| 3001 | Gift Tax Simulator | apps/gift-tax-simulator |
| 3002 | Gift Tax Docs | apps/gift-tax-docs |
| 3003 | Inheritance Tax Docs | apps/inheritance-tax-docs |
| 3004 | Inheritance Tax App | apps/inheritance-tax-app |
| 3005 | Tax Docs Frontend | apps/Required-documents-for-tax-return |
| 3006 | Tax Docs Backend | apps/Required-documents-for-tax-return |
| 3007 | Bank Analyzer | apps/bank-analyzer-django |
| 3010 | Medical Stock Valuation | apps/medical-stock-valuation |
| 3012 | Shares Valuation | apps/shares-valuation |
| 3013 | Retirement Tax Calc | apps/retirement-tax-calc |
| 3020 | ITCM Web | apps/inheritance-case-management |
| 3022 | ITCM PostgreSQL | apps/inheritance-case-management |

## 技術スタック

- **Frontend**: Next.js 16, React 19, Vite
- **Backend**: Hono, Express, Django 5.x
- **Database**: PostgreSQL 16, SQLite
- **Infrastructure**: Docker, Nginx 1.27
- **Node.js**: v22 LTS (Frontend) / v24 (Backend)
- **Python**: 3.12 (Django)

### ヘルスチェック方式

| 対象 | ヘルスチェック方式 | 備考 |
|:-----|:------------------|:-----|
| Gateway | `curl --fail` | nginx Dockerfile に curl 追加 |
| Portal (prod) | `wget --spider` | nginx:alpine 内蔵 |
| Next.js / Hono / Express 系 (dev) | `node -e "fetch(...)"` | Node.js 内蔵 |
| Vite 系 (dev) | `wget --spider` | BusyBox 内蔵 |
| bank-analyzer (Django) | `curl --fail` | Dockerfile に curl 追加 |
| PostgreSQL | `pg_isready -U <user> -d <db>` | PostgreSQL 内蔵 |
