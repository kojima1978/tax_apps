# 別の PC で Django 版から React 版へ切り替える手順書

銀行取引分析（bank-analyzer）が **Django 版で動いている別の PC** を、React 版へ切り替えるための
作業手順。メインの PC では 2026-10-10 にこの順で切り替え済み（記録は
`REACT_MIGRATION_PLAN.md` の「段階7の結果」「段階8の結果」、技術的な背景は
`README.md` の「DB とマイグレーション」）。

- **Django 版はリポジトリから削除済み**（段階8）。`git pull` すると `apps/bank-analyzer-django` は
  Git の管理外のファイル（`.env` と `data/`）だけを残して消える。**Django 版はまだ動いたまま**
  （コンテナは消えない）なので、止めるのは手順3でコンテナ名を指定して行う
- **切替（手順4）で Django 自身の表（`auth_*` / `django_*`）も消える**。そこから先は
  Django 版へ戻すには 1-5 で取る控えを `pg_restore` するしかない

- **データは移し替えない**。新旧どちらも同じ DB ボリューム `bank-analyzer-postgres` を
  名前で指しているので、新アプリをそこへつなぎ直すだけ
- 所要時間はおよそ 15〜30 分（大半はイメージのビルド待ち）。画面が使えないのは手順4の間だけ
- コマンドはすべて **Git Bash** で、**リポジトリのルート（`tax_apps`）** から打つ。
  PowerShell で打たないこと（`$(...)` や変数の書き方が違う）

---

## 0. 作業の時間帯を決める

**`git pull` から手順4の終わりまでを、途中で止めずに通すこと。**

`git pull` した時点で `manage.sh` / `backup.sh` は React 版を前提にした内容に変わる。
その状態で切替前に次の2つが走ると、失敗が記録されてデスクトップに `TAX-APPS-ALERT.txt` が出る
（データは壊れないが、警告を消すには次の成功を待つことになる）:

- **ウォッチドッグの自動復旧**: React 版のコンテナが無いので起動しようとし、
  動いている Django 版とコンテナ名がぶつかって失敗する。手順4の直前に走ると、
  React 版を **dev サーバとして** 上げてしまう
- **夜間バックアップ**: React 版の JSON 書き出し（`npm run backup:json`）を
  Django 版のコンテナで呼んで失敗する

ウォッチドッグは **0時起点の4時間毎**（0 / 4 / 8 / 12 / 16 / 20 時）に起きる。
次の実行時刻を PowerShell で確かめ、そこまで **1時間以上** 空いている時間帯に始める:

```powershell
Get-ScheduledTaskInfo -TaskName 'Tax Apps Docker Watchdog' | Select-Object LastRunTime, NextRunTime
```

作業中は **PC を再起動・サインアウトしない**（ログオン時のタスクも同じ復旧を走らせる）。

---

## 1. 事前の確認（まだ何も変えない）

### 1-1. いまの状態を見る

```bash
git status
git log --oneline -1
docker volume ls | grep bank-analyzer
docker ps --format '{{.Names}}\t{{.Status}}' | grep bank-analyzer
docker inspect bank-analyzer --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
```

| 確認すること | 期待する結果 | 違ったら |
|---|---|---|
| `git status` | `apps/` 配下に自分の変更が無い | 変更の中身を確かめてから進める（`git stash` で退避するなど） |
| `docker volume ls` | `bank-analyzer-postgres` がある | **中止して相談**（名前で引き継げないので `pg_dump` → `pg_restore` の手順になる） |
| `docker ps` | `bank-analyzer` と `bank-analyzer-postgres` が Up | Django 版が動いていないなら、まず動いている状態に戻してから |
| `docker inspect` | 起動に使った compose ファイルの一覧 | ── **控えておく**（切り戻しで同じ形に戻すため。`docker-compose.prod.yml` が入っていれば本番モード） |
| `docker ps` に他の名前 | `bank-analyzer` で始まるのは上の2つだけ | 他にもあれば中止して相談（手順3の (1) はこの2つだけを止める） |

### 1-2. DB の形が新アプリの前提と合っているか

```bash
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -At \
  -c "select max(name) from django_migrations where app = 'analyzer'"
```

**`0018_classificationchange` であること**。新アプリはこの時点の Django の表の形を前提にしている。
これより古い番号なら **中止して相談**（先に Django 側の表を最新へ上げる必要がある）。

`psql: ... role "bankuser" does not exist` や `database "bank_analyzer" does not exist` が出たときも
**中止して相談**（ロール名・DB 名が想定と違う）。

### 1-3. 件数を控える（切替後に突き合わせる）

```bash
mkdir -p ~/.tax-apps/bank-analyzer-pre-cutover
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -c "
select (select count(*) from analyzer_case)                 as cases,
       (select count(*) from analyzer_account)              as accounts,
       (select count(*) from analyzer_transaction)          as transactions,
       (select count(*) from analyzer_classificationchange) as changes,
       (select count(*) from analyzer_deletionbackup)       as deletions" \
  | tee ~/.tax-apps/bank-analyzer-pre-cutover/counts-before.txt
```

