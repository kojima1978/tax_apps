# bank-analyzer（銀行取引分析・React 版）

Django 版（`apps/bank-analyzer-django`）からの**移行中**のアプリ。計画と進捗は
`apps/bank-analyzer-django/REACT_MIGRATION_PLAN.md`。構成は株式評価明細書と同じ
（Vite + React 19 + TypeScript + Tailwind v4 / Hono / Prisma 6 / PostgreSQL 16）。

## 並走中の名前

切替（計画の段階7）までは Django 版と並べて動かすため、名前・ポート・パスをずらしている。

| | Django 版（稼働中） | React 版（このアプリ） |
|---|---|---|
| URL | `/bank-analyzer/` | `/bank-analyzer-next/` |
| コンテナ | `bank-analyzer` / `bank-analyzer-postgres` | `bank-analyzer-next` / `bank-analyzer-next-postgres` |
| ポート | 3007 | 3008（dev の API は 3108） |
| manage.sh | `APPS` | `UNMANAGED_APPS`（自動起動・復旧・バックアップの対象外） |

- **サービス名を `bank-analyzer` にしないこと**。`tax-apps-network` 上の DNS 名になり、
  Django 版のコンテナ名とぶつかる
- パスは **`vite.config.ts` の `base` と `server/app.ts` の `BASE_PATH` の2箇所**。切替時は両方直す

## コマンド

```bash
# 起動（dev。Vite 3008 + API 3108 を1コンテナで並走）
cd apps/bank-analyzer && docker compose up -d --build

# テスト（型検査 + vitest。使い捨てコンテナで回る）
docker/scripts/manage.sh test bank-analyzer
```

ソースは `src` / `server` / `prisma` / `index.html` を読み取り専用で bind mount している
（ポーリング監視）。`package.json` を変えたら `--build` が要る。

## DB とマイグレーション

**Django が作ったテーブル（`analyzer_*`）をそのまま使う**。Prisma 側の名前は `@@map` / `@map` /
`map:` で Django の実名に合わせてあり、id は Django の BigAutoField なので BigInt
（JSON に出すときは `server/json.ts` の `toId` で number へ）。

マイグレーションは**手書き**で、2本ある:

1. `20261007000000_django_baseline` ── Django のスキーマの `pg_dump -s` そのもの
   （`pg_trgm` の拡張だけ先頭に足した）。新しい DB ではこれで Django と同じ形ができる
2. `20261007000001_db_defaults_and_cascade` ── Django がアプリ側で持っていた既定値を DB へ、
   外部キーを `ON DELETE CASCADE` へ（分類変更履歴の取引だけ `SET NULL`）

**本番の DB へ切り替えるとき**（段階7）は、1本目を「適用済み」と記録してから2本目を流す:

```bash
npx prisma migrate resolve --applied 20261007000000_django_baseline
npx prisma migrate deploy
```

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
