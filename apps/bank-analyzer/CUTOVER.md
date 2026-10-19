# 別の PC で Django 版から React 版へ切り替える手順書

銀行取引分析（bank-analyzer）が **Django 版で動いている別の PC** を、React 版へ切り替えるための
作業手順。メインの PC では 2026-10-10 に切り替え、2026-10-14 に DB の照合順序を `C` へ移した
（記録は `REACT_MIGRATION_PLAN.md` の「段階7の結果」「段階8の結果」、技術的な背景は
`README.md` の「DB とマイグレーション」、照合順序は `docker/COLLATION-MIGRATION.md`）。
この手順書は両方を1回で通す。

- **Django 版はリポジトリから削除済み**（段階8）。`git pull` すると `apps/bank-analyzer-django` は
  Git の管理外のファイル（`.env` と `data/`）だけを残して消える。**Django 版はまだ動いたまま**
  （コンテナは消えない）なので、止めるのは手順3の (1) でコンテナ名を指定して行う
- **手順3の (4) で Django 自身の表（`auth_*` / `django_*`）も消える**。そこから先は
  Django 版へ戻すには 1-5 で取る控えを `pg_restore` するしかない
- **DB のイメージが変わる**。Django 版の DB は `postgres:16-alpine`（musl）、新アプリは
  `pgvector/pgvector:0.8.7-pg16-bookworm`（glibc）。DB の照合順序が `en_US.utf8` のままだと
  並び順とインデックスの解釈が libc で変わるので、**切り替えた直後に 4-5 で照合順序を `C` へ移す**
  （それまで画面からの入力・取込はしない）

- **データは移し替えない**。新旧どちらも同じ DB ボリューム `bank-analyzer-postgres` を
  名前で指しているので、新アプリをそこへつなぎ直すだけ（照合順序の移行は同じボリュームの中で
  DB を作り直して入れ替える。旧 DB は `bank_analyzer_pre_c` として残る）
- 所要時間はおよそ 30〜60 分（大半はイメージのビルドとリストア訓練の待ち）。
  画面が使えないのは手順3の間と 4-5 の数分だけ
- コマンドはすべて **Git Bash** で、**リポジトリのルート（`tax_apps`）** から打つ。
  PowerShell で打たないこと（`$(...)` や変数の書き方が違う）。手順0の1行だけは PowerShell

---

## 0. 作業の時間帯を決める

**`git pull` から手順3の終わりまでを、途中で止めずに通すこと。**

`git pull` した時点で `manage.sh` / `backup.sh` は React 版を前提にした内容に変わる。
その状態で切替前にウォッチドッグ（`Tax Apps Docker Watchdog`）が起きると、次の2つが走って
失敗が記録され、デスクトップに `TAX-APPS-ALERT.txt` が出る
（データは壊れないが、警告を消すには次の成功を待つことになる）:

- **自動復旧**: React 版のコンテナが無いので起動しようとし、
  動いている Django 版とコンテナ名がぶつかって失敗する。手順2のビルドの後に走ると、
  React 版を本番ではない形で上げてしまう
- **期限切れのバックアップ**（前回の成功から20時間を過ぎていれば、ウォッチドッグが続けて走らせる）:
  React 版の JSON 書き出し（`npm run backup:json`）を Django 版のコンテナで呼んで失敗する

ウォッチドッグは **0時起点の4時間毎**（0 / 4 / 8 / 12 / 16 / 20 時）に起きる。
次の実行時刻を PowerShell で確かめ、そこまで **1時間以上** 空いている時間帯に始める:

```powershell
Get-ScheduledTaskInfo -TaskName 'Tax Apps Docker Watchdog' | Select-Object LastRunTime, NextRunTime
```

作業中は **PC を再起動・サインアウトしない**（ログオン時の `Tax Apps Startup` も同じ復旧を走らせる）。
手順4から先はウォッチドッグが走っても構わない（操作ロックで順番待ちになるだけ）。

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
| `git status` | `apps/` 配下に自分の変更が無い | 変更の中身を確かめてから進める（`git stash push -- <ファイル>` でファイルを指定して退避するなど） |
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

### 1-3. 件数と照合順序を控える（切替後に突き合わせる）

```bash
mkdir -p ~/.tax-apps/bank-analyzer-pre-cutover
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -c "
select (select count(*) from analyzer_case)                 as cases,
       (select count(*) from analyzer_account)              as accounts,
       (select count(*) from analyzer_transaction)          as transactions,
       (select count(*) from analyzer_classificationchange) as changes,
       (select count(*) from analyzer_deletionbackup)       as deletions" \
  | tee ~/.tax-apps/bank-analyzer-pre-cutover/counts-before.txt

docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -At \
  -c "select datcollate, coalesce(datcollversion, '(なし)') from pg_database where datname = 'bank_analyzer'" \
  | tee ~/.tax-apps/bank-analyzer-pre-cutover/collation-before.txt
```

2つ目の結果で 4-5 のやり方が決まる:

