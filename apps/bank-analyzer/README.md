# bank-analyzer（銀行取引分析・React 版）

Django 版（旧 `apps/bank-analyzer-django`。段階8で削除）の**置き換え**。移行の記録は
`REACT_MIGRATION_PLAN.md`。構成は株式評価明細書と同じ
（Vite + React 19 + TypeScript + Tailwind v4 / Hono / Prisma 6 / PostgreSQL 16）。

## 名前

段階7（切替）で Django 版の名前をそのまま引き継いだ。並走用の
`bank-analyzer-next` / 3008 / `/bank-analyzer-next/` はもう無い。

| | |
|---|---|
| URL | `/bank-analyzer/` |
| コンテナ | `bank-analyzer` / `bank-analyzer-postgres` |
| ポート | 3007（dev の API は 3107） |
| DB のボリューム | `bank-analyzer-postgres`（Django 版のものを引き継ぐ・中身は移し替えない。compose 上は `external`） |

- パスは **`vite.config.ts` の `base` と `server/app.ts` の `BASE_PATH` の2箇所**だけ。
  画面側のパスは全部 `import.meta.env.BASE_URL` から来る

## コマンド

```bash
# 起動（dev。Vite 3007 + API 3107 を1コンテナで並走）
docker/scripts/manage.sh start bank-analyzer

# 本番モードへ切り替えて起動（シークレットの生成と ALTER ROLE はここで走る。
# 個別に -f docker-compose.prod.yml を並べて叩くと、それが飛んで restart ループになる）
docker/scripts/manage.sh start --prod bank-analyzer

# 再ビルド（いま動いているモードを踏襲する）
docker/scripts/manage.sh build bank-analyzer

# テスト（型検査 + vitest。使い捨てコンテナで回る）
docker/scripts/manage.sh test bank-analyzer
```

- **起動は `manage.sh` から行う**。DB のボリュームは `external` なので compose は作りも消しもせず
  （`down -v` でも消えない）、無い PC では `manage.sh` が `EXTERNAL_VOLUMES` から作る。
  素の `docker compose up` はボリュームが無いと失敗するうえ、base の compose だけを読むので
  本番で動いているアプリを dev サーバに作り替える
- dev は `src` / `server` / `prisma` / `index.html` を読み取り専用で bind mount している
  （ポーリング監視。Vite は `vite.config.ts` の `server.watch`、API の `tsx watch` は
  compose の `CHOKIDAR_USEPOLLING` で、2箇所ある）。`package.json` を変えたら `build` が要る
- **本番はソースをイメージに同梱する**（オーバーレイが bind mount を `!reset` で落とす）ので、
  本番モードのときはどの変更も `build` しないと入らない
- 起動のたびに entrypoint が `prisma migrate deploy` を流す（テスト用サービスは
  `BANK_ANALYZER_SKIP_MIGRATE=1` で飛ばす）。本番では `POSTGRES_PASSWORD` が空か既定値だと起動を拒む
- health は `/bank-analyzer/api/health`（DB に問い合わせる。dev は Vite の生存も見る）

## バックアップと復元

全アプリ共通の仕組み（取るのは全体で1つ、戻すのはアプリごと）は [docker/RESTORE.md](../../docker/RESTORE.md)。

- **全体バックアップに入るもの**: DB の `pg_dump`（`bank-analyzer-postgres`）・`.env`・案件ごとの JSON（下）
  （`backup.sh` の `PG_TARGETS` / `SETTINGS_TARGETS`）
- **取る**: `docker/scripts/manage.sh backup`（全体。ふだんはウォッチドッグが自動で回すので叩かなくてよい）
- **戻す**: `docker/scripts/manage.sh restore bank-analyzer <バックアップ>`。`--yes` が無ければ一覧だけ出して
  何も変えない。実行は `--yes` を付けて、人の確認の後。戻るのは DB（`.sql`）で、JSON は流さない
- **案件を1件だけ戻す**: バックアップの中の `<番号>_<案件名>_backup.json` を画面の「JSONから復元」で読む

### 夜間バックアップの JSON

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

DB イメージは `pgvector/pgvector:0.8.7-pg16-bookworm` を使う。引き継いだ DB に登録済みの
`vector` 拡張を復元できるよう、拡張を同梱した PostgreSQL 16・bookworm 系を使う。
標準の `postgres` イメージには拡張ファイルがなく、既存 DB が起動できてもダンプの復元は失敗する。
ただし**引き継いだボリュームの生まれは PC によって違う**
（glibc の `postgres:16` で作られたもの＝照合順序の記録 `2.36`、musl の `postgres:16-alpine` で
作られたもの＝記録なし、の両方が実在する）。DB の照合順序が `en_US.utf8` のままだと並び順が
libc で決まるので、イメージの libc 系をどちらに決めても片方の PC では食い違う。

根治は DB の照合順序を Postgres 組み込みのバイト順 `C` へ移すこと。移した後は alpine / bookworm の
どちらで開いても並び順は変わらない（2026-10-14、開発 PC で実施済み）。**各 PC で一度だけ手で叩く**
（自動の経路には載せていない）:

```bash
docker/scripts/manage.sh backup && docker/scripts/manage.sh drill   # 24時間以内の成功が前提
docker/scripts/manage.sh collation                    # 一覧（何も変えない）
docker/scripts/manage.sh collation bank-analyzer      # 手順の表示（何も変えない）
docker/scripts/manage.sh collation bank-analyzer --yes
```

