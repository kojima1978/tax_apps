# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要な制約

- **ローカル環境を汚さない**: `npm install`、`npm run build` 等をローカルで実行しないこと。開発・動作確認はDocker経由で行う。

## コマンド

### Docker操作（推奨）

各アプリは個別の `docker-compose.yml` を持つ。共有ネットワーク `tax-apps-network` で接続。

```bash
# 個別アプリの起動
cd apps/<app-name> && docker compose up -d

# 個別アプリの再ビルド
cd apps/<app-name> && docker compose up -d --build

# 個別アプリの本番モード
cd apps/<app-name> && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 個別アプリのログ確認
cd apps/<app-name> && docker compose logs -f
```

### ソース同期（private-banking / inheritance-case-management）

この2アプリは dev でもソースを bind mount せず、**イメージ同梱物 + `docker compose watch`** で動かす。

```bash
# 編集しながら開発する間、別ターミナルで開いておく（フォアグラウンド）
docker/scripts/manage.sh watch <app-name>
```

- watch を止めている間の変更は同期されない。その場合は `manage.sh build <app-name>` で取り込む。
- `--watch` は `--detach` と併用できないため、`start` とは別プロセスで動かす設計。
- **なぜ bind mount をやめたか**: Docker Desktop for Windows の bind mount(Windows→WSL2) は起動直後の `scandir` が EFAULT を返すことがあり、Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てる。スキャンに失敗したディレクトリ配下のルートが警告1行だけ残して丸ごと欠落し、「`✓ Ready` なのに 404」のまま稼働し続ける。コンテナ内から bind mount を無くすとこの経路自体が消える。
- 同期経路が bind mount ではなくなった代わりに、Docker はオーバーレイ上位層へ直接書き込むためコンテナ内の inotify にイベントが届かない。**ポーリングが2箇所必要**: ルート表用の `WATCHPACK_POLLING`(compose の environment) と Turbopack 再コンパイル用の `watchOptions.pollIntervalMs`(next.config.ts)。
- **スキャンガード**: 上の障害は healthcheck(`/api/health`) をすり抜けるため、両アプリの `docker-entrypoint.sh` に dev 限定のガードを入れてある。dev サーバの出力を FIFO 経由で監視し `Watchpack Error (initial scan)` を見つけたら即座に落とす → `restart: unless-stopped` で再起動。next は `exec` せず子プロセスとして起動し(PID 1 はハンドラの無いシグナルを無視するため)、`docker stop` の TERM は trap で転送している。

### manage.sh / backup.sh（全アプリ統合管理）

コマンド例は `.sh` を本体として記載する。`.bat` は Windows のダブルクリック用・タスクスケジューラ用の補助ラッパーとして扱う。

- `manage.sh`: 起動、停止、再ビルド、ログ、状態確認などの管理本体
- `backup.sh`: 全体バックアップ/リストア/リストア訓練の本体
- `manage.bat`: Git Bash 経由で `manage.sh` を呼ぶ補助ラッパー
- `backup-db.bat`: Git Bash 経由で `backup.sh itcm` を呼ぶ補助ラッパー（日次タスク用。中身は通常の `backup` と同じ）
- `restore-drill.bat`: Git Bash 経由で `backup.sh drill` を呼ぶ補助ラッパー（週次タスク用）
- バックアップは `docker/backups/` を主保存先とし、最新1日分だけ `tax_apps` と同じ階層の `tax_apps_backup_latest/all-apps/` に追加コピーする
- **バックアップ対象は `backup.sh` 冒頭の4配列** (`PG_TARGETS` / `SQLITE_TARGETS` / `BIND_TARGETS` / `SETTINGS_TARGETS`) で定義する。バックアップ・リストア・ドリルはすべてここから生成されるので、DBやデータを持つアプリを足したら**必ず1行追加すること**

### 自動起動・自動復旧（Windows タスクスケジューラ）

「Docker がたまに立ち上がらない」の実体は、**自動で起動し直す経路が1つも生きていない**こと。
`restart: unless-stopped` は `docker compose stop` したコンテナを「手動停止」として記録するため、
`stop.bat` を一度でも押すと以降のデーモン再起動では二度と復帰しない。タスクは2つで対になっている:

- **`Tax Apps Startup`**（ログオン時・`register-startup-task.bat`）: Docker エンジンの起動を待ってから復旧
- **`Tax Apps Docker Watchdog`**（15分毎・`register-docker-watchdog-task.bat`）: 落ちたら直す係