### 1-4. Django 版の DB パスワードを控える

```bash
grep '^DB_PASSWORD=' apps/bank-analyzer-django/.env
```

1行出ればよい（手順3で使う。このファイルは Git の管理外なので `git pull` の後も残る）。
**何も出なければ中止して相談**。

### 1-5. DB の控えを取る

**`backup.sh backup` / `manage.sh backup` はここでは使わないこと**（Django 版に対して
React 版の JSON 書き出しを呼んで失敗し、デスクトップに警告が出る）。DB だけを直接取る:

```bash
docker exec bank-analyzer-postgres pg_dump -U bankuser -Fc -f /tmp/bank_analyzer.dump bank_analyzer
docker cp bank-analyzer-postgres:/tmp/bank_analyzer.dump ~/.tax-apps/bank-analyzer-pre-cutover/bank_analyzer.dump
docker exec bank-analyzer-postgres rm /tmp/bank_analyzer.dump
ls -l ~/.tax-apps/bank-analyzer-pre-cutover/
```

`bank_analyzer.dump` が 0 バイトでないこと。**実データなのでリポジトリの中には置かない**
（`~/.tax-apps/` はリポジトリの外）。

ここまでで止めても何も変わっていない。

---

## 2. 最新のソースを取り込み、イメージを先に作る

ここから手順4の終わりまで続けて行う。

```bash
git pull

# 新アプリのイメージを先に作っておく（Django 版は動いたまま。画面が止まる時間を短くするため）
cd apps/bank-analyzer
docker compose --profile test build bank-analyzer-test
POSTGRES_PASSWORD=prebuild docker compose -f docker-compose.yml -f docker-compose.prod.yml build bank-analyzer
cd ../..
```

`POSTGRES_PASSWORD=prebuild` はビルドを通すためだけの仮の値で、どこにも保存されない
（本物は手順4で `manage.sh` が生成する）。

---

## 3. 切り替える（(1)〜(5) を続けて）

```bash
# (1) Django 版を止めて消す（compose ファイルは git pull で消えているので、コンテナ名で指定する）
#     消えるのはコンテナだけで、DB のボリューム bank-analyzer-postgres は残る。
#     docker volume rm / docker compose down -v は絶対に叩かない
docker stop bank-analyzer bank-analyzer-postgres
docker rm bank-analyzer bank-analyzer-postgres

# (2) 新アプリの DB だけ先に上げる（中身は Django 版のまま）
cd apps/bank-analyzer && docker compose up -d bank-analyzer-db && cd ../..

# (3) 「Django が作った表は既にある」と記録する（Django 時代のパスワードを使う）
DJANGO_PW=$(grep '^DB_PASSWORD=' apps/bank-analyzer-django/.env | cut -d= -f2- | tr -d '\r')
cd apps/bank-analyzer
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps \
  -e DATABASE_URL="postgresql://bankuser:${DJANGO_PW}@bank-analyzer-db:5432/bank_analyzer?schema=public" \
  bank-analyzer-test node /app/node_modules/prisma/build/index.js \
  migrate resolve --applied 20261007000000_django_baseline
cd ../..
```

(3) は `Migration 20261007000000_django_baseline marked as applied.` が出れば成功。

- **`P1000: Authentication failed`** が出たら、パスワードが違う。まだ何も変わっていないので、
  下の「切り戻し（手順3までで止めた場合）」で Django 版へ戻して相談
- **(3) を飛ばして (4) へ進まないこと**。新アプリが Django の表を一から作りにかかって失敗し、
  起動と失敗を繰り返す

```bash
# (4) 本番モードで起動（パスワードの生成・付け替えと、残りの DB 変更はここで自動で走る。
#     Django 自身の表を消すのもここ ── ここから先は控えの pg_restore でしか Django 版へ戻れない）
docker/scripts/manage.sh start --prod bank-analyzer

# (5) ゲートウェイに設定を読み直させる
docker exec tax-apps-gateway nginx -s reload
```

(4) の出力に `WARN` が出ていないこと。`apps/bank-analyzer/.env` はここで自動で作られる
（手で作らない・手で書き換えない。書き換えると DB とパスワードが食い違って繋がらなくなる）。

**ここまで来たら切替は完了**。以降は確認だけ。

---

## 4. 確認する

### 4-1. 動いているか

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep bank-analyzer
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

- `bank-analyzer` と `bank-analyzer-postgres` が `Up ... (healthy)`
  （起動直後は `health: starting`。1〜2分待って見直す）
- `status` で bank-analyzer のモードが `prod`
- `preflight` にエラーが無い

ブラウザで `/bank-analyzer/` を開き、案件一覧が出て、いつもの案件の取引が見えること。

### 4-2. 件数が変わっていないか