| 出力 | 意味 |
|---|---|
| `C\|...` | 移行済み。4-5 は「OK」と出るだけで何もしない |
| `en_US.utf8\|(なし)` | musl（alpine）生まれ。いまの並びもバイト順なので、`C` へ移しても並びは変わらない |
| `en_US.utf8\|2.36` など | glibc 生まれ。`C` へ移すと口座の並び（下）が言語順からバイト順へ変わりうる |

**glibc 生まれ（バージョンが出た）ときだけ**、口座の並びも控える（4-6 で突き合わせる）:

```bash
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -At \
  -c "select case_id, id from analyzer_account order by case_id, print_order, bank_name, branch_name, account_number" \
  > ~/.tax-apps/bank-analyzer-pre-cutover/account-order-before.txt
wc -l ~/.tax-apps/bank-analyzer-pre-cutover/account-order-before.txt
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

ここから手順3の終わりまで続けて行う。

```bash
git pull

# 新アプリのイメージを先に作っておく（Django 版は動いたまま。画面が止まる時間を短くするため）
cd apps/bank-analyzer
docker compose --profile test build bank-analyzer-test
POSTGRES_PASSWORD=prebuild docker compose -f docker-compose.yml -f docker-compose.prod.yml build bank-analyzer
cd ../..
```

`POSTGRES_PASSWORD=prebuild` はビルドを通すためだけの仮の値で、どこにも保存されない
（本物は手順3の (4) で `manage.sh` が生成する）。ここで `-f docker-compose.prod.yml` を並べてよいのは
`build` だけ（起動には使わない。下の「やってはいけないこと」）。

---

## 3. 切り替える（(1)〜(5) を続けて）

```bash
# (1) Django 版を止めて消す（compose ファイルは git pull で消えているので、コンテナ名で指定する）
#     消えるのはコンテナだけで、DB のボリューム bank-analyzer-postgres は残る。
#     docker volume rm / docker compose down -v は絶対に叩かない
docker stop bank-analyzer bank-analyzer-postgres
docker rm bank-analyzer bank-analyzer-postgres

# (2) 新アプリの DB だけ先に上げる（中身は Django 版のまま。イメージはここで bookworm に変わる）
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

(2) で `external volume "bank-analyzer-postgres" not found` と出たら、ボリューム名が違う。
まだ何も変わっていないので、下の「切り戻し（手順3の (3) までで止めた場合）」で戻して相談。

(3) は `Migration 20261007000000_django_baseline marked as applied.` が出れば成功。

- **`P1000: Authentication failed`** が出たら、パスワードが違う。表はまだ変わっていないので、
  下の「切り戻し（手順3の (3) までで止めた場合）」で Django 版へ戻して相談
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

**ここまで来たら切替は完了**。続けて 4 で確かめ、4-5 で照合順序を移す。
**4-5 が終わるまで、画面からの入力・取込はしない**（開いて見るのは 4-6 で行う）。

---

## 4. 確認と照合順序の移行

### 4-1. 動いているか

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep bank-analyzer
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

- `bank-analyzer` と `bank-analyzer-postgres` が `Up ... (healthy)`
  （起動直後は `health: starting`。1〜2分待って見直す）
- `status` で bank-analyzer のモードが `prod`
- `preflight` に bank-analyzer についてのエラーが無い（照合順序が `C` でないという WARN は
  4-5 で消えるので、この時点では出てよい）

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

### 4-4. バックアップとリストア訓練が通るか

```bash
docker/scripts/manage.sh backup
docker/scripts/manage.sh drill
```

- `backup` は `Failed: 0` で終わり、`bank-analyzer-json/ (N files)` の N が案件数と同じであること。
  これで「切替前に記録された失敗」があっても上書きされる
- `drill` も `Failed: 0` で終わること（4-5 は24時間以内のこの2つの成功が無いと実行を拒否する）

どちらかが失敗したら 4-5 へ進まずに相談（切替そのものは済んでいる。入力は控えたまま）。

### 4-5. 照合順序を `C` へ移す

```bash
docker/scripts/manage.sh collation bank-analyzer        # 手順の表示（何も変えない）
docker/scripts/manage.sh collation bank-analyzer --yes  # 実行（bank-analyzer だけ数分止まる）
docker/scripts/manage.sh collation                      # bank-analyzer が OK（libc 非依存）になったこと
```

`--yes` の出力に `件数一致: N テーブル / M 行` と `bank-analyzer の bank_analyzer を LC_COLLATE=C へ移しました`
が出ること。中身は「アプリだけ止める → `pg_dump` → `C` の新しい DB へ復元（インデックスはここで
作り直される）→ 全テーブルの件数照合 → 改名で入れ替え → アプリ起動 → template1 も `C` で作り直す」。
止まったときの読み方は `docker/COLLATION-MIGRATION.md` の手順5（**どれも元の DB は変わっていない
状態で止まる**ので、手で直そうとせず相談）。

1-3 で既に `C` だった PC は、表示が「OK」になるだけで `--yes` は要らない。

**`REINDEX` を手で叩かないこと**（復元でインデックスは作り直される）。

