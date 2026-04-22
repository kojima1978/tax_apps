# 管理スクリプト仕様書

Tax Apps コンテナ管理スクリプト (`manage.bat` / `manage.sh`) の技術仕様書

**最終更新**: 2026-04-18
**バージョン**: 3.0（manage.bat を Git Bash ラッパー化）

---

## 目次

- [1. 概要](#1-概要)
- [2. スクリプト一覧](#2-スクリプト一覧)
- [3. アプリケーション定義](#3-アプリケーション定義)
- [4. バックアップ/リストア対象定義](#4-バックアップリストア対象定義)
- [5. コマンド仕様](#5-コマンド仕様)
- [6. サブルーチン仕様（manage.sh）](#6-サブルーチン仕様managesh)
- [7. アプリ名解決ロジック](#7-アプリ名解決ロジック)
- [8. バックアップ仕様](#8-バックアップ仕様)
- [9. リストア仕様](#9-リストア仕様)
- [10. Preflight Check 仕様](#10-preflight-check-仕様)

---

## 1. 概要

### 目的

複数の独立した Docker Compose プロジェクト（15アプリ）を統合管理するオーケストレーションスクリプト。

### 設計方針

| 項目 | 方針 |
|:-----|:-----|
| 個別 Compose | 各アプリは独自の `docker-compose.yml` を持ち、スタンドアロン起動可能 |
| 共有ネットワーク | 全コンテナは外部ネットワーク `tax-apps-network` で通信 |
| 起動順序制御 | DB依存アプリを先に、Gateway を最後に起動 |
| 障害分離 | 1アプリの障害が他に影響しない |
| 本番/開発切替 | `docker-compose.prod.yml` オーバーライドによる本番モード |

### 動作環境

| 項目 | manage.bat | manage.sh |
|:-----|:-----------|:----------|
| 役割 | ASCII のみの薄いラッパー（manage.sh を Git Bash 経由で実行） | 全機能搭載の本体スクリプト |
| シェル | CMD.exe → Git Bash | Bash (Linux / Git Bash / WSL) |
| 前提 | Git for Windows, Docker Desktop, docker compose v2 | Docker, docker compose v2 |
| エンコーディング | ASCII（日本語なし） | UTF-8 + LF |

> **設計根拠**: CMD.exe のバッチパーサーはシステムコードページ 932 (Shift-JIS) でファイルを読み込むため、UTF-8 の日本語バイト列で改行 (0x0D) が Shift-JIS トレイルバイトとして消費され行が結合する。一方 Shift-JIS エンコーディングは VS Code・git 等の UTF-8 前提ツールで編集するたびに壊れる。この構造的問題を解決するため、manage.bat を ASCII のみのラッパーとし、全ロジック・日本語テキストを manage.sh に一元化した。

---

## 2. スクリプト一覧

| ファイル | パス | 説明 |
|:---------|:-----|:-----|
| `manage.bat` | `docker/scripts/manage.bat` | Windows ラッパー（Git Bash 経由で manage.sh を実行） |
| `manage.sh` | `docker/scripts/manage.sh` | 管理スクリプト本体（全機能） |

### manage.bat の仕組み

```batch
@echo off
:: Git Bash (C:\Program Files\Git\bin\bash.exe) を検索
:: 見つからない場合は git コマンドのパスから推定
"%GIT_BASH%" "%~dp0manage.sh" %*
```

WSL の bash (`C:\Windows\System32\bash.exe`) ではなく、Git for Windows の bash を明示的に使用する。検索優先順位:

1. `C:\Program Files\Git\bin\bash.exe`
2. `C:\Program Files (x86)\Git\bin\bash.exe`
3. `where git` のパスから `../bin/bash.exe` を推定

---

## 3. アプリケーション定義

### アプリ一覧（起動順序）

| # | 変数名 | パス | 説明 | ポート |
|:--|:-------|:-----|:-----|:-------|
| 1 | `APP_1` | `apps\inheritance-case-management` | 案件管理 (PostgreSQL + Next.js + Prisma) | 3020/3022 |
| 2 | `APP_2` | `apps\bank-analyzer-django` | 銀行分析 (PostgreSQL + Django) | 3007 |
| 3 | `APP_3` | `apps\tax-docs` | 所得税・贈与税書類リスト (Vite) | 3002 |
| 4 | `APP_4` | `apps\medical-stock-valuation` | 医療法人株式 (SQLite + Next.js) | 3010 |
| 5 | `APP_5` | `apps\shares-valuation` | 非上場株式 (Vite) | 3012 |
| 6 | `APP_6` | `apps\inheritance-tax-app` | 相続税計算 (Vite) | 3004 |
| 7 | `APP_7` | `apps\gift-tax-simulator` | 贈与税計算 (Vite) | 3001 |
| 8 | `APP_8` | `apps\inheritance-tax-docs` | 相続税資料ガイド (Vite) | 3003 |
| 9 | `APP_9` | `apps\retirement-tax-calc` | 退職金税額計算 (Vite) | 3013 |
| 10 | `APP_10` | `apps\depreciation-calc` | 減価償却計算 (Vite) | 3015 |
| 11 | `APP_11` | `apps\salary-calc` | 給与手取り計算 (Vite) | 3016 |
| 12 | `APP_12` | `apps\asset-valuation` | 減価償却資産評価 (Vite) | 3017 |
| 13 | `APP_13` | `apps\stock-valuation-form` | 株式評価明細書 (Vite) | 3014 |
| 14 | `APP_14` | `apps\income-tax-calc` | 所得税計算 (Vite) | 3018 |
| 15 | `APP_15` | `docker\gateway` | Nginx Gateway + Portal (Next.js) | 80/3000 |

**合計**: `APP_COUNT=15`

> **注**: Portal アプリ (`apps/portal/`) は Gateway の docker-compose.yml 内にサービスとして定義されている（`portal-app`）。独自の docker-compose.yml は持たない。

### 起動順序の設計根拠

```
[1-2] DB依存アプリ（PostgreSQL コンテナが depends_on で先に起動）
[3-4] SQLite + バックエンド付きアプリ
[5-14] フロントエンドのみアプリ
[15] Gateway（全アプリのコンテナ名を upstream として参照するため最後）
```

停止・削除時は**逆順**（Gateway → フロントエンド → DB依存）で処理する。

### 変更履歴

| バージョン | 変更内容 |
|:-----------|:---------|
| 2.0 | 初版（12アプリ） |
| 2.1 | salary-calc, asset-valuation 追加（14アプリ） |
| 2.2 | Required-documents-for-tax-return → tax-docs に統合済み反映、gift-tax-docs → inheritance-tax-docs の後に番号変更、stock-valuation-form 本番ビルド対応、ポート一覧更新 |
| 2.3 | income-tax-calc 追加（15アプリ化）、APP_14=income-tax-calc、gateway を APP_15 に変更 |
| 2.4 | backup/restore データ駆動化リファクタリング: `PG_TARGETS`/`SQLITE_TARGETS`/`BIND_TARGETS`/`SETTINGS_TARGETS` 定数配列に集約、`cmd_status` を `for_each_app` コールバック統一、ヘルパー関数抽出 (`backup_bind_data`, `backup_settings_file`, `restore_bind_data`, `restore_settings_file`) |
| 3.0 | manage.bat を Git Bash ラッパー化: CMD.exe の Shift-JIS 制約と UTF-8 ツールの非互換を根本解決。全ロジック・日本語テキストを manage.sh に一元化。manage.bat は ASCII のみの16行ラッパーに。convert_encoding.ps1 は不要に |

---

## 4. バックアップ/リストア対象定義

backup/restore コマンドで扱うデータソースは、manage.sh 内の定数配列でデータ駆動的に定義されている。新しいバックアップ対象を追加する際は、この定義に1行追加するだけで backup/restore 両方に反映される。

### 4.1 PostgreSQL ターゲット

| manage.sh |
|:----------|
| `PG_TARGETS` 配列（コロン区切り） |

**フィールド**: `label:container:pg_user:db_name:volume:dump_file:restart_hint`

| # | label | container | pg_user | db_name | volume | dump_file | restart_hint |
|:--|:------|:----------|:--------|:--------|:-------|:----------|:-------------|
| 1 | ITCM PostgreSQL | itcm-postgres | postgres | inheritance_tax_db | inheritance-case-management_postgres_data | itcm-postgres | inheritance-case-management |
| 2 | Bank Analyzer PostgreSQL | bank-analyzer-postgres | bankuser | bank_analyzer | bank-analyzer-postgres | bank-analyzer-postgres | bank-analyzer-django |

### 4.2 SQLite ターゲット

| manage.sh |
|:----------|
| `SQLITE_TARGETS` 配列 |

**フィールド**: `volume:filename`

| # | volume | filename |
|:--|:-------|:---------|
| 1 | bank-analyzer-sqlite | bank-analyzer-sqlite |
| 2 | tax-docs-data | tax-docs-data |
| 3 | medical-stock-valuation-data | medical-stock-valuation-data |

### 4.3 バインドマウントターゲット

| manage.sh |
|:----------|
| `BIND_TARGETS` 配列 |

**フィールド**: `label:src_relative_path:backup_dirname`

| # | label | src_relative_path | backup_dirname |
|:--|:------|:------------------|:---------------|
| 1 | bank-analyzer upload | apps/bank-analyzer-django/data | bank-analyzer-upload |

### 4.4 設定ファイルターゲット

| manage.sh |
|:----------|
| `SETTINGS_TARGETS` 配列 |

**フィールド**: `label:src_relative_path:backup_filename`

| # | label | src_relative_path | backup_filename |
|:--|:------|:------------------|:----------------|
| 1 | ITCM .env | apps/inheritance-case-management/.env | itcm-.env |

### 4.5 ステップ番号の自動計算

ステップ総数は `PG件数 + 1(SQLite) + BIND件数 + SETTINGS件数` で自動計算される。各ステップのラベル `[n/total]` は実行時に動的に生成される。

---

## 5. コマンド仕様

### 5.1 start

```
manage.bat start [--prod]
manage.sh start [--prod]
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを起動 |
| 引数 | `--prod`: 本番モード（オプション） |
| 前処理 | Docker 起動確認 (`preflight_quick`)、ネットワーク作成 (`ensure_network`) |
| 処理 | `APP_1` → `APP_15` の順に `docker compose up -d` |
| 後処理 | `status` を自動表示 |

**開発モード** (`start`):

```
docker compose -f <app>/docker-compose.yml up -d
```

**本番モード** (`start --prod`):

```
docker compose -f <app>/docker-compose.yml -f <app>/docker-compose.prod.yml up -d --build
```

> `docker-compose.prod.yml` が存在しない場合は `docker-compose.yml` のみで `--build` 起動

**付帯処理**:
- `.env.example` が存在し `.env` がない場合、自動コピー

### 5.2 stop

```
manage.bat stop
manage.sh stop
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを停止 |
| 処理順序 | `APP_15` → `APP_1`（逆順） |
| コマンド | `docker compose stop` |
| 備考 | コンテナは停止のみ（削除しない） |

### 5.3 down

```
manage.bat down
manage.sh down
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを停止しコンテナ削除 |
| 処理順序 | `APP_15` → `APP_1`（逆順） |
| コマンド | `docker compose down` |
| 備考 | ボリュームは残る |

### 5.4 restart

```
manage.bat restart <app-name>
manage.sh restart <app-name>
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 指定アプリを再起動 |
| 引数 | `app-name`: 部分一致で解決（[7章](#7-アプリ名解決ロジック)参照） |
| 前処理 | ネットワーク確認 |
| コマンド | `docker compose restart` |

### 5.5 build

```
manage.bat build <app-name>
manage.sh build <app-name>
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 指定アプリを再ビルドして起動 |
| 引数 | `app-name`: 部分一致で解決 |
| コマンド | `docker compose up -d --build` |

### 5.6 logs

```
manage.bat logs <app-name>
manage.sh logs <app-name>
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 指定アプリのログをリアルタイム表示 |
| 引数 | `app-name`: 部分一致で解決 |
| コマンド | `docker compose logs -f` |
| 終了 | `Ctrl+C` で終了 |

### 5.7 status

```
manage.bat status
manage.sh status
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリのコンテナ状態を一覧表示 |
| 表示項目 | ネットワーク状態、コンテナ名、ステータス、ポート |
| 出力形式 | テーブル形式 |

### 5.8 backup

```
manage.bat backup
manage.sh backup
```

詳細は [8章](#8-バックアップ仕様) を参照。

### 5.9 restore

```
manage.bat restore [backup-dir]
manage.sh restore [backup-dir]
```

詳細は [9章](#9-リストア仕様) を参照。

### 5.10 clean

```
manage.bat clean
manage.sh clean
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | コンテナ・イメージ・ボリュームの二段階クリーンアップ |

**Step 1** (Y/N確認):
- 全コンテナを逆順で `docker compose down --rmi local --remove-orphans`
- `tax-apps-network` を削除

**Step 2** (Y/N確認、オプション):
- 以下の Docker Named Volume を削除:

| ボリューム名 | 内容 |
|:------------|:-----|
| `inheritance-case-management_postgres_data` | ITCM PostgreSQL |
| `bank-analyzer-postgres` | 銀行分析 PostgreSQL |
| `bank-analyzer-sqlite` | 銀行分析 SQLite |
| ~~`tax-docs-data`~~ | ~~税務書類 SQLite~~ ※廃止済み |
| `medical-stock-valuation-data` | 医療法人株式 SQLite |

> Step 2 をスキップすればデータを残してコンテナ・イメージのみ削除可能

### 5.11 preflight

```
manage.bat preflight
manage.sh preflight
```

詳細は [10章](#10-preflight-check-仕様) を参照。

---

## 6. サブルーチン仕様（manage.sh）

> manage.bat はラッパーのみのため、全ロジックは manage.sh に集約されている。

### コールバック関数

| 関数 | 引数 | 説明 |
|:-----|:-----|:-----|
| `_do_start` | `dir`, `name`, `prod_mode` | 単一アプリ起動（開発/本番分岐、.env自動生成） |
| `_do_compose_action` | `dir`, `name`, `action`, `label` | 単一アプリに対する docker compose コマンド実行 |
| `_do_status` | `dir`, `name` | 単一アプリ状態表示 |
| `_do_clean_app` | `dir`, `name` | 単一アプリのコンテナ・イメージ削除 |

### ヘルパー関数

| 関数 | 引数 | 説明 |
|:-----|:-----|:-----|
| `backup_postgres` | `label`, `container`, `pg_user`, `db_name`, `volume`, `dump_file` | PostgreSQL バックアップ（pg_dump → volume fallback） |
| `restore_postgres` | `label`, `container`, `pg_user`, `db_name`, `volume`, `dump_file`, `restart_hint` | PostgreSQL リストア（SQL → volume fallback） |
| `backup_sqlite_volumes` | `pair...` | SQLite ボリュームのバックアップ（`volume:filename` 形式） |
| `restore_sqlite_volumes` | `pair...` | SQLite ボリュームのリストア（`filename.tar.gz:volume` 形式） |
| `backup_bind_data` | `step_label`, `label`, `src_dir`, `dest_dir` | バインドマウントデータのバックアップ |
| `backup_settings_file` | `step_label`, `label`, `src_file`, `dest_file` | 設定ファイルのバックアップ |
| `restore_bind_data` | `step_label`, `label`, `src_dir`, `dest_dir` | バインドマウントデータのリストア |
| `restore_settings_file` | `step_label`, `label`, `src_file`, `dest_file` | 設定ファイルのリストア |
| `for_each_app` | `callback`, `args...` | 全アプリを順方向で反復 |
| `for_each_app_reverse` | `callback`, `args...` | 全アプリを逆順で反復 |
| `resolve_app_dir` | `name` | アプリ名解決（部分一致、完全一致優先） |
| `require_app_arg` | `cmd_name`, `app_name` | アプリ引数バリデーション + 解決 |
| `ensure_network` | - | `tax-apps-network` 作成（未作成時のみ） |
| `print_summary_banner` | `title`, `fail_count` | バックアップ/リストアのサマリーバナー表示 |

---

## 7. アプリ名解決ロジック

`restart`, `build`, `logs` コマンドで使用されるアプリ名の解決処理。

### 処理フロー

```
入力: search_string（ユーザー指定のアプリ名）
  │
  ├── 全 APP_1〜APP_15 のパスに対して findstr /i (bat) または *match* (sh) で部分一致検索
  │
  ├── 一致数 == 0 → [ERROR] アプリが見つかりません + アプリ一覧表示
  │
  ├── 一致数 == 1 → RESOLVED_DIR に設定（正常）
  │
  └── 一致数 >= 2 → [ERROR] 複数一致 + 候補一覧表示
                      → RESOLVED_DIR = 空（コマンド中止）
```

### 曖昧性チェック

| 入力 | 一致結果 | 動作 |
|:-----|:---------|:-----|
| `bank-analyzer` | 1件 (`bank-analyzer-django`) | 正常解決 |
| `tax-docs` | 1件 (`tax-docs`) | 正常解決 |
| `tax` | 複数件 (tax-docs, retirement-tax-calc 等) | エラー + 候補表示 |
| `inheritance` | 複数件 | エラー + 候補表示 |
| `nonexistent` | 0件 | エラー + アプリ一覧表示 |

### manage.sh の追加仕様

manage.sh の `resolve_app_dir()` では、部分一致で複数件ヒットした場合でも `basename` の**完全一致**があればそれを優先する。

```bash
# 例: "gateway" → apps/xxx-gateway と docker/gateway の2件ヒット
#     → basename "gateway" 完全一致の docker/gateway が選択される
```

---

## 8. バックアップ仕様

### 概要

| 項目 | 値 |
|:-----|:---|
| 保存先 | `docker/backups/<TIMESTAMP>/` |
| タイムスタンプ形式 | `yyyy-MM-dd_HHmmss` |
| データソース数 | 5カテゴリ（[4章](#4-バックアップリストア対象定義)の定数定義から自動展開） |

### バックアップ対象

| # | データ | ボリューム/パス | 方式 | ファイル名 |
|:--|:-------|:---------------|:-----|:-----------|
| 1 | ITCM PostgreSQL | `inheritance-case-management_postgres_data` | `pg_dump` → SQL / ボリューム tar | `itcm-postgres.sql` or `itcm-postgres-volume.tar.gz` |
| 2 | Bank Analyzer PostgreSQL | `bank-analyzer-postgres` | `pg_dump` → SQL / ボリューム tar | `bank-analyzer-postgres.sql` or `bank-analyzer-postgres-volume.tar.gz` |
| 3a | Bank Analyzer SQLite | `bank-analyzer-sqlite` | ボリューム tar | `bank-analyzer-sqlite.tar.gz` |
| ~~3b~~ | ~~Tax Docs SQLite~~ | ~~`tax-docs-data`~~ | ~~ボリューム tar~~ | ~~`tax-docs-data.tar.gz`~~ ※廃止済み |
| 3c | Medical Stock SQLite | `medical-stock-valuation-data` | ボリューム tar | `medical-stock-valuation-data.tar.gz` |
| 4 | アップロードデータ | `apps/bank-analyzer-django/data/` | `robocopy` (bat) / `cp -r` (sh) | `bank-analyzer-upload/` |
| 5 | 設定ファイル | `apps/inheritance-case-management/.env` | `copy` / `cp` | `itcm-.env` |

### PostgreSQL バックアップ フォールバック

```
コンテナ起動中?
  ├── Yes → pg_dump でSQLダンプ
  │         ├── 成功 → .sql ファイル保存
  │         └── 失敗 → ボリューム tar にフォールバック
  └── No  → ボリュームが存在する?
              ├── Yes → docker run alpine tar でボリューム tar
              └── No  → [SKIP]
```

### SQLite バックアップ

```
ボリュームが存在する?
  ├── Yes → docker run alpine tar czf でバックアップ
  │         ├── 成功 → SQLITE_OK++
  │         └── 失敗 → BACKUP_FAIL++
  └── No  → SQLITE_SKIP++
```

### サマリー出力

```
============================================================
  Backup Complete
============================================================

  Destination: docker\backups\2026-03-28_120000\
  Size: 15.2 MB
  OK: 5  Skipped: 2  Failed: 0

  To restore: manage.bat restore 2026-03-28_120000
```

バックアップ件数が 0 の場合、空ディレクトリを自動削除する。

---

## 9. リストア仕様

### 概要

| 項目 | 値 |
|:-----|:---|
| ソース | `docker/backups/<TIMESTAMP>/` |
| 選択方式 | 引数指定 or 対話選択 |
| 確認 | Y/N プロンプト |

### 対話選択フロー

```
引数あり? → 指定ディレクトリの存在確認
  ├── 存在 → リストア確認へ
  └── 不存在 → エラー表示、一覧表示へフォールバック

引数なし → バックアップ一覧表示（番号 + サイズ）
  → ユーザーが番号選択
  → 0 = キャンセル
```

### リストア対象

| # | データ | ファイル名 | リストア方式 |
|:--|:-------|:-----------|:------------|
| 1 | ITCM PostgreSQL | `itcm-postgres.sql` | コンテナ内 `psql` で DROP → CREATE → IMPORT |
| 1' | ITCM PostgreSQL (volume) | `itcm-postgres-volume.tar.gz` | ボリュームに tar 展開 |
| 2 | Bank Analyzer PostgreSQL | `bank-analyzer-postgres.sql` | 同上 |
| 2' | Bank Analyzer PostgreSQL (volume) | `bank-analyzer-postgres-volume.tar.gz` | 同上 |
| 3 | SQLite ボリューム | `*.tar.gz` | ボリュームに tar 展開（ボリューム未作成時は自動作成） |
| 4 | アップロードデータ | `bank-analyzer-upload/` | `robocopy` / `cp -r` |
| 5 | 設定ファイル | `itcm-.env` | `copy` / `cp` |

### PostgreSQL リストア手順

```
1. 既存接続を強制切断 (pg_terminate_backend)
2. データベースを DROP
3. データベースを CREATE
4. SQL ダンプを psql でインポート
```

> コンテナが起動していない場合はエラーとなり、先に `restart` を案内する。

### リストア後の案内

```
[NOTE] Restart apps to apply restored data:
  manage.bat restart inheritance-case-management
  manage.bat restart bank-analyzer-django
```

---

## 10. Preflight Check 仕様

### チェック項目

| # | チェック | 判定 | 方式 |
|:--|:--------|:-----|:-----|
| 1 | Docker Desktop 起動確認 | ERROR (致命的) | `docker info` |
| 2 | docker compose コマンド確認 | ERROR (致命的) | `docker compose version` |
| 3 | docker-compose.yml 存在確認 (15個) | WARN | 各 `APP_*` パスの `docker-compose.yml` 存在チェック |
| 4 | Nginx 設定ファイル確認 | WARN | `nginx.conf`, `default.conf`, `upstreams.conf`, `maps.conf` |
| 5 | ITCM `.env` 確認 | WARN | ファイル存在チェック（`.env.example` からのコピーを案内） |
| 6 | ポート競合検出 (18ポート) | WARN | `ss` + `netstat` フォールバック |
| 7 | ディスク空き容量 | WARN | 5GB 未満で警告 |

### 対象ポート一覧

```
80, 3000, 3001, 3002, 3003, 3004, 3007,
3010, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3020, 3022, 5432
```

### 判定ロジック

- **ERROR**: 処理を中止し、修正を案内する
- **WARN**: 警告表示のみ、`start` コマンドの実行は可能
- **OK**: 問題なし

### サマリー出力

```
============================================================
  Results:  OK=7  WARN=0  ERROR=0
============================================================

All checks passed!
```

### start コマンドとの連携

`start` コマンド実行時は簡易版 `preflight_quick` が自動実行される。Docker 起動確認のみ行い、失敗時はエラー表示して中止する。

---

## 付録: 変数・定数一覧

### manage.sh グローバル変数

| 変数名 | 値 | 説明 |
|:-------|:---|:-----|
| `SCRIPT_DIR` | 計算値 | スクリプトディレクトリ |
| `PROJECT_ROOT` | 計算値 | リポジトリルート |
| `NETWORK_NAME` | `tax-apps-network` | 外部ネットワーク名 |
| `BACKUP_BASE` | `$SCRIPT_DIR/../backups` | バックアップベースディレクトリ |
| `APPS` | 配列 (15要素) | アプリパス一覧 |
| `VOLUMES` | 配列 (5要素) | データボリューム一覧 |
| `PG_TARGETS` | 配列 (2要素) | PostgreSQL バックアップ/リストア対象定義（コロン区切り） |
| `SQLITE_TARGETS` | 配列 (3要素) | SQLite バックアップ/リストア対象定義 |
| `BIND_TARGETS` | 配列 (1要素) | バインドマウントバックアップ/リストア対象定義 |
| `SETTINGS_TARGETS` | 配列 (1要素) | 設定ファイルバックアップ/リストア対象定義 |
