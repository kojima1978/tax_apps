# Tax Apps - Docker Environment

税理士業務支援アプリケーション統合プラットフォーム

## 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [クイックスタート](#クイックスタート)
- [管理コマンド](#管理コマンド)
- [開発モードと本番モード](#開発モードと本番モード)
- [コード更新時の対応](#コード更新時の対応git-pull)
- [データ管理](#データ管理)
- [トラブルシューティング](#トラブルシューティング)
- [リファレンス](#リファレンス)

---

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。各アプリケーションは独立した Docker Compose プロジェクトとして運用され、共有ネットワーク (`tax-apps-network`) を通じて Nginx Gateway 経由でアクセスします。

| 特徴 | 説明 |
|:-----|:-----|
| **障害分離** | 1つのアプリがクラッシュしても他に影響しない |
| **個別操作** | アプリ単位で起動・停止・リビルドが可能 |
| **共有ネットワーク** | `tax-apps-network` で全コンテナが通信 |
| **統一アクセス** | Nginx Gateway が全アプリへルーティング |

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
│  Portal App   │         │  Frontend Apps  │         │   Backend APIs    │
│  (nginx:alpine│         │  (Next.js/Vite) │         │  (Express/        │
│   Port 3000)  │         │                 │         │   Django)         │
└───────────────┘         └─────────────────┘         └─────────┬─────────┘
                                                                │
                                                       ┌────────┴────────┐
                                                       │   Databases     │
                                                       │  (PostgreSQL/   │
                                                       │   SQLite)       │
                                                       └─────────────────┘

※ 各ボックスはそれぞれ独立した docker-compose プロジェクト
※ DB依存アプリ（ITCM, bank-analyzer, tax-docs, medical-stock）は同一プロジェクト内にDBを含む
```

---

## クイックスタート

### 前提条件

| ソフトウェア | 確認コマンド | 備考 |
|:-----------|:------------|:-----|
| [Git](https://git-scm.com/downloads) | `git --version` | ソースコードの取得・更新に使用 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | コンテナの実行環境 |

> Docker Desktop をインストールすると `docker compose` コマンドも一緒に入ります。

### 初回セットアップ（git clone〜起動まで）

#### Step 1. リポジトリをクローン

```bash
git clone https://github.com/kojima1978/tax_apps.git
```

#### Step 2. Docker Desktop を起動

タスクバーにクジラのアイコンが表示され、**"Docker Desktop is running"** になるまで待ちます。

#### Step 3. manage.bat をダブルクリック

エクスプローラーで `tax_apps\docker\scripts\` フォルダを開き、`manage.bat` をダブルクリックします。

**これだけで完了です。** 内部で以下が自動的に行われます:

| 順番 | 処理 | 説明 |
|:-----|:-----|:-----|
| 1 | Docker 起動確認 | Docker Desktop が起動しているか確認 |
| 2 | ネットワーク作成 | `tax-apps-network` を自動作成（未作成時のみ） |
| 3 | 順次起動 | DB依存アプリ → フロントエンドアプリ → Gateway の順に起動 |
| 4 | 状態表示 | 全コンテナの状態を一覧表示 |

> 初回はDockerイメージのビルドがあるため、5〜15分ほどかかります。
> 2回目以降はキャッシュが効くため、数十秒で起動します。

#### Step 4. ブラウザでアクセス

http://localhost を開くとポータル画面が表示されます。

### 停止するとき

`stop.bat` をダブルクリック、または Git Bash で:

```bash
./manage.sh stop
```

データは Docker ボリュームに保存されているため、停止してもデータは消えません。

### 完全削除（アンインストール）

```bash
./manage.sh clean
```

二段階で確認されます:

| Step | 削除対象 | 確認 |
|:-----|:---------|:-----|
| Step 1 | コンテナ、Docker イメージ、ネットワーク | Y/N |
| Step 2 | Docker ボリューム（PostgreSQL, SQLite データ） | Y/N |

> Step 1 のみ実行して Step 2 をスキップすれば、データを残したままコンテナだけ削除できます。
> 削除後に `./manage.sh start` を実行すれば、再セットアップされます。

ソースコードごと完全に削除する場合は、上記の後にフォルダを削除します:

```bash
cd ..\..\..\
rd /s /q tax_apps
```

---

## 管理コマンド

管理スクリプトは `tax_apps\docker\scripts\` にあります。コマンド例は `manage.sh` を本体として記載し、`.bat` は Windows のダブルクリック用補助スクリプトとして扱います。

| スクリプト | 環境 | 説明 |
|-----------|------|------|
| `manage.sh` | Linux / Git Bash | 全機能搭載（本体） |
| `manage.bat` | Windows (CMD) | `manage.sh` を Git Bash 経由で呼び出す補助ラッパー（ダブルクリックで開発モード起動） |
| `backup.sh` | Linux / Git Bash | 全体バックアップ/リストア + ITCM定期バックアップ本体 |
| `backup-db.bat` | Windows (CMD) | `backup.sh itcm` を Git Bash 経由で呼び出す補助ラッパー |
| `start-prod.bat` | Windows (CMD) | ワンクリックで本番モード起動 |
| `stop.bat` | Windows (CMD) | ワンクリックで全アプリ停止 |
| `status.bat` | Windows (CMD) | ワンクリックで状態確認 |

> **前提**: [Git for Windows](https://gitforwindows.org/) がインストールされていること（`bash` コマンドが必要）。

### かんたん操作（ダブルクリック）

| 操作 | スクリプト | 説明 |
|:-----|:---------|:-----|
| 開発モード起動 | `manage.bat` | ダブルクリックするだけで全アプリを開発モードで起動 |
| 本番モード起動 | `start-prod.bat` | ダブルクリックするだけで全アプリを本番モードで起動 |
| 停止 | `stop.bat` | ダブルクリックするだけで全アプリを停止 |
| 状態確認 | `status.bat` | ダブルクリックするだけで状態を確認 |
| 自動バックアップ | `backup-db.bat` | `backup.sh itcm` を呼び出す補助。ITCM PostgreSQLダンプ + JSONエクスポート + Excelテンプレート等を7日間保持 |

> 詳細操作は下記「コマンド一覧」を参照してください。Windows のコマンドプロンプトから実行する場合は、補助ラッパーとして `manage.bat` に読み替えできます。

### コマンド一覧

| コマンド | 説明 |
|---------|------|
| `./manage.sh start` | 全アプリを開発モードで起動 |
| `./manage.sh start --prod` | 全アプリを本番モードでビルド＋起動 |
| `./manage.sh stop` | 全アプリを停止（逆順） |
| `./manage.sh down` | 全アプリを停止してコンテナ削除（逆順） |
| `./manage.sh restart <app>` | 指定アプリのみ再起動 |
| `./manage.sh build <app>` | 指定アプリを再ビルドして起動 |
| `./manage.sh logs <app>` | 指定アプリのログ表示 |
| `./manage.sh status` | 全アプリの状態表示 |
| `./manage.sh backup` | 全データベース・データをバックアップ |
| `./manage.sh restore [dir]` | バックアップからリストア |
| `./manage.sh clean` | コンテナ・イメージ・ボリュームのクリーンアップ |
| `./manage.sh preflight` | 起動前環境チェック |

### アプリ名の指定

`restart`, `build`, `logs` コマンドではアプリ名を**部分一致**で指定できます:

```bash
./manage.sh restart bank-analyzer-django  # フルネーム
./manage.sh restart bank-analyzer         # 部分一致
./manage.sh logs gift-tax-sim             # 部分一致
./manage.sh build retirement              # 部分一致
```

> **曖昧性警告**: 複数のアプリが一致する場合（例: `tax` → tax-docs, retirement-tax-calc 等）、エラーメッセージと候補一覧が表示されます。より具体的な名前を指定してください。

### 使用例

```bash
./manage.sh start                         # 全アプリを開発モードで起動
./manage.sh start --prod                  # 全アプリを本番モードで起動
./manage.sh status                        # 状態確認
./manage.sh build bank-analyzer           # 特定アプリを再ビルド
./manage.sh logs inheritance-tax-docs      # ログ確認
./manage.sh restart retirement-tax-calc   # 再起動
./manage.sh backup                        # バックアップ
./manage.sh preflight                     # 起動前チェック
```

### コマンドプロンプトの開き方

| 方法 | 手順 |
|:-----|:-----|
| **アドレスバー** | エクスプローラーで `docker\scripts` フォルダを開き、アドレスバーに `cmd` と入力して Enter |
| **右クリック（Win11）** | フォルダ内の空白部分を右クリック →「ターミナルで開く」 |
| **Shift+右クリック（Win10）** | フォルダ内の空白部分を Shift + 右クリック →「コマンド ウィンドウをここで開く」 |

---

## 開発モードと本番モード

### 比較

| 項目 | 開発モード (`start`) | 本番モード (`start --prod`) |
|:-----|:--------------------|:---------------------------|
| サーバー | Vite dev / Next.js dev / runserver | Nginx / Node standalone / Gunicorn |
| ソースマウント | あり（ホットリロード対応） | なし（イメージに内包） |
| 最適化 | なし | minify, tree-shaking, gzip |
| 非rootユーザー | 一部 | 全アプリ |
| メモリ使用量 | 多い（512M〜） | 少ない（64M〜256M） |
| ビルド | 不要（キャッシュ起動） | 必要（初回・更新時） |

### 本番モードで起動

```bash
# 全アプリ
./manage.sh start --prod

# 個別アプリ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

個別アプリの例:

```bash
docker compose -f apps\inheritance-tax-docs\docker-compose.yml -f apps\inheritance-tax-docs\docker-compose.prod.yml up -d --build
docker compose -f apps\bank-analyzer-django\docker-compose.yml -f apps\bank-analyzer-django\docker-compose.prod.yml up -d --build
```

### 開発モードに戻す

```bash
./manage.sh start
```

`--build` なしで既存の開発イメージを使用します。

### docker-compose.prod.yml の仕組み

各アプリに `docker-compose.prod.yml`（オーバーライドファイル）が用意されています。開発用の `docker-compose.yml` を本番向けに上書きします。

**主な上書き内容:**

| 設定 | 開発 → 本番 |
|:-----|:------------|
| `build.target` | `dev` → `runner`（または `production`） |
| `volumes` | ソースマウント削除（データボリュームのみ残す） |
| `command` | 本番サーバーコマンドに変更 |
| `deploy.resources` | メモリ制限を本番向けに削減 |

### アプリ別の本番構成

| アプリ | 本番ステージ | 本番サーバー | prod.yml |
|:------|:------------|:------------|:---------|
| Gift Tax Simulator | `runner` | nginx:1.27-alpine | あり |
| Inheritance Tax Docs | `runner` | nginx:1.27-alpine | あり |
| Inheritance Tax App | `runner` | nginx:1.27-alpine | あり |
| Tax Docs (frontend) | `runner` | nginx:1.27-alpine | あり |
| Tax Docs (backend) | `runner` | Node.js + tini | あり |
| Shares Valuation | `runner` | nginx:1.27-alpine | あり |
| Retirement Tax Calc | `runner` | nginx:1.27-alpine | あり |
| Depreciation Calc | `runner` | nginx:1.27-alpine | あり |
| Salary Calc | `runner` | nginx:1.27-alpine | あり |
| Asset Valuation | `runner` | nginx:1.27-alpine | あり |
| Medical Stock | `runner` | Node.js standalone | あり |
| Stock Valuation Form | `runner` | nginx:1.27-alpine | あり |
| Income Tax Calc | `runner` | nginx:1.27-alpine | あり |
| Bank Analyzer | `production` | Gunicorn | あり |
| ITCM | `runner` | Node.js standalone + tini | あり |

### Dockerfile マルチステージ構成

全アプリの Dockerfile は複数ステージで構成されています:

```
base → deps → dev        （開発サーバー）
              └→ builder → runner   （本番サーバー）
```

| ステージ | 用途 | 使用イメージ |
|:---------|:-----|:------------|
| `base` / `deps` | 依存関係インストール | node:22-alpine |
| `dev` | 開発サーバー（ホットリロード） | node:22-alpine |
| `builder` | 本番ビルド（`npm run build`） | node:22-alpine |
| `runner` | 本番サーバー | nginx:1.27-alpine / node:22-alpine |

> Django（bank-analyzer）は `builder` → `production` → `dev` の順で、本番ステージ名は `production` です。

---

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
./manage.sh restart <app-name>
```

#### 依存関係・Dockerfile の変更を含む場合

`package.json`、`requirements.txt`、`Dockerfile` 等が変更された場合は**リビルドが必要**です:

```bash
./manage.sh build <app-name>
```

#### Nginx 設定の変更

Nginx 設定ファイル（`nginx.conf`, `default.conf`, `includes/`）はコンテナにマウントされているため、リビルド不要でリロードできます:

```bash
docker exec tax-apps-gateway nginx -s reload
```

> 本番モードではソースマウントがないため、コード変更後は必ず `./manage.sh start --prod` で再ビルドしてください。

---

## データ管理

### 永続化

各アプリケーションのデータは Docker Named Volume に保存されます。`./manage.sh stop` や `./manage.sh down` を実行してもデータは消えません。

| ボリューム名 | サービス | 内容 |
|:------------|:---------|:-----|
| `inheritance-case-management_postgres_data` | itcm-postgres | ITCM用 PostgreSQL データ |
| `bank-analyzer-postgres` | bank-analyzer-postgres | 銀行分析用 PostgreSQL |
| `bank-analyzer-sqlite` | bank-analyzer | 銀行分析 SQLite（レガシー） |
| ~~`tax-docs-data`~~ | ~~tax-docs-backend~~ | ~~確定申告書類 SQLite~~ ※廃止済み |
| `medical-stock-valuation-data` | medical-stock-valuation | 医療法人株式 SQLite |

> `bank-analyzer-django/data/` のみバインドマウント（アップロードファイル用）

データを完全に削除したい場合は `./manage.sh clean` の Step 2 を実行してください。

### バックアップ

```bash
./manage.sh backup
```

`docker\backups\2026-02-22_153000\` のようなタイムスタンプ付きフォルダに保存されます。
あわせて、リポジトリと同じ階層の `tax_apps_backup_latest\full\` に最新1日分だけ追加コピーされます。

| # | データ | 方式 | 備考 |
|:--|:------|:-----|:-----|
| 1 | ITCM PostgreSQL | `pg_dump`（SQLダンプ） | コンテナ停止中はボリューム tar バックアップ |
| 2 | Bank Analyzer PostgreSQL | `pg_dump`（SQLダンプ） | 同上 |
| 3 | SQLite ボリューム（2つ） | `docker run alpine tar` | bank-analyzer-sqlite, medical-stock-valuation-data |
| 4 | アップロードデータ | `cp` | bank-analyzer/data/ |
| 5 | 設定ファイル | `copy` | ITCM .env |

### リストア

```bash
./manage.sh restore                       # 一覧から選択
./manage.sh restore 2026-02-22_153000     # 直接指定
```

PostgreSQL はコンテナ起動中に `psql` でリストア、SQLite はボリュームに `tar` で復元します。

リストア後はアプリの再起動が必要です:

```bash
./manage.sh restart inheritance-case-management
./manage.sh restart bank-analyzer-django
```

### 自動バックアップ（タスクスケジューラ）

`backup.sh itcm` を使って ITCM PostgreSQL + JSONエクスポート + Excelテンプレート等の定期バックアップを設定できます。Windows のタスクスケジューラでは補助ラッパーの `backup-db.bat` を指定できます。

```bash
./backup.sh itcm                           # Git Bashで実行（本体）
backup-db.bat                              # Windows補助。ダブルクリックまたはタスクスケジューラ用
```

| 項目 | 内容 |
|:-----|:-----|
| 対象① | ITCM PostgreSQL（`itcm-postgres` コンテナ） |
| 方式① | `pg_dump --clean --if-exists`、`pg_dump -Fc`、`pg_dumpall --globals-only` |
| 保存先① | `docker\backups\itcm-db\itcm-db_YYYYMMDD_HHMMSS.sql`、`.dump`、`itcm-globals_YYYYMMDD_HHMMSS.sql` |
| 対象② | ITCM JSONエクスポート（画面の「エクスポート」と同等） |
| 方式② | `/itcm/api/backup` をダウンロード |
| 保存先② | `docker\backups\itcm-json\itcm-json_YYYYMMDD_HHMMSS.json` |
| 対象③ | Excelテンプレート（見積書・請求書・依頼票） |
| 方式③ | `cp`（`*.xlsx` フィルタ） |
| 保存先③ | `docker\backups\itcm-templates\itcm-templates_YYYYMMDD_HHMMSS\` |
| 対象④ | 復元補助ファイル（Prisma schema/migrations、Compose、`.env`） |
| 方式④ | `cp` |
| 保存先④ | `docker\backups\itcm-app\itcm-app_YYYYMMDD_HHMMSS\` |
| 保持期間 | 7日間（古いファイルは自動削除） |
| 追加保存先 | `tax_apps` と同じ階層の `tax_apps_backup_latest\itcm\`（最新1日分のみ） |

**タスクスケジューラへの登録手順:**

1. `taskschd.msc` を開く（Win+R →「taskschd.msc」）
2. 「タスクの作成」→ 名前: `ITCM DB Backup`
3. トリガー: 毎日、深夜 3:00
4. 操作: プログラム `C:\Users\Desktop\dev\tax_apps\docker\scripts\backup-db.bat`（内部で `backup.sh itcm` を実行）
5. 条件: 「AC電源でのみ」のチェックを外す（ノートPCの場合）
6. 設定: 「タスクを停止するまでの時間」を1時間に設定

> OneDrive等の同期フォルダに保存する場合は、`backup.sh` 実行時に `BACKUP_BASE` または `LATEST_BACKUP_BASE` を指定してください。

---

## トラブルシューティング

### コンテナが起動しない

```bash
./manage.sh logs <app-name>               # ログ確認
./manage.sh status                        # 全体の状態確認
```

### 502 Bad Gateway

対象アプリのコンテナが停止中または起動失敗しています。Gateway 自体は動的DNS解決を使用しているため、特定アプリが停止していてもクラッシュしません。

```bash
./manage.sh status                        # 全体の状態確認（停止中のアプリを特定）
./manage.sh logs <app-name>               # 問題のアプリのログ確認
./manage.sh build <app-name>              # 再ビルドして起動
```

### データベース接続エラー

```bash
./manage.sh logs inheritance-case-management  # ITCM ログ
./manage.sh logs bank-analyzer                # Bank Analyzer ログ

# 直接接続テスト
docker exec -it itcm-postgres psql -U postgres -d inheritance_tax_db
docker exec -it bank-analyzer-postgres psql -U bankuser -d bank_analyzer
```

### ホットリロードが効かない

Windows + Docker Desktop 環境では、ボリュームマウントでファイル監視が正常に動作しないことがあります:

```bash
./manage.sh restart <app-name>
```

### 特定アプリだけ起動したい

全アプリを起動する必要はありません。個別の docker-compose.yml を直接使用できます:

```bash
docker network create tax-apps-network                          # ネットワーク作成
docker compose -f docker\gateway\docker-compose.yml up -d       # Gateway 起動
docker compose -f apps\tax-docs\docker-compose.yml up -d        # 必要なアプリだけ起動
```

### ネットワークエラー

全コンテナは `tax-apps-network` という外部ネットワークで通信します。ネットワークが存在しない場合:

```bash
docker network create tax-apps-network
```

---

## リファレンス

### サービス一覧

| アプリケーション | Gateway URL | Port | 技術 | 説明 |
|:----------------|:------------|:-----|:-----|:-----|
| Portal | http://localhost/ | 3000 | Next.js | メインポータル |
| Gift Tax Simulator | http://localhost/gift-tax-simulator/ | 3001 | Vite | 贈与税計算シミュレーター |
| Tax Docs | http://localhost/tax-docs/ | 3002 | Vite | 確定申告 必要書類 |
| Inheritance Tax Docs | http://localhost/inheritance-tax-docs/ | 3003 | Vite | 相続税 資料ガイド |
| Inheritance Tax App | http://localhost/inheritance-tax-app/ | 3004 | Vite | 相続税計算 |
| Bank Analyzer | http://localhost/bank-analyzer/ | 3007 | Django + PostgreSQL | 銀行分析 |
| Medical Stock | http://localhost/medical/ | 3010 | Next.js + SQLite | 医療法人株式評価 |
| Shares Valuation | http://localhost/shares/ | 3012 | Vite | 非上場株式評価 |
| Retirement Tax | http://localhost/retirement-tax-calc/ | 3013 | Vite | 退職金税額計算 |
| Stock Valuation Form | http://localhost/stock-valuation-form/ | 3014 | Vite | 株式評価明細書 |
| Depreciation Calc | http://localhost/depreciation-calc/ | 3015 | Vite | 減価償却計算 |
| Salary Calc | http://localhost/salary-calc/ | 3016 | Vite | 給与・賞与 手取り計算 |
| Asset Valuation | http://localhost/asset-valuation/ | 3017 | Vite | 減価償却資産評価 |
| Income Tax Calc | http://localhost/income-tax-calc/ | 3018 | Vite | 所得税計算 |
| ITCM | http://localhost/itcm/ | 3020 | Next.js + PostgreSQL | 案件管理システム |

### バックエンドサービス

| サービス | Port | 説明 |
|:--------|:-----|:-----|
| itcm-postgres | 3022 | ITCM用 PostgreSQL |
| bank-analyzer-postgres | 5432 (内部) | 銀行分析用 PostgreSQL |

### 起動順序

manage.sh は以下の順序でアプリを起動します（停止は逆順）:

| # | アプリ | 備考 |
|:--|:------|:-----|
| 1 | inheritance-case-management | PostgreSQL + Next.js |
| 2 | bank-analyzer-django | PostgreSQL + Django |
| 3 | tax-docs | Vite |
| 4 | medical-stock-valuation | SQLite + Next.js |
| 5 | shares-valuation | Vite |
| 6 | inheritance-tax-app | Vite |
| 7 | gift-tax-simulator | Vite |
| 8 | inheritance-tax-docs | Vite |
| 9 | retirement-tax-calc | Vite |
| 10 | depreciation-calc | Vite |
| 11 | salary-calc | Vite |
| 12 | asset-valuation | Vite |
| 13 | stock-valuation-form | Vite |
| 14 | income-tax-calc | Vite |
| 15 | gateway | Nginx + Portal（全アプリ起動後に起動） |

### ポートマップ

| Port | サービス | Compose プロジェクト |
|:-----|:---------|:-------------------|
| 80 | Nginx Gateway | docker/gateway |
| 3000 | Portal | docker/gateway |
| 3001 | Gift Tax Simulator | apps/gift-tax-simulator |
| 3002 | Tax Docs Frontend | apps/tax-docs |
| 3003 | Inheritance Tax Docs | apps/inheritance-tax-docs |
| 3004 | Inheritance Tax App | apps/inheritance-tax-app |
| 3007 | Bank Analyzer | apps/bank-analyzer-django |
| 3010 | Medical Stock Valuation | apps/medical-stock-valuation |
| 3012 | Shares Valuation | apps/shares-valuation |
| 3013 | Retirement Tax Calc | apps/retirement-tax-calc |
| 3014 | Stock Valuation Form | apps/stock-valuation-form |
| 3015 | Depreciation Calc | apps/depreciation-calc |
| 3016 | Salary Calc | apps/salary-calc |
| 3017 | Asset Valuation | apps/asset-valuation |
| 3018 | Income Tax Calc | apps/income-tax-calc |
| 3020 | ITCM Web | apps/inheritance-case-management |
| 3022 | ITCM PostgreSQL | apps/inheritance-case-management |

### Preflight Check

`./manage.sh preflight` で起動前の環境チェックを実行できます。`start` コマンドからも Docker 起動確認が自動実行されます。

| # | チェック項目 | 判定 |
|:--|:------------|:-----|
| 1 | Docker Desktop 起動確認 | ERROR（致命的） |
| 2 | `docker compose` コマンド確認 | ERROR（致命的） |
| 3 | docker-compose.yml ファイル存在確認（15個） | OK / WARN |
| 4 | Nginx 設定ファイル存在確認 | OK / WARN |
| 5 | ITCM `.env` ファイル存在確認 | OK / WARN |
| 6 | ポート競合検出（18ポート） | OK / WARN |
| 7 | ディスク空き容量（5GB未満で警告） | OK / WARN |

### Gateway 機能

| 機能 | 説明 |
|:-----|:-----|
| 動的DNS解決 | Docker DNS resolver + 変数で起動時のホスト名依存を排除。コンテナ未起動でも Gateway は起動し、該当サービスのみ 502 を返す |
| Gzip圧縮 | CSS, JS, JSON等を自動圧縮 |
| レート制限 | API 300req/s (burst=10), 一般 1000req/s (burst=200) |
| セキュリティヘッダー | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| ヘルスチェック | `/health` エンドポイント |

### Docker Compose 共通設定

| 設定 | 内容 |
|:-----|:-----|
| ログローテーション | 10MB × 3ファイル |
| リソース制限 | deploy.resources による memory limit/reservation |
| ヘルスチェック | 全サービスに設定 |
| 依存関係管理 | service_healthy 条件 |
| 外部ネットワーク | `tax-apps-network` で全コンテナ間通信 |

### ヘルスチェック方式

| 対象 | 方式 | 備考 |
|:-----|:-----|:-----|
| Gateway | `curl --fail` | nginx Dockerfile に curl 追加 |
| Portal (prod) | `wget --spider` | nginx:alpine 内蔵 |
| Next.js / Express 系 (dev) | `node -e "fetch(...)"` | Node.js 内蔵 |
| Vite 系 (dev) | `wget --spider` | BusyBox 内蔵 |
| Django | `curl --fail` | Dockerfile に curl 追加 |
| PostgreSQL | `pg_isready -U <user> -d <db>` | PostgreSQL 内蔵 |

### 技術スタック

| カテゴリ | 技術 |
|:---------|:-----|
| Frontend | Next.js 16, React 19, Vite 6〜7 |
| Backend | Next.js API Routes, Django 5.x |
| Database | PostgreSQL 16 Alpine, SQLite |
| Infrastructure | Docker, Nginx 1.27 |
| Node.js | v22 LTS |
| Python | 3.12 (Django) |

### ディレクトリ構造

```
tax_apps/
├── apps/                       # アプリケーションコード
│   ├── portal/                 # ポータルサイト
│   ├── tax-docs/               # 確定申告 必要書類
│   │   └── docker-compose.yml
│   ├── gift-tax-simulator/     # 贈与税計算
│   │   └── docker-compose.yml
│   ├── inheritance-tax-docs/   # 相続税資料ガイド
│   │   └── docker-compose.yml
│   ├── inheritance-tax-app/    # 相続税計算
│   │   └── docker-compose.yml
│   ├── inheritance-case-management/  # 案件管理
│   │   ├── web/                #   Next.js + Prisma
│   │   ├── .env                #   PostgreSQL認証情報
│   │   ├── docker-compose.yml  #   PostgreSQL + Web（dev）
│   │   └── docker-compose.prod.yml  #   本番オーバーライド
│   ├── medical-stock-valuation/ # 医療法人株式
│   │   └── docker-compose.yml
│   ├── shares-valuation/       # 非上場株式
│   │   └── docker-compose.yml
│   ├── retirement-tax-calc/    # 退職金税額計算
│   │   └── docker-compose.yml
│   ├── depreciation-calc/      # 減価償却計算
│   │   └── docker-compose.yml
│   ├── salary-calc/            # 給与・賞与 手取り計算
│   │   └── docker-compose.yml
│   ├── asset-valuation/        # 減価償却資産評価
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── stock-valuation-form/   # 株式評価明細書
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── income-tax-calc/        # 所得税計算
│   │   └── docker-compose.yml
│   └── bank-analyzer-django/   # 銀行分析
│       ├── data/               #   アップロードデータ（バインドマウント）
│       └── docker-compose.yml  #   PostgreSQL + Django + テスト
├── docker/                     # Docker 管理
│   ├── Dockerfile.vite-static  # Vite系アプリ共通Dockerfile（10アプリ共有）
│   ├── gateway/                # Gateway Compose プロジェクト
│   │   ├── docker-compose.yml  #   Nginx + Portal
│   │   └── docker-compose.prod.yml  #   本番オーバーライド
│   ├── scripts/                # 管理スクリプト
│   │   ├── manage.sh           #   管理スクリプト本体（全機能）
│   │   ├── manage.bat          #   Windows 補助ラッパー（ダブルクリックで開発モード起動）
│   │   ├── backup.sh           #   全体バックアップ/リストア + ITCM定期バックアップ本体
│   │   ├── start-prod.bat      #   ワンクリック本番モード起動
│   │   ├── stop.bat            #   ワンクリック停止
│   │   ├── status.bat          #   ワンクリック状態確認
│   │   └── backup-db.bat       #   backup.sh itcm を呼び出す Windows 補助ラッパー
│   ├── specs/                  # 仕様書
│   │   └── manage-script-spec.md #  管理スクリプト仕様書
│   ├── backups/                # バックアップ保存先（git管理外）
│   └── README.md               # このファイル
└── nginx/                      # Nginx 設定
    ├── Dockerfile              # Nginx イメージ
    ├── nginx.conf              # グローバル設定
    ├── default.conf            # ルーティング設定
    ├── includes/               # 共通設定ファイル
    │   ├── proxy_params.conf       # プロキシ共通パラメータ
    │   ├── upstreams.conf          # アップストリーム参照情報
    │   ├── maps.conf               # Map定義
    │   ├── rate_limit_general.conf # 一般レート制限
    │   └── rate_limit_api.conf     # APIレート制限
    ├── html/                   # カスタムエラーページ
    │   ├── 404.html            # ページ未検出
    │   ├── 429.html            # Rate Limit超過
    │   ├── 50x.html            # サーバーエラー
    │   └── 503.html            # メンテナンス
    └── readme.md               # Nginx説明
```
