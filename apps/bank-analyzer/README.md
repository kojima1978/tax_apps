# bank-analyzer（銀行取引分析・React 版）

Django 版（`apps/bank-analyzer-django`）の**置き換え**。計画と進捗は
`apps/bank-analyzer-django/REACT_MIGRATION_PLAN.md`。構成は株式評価明細書と同じ
（Vite + React 19 + TypeScript + Tailwind v4 / Hono / Prisma 6 / PostgreSQL 16）。

## 名前

段階7（切替）で Django 版の名前をそのまま引き継いだ。並走用の
`bank-analyzer-next` / 3008 / `/bank-analyzer-next/` はもう無い。

| | |
|---|---|
| URL | `/bank-analyzer/` |
| コンテナ | `bank-analyzer` / `bank-analyzer-postgres` |
| ポート | 3007（dev の API は 3107） |
| DB のボリューム | `bank-analyzer-postgres`（Django 版のものを引き継ぐ・中身は移し替えない） |

- **Django 版の compose も同じコンテナ名を持つ**ので、同時には起動できない
  ＝ 2つのアプリが同じ DB へ同時に書く形にはならない。切り戻すときは
  こちらを `docker compose down`（**`-v` は付けない**。ボリュームが消える）してから Django 版を上げる
- パスは **`vite.config.ts` の `base` と `server/app.ts` の `BASE_PATH` の2箇所**だけ。
  画面側のパスは全部 `import.meta.env.BASE_URL` から来る

## コマンド

```bash
# 起動（dev。Vite 3007 + API 3107 を1コンテナで並走）
cd apps/bank-analyzer && docker compose up -d --build

# 本番モードへ切り替えて起動（シークレットの生成と ALTER ROLE はここで走る。
# 個別に -f docker-compose.prod.yml を並べて叩くと、それが飛んで restart ループになる）
docker/scripts/manage.sh start --prod bank-analyzer

# テスト（型検査 + vitest。使い捨てコンテナで回る）
docker/scripts/manage.sh test bank-analyzer
```

ソースは `src` / `server` / `prisma` / `index.html` を読み取り専用で bind mount している
（ポーリング監視）。`package.json` を変えたら `--build` が要る。

## 夜間バックアップの JSON

`backup.sh` が稼働中のコンテナの中で `npm run backup:json` を呼び、案件を1件1ファイルで
書き出す（`server/scripts/exportJsonBackups.ts`。出力先は環境変数 `OUTPUT_DIR`）。

- **ファイル名と中身は Django 版の管理コマンドと同じ形に保つこと**。
  `0001_<案件名>_backup.json` で過去のバックアップと同じフォルダに並び、どちらも
  画面の「JSONから復元」で読める（`version` は `1.0` / `1.1` の両対応）
- 取引0件の案件も1本書き出す（Django 版と同じ。読み込み側は弾く）
- dev は tsx がソースを直接読み、本番はビルド済みの `dist-server` を読む。
  切り分けは `package.json` の `backup:json` が1箇所で持つ（`npm run` で引数を渡せないので
  出力先は環境変数）

## DB とマイグレーション

**Django が作ったテーブル（`analyzer_*`）をそのまま使う**。Prisma 側の名前は `@@map` / `@map` /
`map:` で Django の実名に合わせてあり、id は Django の BigAutoField なので BigInt
（JSON に出すときは `server/json.ts` の `toId` で number へ）。

マイグレーションは**手書き**で、2本ある:

1. `20261007000000_django_baseline` ── Django のスキーマの `pg_dump -s` そのもの
   （`pg_trgm` の拡張だけ先頭に足した）。新しい DB ではこれで Django と同じ形ができる
2. `20261007000001_db_defaults_and_cascade` ── Django がアプリ側で持っていた既定値を DB へ、
   外部キーを `ON DELETE CASCADE` へ（分類変更履歴の取引だけ `SET NULL`）

**Django 版の DB へ初めてつなぐとき**は、1本目を「適用済み」と記録してから2本目を流す。
アプリの entrypoint は起動時に `migrate deploy` を流すので、**これを先に済ませないと
1本目が Django の表を作りにかかって失敗し、restart ループになる**。
段階7では Django を落とした後、DB だけ先に上げて使い捨てコンテナから叩いた:

```bash
cd apps/bank-analyzer && docker compose up -d bank-analyzer-db
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps \
  -e DATABASE_URL="postgresql://bankuser:<いまのパスワード>@bank-analyzer-db:5432/bank_analyzer?schema=public" \
  bank-analyzer-test node /app/node_modules/prisma/build/index.js \
  migrate resolve --applied 20261007000000_django_baseline
```

2本目は `manage.sh start --prod bank-analyzer` の entrypoint が流す。
本番 DB の複製で予行済み（2026-10-07。件数は変わらず、`analyzer_*` に残る差は下の1件だけ）。

- **`prisma db push` と `prisma migrate dev` を本番の DB に対して叩かないこと**。スキーマに無い
  Django 自身のテーブル（`auth_*` / `django_*`）を消しにかかる。スキーマの変更は
  マイグレーションを手で書いて `migrate deploy` で流す
- `migrate diff` で必ず1件出る `DROP INDEX "analyzer_case_name_2f00419f_like"` は想定どおり
  （Django が `unique=True` の文字列に自動で付ける LIKE 用の索引で、Prisma では表せない）。
  消さずに置いておく
- `description_search` は既定値を持たない。取引を作るときにアプリ側で
  NFKC 正規化 + 小文字化した値を入れる（Django 版と同じ規則。部分一致検索の trigram 索引が見る列）

## テスト

`test-data/golden/` は Django 版の出力から作った**合成データ**の正解（段階1）。
計算部分を移すたびに、ここと突き合わせるテストを足していく。**実データの正解は
リポジトリ外**（`~/.tax-apps/bank-analyzer-golden/`）にあり、リポジトリは公開なので
ここへは入れない。

集計（`aggregate.test.ts`）は実データの正解でも回せる（手で叩く。結果の中身は出さない）:

```bash
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps -e BANK_ANALYZER_GOLDEN_DIR=/golden -v "$(cygpath -w ~/.tax-apps/bank-analyzer-golden):/golden:ro" bank-analyzer-test npx vitest run server/__tests__/aggregate.test.ts
```