中身は「アプリだけ止める → `pg_dump` → `LC_COLLATE=C` の新しい DB へ復元 → 全テーブルの件数照合
→ 改名で入れ替え → アプリ起動 → template1 も `C` で作り直す」。ボリュームは消さず、旧 DB は
`bank_analyzer_pre_c` として残る。template1 を作り直すのはリストアや新しい DB が `en_US.utf8` へ
戻らないようにするため。template1 の作り直しが入る前の版で移した PC は、もう一度 `--yes` を叩くと
template1 だけを直す（アプリは止めない）。手順書は `docker/COLLATION-MIGRATION.md`。

- **musl 生まれ（記録なし）の PC**: 今の並び順もバイト順なので挙動は変わらない。移してから
  bookworm へ切り替えれば `REINDEX` も要らない（先に bookworm へ切り替えると、musl の順で作った
  インデックスを glibc で読むことになるので `REINDEX DATABASE` が必須になる）
- **glibc 生まれ（記録 `2.36`）の PC**: 並び順が言語順からバイト順に変わる（記号・大文字小文字の
  前後など）。画面で効くのは口座の並び（`printOrder` が同じ口座どうしの銀行名・支店名・口座番号の順。
  `cases.ts` / `passbookInventory.ts`）だけ。移す前に口座一覧を見ておき、後で同じ順か確かめる
- 旧 DB は移した直後の巻き戻し用。**イメージの libc 系を変えた後は旧 DB の索引は信用できない**ので、
  画面と件数を確かめたら `DROP DATABASE bank_analyzer_pre_c;` で消す

マイグレーションは**手書き**で、4本ある:

1. `20261007000000_django_baseline` ── Django のスキーマの `pg_dump -s` そのもの
   （`pg_trgm` の拡張だけ先頭に足した）。新しい DB ではこれで Django と同じ形ができる
2. `20261007000001_db_defaults_and_cascade` ── Django がアプリ側で持っていた既定値を DB へ、
   外部キーを `ON DELETE CASCADE` へ（分類変更履歴の取引だけ `SET NULL`）
3. `20261008000000_app_settings` ── 全体の設定（多額取引の閾値・分類パターンなど）の表
4. `20261010000000_drop_django_tables` ── Django 自身の表（`auth_*` / `django_*` の10表）を落とす（段階8）。
   新しい DB にはもともと無いので `IF EXISTS`

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

2本目以降は `manage.sh start --prod bank-analyzer` の entrypoint が流す。
本番 DB の複製で予行済み（2026-10-07。件数は変わらず、`analyzer_*` に残る差は下の1件だけ）。

- **`prisma db push` と `prisma migrate dev` を本番の DB に対して叩かないこと**。下の LIKE 用索引を
  消しにかかるうえ、マイグレーションの記録とずれる。スキーマの変更は
  マイグレーションを手で書いて `migrate deploy` で流す
- `migrate diff` に必ず1件出る `DROP INDEX "analyzer_case_name_2f00419f_like"` は想定どおり
  （Django が `unique=True` の文字列に自動で付ける LIKE 用の索引で、Prisma では表せない）。
  消さずに置いておく
- `description_search` は既定値を持たない。取引を作るときにアプリ側で
  NFKC 正規化 + 小文字化した値を入れる（Django 版と同じ規則。部分一致検索の trigram 索引が見る列）

## 別の環境で切り替える

Django 版が動いている別の環境で同じ切替をするときは **`CUTOVER.md`**（事前確認・控え・件数の突合・
切り戻しまで含めた手順書）を使う。要点:

- DB の実体が `bank-analyzer-postgres` という名前のボリュームなら、データは移し替えずにつなぎ直すだけ
- Django 版のソースはリポジトリから消えている（`git pull` 後も Django のコンテナは動いたまま）ので、
  止めるのはコンテナ名を指定して行う
- つなぐ前に baseline を「適用済み」と記録する（上の「DB とマイグレーション」）。
  `manage.sh start --prod bank-analyzer` の entrypoint が残りを流し、**Django の表もそこで消える**
  ＝ 切替前の `pg_dump` が唯一の戻り道になる
- Django 版の DB は `postgres:16-alpine` で動いていたので、新アプリ（bookworm）へつないだ直後に
  `manage.sh collation bank-analyzer --yes` で照合順序を `C` へ移す（それまで画面から入力しない）
- Django のデータが無い環境では `manage.sh start --prod bank-analyzer` だけで DB が一から作られる

## テスト

`manage.sh test bank-analyzer` は `bank-analyzer-test`（dev ステージに PostgreSQL を足した
test ステージ。本体の DB にはつながない）を `run --rm --build` で回す。ソースは bind mount せず
イメージに同梱するので、手で回すときも `--build` を付けないと古いソースのまま走る。
DB を使うテスト（`*.db.test.ts`）は、コンテナの中でテストのたびに PostgreSQL を立てて使う
（`server/__tests__/setup/postgres.ts`）。

`test-data/golden/` は Django 版の出力から作った**合成データ**の正解（段階1）で、
`golden.test.ts` などが毎回突き合わせる。作り直す手順は `test-data/golden/README.md`
（Django 版は消えているので `4962355e` から取り出す）。**実データの正解は
リポジトリ外**（`~/.tax-apps/bank-analyzer-golden/`）にあり、リポジトリは公開なので
ここへは入れない。

集計（`aggregate.test.ts`）は実データの正解でも回せる（手で叩く。結果の中身は出さない）:

```bash
cd apps/bank-analyzer && MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps --build -e BANK_ANALYZER_GOLDEN_DIR=/golden -v "$(cygpath -w ~/.tax-apps/bank-analyzer-golden):/golden:ro" bank-analyzer-test npx vitest run server/__tests__/aggregate.test.ts
```

`real.db.test.ts`（本番 DB の複製との突き合わせ）は移行時の検証記録で、もう回さない
（`REACT_MIGRATION_PLAN.md` の段階6）。環境変数が無ければ丸ごと飛ぶ。
