# 別の PC で Django 版から React 版へ切り替える手順書

銀行取引分析（bank-analyzer）が **Django 版で動いている別の PC** を、React 版へ切り替えるための
作業手順。メインの PC では 2026-10-10 にこの順で切り替え済み（記録は
`apps/bank-analyzer-django/REACT_MIGRATION_PLAN.md` の「段階7の結果」、技術的な背景は
`README.md` の「DB とマイグレーション」）。

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

1行出ればよい（手順3で使う）。**何も出なければ中止して相談**。

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
# (1) Django 版を止める ── -v は絶対に付けない（DB のボリュームが消える）
cd apps/bank-analyzer-django && docker compose down && cd ../..

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
# (4) 本番モードで起動（パスワードの生成・付け替えと、残りの DB 変更はここで自動で走る）
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

3行（`..._django_baseline` / `..._db_defaults_and_cascade` / `..._app_settings`）がすべて `ok = t`。

### 4-4. 夜間バックアップが通るか

```bash
docker/scripts/manage.sh backup
```

失敗0で終わり、`bank-analyzer-json/ (N files)` の N が案件数と同じであること。
これで「切替前に記録された失敗」があっても上書きされる。

### 4-5. （任意）DB の形の突き合わせ

**読み取りだけ。出てきた SQL は絶対に流さないこと**（Django 自身の表を消す文が含まれている）。

```bash
NEW_PW=$(grep '^POSTGRES_PASSWORD=' apps/bank-analyzer/.env | cut -d= -f2- | tr -d '\r')
cd apps/bank-analyzer
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps \
  -e BANK_ANALYZER_SKIP_MIGRATE=1 \
  -e TARGET_URL="postgresql://bankuser:${NEW_PW}@bank-analyzer-db:5432/bank_analyzer?schema=public" \
  bank-analyzer-test sh -c 'node /app/node_modules/prisma/build/index.js migrate diff \
  --from-url "$TARGET_URL" --to-schema-datamodel /app/prisma/schema.prisma --script' \
  | grep -i 'analyzer_'
cd ../..
```

出るのが `DROP INDEX "analyzer_case_name_2f00419f_like";` の **1行だけ** なら想定どおり
（Django が自動で付けた索引で、Prisma では表せないだけ。消さずに置いておく）。
それ以外の行が出たら相談。

---

## 切り戻し

### 手順3の (1)〜(3) までで止めた場合

パスワードはまだ Django 時代のまま、表も変わっていない。新アプリの DB を落として Django 版を上げ直す:

```bash
cd apps/bank-analyzer && docker compose down && cd ../..        # -v は付けない
cd apps/bank-analyzer-django
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d   # 1-1 で控えた形に合わせる（dev なら -f を付けない）
cd ../..
```

ただしリポジトリは `git pull` 後の状態なので、このままだとウォッチドッグとバックアップが
React 版を前提に動いて失敗し続ける。**その日のうちに相談**（やり直すか、リポジトリを戻すかを決める）。

### 手順4まで進んだ後

DB のパスワードは新しい値に付け替わっており、`manage.sh` も React 版を前提にしているので、
Django 版を上げ直すだけでは戻らない。**自分で戻そうとせず相談すること**。
データは同じボリュームに残っていて、切替前の控え（`~/.tax-apps/bank-analyzer-pre-cutover/`）もある。

---

## やってはいけないこと

- `docker compose down -v`、`docker volume rm` / `docker volume prune`（DB が消える）
- `prisma db push` / `prisma migrate dev` を本番の DB に対して叩く（Django 自身の表を消しにかかる）
- `-f docker-compose.prod.yml` を並べて新アプリを手で起動する（パスワードの生成と付け替えが飛び、
  起動と失敗を繰り返す。本番起動は必ず `manage.sh start --prod bank-analyzer`）
- `apps/bank-analyzer-django` のディレクトリや Django 版のイメージを消す
  （切り戻し用。片付けは切替から2週間ほど様子を見てから、別途の手順で行う）

## Django のデータが無い PC の場合

ボリューム `bank-analyzer-postgres` が無い（＝Django 版を使っていない）PC では、
`git pull` の後に次の1行だけでよい。新アプリが DB を一から作る:

```bash
docker/scripts/manage.sh start --prod bank-analyzer && docker exec tax-apps-gateway nginx -s reload
```
