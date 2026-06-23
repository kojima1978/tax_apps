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
| Step 2 | Docker ボリューム（PostgreSQL, SQLite データ） | `DELETE DATA` 入力 |

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
| `docker-watchdog.ps1` | Windows PowerShell | Docker Desktop の応答確認・自動再起動・unhealthy コンテナ再起動 |
| `docker-watchdog.bat` | Windows (CMD) | 手動実行用の watchdog ラッパー（`-DryRun` 等の動作確認用。タスクスケジューラからは `.ps1` が直接呼ばれる） |
| `register-docker-watchdog-task.ps1` | Windows PowerShell | 15分ごとの Docker watchdog タスクを登録（`-Unregister` で解除） |
| `register-docker-watchdog-task.bat` | Windows (CMD) | watchdog タスク登録の自己昇格ラッパー（ダブルクリックで UAC 昇格 → 登録） |
| `unregister-docker-watchdog-task.bat` | Windows (CMD) | watchdog タスク解除の自己昇格ラッパー（ダブルクリックで UAC 昇格 → 解除） |

> **前提**: [Git for Windows](https://gitforwindows.org/) がインストールされていること（`bash` コマンドが必要）。

### かんたん操作（ダブルクリック）

| 操作 | スクリプト | 説明 |
|:-----|:---------|:-----|
| 開発モード起動 | `manage.bat` | ダブルクリックするだけで全アプリを開発モードで起動 |
| 本番モード起動 | `start-prod.bat` | ダブルクリックするだけで全アプリを本番モードで起動 |
| 停止 | `stop.bat` | ダブルクリックするだけで全アプリを停止 |
| 状態確認 | `status.bat` | ダブルクリックするだけで状態を確認 |
| 自動バックアップ | `backup-db.bat` | `backup.sh itcm` を呼び出す補助。ITCM PostgreSQLダンプ + JSONエクスポート + Excelテンプレート等を7日間保持 |
| Docker自動復旧 | `docker-watchdog.bat` | `docker info` が連続失敗した場合に Docker Desktop を再起動し、unhealthy コンテナも再起動 |

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
| `./manage.sh clean-cache [--all]` | Docker Build Cache の安全な削除 |
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
./manage.sh clean-cache                   # 7日以上未使用の Build Cache だけ削除
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
| Tax Docs | `runner` | nginx:1.27-alpine | あり |
| Shares Valuation | `runner` | nginx:1.27-alpine | あり |
| Retirement Tax Calc | `runner` | nginx:1.27-alpine | あり |
| Depreciation Calc | `runner` | nginx:1.27-alpine | あり |
| Asset Valuation | `runner` | nginx:1.27-alpine | あり |
| Medical Stock | `runner` | Node.js standalone | あり |
| Stock Valuation Form | `runner` | nginx:1.27-alpine | あり |
| Income Tax Calc | 全体本番ビルド対象外 | 開発中のため個別 Compose で起動 | あり |
| Bank Analyzer | `production` | Gunicorn | なし（`--profile production` で起動） |
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

DBなどの永続データは Docker Named Volume またはバインドマウントに保存されます。`./manage.sh stop` や `./manage.sh down` を実行しても、Named Volume とバインドマウント上のデータは消えません。

| ボリューム名 | サービス | 内容 |
|:------------|:---------|:-----|
| `inheritance-case-management_postgres_data` | itcm-postgres | ITCM用 PostgreSQL データ |
| `bank-analyzer-postgres` | bank-analyzer-postgres | 銀行分析用 PostgreSQL |
| `medical-stock-valuation-data` | medical-stock-valuation | 医療法人株式 SQLite |

バインドマウント:

| パス | サービス | 内容 |
|:-----|:---------|:-----|
| `apps/bank-analyzer-django/data/` | bank-analyzer | アップロードファイル・ユーザー設定 |

データを完全に削除したい場合は `./manage.sh clean` の Step 2 を実行してください。

### バックアップ

```bash
./manage.sh backup
```

`docker\backups\2026-02-22_153000.tar.gz.enc` のようなAES-256暗号化ファイルとして7日間保存されます。
あわせて、リポジトリと同じ階層の `tax_apps_backup_latest\all-apps\` に最新1日分だけ追加コピーされます。

暗号鍵は既定でリポジトリ外の `~/.tax-apps/backup.key` に初回実行時に作成されます。鍵を失うと復元できないため、アクセス制限した外部媒体へ鍵だけを別途保管してください。バックアップファイルと鍵を同じ場所へコピーしないでください。

| # | データ | 方式 | 備考 |
|:--|:------|:-----|:-----|
| 1 | ITCM PostgreSQL | `pg_dump`（SQLダンプ） | コンテナ停止中はボリューム tar バックアップ |
| 2 | Bank Analyzer PostgreSQL | `pg_dump`（SQLダンプ） | 同上 |
| 3 | SQLite 3アプリ | `better-sqlite3 backup` + `PRAGMA integrity_check` | 稼働中も整合性のあるスナップショットを取得 |
| 4 | Bank Analyzer データフォルダ | `cp` | `apps/bank-analyzer-django/data/` |
| 5 | 設定ファイル | `cp` | ITCM .env, Bank Analyzer .env |
| 6 | Bank Analyzer 案件別JSON | `manage.py export_case_json_backups` | 画面のJSONバックアップと同じ形式 |

> 全体バックアップの保持期間は既定で7日間です。変更する場合は `FULL_BACKUP_RETENTION_DAYS` を指定して `backup.sh` を実行してください。

### リストア

```bash
./manage.sh restore                       # 一覧から選択
./manage.sh restore 2026-02-22_153000.tar.gz.enc # 直接指定
./manage.sh verify 2026-02-22_153000.tar.gz.enc  # 上書きせず復号・整合性検証
```

PostgreSQL はコンテナ起動中に `psql` でリストア、SQLite はボリュームに `tar` で復元します。
リストアを承認すると、上書き前に現在データの `pre-restore_YYYY-MM-DD_HHMMSS` バックアップを自動作成します。事前バックアップに失敗した場合、リストアは中止されます。
リストア対象として選べるのは、全体バックアップ形式の `YYYY-MM-DD_HHMMSS` と `pre-restore_YYYY-MM-DD_HHMMSS` だけです。

リストア後はアプリの再起動が必要です:

```bash
./manage.sh restart inheritance-case-management
./manage.sh restart bank-analyzer-django
```

### 自動バックアップ（タスクスケジューラ）

`backup-db.bat` は互換コマンド `backup.sh itcm` を通じて、通常の `backup` と同じ暗号化済み全体バックアップを作成します。

```bash
./backup.sh itcm                           # Git Bashで実行（本体）
backup-db.bat                              # Windows補助。ダブルクリックまたはタスクスケジューラ用
```

| 項目 | 内容 |
|:-----|:-----|
| 対象 | PostgreSQL、SQLite、アップロード、設定、JSONエクスポート |
| SQLite方式 | オンラインバックアップ後に `PRAGMA integrity_check` |
| 暗号化 | AES-256-CBC、PBKDF2（200,000 iterations） |
| 保存先 | `docker\backups\YYYY-MM-DD_HHMMSS.tar.gz.enc` |
| 保持期間 | 7日間（古い暗号化ファイルは自動削除） |
| 追加保存先 | `tax_apps_backup_latest\all-apps\`（最新1日分） |

**タスクスケジューラへの登録手順:**

`register-backup-task.bat` をダブルクリックすると、現在ユーザーの最小権限で `Tax Apps Daily Backup` が毎日3:00に登録されます。管理者権限は不要です。`manage.sh preflight` は暗号化バックアップが26時間以上更新されていない場合に警告します。

> OneDrive等の同期フォルダに保存する場合は、`backup.sh` 実行時に `BACKUP_BASE` または `LATEST_BACKUP_BASE` を指定してください。

### Docker Desktop Watchdog（15分監視）

Docker Desktop 自体がクラッシュ、または `docker info` に応答しない状態になった場合に、Docker Desktop の再起動を試みる watchdog を用意しています。

**かんたん登録（推奨）**: `register-docker-watchdog-task.bat` をダブルクリック → UAC で「はい」をクリックするだけ。

**手動登録**（管理者 PowerShell から実行）:

```powershell
cd C:\Users\sashi\Desktop\dev\tax_apps\docker\scripts
powershell -NoProfile -ExecutionPolicy Bypass -File .\register-docker-watchdog-task.ps1
```

**かんたん解除**: `unregister-docker-watchdog-task.bat` をダブルクリック → UAC で「はい」をクリックするだけ。

**手動解除**:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\register-docker-watchdog-task.ps1 -Unregister
```

> スクリプト冒頭で管理者権限を検証するため、非管理者で実行するとエラーになります。

登録されるタスクの既定値:

| 項目 | 内容 |
|:-----|:-----|
| タスク名 | `Tax Apps Docker Watchdog` |
| 実行間隔 | 15分ごと |
| 実行条件 | ログオン中の現在ユーザーで実行（`RunLevel=Highest` で管理者権限） |
| 多重起動 | 新しいインスタンスを開始しない |
| ログ | `docker\logs\docker-watchdog.log` |
| 状態ファイル | `docker\logs\docker-watchdog.state.json`（直近の再起動時刻を記録） |
| 監視判定 | `docker info` が2回連続で失敗（タイムアウト or 非0終了）したら復旧処理を実行 |
| 復旧手順 | ① Docker関連プロセス kill（`Docker Desktop`, `com.docker.backend`, `com.docker.build`, `docker-sandbox`, `docker`） → ② `com.docker.service` 再起動（管理者権限が必要） → ③ `wsl --shutdown` で WSL バックエンドをリセット → ④ `Docker Desktop.exe` 起動 → ⑤ 最大300秒間 healthy 待機 |
| クールダウン | 直近45分以内に再起動済みなら復旧処理をスキップ（`docker-watchdog.state.json` を削除すれば即座に解除） |

手動確認:

```powershell
.\docker-watchdog.bat -DryRun
```

> 既定では Docker Desktop の復旧だけを行い、Tax Apps の `start --prod` は自動実行しません。コンテナ復帰は Compose の `restart: unless-stopped` に任せます。
> Docker 復旧後に Tax Apps も起動したい場合は、登録時に `-StartAppsAfterRecovery` を付けます。
> 登録時に既存タスクがある場合は自動的に上書き更新され、登録後に次回実行時刻が表示されます。

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
| Asset Valuation | http://localhost/asset-valuation/ | 3017 | Vite | 減価償却資産評価 |
| Income Tax Calc | http://localhost/income-tax-calc/ | 3018 | Vite | 所得税計算（個別起動のみ・全体管理対象外） |
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
| 5 | insurance-app | SQLite + Next.js |
| 6 | inheritance-tax-app | Vite |
| 7 | gift-tax-simulator | Vite |
| 8 | inheritance-tax-docs | Vite |
| 9 | retirement-tax-calc | Vite |
| 10 | depreciation-calc | Vite |
| 11 | asset-valuation | Vite |
| 12 | stock-valuation-form | Vite |
| 13 | gateway | Nginx + Portal（管理対象アプリ起動後に起動） |

### ポートマップ

ホストへ publish するポートは `127.0.0.1` に限定しています。LAN など外部端末からは直接アクセスできず、同一PC上のブラウザまたは Gateway 経由で利用します。

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
| 3013 | Retirement Tax Calc | apps/retirement-tax-calc |
| 3030 | Insurance App | apps/insurance-app |
| 3014 | Stock Valuation Form | apps/stock-valuation-form |
| 3015 | Depreciation Calc | apps/depreciation-calc |
| 3017 | Asset Valuation | apps/asset-valuation |
| 3018 | Income Tax Calc | apps/income-tax-calc（個別起動のみ） |
| 3020 | ITCM Web | apps/inheritance-case-management |
| 3022 | ITCM PostgreSQL | apps/inheritance-case-management |

### Preflight Check

`./manage.sh preflight` で起動前の環境チェックを実行できます。`start` コマンドからも Docker 起動確認が自動実行されます。
既に Tax Apps が起動中の場合、そのポートは外部競合ではなく Tax Apps 使用中として扱われます。

| # | チェック項目 | 判定 |
|:--|:------------|:-----|
| 1 | Docker Desktop 起動確認 | ERROR（致命的） |
| 2 | `docker compose` コマンド確認 | ERROR（致命的） |
| 3 | docker-compose.yml ファイル存在確認（13個、income-tax-calc 除外） | OK / WARN |
| 4 | Compose config 検証 | OK / WARN |
| 5 | Nginx 設定ファイル存在確認 | OK / WARN |
| 6 | ITCM `.env` ファイル存在確認 | OK / WARN |
| 7 | ポート競合検出（16ポート、Tax Apps 自身の使用ポートは除外） | OK / WARN |
| 8 | ホストディスク空き容量（5GB未満で警告） | OK / WARN |
| 9 | Docker daemon メモリ（4GB未満で警告） | OK / WARN |
| 10 | Docker ディスク使用量表示 | OK / WARN |

### Docker Build Cache Cleanup

`./manage.sh clean-cache` はコンテナ、イメージ、ボリューム、DBデータを削除せず、Docker Build Cache だけを確認付きで削除します。

| コマンド | 内容 |
|:---------|:-----|
| `./manage.sh clean-cache` | 7日以上使われていない Build Cache を削除 |
| `./manage.sh clean-cache --all` | 未使用の Build Cache をすべて削除（次回ビルドは遅くなる可能性あり） |

### Gateway 機能

| 機能 | 説明 |
|:-----|:-----|
| 動的DNS解決 | Docker DNS resolver + 変数で起動時のホスト名依存を排除。コンテナ未起動でも Gateway は起動し、該当サービスのみ 502 を返す |
| Gzip圧縮 | CSS, JS, JSON等を自動圧縮 |
| レート制限 | API 300req/s (burst=10), 一般 1000req/s (burst=200) |
| セキュリティヘッダー | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| ヘルスチェック | `/health`（liveness）、`/ready`（readiness）エンドポイント |

### Docker Compose 共通設定

| 設定 | 内容 |
|:-----|:-----|
| ログローテーション | 10MB × 3ファイル |
| リソース制限 | deploy.resources による memory limit/reservation（Gateway/Portal は 256M/64M） |
| ヘルスチェック | 全サービスに設定。コンテナ内の自己診断は IPv6 誤判定を避けるため `127.0.0.1` を使用 |
| 自動復旧 | `tax-apps.autoheal=true` ラベル付きの unhealthy コンテナを、ホスト側の `docker-watchdog.ps1` が再起動（Docker socket はコンテナへ渡さない） |
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
| Frontend | Next.js 16.1, React 19, Vite 6.3〜7.3 |
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
│   ├── insurance-app/          # 保険管理
│   │   └── docker-compose.yml
│   ├── retirement-tax-calc/    # 退職金税額計算
│   │   └── docker-compose.yml
│   ├── depreciation-calc/      # 減価償却計算
│   │   └── docker-compose.yml
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
│   ├── Dockerfile.vite-static  # Vite系アプリ共通Dockerfile（9アプリ共有）
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
│   │   ├── backup-db.bat       #   backup.sh itcm を呼び出す Windows 補助ラッパー
│   │   ├── docker-watchdog.ps1 #   Docker Desktop 監視/復旧本体
│   │   ├── docker-watchdog.bat #   watchdog Windows 補助ラッパー
│   │   ├── register-docker-watchdog-task.ps1 #  タスクスケジューラ登録
│   │   └── register-docker-watchdog-task.bat #  タスク登録の自己昇格ラッパー（UAC 昇格→登録）
│   ├── specs/                  # 仕様書
│   │   └── manage-script-spec.md #  管理スクリプト仕様書
│   ├── backups/                # バックアップ保存先（git管理外）
│   └── README.md               # このファイル
└── nginx/                      # Nginx 設定
    ├── .dockerignore           # Docker ビルド除外
    ├── Dockerfile              # Nginx イメージ
    ├── nginx.conf              # グローバル設定
    ├── default.conf            # ルーティング設定
    ├── robustness-checklist.md # 堅牢性チェックリスト
    ├── includes/               # 共通設定ファイル
    │   ├── proxy_params.conf       # プロキシ共通パラメータ
    │   ├── upstreams.conf          # アップストリーム参照情報
    │   ├── maps.conf               # Map定義
    │   ├── rate_limit_general.conf # 一般レート制限
    │   └── rate_limit_api.conf     # APIレート制限
    ├── html/                   # カスタムエラーページ
    │   ├── error-common.css    # エラーページ共通CSS
    │   ├── error-pages-spec.md # エラーページ仕様書
    │   ├── 404.html            # ページ未検出
    │   ├── 429.html            # Rate Limit超過
    │   ├── 50x.html            # サーバーエラー
    │   └── 503.html            # メンテナンス
    └── readme.md               # Nginx説明
```