```bash
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -c "
select (select count(*) from analyzer_case)                 as cases,
       (select count(*) from analyzer_account)              as accounts,
       (select count(*) from analyzer_transaction)          as transactions,
       (select count(*) from analyzer_classificationchange) as changes,
       (select count(*) from analyzer_deletionbackup)       as deletions"
cat ~/.tax-apps/bank-analyzer-pre-cutover/counts-before.txt
```

2つの数字が全部同じであること。

### 4-3. マイグレーションが全部通ったか

```bash
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -c \
  "select migration_name, finished_at is not null as ok from _prisma_migrations order by migration_name"
```

4行（`..._django_baseline` / `..._db_defaults_and_cascade` / `..._app_settings` /
`..._drop_django_tables`）がすべて `ok = t`。

### 4-4. 夜間バックアップが通るか

```bash
docker/scripts/manage.sh backup
```

失敗0で終わり、`bank-analyzer-json/ (N files)` の N が案件数と同じであること。
これで「切替前に記録された失敗」があっても上書きされる。

### 4-5. （任意）DB の形の突き合わせ

**読み取りだけ。出てきた SQL は流さないこと**。

```bash
NEW_PW=$(grep '^POSTGRES_PASSWORD=' apps/bank-analyzer/.env | cut -d= -f2- | tr -d '\r')
cd apps/bank-analyzer
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps \
  -e BANK_ANALYZER_SKIP_MIGRATE=1 \
  -e TARGET_URL="postgresql://bankuser:${NEW_PW}@bank-analyzer-db:5432/bank_analyzer?schema=public" \
  bank-analyzer-test sh -c 'node /app/node_modules/prisma/build/index.js migrate diff \
  --from-url "$TARGET_URL" --to-schema-datamodel /app/prisma/schema.prisma --script'
cd ../..
```

出る SQL 文が `DROP INDEX "analyzer_case_name_2f00419f_like";` の **1つだけ** なら想定どおり
（Django が自動で付けた索引で、Prisma では表せないだけ。消さずに置いておく）。
それ以外の行が出たら相談。

---

## 5. 片付け

4 の確認が全部済んだら、Django 版の残りを消す（DB からは手順4で Django の表が消えているので、
これらはもう切り戻しの役に立たない。切り戻しに要るのは 1-5 の控えだけ）:

```bash
rm -rf apps/bank-analyzer-django                     # 残っているのは Git の管理外の .env と data/ だけ
rm -f docker/logs/app-modes/bank-analyzer-django
docker rmi bank-analyzer-django-bank-analyzer-django bank-analyzer-django-test   # 無いと言われたらそれでよい
```

`~/.tax-apps/bank-analyzer-pre-cutover/` は**消さない**（Django 版の DB の最後の控え）。

---

## 切り戻し

### 手順3の (1)〜(3) までで止めた場合

パスワードはまだ Django 時代のまま、表も変わっていない。Django 版のソースは `git pull` で消えているので、
最後にあったコミットから一時的に取り出して上げ直す:

```bash
cd apps/bank-analyzer && docker compose down && cd ../..        # -v は付けない
git checkout 4962355e -- apps/bank-analyzer-django              # 一時的な取り出し。コミットしない
cd apps/bank-analyzer-django
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build   # 1-1 で控えた形に合わせる（dev なら -f を付けない）
cd ../..
```

ただしリポジトリのほかの部分は `git pull` 後の状態なので、このままだとウォッチドッグとバックアップが
React 版を前提に動いて失敗し続ける。**その日のうちに相談**（やり直すか、リポジトリを戻すかを決める）。

### 手順4まで進んだ後

DB のパスワードは新しい値に付け替わり、Django 自身の表（ログインやセッションの表）も消えているので、
Django 版を上げ直すだけでは戻らない。**自分で戻そうとせず相談すること**。
取引などのデータは同じボリュームに残っていて、切替前の控え（`~/.tax-apps/bank-analyzer-pre-cutover/`）もある。

---

## やってはいけないこと

- `docker compose down -v`、`docker volume rm` / `docker volume prune`（DB が消える）
- `prisma db push` / `prisma migrate dev` を本番の DB に対して叩く（Django 自身の表を消しにかかる）
- `-f docker-compose.prod.yml` を並べて新アプリを手で起動する（パスワードの生成と付け替えが飛び、
  起動と失敗を繰り返す。本番起動は必ず `manage.sh start --prod bank-analyzer`）
- 1-5 の控えを取らずに手順4へ進む（手順4で Django の表が消えるので、控えが唯一の戻り道になる）

## Django のデータが無い PC の場合

ボリューム `bank-analyzer-postgres` が無い（＝Django 版を使っていない）PC では、
`git pull` の後に次の1行だけでよい。新アプリが DB を一から作る:

```bash
docker/scripts/manage.sh start --prod bank-analyzer && docker exec tax-apps-gateway nginx -s reload
```
