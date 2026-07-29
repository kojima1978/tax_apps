# Tax Apps - docker/scripts ディレクトリ

このディレクトリには Tax Apps の運用・バックアップ・監視を担う **18 ファイル** が含まれています。

詳しい操作手順は親ディレクトリの [`docker/README.md`](../README.md) を参照してください。本ファイルは scripts ディレクトリ内の各ファイルの役割を整理した目次です。

## 設計方針

- **本体は `.sh` / `.ps1`**: ロジックは本体スクリプトに集約
- **`.bat` は Windows 補助ラッパー**: Git Bash 経由で `.sh` を、または PowerShell 経由で `.ps1` を呼び出す
- **ASCII-only な `.bat`**: 日本語を含むと CMD.exe の Shift-JIS 解釈で文字化け・行読みバグが起きるため、`.bat` 内は ASCII のみ（日本語は呼び出し先の `.sh` / `.ps1` に集約）

---

## 1. 運用・管理（メイン）

### 本体スクリプト

- **`manage.sh`** ← **本体**
  全アプリの起動・停止・再ビルド・ログ・状態確認・バックアップなどを統合管理する Bash 本体。13 個のアプリを正しい順序で起動・停止する。

### Windows 補助ラッパー

- **`manage.bat`**
  `manage.sh` を Git Bash 経由で呼び出す薄い ASCII ラッパー。ダブルクリックで開発モード起動（`manage.sh start`）。引数転送対応。

### ワンクリックショートカット（ダブルクリック用）

- **`start-prod.bat`**
  `manage.bat start --prod` を呼ぶ。全アプリを本番モードでビルド + 起動。

- **`stop.bat`**
  `manage.bat stop` を呼ぶ。全アプリの **コンテナを停止する（削除はしない）**。データボリュームも消えない。コンテナ削除は `manage.sh down`、ボリューム削除は `manage.sh clean`。

- **`status.bat`**
  `manage.bat status` を呼ぶ。全アプリのコンテナ状態（Up/Exited 等）を一覧表示。

---

## 2. バックアップ関連

### 本体スクリプト

- **`backup.sh`** ← **本体**
  バックアップ・リストア・ITCM 定期バックアップを統合した Bash 本体。**ホスト側で実行**（Git Bash または Linux）。
  - `backup.sh backup`: 全データの暗号化完全バックアップ
  - `backup.sh itcm`: Windowsタスク用の互換名（暗号化済み全体バックアップ）
  - `backup.sh restore [dir]`: バックアップからのリストア
  - `backup.sh verify <file>`: データを上書きせず復号とSHA-256検証
  - `backup.sh drill [file]`: リストア訓練。引数省略で最新のバックアップが対象
  - 暗号鍵: `~/.tax-apps/backup.key`（リポジトリ外、別媒体への保管必須）

  対象は `backup.sh` 冒頭の 4 つの配列で定義する。DBを持つアプリを追加したら、ここに1行足すこと。
  - `PG_TARGETS`: ITCM / Bank Analyzer / Private Banking の PostgreSQL
  - `SQLITE_TARGETS`: Medical Stock / Insurance / Inheritance Tax Docs の SQLite
  - `BIND_TARGETS`: Bank Analyzer のアップロード、ITCM の Excel テンプレート（`.gitignore` 対象なので Git には無い）
  - `SETTINGS_TARGETS`: 各アプリの `.env`

### リストア訓練（drill）

`verify` は「復号できてハッシュが一致する」ことまでしか保証しない。ダンプが本当にリストア可能な
SQL かどうかは別問題なので、`drill` が実際に復元して確かめる。

- PostgreSQL: 使い捨ての `postgres:16-alpine` コンテナを起動し、`psql -v ON_ERROR_STOP=1` で
  ダンプを流し込む。復元後にテーブル数と行数を数え、0 件なら失敗扱い。
- SQLite: アーカイブを展開したコピーを稼働中コンテナの `/tmp` へ置き、readonly で開いて
  `integrity_check` とテーブル数を確認する（`better-sqlite3` がアプリイメージにしか無いため）。
- **稼働中のDBには一切触れない**。ドリル用コンテナは `tax-apps-network` に繋がず、ポートも公開しない。

