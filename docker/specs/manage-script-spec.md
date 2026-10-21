# 管理スクリプト仕様書

Tax Apps コンテナ管理スクリプト (`manage.bat` / `manage.sh` / `backup.sh`) の技術仕様書

**最終更新**: 2026-10-20
**バージョン**: 4.0（現状に合わせて全面改訂。バックアップ系の `backup.sh` への分離、アプリ単位のリストア、無人処理・テスト・照合順序のコマンド、preflight のチェック13〜23）

> 運用上の「なぜそうなっているか」は `tax_apps/CLAUDE.md` の「manage.sh / backup.sh」「自動起動・自動復旧」が正本。
> この文書はコマンドと定義の一覧に徹する。リストアの手順は `docker/RESTORE.md`、照合順序の移行は `docker/COLLATION-MIGRATION.md`。

---

## 目次

- [1. 概要](#1-概要)
- [2. スクリプト一覧](#2-スクリプト一覧)
- [3. アプリケーション定義](#3-アプリケーション定義)
- [4. バックアップ/リストア対象定義](#4-バックアップリストア対象定義)
- [5. コマンド仕様](#5-コマンド仕様)
- [6. サブルーチン仕様（manage.sh）](#6-サブルーチン仕様managesh)
- [7. アプリ名解決ロジック](#7-アプリ名解決ロジック)
- [8. バックアップ・リストア仕様](#8-バックアップリストア仕様)
- [9. 無人処理](#9-無人処理)
- [10. Preflight Check 仕様](#10-preflight-check-仕様)

---

## 1. 概要

### 目的

複数の独立した Docker Compose プロジェクト（14管理対象アプリ + gateway。`APPS` 配列 15 要素）を統合管理するオーケストレーションスクリプト。

### 設計方針

| 項目 | 方針 |
|:-----|:-----|
| 個別 Compose | 各アプリは独自の `docker-compose.yml` を持ち、スタンドアロン起動可能 |
| 共有ネットワーク | 全コンテナは外部ネットワーク `tax-apps-network` で通信 |
| 起動順序制御 | DB依存アプリを先に、Gateway を最後に起動 |
| 障害分離 | 1アプリの障害が他に影響しない |
| 本番/開発切替 | `docker-compose.prod.yml` オーバーレイによる本番モード。モードはアプリ単位で記録し（`docker/logs/app-modes/<app>`）、`build` / `apply` / `recover` は記録されたモードを踏襲する |
| 操作ロック | 状態を変えるコマンドは共有の操作ロック（`lib/ops-common.sh`）を取る。端末からは待たず、無人実行のときだけ待つ（`recover` 240秒、ほか120秒） |

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
| `manage.sh` | `docker/scripts/manage.sh` | 管理スクリプト本体 |
| `backup.sh` | `docker/scripts/backup.sh` | バックアップ・リストア・訓練・無人処理（`manage.sh` の backup / restore / newpc / usb / verify / drill / due はここへ委譲） |
| `ops-common.sh` | `docker/scripts/lib/ops-common.sh` | 両方から source する共通処理（色・ログローテーション・直近結果 `last-run`・操作ロック・`OPS_WATCHED_RESULTS`） |
| `docker-watchdog.ps1` | `docker/scripts/docker-watchdog.ps1` | ウォッチドッグ（4時間毎）。Docker の起動待ち → `recover` → unhealthy の再起動 → `due` → `alert` |
| `*.bat` | `docker/scripts/` | ダブルクリック用の補助ラッパー（`start-prod` / `stop` / `status` / `backup-db` / `restore` / `restore-new-pc` / `restore-drill` / `set-backup-usb` / `register-*-task` / `unregister-*-task`） |

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

`APPS` 配列の並びがそのまま起動順。パスはリポジトリルートからの相対。ポートは `127.0.0.1` だけに publish し、外からはゲートウェイ（80）経由で `http://<host>/<app>/` に届く。

| # | パス | 説明 | ポート |
|:--|:-----|:-----|:-------|
| 1 | `apps/inheritance-case-management` | 相続税案件管理 (PostgreSQL + Next.js + Hono + Prisma) | 3020 / DB 3022 |
| 2 | `apps/bank-analyzer` | 銀行取引分析 (PostgreSQL + Hono + React) | 3007 |
| 3 | `apps/tax-docs` | 確定申告・贈与税の必要書類 (Vite) | 3002 |
| 4 | `apps/insurance-app` | 保険管理 (SQLite + Next.js) | 3030 |
| 5 | `apps/private-banking` | ファミリーB/S (PostgreSQL + Next.js + Prisma) | 3025 / DB 3026 |
| 6 | `apps/inheritance-tax-app` | 相続税シミュレーター (Express + Vite) | 3004 |
| 7 | `apps/gift-tax-simulator` | 贈与税・不動産関連税 (Vite) | 3001 |
| 8 | `apps/inheritance-tax-docs` | 相続税 資料準備ガイド (SQLite + Express + Vite) | 3003 |
| 9 | `apps/retirement-tax-calc` | 退職金税額計算 (Vite) | 3013 |
| 10 | `apps/depreciation-calc` | 減価償却・耐用年数 (Vite) | 3015 |
| 11 | `apps/asset-valuation` | 減価償却資産評価 (Vite) | 3017 |
| 12 | `apps/stock-valuation-form` | 株式評価明細書 (PostgreSQL + Hono + Vite) | 3014 / DB 3016 |
| 13 | `apps/capital-gains-calc` | 譲渡所得税計算 (Vite) | 3019 |
| 14 | `apps/inheritance-tax-form` | 相続税の申告書 (Vite) | 3021 |
| 15 | `docker/gateway` | Nginx ゲートウェイ + ポータル (Next.js) | 80 / 3000 |

> **注**: ポータル (`apps/portal/`) は gateway の `docker-compose.yml` の中のサービス（`portal-app`）として定義されていて、独自の compose を持たない。

### 管理外のアプリ（`UNMANAGED_APPS`）

`apps/` 直下にあっても意図的に `APPS` へ載せないもの。preflight のチェック15はここに無いディレクトリを「載せ忘れ」として出す。

| ディレクトリ | 理由 |
|:-------------|:-----|
| `mcp-server` | 常駐しない MCP サーバー。クライアントが `docker run -i --rm` で起動する。テストだけ `TEST_TARGETS` の `run@mcp-server-test` で回る |

### そのほかの定義（manage.sh 冒頭）

| 配列 | 中身 |
|:-----|:-----|
| `VOLUMES` | `clean` の Step 2 で消すデータボリューム（6件）。チェック14が実際のボリュームと突き合わせる |
| `EXTERNAL_VOLUMES` | compose で `external: true` のボリューム（`bank-analyzer-postgres`）。無ければ `ensure_network` が作る |
| `NON_DATA_VOLUMES` | データではないボリューム（`private-banking_private_banking_next`）。チェック14の除外 |
| `POSTGRES_APPS` | 本番起動の前に DB パスワードを生成して `ALTER ROLE` するアプリ（private-banking / stock-valuation-form / bank-analyzer）。形式 `アプリ名:サービス名:DB名:接頭辞:既定パスワード[:キー名[:ユーザー名]]` |
| `PROD_SECRETS` | DB 以外の本番シークレット。いまは空 |
| `TEST_TARGETS` | `test` の対象（`アプリ名:コンテナ名:コマンド`。`run@<サービス>` は使い捨てコンテナ）。CI の matrix と対で、チェック16が突き合わせる |

### 起動順序の設計根拠

```
[1-2]  DB を持つアプリ（PostgreSQL コンテナが depends_on で先に起動）
[3-14] そのほかのアプリ
[15]   Gateway（全アプリのコンテナ名を upstream として参照するため最後）
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
| 3.1 | income-tax-calc は開発中のため、manage.sh の全体管理対象から除外。個別起動時のみ app 配下の Compose を使用 |
| 3.2 | `start` 前に `preflight_quick` を実行。`preflight` のポート競合判定で Tax Apps 自身の使用ポートを WARN から除外 |
| 3.3 | `restore` 前に `pre-restore` バックアップを自動作成。`clean` Step 2 は `DELETE DATA` 入力必須に変更 |
| 3.4 | salary-calc を削除。manage.sh、Nginx、ポータル、Docker docs から参照を削除 |
| 3.5 | `watch` コマンド追加（private-banking / inheritance-case-management の bind mount 廃止に伴う compose watch 対応）。`status` の末尾に自動復旧（ウォッチドッグ）の配線チェックを追加。`WATCHDOG_TASK_NAME` 定数を追加 |
| 3.6 | income-tax-calc を削除。manage.sh、Nginx、ポータル、Docker docs から参照を削除 |
| 3.7 | medical-stock-valuation を削除。manage.sh（APPS / VOLUMES）、backup.sh（SQLITE_TARGETS）、Nginx、ポータル、Docker docs から参照を削除。データボリューム `medical-stock-valuation-data` は消さずに残す |
| 3.7 | capital-gains-calc（譲渡所得税計算・port 3019）を追加。あわせてアプリ一覧の private-banking 欠落と preflight 対象ポート一覧の記載ずれを修正 |
| 4.0 | 現状に合わせて全面改訂。inheritance-tax-form を一覧へ、バックアップ対象の定義を `backup.sh` へ（SQLite の対象が実在しない2件のままだった）、リストアをアプリ単位の記述へ、コマンド一覧に recover / apply / test / newpc / usb / verify / drill / due / prune / alert / loop-check / collation、preflight をチェック23まで。preflight のポート一覧から削除済みの 3010（medical）を外す |

---

## 4. バックアップ/リストア対象定義

対象は **`backup.sh` 冒頭の4配列**で定義する。バックアップ・リストア・訓練（drill）・件数照合はすべてここから生成されるので、DB やデータを持つアプリを足したら必ず1行追加すること。下の表は写しで、正本は `backup.sh`。

### 4.1 PostgreSQL（`PG_TARGETS`、7フィールド）

`label:container:pg_user:db_name:volume:dump_file:app`（7番目は `apps/` の下の名前で、`restore <app>` の対応付けに使う）

| container | app |
|:----------|:----|
| `itcm-postgres` | inheritance-case-management |
| `bank-analyzer-postgres` | bank-analyzer（ユーザー `bankuser`） |
| `private-banking-postgres` | private-banking |
| `svf-postgres` | stock-valuation-form |

### 4.2 SQLite（`SQLITE_TARGETS`、6フィールド）

6番目が app。件数照合はアプリのコンテナを借りて行う。

| app | ファイル | ボリューム |
|:----|:---------|:-----------|
| insurance-app | `/app/data/insurance.sqlite` | `insurance-app-data` |
| inheritance-tax-docs | `/app/data/resources.sqlite` | `inheritance-tax-docs-data` |

### 4.3 バインドマウント（`BIND_TARGETS`）

| label | パス |
|:------|:-----|
| ITCM Excel templates | `apps/inheritance-case-management/templates` |

### 4.4 設定ファイル（`SETTINGS_TARGETS`）

`.env` 4件（inheritance-case-management / bank-analyzer / private-banking / stock-valuation-form）。リストアでは**無いときだけ戻す**（`--with-env` で上書き）。本番の DB パスワードは `ALTER ROLE` で DB 側にあるので、`.env` だけ古い版へ戻すと繋がらなくなるため。

### 4.5 そのほか

bank-analyzer の JSON エクスポート（`npm run backup:json`）もアーカイブに入る。

---

## 5. コマンド仕様

`<app>` はアプリ名の部分一致（[7章](#7-アプリ名解決ロジック)）。`manage.bat` は引数をそのまま `manage.sh` へ渡す（`watch` は常駐するので Git Bash から直接叩く）。

### 5.1 起動・停止・反映

| コマンド | 処理 |
|:---------|:-----|
| `start [app]` | 開発モードで起動。アプリ名を省略すると全アプリ（`preflight_quick` → `ensure_network` → 順に `up -d`）で、停止マーカーを解除する。`.env.example` があって `.env` が無ければコピーする |
| `start --prod [app]` | 本番モード（`-f docker-compose.yml -f docker-compose.prod.yml up -d --build`）。先に `POSTGRES_APPS` / `PROD_SECRETS` のシークレットを用意する（`ensure_production_env`）。オーバーレイが無いアプリは WARN を出して dev で上げ、「本番で起動した」とは書かない。アプリ名付きでは停止マーカーを解除しない |
| `start --recorded` | 全アプリを、アプリごとに記録されたモードで起動（記録が無ければ dev）。`newpc` が使う |
| `recover` | 落ちているアプリだけを記録されたモードで `up -d --no-build`。停止マーカーがあれば何もしない。結果は ASCII の `RECOVER_RESULT` 1行（`failed=N` / `noimage=N` つき）でウォッチドッグへ返す |
| `stop` / `down` | 全アプリを逆順で `stop` / `down`（ボリュームは残す）。停止マーカー `docker/logs/tax-apps-stopped-intentionally` を置く |
| `restart <app>` | `docker compose restart`（compose の変更は反映されない） |
| `build <app>` | 稼働中のモードを踏襲して `up -d --build` |
| `apply [app]` | `up -d --no-build`。compose の設定やイメージに差分があるコンテナだけ作り直す。停止中のアプリには触らない |
| `watch <app>` | `docker compose watch --no-up`（フォアグラウンド）。`develop:` を持つ private-banking / inheritance-case-management だけ |

`watch` を `start` と分けているのは `--watch` が `--detach` と併用できないため。compose watch は起動後の変更しか同期しないので、止めている間の編集は `build <app>` で取り込む。対象アプリが bind mount を使わない理由とポーリングが2箇所要る理由は `CLAUDE.md` の「ソース同期」を参照。

### 5.2 確認

| コマンド | 処理 |
|:---------|:-----|
| `status` | ネットワーク、コンテナごとの状態・ヘルス・再起動回数・OOM kill・ポート、各アプリのモード（ここで毎回採取する）、自動復旧の配線（タスク登録と `tax-apps.autoheal` ラベル）、無人処理の直近結果、廃止済みタスクの残り |
| `logs <app>` | `docker compose logs -f` |
| `test [app]` | `TEST_TARGETS` を稼働中のコンテナの中で実行。`run@<サービス>` は `docker compose run --rm`。本番モードのアプリは `<app>-test` サービスがあれば dev ステージの使い捨てコンテナで回し、無ければ飛ばす |
| `preflight` | [10章](#10-preflight-check-仕様) |

### 5.3 バックアップ・リストア（`backup.sh` へ委譲）

| コマンド | 処理 |
|:---------|:-----|
| `backup` | 暗号化された全体バックアップ（GFS: 日次7・週次4・月次6）。最新1日分を `tax_apps_backup_latest/all-apps/` と外部コピー先へ |
| `restore [app\|--all] [backup] [--yes]` | アプリ単位のリストア（件数照合 → 起動して healthy まで待つ）。`--env-only` / `--with-env` / `--from DIR` は `docker/RESTORE.md` |
| `newpc [--check]` | 新しい PC で `.env` → 記録されたモードで起動 → データの順に全部戻す |
| `usb [--set DIR\|--show\|--copy-now\|--off]` | 外部コピー先（`~/.tax-apps/backup-external-dest`）を選ぶ |
| `verify <backup>` | 復号とハッシュ照合だけ |
| `drill [backup]` | 使い捨て DB へ実際に復元して件数と照合順序 `C` を検証（既定は最新） |

### 5.4 無人処理・掃除

| コマンド | 処理 |
|:---------|:-----|
| `due` | 期限切れのものだけ実行: バックアップ20時間・訓練168時間・掃除144時間・ループ検知3時間。4項目は互いの成否に依存しない |
| `prune` | 確認なしの掃除。dangling イメージ（168時間より古いもの）と、ビルドキャッシュの Private が `TAX_APPS_PRUNE_CACHE_MAX`（既定10GB）を超えたときだけキャッシュ全体。**ボリュームには触らない** |
| `loop-check` | ゲートウェイのアクセスログから画面のリロードループ（同じ画面が1分に60回以上）を検知し、`docker/logs/reload-loop/` に証拠を残す。ロックを取らない |
| `alert` | `last-run` からデスクトップの `TAX-APPS-ALERT.txt` を作り直す。Docker に触れずロックも取らない |
| `clean` | Step 1（Y/N）: 全アプリを逆順に `down --rmi local --remove-orphans`、ネットワーク削除。Step 2（`DELETE DATA` の入力）: `VOLUMES` のボリュームを削除。停止マーカーを置く |
| `clean-cache [--all]` | 確認つきで `docker builder prune --force`（`--all` を付けると未使用のキャッシュをすべて）。絞り込みのフラグは Docker Desktop の builder では無言で何も消さないので渡さない |
| `collation [app] [--yes]` | PostgreSQL の照合順序を `C` へ移す（引数なしは一覧だけ）。手順は `docker/COLLATION-MIGRATION.md`。自動の経路には載せない |

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
| `cmd_clean_cache` | `mode` | Docker Build Cache の確認付き削除 |
| `_print_autoheal_status` | - | 自動復旧の配線状況表示（タスク登録 + autoheal ラベル欠落）。`cmd_status` の末尾から呼ぶ |

### ヘルパー関数

（バックアップ・リストアの関数は `backup.sh` 側にある）

| 関数 | 引数 | 説明 |
|:-----|:-----|:-----|
| `for_each_app` | `callback`, `args...` | 全アプリを順方向で反復 |
| `for_each_app_reverse` | `callback`, `args...` | 全アプリを逆順で反復 |
| `resolve_app_dir` | `name` | アプリ名解決（部分一致、完全一致優先） |
| `require_app_arg` | `cmd_name`, `app_name` | アプリ引数バリデーション + 解決 |
| `ensure_network` | - | `tax-apps-network` 作成（未作成時のみ） |
| `preflight_quick` | - | `start` 前の Docker Desktop / docker compose 起動確認 |
| `print_docker_disk_usage` | - | `docker system df` 表示 |
| `port_is_listening` | `port` | Linux/Windows 両対応の待受ポート検出 |
| `is_managed_compose_project` | `project` | Compose project が `APPS` 管理対象か判定 |
| `tax_apps_container_for_port` | `port` | 指定ポートを使う管理対象 Tax Apps コンテナ名を返す |
| `compose_files_for_app` | `dir` | そのアプリの記録されたモードに合わせた `-f` の並び |

---

## 7. アプリ名解決ロジック

アプリ名を取るコマンド（`start <app>` / `restart` / `build` / `apply` / `watch` / `logs`）で使う解決処理（`resolve_app_dir`）。

### 処理フロー

```
入力: search_string（ユーザー指定のアプリ名）
  │
  ├── APPS の全パスに対して *match* で部分一致検索
  │
  ├── 一致数 == 0 → [ERROR] アプリが見つかりません + アプリ一覧表示
  │
  ├── 一致数 == 1 → RESOLVED_DIR に設定（正常）
  │
  └── 一致数 >= 2 → basename の完全一致があればそれ
                      無ければ [ERROR] 複数一致 + 候補一覧表示（コマンド中止）
```

### 曖昧性チェック

| 入力 | 一致結果 | 動作 |
|:-----|:---------|:-----|
| `bank-analyzer` | 1件 (`bank-analyzer`) | 正常解決 |
| `tax-docs` | 2件 (tax-docs, inheritance-tax-docs) | basename 完全一致で tax-docs |
| `tax` | 複数件 (tax-docs, retirement-tax-calc 等) | エラー + 候補表示 |
| `inheritance` | 複数件 | エラー + 候補表示 |
| `nonexistent` | 0件 | エラー + アプリ一覧表示 |

---

## 8. バックアップ・リストア仕様

| 項目 | 値 |
|:-----|:---|
| 主保存先 | `docker/backups/`（暗号化アーカイブ。平文のディレクトリは作らない） |
| 追加コピー | 最新1日分を `../tax_apps_backup_latest/all-apps/`、外部コピー先が設定されていればそこにも |
| 保持 | 日次7 + 週次4 + 月次6（GFS） |
| 暗号鍵 | `~/.tax-apps/backup.key`（リポジトリ外。控えは手で取る）。鍵が無いのに暗号化済みのアーカイブがあれば、新しい鍵を作らずに中断する |
| PostgreSQL | 稼働中のコンテナで `pg_dump` |
| リストア | アプリ単位。そのアプリのコンテナだけ止め、直前の状態を `pre-restore_*` に取ってから戻し、件数を照合して起動・healthy 待ち。DB は `pg_create_c_database`（`TEMPLATE template0`・`LC_COLLATE 'C'`）で作る |
| 端末なし | `--yes` が無ければ一覧を出して中止（AI や無人実行から勝手に戻らない） |
| 中断 | `on_release_operation_lock` が止めたコンテナを起動し直す。殺された回の平文の作業ディレクトリは次の回の `sweep_stale_restore_work` が掃く |

詳しい手順・新しい PC での戻し方は `docker/RESTORE.md`。

---

## 9. 無人処理

| タスク | 契機 | 実体 |
|:-------|:-----|:-----|
| `Tax Apps Startup` | ログオン時 | Docker の起動を待って `recover` |
| `Tax Apps Docker Watchdog` | 4時間毎（0時起点の繰り返し） | `docker-watchdog.ps1`: `recover` → unhealthy の再起動 → `due` → `alert` |

- どちらも昇格不要（`RunLevel Limited`）。消えていれば `backup.sh` が再登録する（`OPS_SCHEDULED_TASKS`）
- 廃止済みの `Tax Apps Daily Backup` / `Tax Apps Weekly Restore Drill` は `OPS_RETIRED_TASKS`。残っていれば `status` と `preflight` が警告する（解除は `unregister-*.bat`）
- 無人処理は必ず `docker/logs/last-run/<名前>` に結果を1件残し、`OPS_WATCHED_RESULTS` の鮮度しきい値で `status` / `preflight` / デスクトップ警告が見る
- タイムアウトの大小関係（内側 < 外側）、殺された回の記録、ロックの陳腐化は `CLAUDE.md` の「自動起動・自動復旧」を参照

---

## 10. Preflight Check 仕様

### チェック項目

| # | チェック | 判定 |
|:--|:--------|:-----|
| 1 | Docker Desktop 起動確認（`docker info`） | ERROR |
| 2 | `docker compose` コマンド確認 | ERROR |
| 3 | `APPS` 全件の `docker-compose.yml` の存在 | WARN |
| 4 | Compose config 検証（prod オーバーレイがあれば重ねて `config --quiet`） | WARN |
| 5 | Nginx 設定ファイル（`nginx.conf` / `default.conf` / `upstreams.conf` / `maps.conf` / `proxy_params.conf`） | WARN |
| 6 | ITCM の `.env` | WARN |
| 7 | 暗号化バックアップの鮮度・暗号鍵の存在・平文バックアップの残り | WARN |
| 8 | スケジュールタスクの登録と、廃止済みタスクの残り | WARN |
| 9 | ポート競合（下の一覧。Tax Apps 自身が使っているものは除外） | WARN |
| 10 | ホストのディスク空き（5GB 未満） | WARN |
| 11 | Docker daemon のメモリ（4GB 未満） | WARN |
| 12 | Docker のディスク使用量（`docker system df` を表示） | 表示のみ |
| 13 | Dockerfile の CRLF ガード | WARN |
| 14 | 無人処理の直近結果（`OPS_WATCHED_RESULTS`）と、`VOLUMES` と実際のボリュームの差 | WARN |
| 15 | 一覧の取りこぼし（`apps/` 直下で `APPS` にも `UNMANAGED_APPS` にも無いもの） | WARN |
| 16 | テスト・型検査の登録漏れ（`package.json` ↔ `TEST_TARGETS` ↔ CI matrix） | WARN |
| 17 | メモリ上限と `NODE_OPTIONS` のヒープ上限のずれ（dev の compose） | WARN |
| 18 | 本番オーバーレイの欠け | WARN |
| 19 | ゲートウェイに外から届くファイアウォールの穴（全送信元に戻ったルール） | WARN |
| 20 | モードが記録されているのに上がっていないアプリ（イメージ無し／作成のまま／落ちている、を直し方つきで） | WARN |
| 21 | 持ち主の死んだウォッチドッグのロック | WARN |
| 22 | 稼働中の PostgreSQL の照合順序が `C` か（template1 も） | WARN |
| 23 | ホスト側に湧いた `node_modules`（`apps/<app>` とその1つ下） | WARN |

### 対象ポート一覧

```
80, 3000, 3001, 3002, 3003, 3004, 3007, 3013, 3014, 3015, 3016,
3017, 3019, 3020, 3021, 3022, 3025, 3026, 3030
```

実際に host へ publish しているポートと揃えること（3016 / 3022 / 3026 は DB）。

### 判定ロジック

- **ERROR**: 処理を中止し、修正を案内する
- **WARN**: 警告表示のみ、`start` コマンドの実行は可能
- **OK**: 問題なし

### サマリー出力

```
============================================================
  Results:  OK=NN  WARN=0  ERROR=0
============================================================

All checks passed!
```

### start コマンドとの連携

`start` コマンド実行時は簡易版 `preflight_quick` が自動実行される。Docker Desktop と `docker compose` の利用可否のみ確認し、失敗時はエラー表示して中止する。

---

## 付録: 変数・定数一覧

### manage.sh グローバル変数

| 変数名 | 値 | 説明 |
|:-------|:---|:-----|
| `SCRIPT_DIR` | 計算値 | スクリプトディレクトリ |
| `PROJECT_ROOT` | 計算値 | リポジトリルート |
| `NETWORK_NAME` | `tax-apps-network` | 外部ネットワーク名 |
| `WATCHDOG_TASK_NAME` | `Tax Apps Docker Watchdog` | `register-docker-watchdog-task.ps1` の `$TaskName` 既定値と一致させること |
| `APPS` | 配列（15要素） | 管理対象アプリ + `docker/gateway` |
| `UNMANAGED_APPS` | 配列（2要素） | 意図的な管理外 |
| `VOLUMES` / `EXTERNAL_VOLUMES` / `NON_DATA_VOLUMES` | 配列 | [3章](#3-アプリケーション定義) |
| `POSTGRES_APPS` / `PROD_SECRETS` | 配列 | 本番シークレット |
| `TEST_TARGETS` | 配列 | `test` の対象 |

バックアップ対象の4配列は `backup.sh`、無人処理の表（`OPS_WATCHED_RESULTS` / `OPS_SCHEDULED_TASKS` / `OPS_RETIRED_TASKS`）は `lib/ops-common.sh` にある。
