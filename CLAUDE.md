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

### manage.sh / backup.sh（全アプリ統合管理）

コマンド例は `.sh` を本体として記載する。`.bat` は Windows のダブルクリック用・タスクスケジューラ用の補助ラッパーとして扱う。

- `manage.sh`: 起動、停止、再ビルド、ログ、状態確認などの管理本体
- `backup.sh`: 全体バックアップ/リストア + ITCM定期バックアップ本体
- `manage.bat`: Git Bash 経由で `manage.sh` を呼ぶ補助ラッパー
- `backup-db.bat`: Git Bash 経由で `backup.sh itcm` を呼ぶ補助ラッパー
- バックアップは `docker/backups/` を主保存先とし、最新1日分だけ `tax_apps` と同じ階層の `tax_apps_backup_latest/` に追加コピーする

ヘルパースクリプト（ダブルクリック用）:
- `start-prod.bat`: ワンクリックで本番モード起動
- `stop.bat`: ワンクリックで停止
- `status.bat`: ワンクリックで状態確認
- `backup-db.bat`: ITCM PostgreSQLダンプ + JSONエクスポート + Excelテンプレート等（7日間保持、タスクスケジューラ対応）

```bash
# 全アプリ起動（開発モード）
docker/scripts/manage.sh start

# 全アプリ本番モード起動
docker/scripts/manage.sh start --prod

# 特定アプリのみ再ビルド
docker/scripts/manage.sh build <app-name>

# ログ確認
docker/scripts/manage.sh logs <app-name>

# 全アプリ停止
docker/scripts/manage.sh stop

# 状態確認
docker/scripts/manage.sh status

# 全体バックアップ / リストア
docker/scripts/manage.sh backup
docker/scripts/manage.sh restore [dir]

# ITCM定期バックアップ（画面のJSONエクスポート相当も含む）
docker/scripts/backup.sh itcm
```

### 個別アプリのスクリプト（Docker内で実行）
- Next.js系 / Vite系: `npm run dev` / `npm run build` / `npm run lint`
- 案件管理 (inheritance-case-management/web): `npm run dev` / `npm run db:generate` / `npm run db:push`
- 確定申告書類 (tax-docs): Vite フロントエンドのみ（バックエンドなし）
- Django (bank-analyzer-django): `python manage.py runserver 0.0.0.0:3007`

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
