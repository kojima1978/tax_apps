# 管理スクリプト仕様書

Tax Apps コンテナ管理スクリプト (`manage.bat` / `manage.sh`) の技術仕様書

**最終更新**: 2026-03-26
**バージョン**: 2.1（salary-calc, asset-valuation 追加）

---

## 目次

- [1. 概要](#1-概要)
- [2. スクリプト一覧](#2-スクリプト一覧)
- [3. アプリケーション定義](#3-アプリケーション定義)
- [4. コマンド仕様](#4-コマンド仕様)
- [5. サブルーチン仕様](#5-サブルーチン仕様)
- [6. アプリ名解決ロジック](#6-アプリ名解決ロジック)
- [7. バックアップ仕様](#7-バックアップ仕様)
- [8. リストア仕様](#8-リストア仕様)
- [9. Preflight Check 仕様](#9-preflight-check-仕様)
- [10. エンコーディング制約](#10-エンコーディング制約)
- [11. 補助スクリプト](#11-補助スクリプト)

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
| シェル | CMD.exe (Windows) | Bash (Linux / Git Bash / WSL) |
| 前提 | Docker Desktop, docker compose v2 | Docker, docker compose v2 |
| エンコーディング | Shift-JIS (932) + CRLF | UTF-8 + LF |
| 機能 | 全機能 | 全機能（manage.bat と同等） |

---

## 2. スクリプト一覧

| ファイル | パス | 説明 |
|:---------|:-----|:-----|
| `manage.bat` | `docker/scripts/manage.bat` | Windows メイン管理スクリプト |
| `manage.sh` | `docker/scripts/manage.sh` | Linux/Bash メイン管理スクリプト |
| `convert_encoding.ps1` | `docker/scripts/convert_encoding.ps1` | UTF-8 → Shift-JIS 変換ツール |
| `inspect_bat.ps1` | `docker/scripts/inspect_bat.ps1` | manage.bat 構造検査ツール |

---

## 3. アプリケーション定義

### アプリ一覧（起動順序）

| # | 変数名 | パス | 説明 | ポート |
|:--|:-------|:-----|:-----|:-------|
| 1 | `APP_1` | `apps\inheritance-case-management` | 案件管理 (PostgreSQL + Next.js) | 3020 |
| 2 | `APP_2` | `apps\bank-analyzer-django` | 銀行分析 (PostgreSQL + Django) | 3007 |
| 3 | `APP_3` | `apps\Required-documents-for-tax-return` | 確定申告書類 (SQLite + Express + Vite) | 3005/3006 |
| 4 | `APP_4` | `apps\medical-stock-valuation` | 医療法人株式 (SQLite + Next.js) | 3010 |
| 5 | `APP_5` | `apps\shares-valuation` | 非上場株式 (Vite) | 3012 |
| 6 | `APP_6` | `apps\inheritance-tax-app` | 相続税計算 (Vite) | 3004 |
| 7 | `APP_7` | `apps\gift-tax-simulator` | 贈与税計算 (Vite) | 3001 |
| 8 | `APP_8` | `apps\gift-tax-docs` | 贈与税書類 (Vite) | 3002 |
| 9 | `APP_9` | `apps\inheritance-tax-docs` | 相続税資料ガイド (Vite) | 3003 |
| 10 | `APP_10` | `apps\retirement-tax-calc` | 退職金税額計算 (Vite) | 3013 |
| 11 | `APP_11` | `apps\depreciation-calc` | 減価償却計算 (Vite) | 3015 |
| 12 | `APP_12` | `apps\salary-calc` | 給与手取り計算 (Vite) | 3016 |
| 13 | `APP_13` | `apps\asset-valuation` | 減価償却資産評価 (Vite) | 3017 |
| 14 | `APP_14` | `apps\stock-valuation-form` | 株式評価明細書 (Vite) **開発中** | 3014 |
| 15 | `APP_15` | `docker\gateway` | Nginx Gateway + Portal | 80/3000 |

**合計**: `APP_COUNT=15`

### 起動順序の設計根拠

```
[1-2] DB依存アプリ（PostgreSQL コンテナが depends_on で先に起動）
[3-4] SQLite + バックエンド付きアプリ
[5-14] フロントエンドのみアプリ
[15] Gateway（全アプリのコンテナ名を upstream として参照するため最後）
```

停止・削除時は**逆順**（Gateway → フロントエンド → DB依存）で処理する。

### 本番モード除外アプリ

以下のアプリは `start --prod` 実行時にスキップされる:

| アプリ | 理由 |
|:-------|:-----|
| `stock-valuation-form` | 開発中のため本番ビルド対象外 |

**manage.bat での実装**: `:do_start_app` 内で `APP_NAME` をチェック
**manage.sh での実装**: `PROD_SKIP_APPS` 配列で管理

---

## 4. コマンド仕様

### 4.1 start

```
manage.bat start [--prod]
manage.sh start [--prod]
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを起動 |
| 引数 | `--prod`: 本番モード（オプション） |
| 前処理 | Docker 起動確認 (`preflight_quick`)、ネットワーク作成 (`ensure_network`) |
| 処理 | `APP_1` → `APP_12` の順に `docker compose up -d` |
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
- 本番モード時、`PROD_SKIP_APPS` に含まれるアプリはスキップ（`[WARN]` 表示）

### 4.2 stop

```
manage.bat stop
manage.sh stop
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを停止 |
| 処理順序 | `APP_12` → `APP_1`（逆順） |
| コマンド | `docker compose stop` |
| 備考 | コンテナは停止のみ（削除しない） |

### 4.3 down

```
manage.bat down
manage.sh down
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリを停止しコンテナ削除 |
| 処理順序 | `APP_12` → `APP_1`（逆順） |
| コマンド | `docker compose down` |
| 備考 | ボリュームは残る |

### 4.4 restart

```
manage.bat restart <app-name>
manage.sh restart <app-name>
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 指定アプリを再起動 |
| 引数 | `app-name`: 部分一致で解決（[6章](#6-アプリ名解決ロジック)参照） |
| 前処理 | ネットワーク確認 |
| コマンド | `docker compose restart` |

### 4.5 build

```
manage.bat build <app-name>
manage.sh build <app-name>
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 指定アプリを再ビルドして起動 |
| 引数 | `app-name`: 部分一致で解決 |
| コマンド | `docker compose up -d --build` |

### 4.6 logs

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

### 4.7 status

```
manage.bat status
manage.sh status
```

| 項目 | 説明 |
|:-----|:-----|
| 概要 | 全アプリのコンテナ状態を一覧表示 |
| 表示項目 | ネットワーク状態、コンテナ名、ステータス、ポート |
| 出力形式 | テーブル形式 |

### 4.8 backup

```
manage.bat backup
manage.sh backup
```

詳細は [7章](#7-バックアップ仕様) を参照。

### 4.9 restore

```
manage.bat restore [backup-dir]
manage.sh restore [backup-dir]
```

詳細は [8章](#8-リストア仕様) を参照。

### 4.10 clean

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
| `tax-docs-data` | 確定申告書類 SQLite |
| `medical-stock-valuation-data` | 医療法人株式 SQLite |

> Step 2 をスキップすればデータを残してコンテナ・イメージのみ削除可能

### 4.11 preflight

```
manage.bat preflight
manage.sh preflight
```

詳細は [9章](#9-preflight-check-仕様) を参照。

---

## 5. サブルーチン仕様

### manage.bat サブルーチン一覧

| ラベル | 引数 | 戻り値 | 説明 |
|:-------|:-----|:-------|:-----|
| `:do_start_app` | `%1`=app_index | - | 単一アプリ起動（開発/本番分岐、.env自動生成、開発中スキップ） |
| `:do_stop_app` | `%1`=app_index | - | 単一アプリ停止 |
| `:do_down_app` | `%1`=app_index | - | 単一アプリ停止・削除 |
| `:do_status_app` | `%1`=app_index | - | 単一アプリ状態表示 |
| `:do_clean_app` | `%1`=app_index | - | 単一アプリ削除（`--rmi local`） |
| `:do_clean_volume` | `%1`=volume_name | - | ボリューム削除（存在確認付き） |
| `:do_backup_sqlite` | `%1`=volume, `%2`=filename | `SQLITE_OK`/`SQLITE_SKIP` | SQLite ボリュームを tar.gz バックアップ |
| `:do_restore_sqlite` | `%1`=filename, `%2`=volume | `SQLITE_OK`/`RESTORE_FAIL` | SQLite ボリュームを tar.gz からリストア |
| `:do_preflight_compose` | `%1`=app_index | `COMPOSE_FOUND`/`COMPOSE_MISSING` | docker-compose.yml 存在確認 |
| `:do_preflight_nginx` | `%1`=config_path | `NGINX_OK`/`PF_WARN` | Nginx 設定ファイル存在確認 |
| `:do_preflight_port` | `%1`=port | `PORT_CONFLICT`/`PF_WARN` | ポート使用中警告 |
| `:do_show_backup` | `%1`=backup_index | - | バックアップ一覧表示（サイズ付き） |
| `:do_show_app` | `%1`=app_index | - | アプリ名表示 |
| `:do_resolve_check` | `%1`=app_index | `MATCH_COUNT`/`FIRST_MATCH`/`MATCH_LIST` | アプリ名部分一致チェック |

### manage.bat ユーティリティ関数

| ラベル | 引数 | 戻り値 | 説明 |
|:-------|:-----|:-------|:-----|
| `:require_app_arg` | `%1`=command_name | `RESOLVED_DIR`, `APP_NAME`, ERRORLEVEL | アプリ引数バリデーション + 解決 |
| `:init_app_vars` | `%1`=app_index | `APP_PATH`, `COMPOSE_FILE`, `APP_NAME`, ERRORLEVEL | アプリ変数初期化 |
| `:format_dir_size` | `%1`=dir_path | `DIR_SIZE_RESULT` | ディレクトリサイズ取得 (PowerShell) |
| `:ensure_network` | - | - | `tax-apps-network` 作成（未作成時のみ） |
| `:resolve_app` | `%1`=search_string | `RESOLVED_DIR` | アプリ名解決（部分一致、曖昧性チェック） |
| `:show_apps` | - | - | アプリ一覧表示 |
| `:preflight_quick` | - | ERRORLEVEL | Docker 起動確認のみ |

---

## 6. アプリ名解決ロジック

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
| `gift-tax-docs` | 1件 (`gift-tax-docs`) | 正常解決 |
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

## 7. バックアップ仕様

### 概要

| 項目 | 値 |
|:-----|:---|
| 保存先 | `docker/backups/<TIMESTAMP>/` |
| タイムスタンプ形式 | `yyyy-MM-dd_HHmmss` |
| データソース数 | 5カテゴリ |

### バックアップ対象

| # | データ | ボリューム/パス | 方式 | ファイル名 |
|:--|:-------|:---------------|:-----|:-----------|
| 1 | ITCM PostgreSQL | `inheritance-case-management_postgres_data` | `pg_dump` → SQL / ボリューム tar | `itcm-postgres.sql` or `itcm-postgres-volume.tar.gz` |
| 2 | Bank Analyzer PostgreSQL | `bank-analyzer-postgres` | `pg_dump` → SQL / ボリューム tar | `bank-analyzer-postgres.sql` or `bank-analyzer-postgres-volume.tar.gz` |
| 3a | Bank Analyzer SQLite | `bank-analyzer-sqlite` | ボリューム tar | `bank-analyzer-sqlite.tar.gz` |
| 3b | Tax Docs SQLite | `tax-docs-data` | ボリューム tar | `tax-docs-data.tar.gz` |
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

  Destination: docker\backups\2026-03-08_120000\
  Size: 15.2 MB
  OK: 5  Skipped: 2  Failed: 0

  To restore: manage.bat restore 2026-03-08_120000
```

バックアップ件数が 0 の場合、空ディレクトリを自動削除する。

---

## 8. リストア仕様

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

## 9. Preflight Check 仕様

### チェック項目

| # | チェック | 判定 | 方式 |
|:--|:--------|:-----|:-----|
| 1 | Docker Desktop 起動確認 | ERROR (致命的) | `docker info` |
| 2 | docker compose コマンド確認 | ERROR (致命的) | `docker compose version` |
| 3 | docker-compose.yml 存在確認 (15個) | WARN | 各 `APP_*` パスの `docker-compose.yml` 存在チェック |
| 4 | Nginx 設定ファイル確認 | WARN | `nginx.conf`, `default.conf`, `upstreams.conf`, `maps.conf` |
| 5 | ITCM `.env` 確認 | WARN | ファイル存在チェック（`.env.example` からのコピーを案内） |
| 6 | ポート競合検出 (19ポート) | WARN | `netstat` (bat) / `ss`+`netstat` (sh) |
| 7 | ディスク空き容量 | WARN | 5GB 未満で警告 |

### 対象ポート一覧

```
80, 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007,
3010, 3012, 3013, 3014, 3015, 3016, 3017, 3020, 3022, 5173
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

## 10. エンコーディング制約

### manage.bat 固有の制約

| 項目 | 値 |
|:-----|:---|
| ファイルエンコーディング | **Shift-JIS (コードページ 932)** |
| 改行コード | **CRLF** |
| 理由 | CMD.exe がシステムコードページ (932) でバッチファイルを読み込むため |

### 編集時の注意事項

Claude Code の Write/Edit ツールは UTF-8 で保存するため、manage.bat 編集後は必ずエンコーディング変換が必要:

```powershell
powershell -ExecutionPolicy Bypass -File docker/scripts/convert_encoding.ps1 ^
  -InputFile manage.bat -OutputFile manage.bat
```

### 禁止事項

- `chcp 65001` をバッチファイル内で使用しない（日本語テキストの行読み取りバグの原因）
- UTF-8 エンコーディングのまま CMD.exe で実行しない（パーサーエラーの原因）

---

## 11. 補助スクリプト

### convert_encoding.ps1

| 項目 | 値 |
|:-----|:---|
| パス | `docker/scripts/convert_encoding.ps1` |
| 機能 | UTF-8 → Shift-JIS (932) 変換 + CRLF 正規化 |
| 引数 | `-InputFile <path>` `-OutputFile <path>` |
| 出力 | 書き込みバイト数、先頭15バイト、CRLF 件数 |

### inspect_bat.ps1

| 項目 | 値 |
|:-----|:---|
| パス | `docker/scripts/inspect_bat.ps1` |
| 機能 | manage.bat の構造検査（ラベル、アプリ一覧、セクション確認） |
| 用途 | manage.bat 編集後の整合性検証 |

---

## 付録: 変数・定数一覧

### manage.bat グローバル変数

| 変数名 | 値 | 説明 |
|:-------|:---|:-----|
| `SCRIPT_DIR` | `%~dp0` | スクリプトディレクトリ |
| `PROJECT_ROOT` | 計算値 | リポジトリルート（`docker/scripts/` の2階層上） |
| `NETWORK_NAME` | `tax-apps-network` | 外部ネットワーク名 |
| `BACKUP_BASE` | `%SCRIPT_DIR%..\backups` | バックアップベースディレクトリ |
| `APP_COUNT` | `15` | アプリ総数 |
| `APP_1`〜`APP_15` | パス文字列 | 各アプリの相対パス |

### manage.sh グローバル変数

| 変数名 | 値 | 説明 |
|:-------|:---|:-----|
| `SCRIPT_DIR` | 計算値 | スクリプトディレクトリ |
| `PROJECT_ROOT` | 計算値 | リポジトリルート |
| `NETWORK_NAME` | `tax-apps-network` | 外部ネットワーク名 |
| `BACKUP_BASE` | `$SCRIPT_DIR/../backups` | バックアップベースディレクトリ |
| `APPS` | 配列 (15要素) | アプリパス一覧 |
| `VOLUMES` | 配列 (5要素) | データボリューム一覧 |
| `PROD_SKIP_APPS` | 配列 | 本番モード除外アプリ一覧 |
