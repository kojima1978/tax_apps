# 保険証券分析・診断ダッシュボード

保険コンサルタント向けに、顧客ごとの保険証券を管理し、保障内容・保険料負担・証券別分析を可視化するNext.jsアプリです。証券情報はSQLiteに保存し、CSV取込、JSON貼り付け、印刷用レポート出力に対応しています。

## 主な機能

- 顧客ケース、家族情報、代理店情報、保険証券の管理
- 代理店情報のSQLite保存、代理店マスターへの登録・更新・呼び出し
- 保険証券CSV取込と重複証券番号チェック
- 保険証券画像OCR向けJSONプロンプトの表示・編集・SQLite保存
- 現在の月額保険料負担、死亡保障、入院日額のサマリー表示
- 保険料推移、保障推移、種類別概要、個別証券分析
- A4横向きの印刷レポート、表紙、ページ番号、証券別改ページ
- SQLiteデータベースのバックアップ・復元

## 技術スタック

| 分類 | 技術 |
|---|---|
| フレームワーク | Next.js 16 App Router |
| UI | React 19, TypeScript 6, lucide-react |
| グラフ | Recharts |
| データベース | SQLite, better-sqlite3 |
| 実行環境 | Docker, node:22-alpine |

## 起動

起動・再ビルドはリポジトリのルートから `docker/scripts/manage.sh` で行います。
素の `docker compose up` は base の compose だけを読むので、本番で動いているこのアプリを dev サーバに作り替えます。

```bash
docker/scripts/manage.sh start insurance-app          # dev
docker/scripts/manage.sh start --prod insurance-app   # 本番（standalone）
docker/scripts/manage.sh build insurance-app          # 再ビルド（いま動いているモードを踏襲）
docker/scripts/manage.sh logs insurance-app
```

画面はゲートウェイ経由の `/insurance/`（直接なら `http://localhost:3030/insurance/`）。
`3020` は相続税案件管理が使うので、このアプリの標準ポートは `3030` です。

- dev はソースの主要ディレクトリを読み取り専用で bind mount します
- 本番（`docker-compose.prod.yml`、`target: runner`）はソースを同梱するので、**どの変更も `build` しないと入りません**
- dev も本番も `node` ユーザーで動きます。メモリ上限は dev 1536M / 本番 192M（Node のヒープ上限はそれぞれ 1024 / 128MB）

ヘルスチェック:

```bash
curl http://localhost:3030/insurance/api/health/
```

DB（`/app/data/insurance.sqlite`）を開いて読めることに加え、DB ファイルと `/app/data` に書けるかまで見ます。
basePath が `/insurance` で末尾スラッシュ必須です（無いと 308）。使えなければ `503 {"status":"degraded","database":"EACCES"}` のようにエラーコードを返し、コンテナは unhealthy になります。

## 検証コマンド

TypeScriptチェック（**dev モードのときだけ**。本番イメージには `node_modules/.bin` がありません）:

```bash
cd apps/insurance-app && docker compose exec -T insurance-app ./node_modules/.bin/tsc --noEmit --pretty false
```

`npm test` は無く、`manage.sh test` / CI の対象にも入っていません。

`npm run test:sample-reset` は**いまは動きません**。basePath を付けずに `http://127.0.0.1:3030/api/cases` を叩くので 404 になります。
しかも本物の DB にケースを作って消す作りなので、顧客データの入った DB では叩かないでください。

## データ保存

SQLite は名前付きボリューム `insurance-app-data`（compose 上は `insurance_data`）の `/app/data/insurance.sqlite` にあります。
dev も本番も同じボリュームなので、モードを切り替えてもデータは同じです。

- 夜間の全体バックアップ（`docker/scripts/backup.sh` の `SQLITE_TARGETS`）が稼働中のコンテナから取ります。
  戻すのは `docker/scripts/manage.sh restore insurance-app`（手順は `docker/RESTORE.md`）
- 画面の「バックアップ・復元」は SQLite ファイルをそのまま落とす／戻す別の経路です
- スキーマにマイグレーションは無く、`lib/db.ts` が起動時に `CREATE TABLE IF NOT EXISTS` と `ALTER TABLE ADD COLUMN` を流します（`docs/er-diagram.md`）

ポートを変更する場合は、`Dockerfile` の `APP_PORT` と `HEALTHCHECK`、`docker-compose.yml` の `APP_PORT` / `ports` / `healthcheck`、`package.json` の起動スクリプト、ゲートウェイの `nginx/includes/upstreams.conf` / `maps.conf`、README/docs の URL を同じ値に揃えます。

## 関連ドキュメント

- [技術仕様書](docs/specification.md)
- [ER図](docs/er-diagram.md)