### 4-6. 画面で確かめる

ブラウザで `/bank-analyzer/` を開き、案件一覧が出て、いつもの案件の取引が見えること。
ここから画面での入力・取込をしてよい。

1-3 で口座の並びを控えた（glibc 生まれの）PC だけ、並びを突き合わせる:

```bash
docker exec bank-analyzer-postgres psql -U bankuser -d bank_analyzer -At \
  -c "select case_id, id from analyzer_account order by case_id, print_order, bank_name, branch_name, account_number" \
  > ~/.tax-apps/bank-analyzer-pre-cutover/account-order-after.txt
diff ~/.tax-apps/bank-analyzer-pre-cutover/account-order-before.txt ~/.tax-apps/bank-analyzer-pre-cutover/account-order-after.txt
```

差分が出ても失敗ではない（印刷順が同じ口座どうしの銀行名・支店名・口座番号の並びが、言語順から
バイト順へ変わった結果）。困る口座があれば画面で印刷順を付け直せば並びは固定できる。

### 4-7. （任意）DB の形の突き合わせ

**読み取りだけ。出てきた SQL は流さないこと**。

```bash
NEW_PW=$(grep '^POSTGRES_PASSWORD=' apps/bank-analyzer/.env | cut -d= -f2- | tr -d '\r')
cd apps/bank-analyzer
MSYS_NO_PATHCONV=1 docker compose --profile test run --rm --no-deps \
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

4 の確認が全部済んだら、Django 版の残りを消す（DB からは手順3の (4) で Django の表が消えているので、
これらはもう切り戻しの役に立たない。切り戻しに要るのは 1-5 の控えだけ）:

```bash
rm -rf apps/bank-analyzer-django                     # 残っているのは Git の管理外の .env と data/ だけ
rm -f docker/logs/app-modes/bank-analyzer-django
docker rmi bank-analyzer-django-bank-analyzer-django bank-analyzer-django-test   # 無いと言われたらそれでよい
```

4-5 で残った旧 DB（`bank_analyzer_pre_c`）は、4-6 で画面に問題が無いと**人が確かめてから**消す
（イメージの libc が変わった後なので、旧 DB の索引はもう信用できない。巻き戻しは 1-5 の控えで行う）:

```bash
docker exec bank-analyzer-postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE bank_analyzer_pre_c"'
```

`~/.tax-apps/bank-analyzer-pre-cutover/` は**消さない**（Django 版の DB の最後の控え）。

---

## 切り戻し

### 手順3の (3) までで止めた場合

パスワードはまだ Django 時代のまま、表も変わっていない（(3) が成功していれば `_prisma_migrations` の
表が1つ増えているだけで、Django 版はこれを見ない）。Django 版のソースは `git pull` で消えているので、
最後にあったコミットから一時的に取り出して上げ直す:

```bash
cd apps/bank-analyzer && docker compose down && cd ../..        # -v は付けない（ボリュームは external なので消えないが、付けない）
git checkout 4962355e -- apps/bank-analyzer-django              # 一時的な取り出し。コミットしない
cd apps/bank-analyzer-django
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build   # 1-1 で控えた形に合わせる（dev なら -f を付けない）
cd ../..
```

ただしリポジトリのほかの部分は `git pull` 後の状態なので、このままだとウォッチドッグとバックアップが
React 版を前提に動いて失敗し続ける。**その日のうちに相談**（やり直すか、リポジトリを戻すかを決める）。

### 手順3の (4) まで進んだ後

DB のパスワードは新しい値に付け替わり、Django 自身の表（ログインやセッションの表）も消えているので、
Django 版を上げ直すだけでは戻らない。**自分で戻そうとせず相談すること**。
取引などのデータは同じボリュームに残っていて、切替前の控え（`~/.tax-apps/bank-analyzer-pre-cutover/`）もある。

---

## やってはいけないこと

- `docker compose down -v`、`docker volume rm` / `docker volume prune`（DB が消える）
- `prisma db push` / `prisma migrate dev` を本番の DB に対して叩く（Django 自身の表を消しにかかる）
- `-f docker-compose.prod.yml` を並べて新アプリを手で起動する（パスワードの生成と付け替えが飛び、
  起動と失敗を繰り返す。本番起動は必ず `manage.sh start --prod bank-analyzer`）
- 1-5 の控えを取らずに手順3の (4) へ進む（そこで Django の表が消えるので、控えが唯一の戻り道になる）
- 4-5 の前に画面から入力・取込をする、`REINDEX` を手で叩く、`bank_analyzer_pre_c` を確認前に消す

## Django のデータが無い PC の場合

ボリューム `bank-analyzer-postgres` が無い（＝Django 版を使っていない）PC では、
`git pull` の後に次の1行だけでよい。ボリュームは `manage.sh` が作り、新アプリが DB を一から
`C` の照合順序で作る（4-5 は要らない）:

```bash
docker/scripts/manage.sh start --prod bank-analyzer && docker exec tax-apps-gateway nginx -s reload
```