### Windows 補助ラッパー

- **`backup-db.bat`**
  `backup.sh itcm` を Git Bash 経由で呼ぶ ASCII ラッパー。ダブルクリックでも、タスクスケジューラからでも実行可能。

- **`restore-drill.bat`**
  `backup.sh drill` を Git Bash 経由で呼ぶ ASCII ラッパー。

### タスク登録（自動定期バックアップ）

- **`register-backup-task.ps1`** ← **本体**
  毎日指定時刻（デフォルト 03:00）に `backup-db.bat` を実行する Windows スケジュールタスクを現在ユーザーの最小権限で登録する PowerShell。`-Unregister` スイッチで削除も可能。

- **`register-backup-task.bat`**
  `register-backup-task.ps1` を呼ぶラッパー。UACなしで登録。

- **`unregister-backup-task.bat`**
  `register-backup-task.ps1 -Unregister` を呼ぶラッパー。UACなしでタスク削除。

### タスク登録（週次リストア訓練）

- **`register-restore-drill-task.ps1`** ← **本体**
  毎週（デフォルト 日曜 04:00、日次バックアップの直後）に `restore-drill.bat` を実行する
  スケジュールタスクを登録する PowerShell。出力は `docker/logs/restore-drill.log` に追記される。
  `-Unregister` スイッチで削除も可能。

- **`register-restore-drill-task.bat`** / **`unregister-restore-drill-task.bat`**
  上記 `.ps1` を呼ぶ ASCII ラッパー。

---

## 3. 監視・自動復旧（Docker Desktop ウォッチドッグ）

### 重要

監視対象は **Docker Desktop daemon 自体**（`docker info` の応答性）と、`tax-apps.autoheal=true` ラベル付きコンテナの health 状態です。unhealthy コンテナの再起動はホスト側の Docker CLI から実行し、コンテナへ Docker socket は渡しません。

### 本体スクリプト

- **`docker-watchdog.ps1`** ← **本体**
  `docker info` で Docker Desktop daemon の応答を確認し、2 回連続失敗（タイムアウト or 非 0 終了）時に復旧処理を実行する PowerShell 本体。daemon が正常な場合は、`tax-apps.autoheal=true` ラベル付きの unhealthy コンテナをホスト側 Docker CLI で再起動する。
  - **復旧手順**:
    1. Docker 関連プロセスを kill（`Docker Desktop`, `com.docker.backend`, `com.docker.build`, `docker-sandbox`, `docker`）
    2. `com.docker.service` 再起動（管理者権限必須）
    3. `wsl --shutdown` で WSL バックエンドをリセット
    4. `Docker Desktop.exe` 起動
    5. 最大 300 秒間 healthy 待機
  - **クールダウン**: 直近 45 分以内に再起動済みなら復旧をスキップ
  - **状態ファイル**: `docker/logs/docker-watchdog.state.json`（直近の再起動時刻を記録）
  - **ログ**: `docker/logs/docker-watchdog.log`
  - **ロック**: `docker/logs/docker-watchdog.lock`（多重起動防止）

### Windows 補助ラッパー

- **`docker-watchdog.bat`**
  `docker-watchdog.ps1` を呼ぶ **手動実行用** ラッパー（`-DryRun` などの動作確認用）。タスクスケジューラからは `.ps1` が直接呼ばれるため、自動運用では未使用。

### タスク登録（定期監視）

- **`register-docker-watchdog-task.ps1`** ← **本体**
  デフォルト 15 分間隔で `docker-watchdog.ps1` を実行する Windows スケジュールタスクを `RunLevel=Highest`（管理者権限）で登録する PowerShell。要管理者権限。`-Unregister` スイッチで削除も可能。`-StartAppsAfterRecovery` スイッチで Docker 復旧後に Tax Apps を自動起動。

- **`register-docker-watchdog-task.bat`**
  `register-docker-watchdog-task.ps1` を呼ぶ **UAC 自己昇格ラッパー**。ダブルクリック → UAC 昇格 → 登録。

- **`unregister-docker-watchdog-task.bat`**
  `register-docker-watchdog-task.ps1 -Unregister` を呼ぶ UAC 自己昇格ラッパー。ダブルクリック → UAC 昇格 → タスク削除。