どちらも**昇格不要**（`RunLevel Limited`）。以前は UAC 必須だったが、それが原因で
一度消えると管理者ダブルクリックでしか戻せず、**実際に2回消えて数ヶ月間無防備だった**。
さらに `backup.sh` が毎日の実行時に両タスクの存在を確認し、消えていれば自動で再登録する。

- 復旧の実体は `manage.sh recover`。起動ロジックを PowerShell 側に複製せず、
  `APPS` 配列を唯一の定義元に保つ。`start` との違いは無人で15分毎に呼ばれる前提から来る:
  **再ビルドしない / 落ちているアプリだけ / モードを踏襲 / 意図的な停止中は何もしない**
- **モードはアプリ単位で記録する**（`docker/logs/app-modes/`）。このリポジトリは実際には
  混在稼働していて、一部のアプリだけ個別に `-f docker-compose.prod.yml` 付きで起動されている。
  全体で1つのモードにすると、落ちた本番アプリを dev サーバとして作り直してしまう。
  判定は推測ではなく `com.docker.compose.project.config_files` ラベル（起動に使った `-f` の一覧そのもの）。
  **落ちてからでは調べようがない**ので、`status` と `recover` が動いているうちに毎回採取する
- `stop` / `down` / `clean` は停止マーカー（`docker/logs/tax-apps-stopped-intentionally`）を置く。
  これが無いと `stop.bat` の直後にウォッチドッグが起動し直して停止操作が成立しない。`start` で解除
- ウォッチドッグとの連絡は `RECOVER_RESULT` の1行のみ **ASCII** で出す（日本語ログ行はコンソールの
  コードページ次第で拾えなくなるため）。**復旧しなかった場合は必ず WARN でログに残す** —
  黙って何もしない状態こそが今回数ヶ月見逃された当のもの
- 未登録・モード未記録は `manage.sh status` と `preflight` の両方に出る

ヘルパースクリプト（ダブルクリック用）:
- `start-prod.bat`: ワンクリックで本番モード起動
- `stop.bat`: ワンクリックで停止
- `status.bat`: ワンクリックで状態確認
- `register-startup-task.bat` / `register-docker-watchdog-task.bat`: 自動起動・自動復旧タスクの登録
  （`unregister-*.bat` で解除）
- `backup-db.bat`: 暗号化された全体バックアップ（PostgreSQL 3件 + SQLite 3件 + アップロード + テンプレート + `.env` + JSONエクスポート。7日間保持、タスクスケジューラ対応）
- `restore-drill.bat`: 最新バックアップのリストア訓練（週次タスク対応）

```bash
# 全アプリ起動（開発モード）
docker/scripts/manage.sh start

# 全アプリ本番モード起動
docker/scripts/manage.sh start --prod

# 特定アプリのみ再ビルド
docker/scripts/manage.sh build <app-name>

# ソース変更をコンテナへ同期（対応アプリのみ・フォアグラウンド）
docker/scripts/manage.sh watch <app-name>

# ログ確認
docker/scripts/manage.sh logs <app-name>

# 全アプリ停止
docker/scripts/manage.sh stop

# 落ちているアプリだけ起動し直す（ウォッチドッグ用・再ビルドなし）
docker/scripts/manage.sh recover

# 状態確認
docker/scripts/manage.sh status

# 全体バックアップ / リストア
docker/scripts/manage.sh backup
docker/scripts/manage.sh restore [dir]

# リストア訓練（使い捨てDBへ実際に復元して検証。引数省略で最新が対象）
docker/scripts/manage.sh drill
```

### 個別アプリのスクリプト（Docker内で実行）
- Next.js系 / Vite系: `npm run dev` / `npm run build` / `npm run lint`
- 案件管理 (inheritance-case-management/web): `npm run dev` / `npm run db:generate` / `npm run db:push`
- 確定申告書類 (tax-docs): Vite フロントエンドのみ（バックエンドなし）
- 株式評価明細書 (stock-valuation-form): `npm run dev:all`（Vite 3014 + API 3114 を並走）/ `npm run build` + `npm run build:server`。本番は Node が 3014 で両方を配信
- Django (bank-analyzer-django): `python manage.py runserver 0.0.0.0:3007`

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