### 登録状況の確認（重要）

自動復旧は **① `tax-apps.autoheal=true` ラベル** と **② スケジュールタスク登録** の2段構えで、どちらか一方でも欠けると何も起きない。しかも欠けていること自体はどこにも表示されないため、過去にタスク未登録のまま数ヶ月気づかなかったことがある。

`manage.sh status` の末尾で両方を確認できるようにしてある:

```
自動復旧（ウォッチドッグ）:
  スケジュールタスク: 登録済み（Tax Apps Docker Watchdog）
  autoheal ラベル: 稼働中の healthcheck 付きコンテナすべてに付与済み
```

★ が付いていたらその項目が未配線。ラベルは compose を直して `up -d` で再作成、タスクは `register-docker-watchdog-task.bat` をダブルクリックで登録する。

---

## ファイル一覧表

| ファイル | 種別 | 役割 |
|---|---|---|
| `manage.sh` | 本体 (Bash) | 全アプリ統合管理 |
| `manage.bat` | 補助 (CMD) | manage.sh の Git Bash ラッパー |
| `start-prod.bat` | ショートカット | 本番モード起動 |
| `stop.bat` | ショートカット | 停止（削除はしない） |
| `status.bat` | ショートカット | 状態確認 |
| `backup.sh` | 本体 (Bash) | バックアップ/リストア本体 |
| `backup-db.bat` | 補助 (CMD) | backup.sh itcm の Git Bash ラッパー |
| `restore-drill.bat` | 補助 (CMD) | backup.sh drill の Git Bash ラッパー |
| `register-backup-task.ps1` | 本体 (PS) | バックアップタスク登録 |
| `register-backup-task.bat` | 補助 (CMD) | 現在ユーザーへタスク登録 |
| `unregister-backup-task.bat` | 補助 (CMD) | 現在ユーザーのタスク削除 |
| `register-restore-drill-task.ps1` | 本体 (PS) | 週次リストア訓練タスク登録 |
| `register-restore-drill-task.bat` | 補助 (CMD) | 現在ユーザーへタスク登録 |
| `unregister-restore-drill-task.bat` | 補助 (CMD) | 現在ユーザーのタスク削除 |
| `docker-watchdog.ps1` | 本体 (PS) | Docker Desktop daemon 監視/復旧、unhealthy コンテナ再起動 |
| `docker-watchdog.bat` | 補助 (CMD) | 手動実行用ラッパー |
| `register-docker-watchdog-task.ps1` | 本体 (PS) | ウォッチドッグタスク登録 |
| `register-docker-watchdog-task.bat` | 補助 (CMD) | UAC 自己昇格 → 登録 |
| `unregister-docker-watchdog-task.bat` | 補助 (CMD) | UAC 自己昇格 → タスク削除 |

---

## かんたん導入手順

| やりたいこと | 操作 |
|---|---|
| 開発モードで起動 | `manage.bat` をダブルクリック |
| 本番モードで起動 | `start-prod.bat` をダブルクリック |
| 停止 | `stop.bat` をダブルクリック |
| 状態確認 | `status.bat` をダブルクリック |
| 毎日 03:00 の自動バックアップを設定 | `register-backup-task.bat` をダブルクリック |
| バックアップタスクを削除 | `unregister-backup-task.bat` をダブルクリック |
| 毎週日曜 04:00 のリストア訓練を設定 | `register-restore-drill-task.bat` をダブルクリック |
| リストア訓練タスクを削除 | `unregister-restore-drill-task.bat` をダブルクリック |
| バックアップが復元できるか今すぐ試す | `restore-drill.bat` をダブルクリック |
| 15 分ごとの Docker 監視を設定 | `register-docker-watchdog-task.bat` をダブルクリック → UAC「はい」 |
| 監視タスクを削除 | `unregister-docker-watchdog-task.bat` をダブルクリック → UAC「はい」 |

---

## 関連ドキュメント

- 親ディレクトリ [`docker/README.md`](../README.md) — 全体ガイド（アーキテクチャ、トラブルシューティング、リファレンス）
- リポジトリ root [`CLAUDE.md`](../../CLAUDE.md) — コーディング規約・重要制約
