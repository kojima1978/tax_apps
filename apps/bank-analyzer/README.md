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
- 社員台帳が読む担当件数は `GET /bank-analyzer/api/staff-directory/workload`（読むだけ・台帳ID と件数だけ。
  終わりの印が無いので進行中＝すべて）。リンク先は案件一覧を担当者で絞った `/bank-analyzer/?assignee=staff:<台帳ID>`
  （URL の絞り込みは保存した絞り込みより優先し、選び直すと URL から外す）

## 取込できる形式（通帳を OCR した CSV・Excel）

取込ウィザードの手順1の「取込できる形式」と同じ内容。表は `server/lib/import/columns.ts`（列）と
`format.ts`（決まり）から作っていて、下の表が画面と同じかは `importFormat.test.ts` が確かめる
（列を変えたらテストが落ちるので、`formatGuideMarkdown()` の出力で書き換える）。

- 1行目を見出しの行にする（1行目が表題で2行目が見出しでもよい）。通帳の1行を1行に書く
- 列は名前で読むので、並びが違っても読める。並びは下の表の順をすすめる
- 必須でない列は、列ごと無くても、空欄でも、一部の行だけ書いてあってもよい
- 文字コードは UTF-8（BOM の有無は問わない）か Shift_JIS。Excel（.xlsx）も読める
- 1ファイルに複数の口座を入れるときは、全行に銀行名と口座番号を書く（口座ごとに分けて取り込む）
- 一度に10ファイル・1ファイル10MBまで

| 列の名前 | 必須 | 書き方 |
|---|---|---|
| 銀行名 | 任意 | 例: さくら銀行。1ファイルに複数の口座を入れるときは全行に書く |
| 支店名 | 任意 | 例: 本店 |
| 口座番号 | 任意 | 文字列として書く（先頭の0を残す。例: 0012345）。1ファイルに複数の口座を入れるときは全行に書く |
| 種別 | 任意 | 例: 普通・定期 |
| 日付（年月日 も可） | 必須 | 西暦（2021-04-01・2021/4/1・2021年4月1日）か和暦（R3.4.1・令和3年4月1日・H28.6.3）。04/01/2021 のような月/日/年は読めない |
| 摘要 | 必須 | 通帳に印字されたとおり |
| 払戻額（払戻 も可） | 必須 | 整数（カンマ・「円」・「¥」は付いていてもよい）。空欄は0。マイナスは「△」か「−」 |
| お預り額（お預り も可） | 必須 | 払戻額と同じ書き方。空欄は0 |
| 差引残高（残高 も可） | 任意 | 払戻額と同じ書き方。空欄は「残高なし」（0 ではない）。列があれば残高のつながりを確かめる |
| 分類（カテゴリー・カテゴリ も可） | 任意 | アプリの分類名のどれか。空欄・「未分類」はアプリが自動で分類する。知らない名前は取込前に読み替え先を選ぶ |
| メモ（備考 も可） | 任意 | 取引のメモとして残る（読みにくかった箇所・分類に迷った理由など） |
| 要確認 | 任意 | 「○」なら質問候補の付箋を付ける。空欄は付けない |

- 足した列（分類・メモ・要確認）は、無い・空欄・一部だけ・おかしな値のどれでも取込を止めない。
  形式のエラーになるのは必須の列が無いときと、日付・金額が読めないときだけ
- 分類: 設定にある名前はそのまま取り込む（古い名前は今の名前へ寄せる）。空欄・「未分類」は自動分類。
  **知らない名前は分類を作らない** ── 手順3に「知らない分類: 〇〇（N行）」と出し、読み替え先を選ぶ
  （選ばなければ自動分類）。手順3の表で行ごとに直せ、出どころ（CSV／自動／手直し）が付く
- CSV の分類は自動分類と同じく `classification_score` 0 で入り、分類の変更履歴（`ClassificationChange`）には
  載らない（取込の時点が最初の状態）。CSV に分類が書いてある行は、贈与の金額による自動分類もかからない。
  多額の印・資金移動の判定は今までどおり取込後に走り、「通帳間移動」なのに相手が見つからない行は
  取込のお知らせに件数を出す（資金移動タブで確かめる）
- 要確認が「○」などの行は質問候補の付箋つきで入る。読めない値は付箋なしにして、手順3に件数を出す
- 「AI に渡す指示文をコピー」は、この表と、案件のいまの設定の分類名・キーワードの例・贈与の金額から
  指示文を作る（`aiInstruction`）。設定で分類を足せば指示文にも出る。ひな形は `templateCsv`

## お客様への確認事項（質問候補の書面）

質問候補タブ（付箋を付けた取引）でメモに質問を書くと、案件ごとの書面
「お客様への確認事項」になる（`/cases/<番号>/questions`。タブの「お客様への確認事項」から別タブで開く）。

- **書面に出るのはメモ（質問）を書いた質問候補だけ**。付箋だけ付けてメモの無いものは事務所内の
  覚え書きとして扱い、出さない（件数だけ画面の帯に出る）。出す・出さないの列は持たない
- 並びと絞り込みは質問候補タブと同じ（`?keyword=` `?sort=` を引き継ぐ）
- A4 横・複数ページ。表の見出しは各ページに出て、行はページをまたがない。回答欄は手書きできる高さ（18mm）
- **口座番号は下4桁だけ**（`末尾1234`）。メールで送った書面が他人の手に渡っても番号の全部は漏れない
- 同じ内容の Excel（`/cases/<番号>/export/xlsx/questions`）。画面の書面と同じ `questionSheet` から作る
- **質問文の下書き**: メモが空の行に定型文を入れられる。1件ずつ（「下書き」で入力欄に入るだけ。
  Enter で保存・Esc で取り消し）と、まとめて（確認の後、メモが空の行にだけ保存）。
  **書いてあるメモは上書きしない。押さない限り保存しない**
- 定型文は設定画面の「質問文の下書き」で直せる（7種類。`{日付}`・`{金額}`・`{摘要}` が取引の値に置き換わる）。
  保存先は `analyzer_appsetting` の `QUESTION_TEMPLATES`（既定から変えた文だけ。表は増やしていない）。
  JSON バックアップの `settings` に一緒に入り、このキーの無い古いバックアップから設定ごと戻すと既定の文に戻る
- 「お客様配布用文書」（`/letter`）は案件によらない1枚の案内（A4 縦）で、この書面とは別紙。書面の帯の
  「ご案内（別紙）」から開ける
- 決めごとは `server/lib/questions.ts`（どの行を出すか・口座の書き方・下書きの選び方）、
  書面と Excel は `server/services/questions.ts`、画面は `src/pages/QuestionLetterPage.tsx`

## 月次入出金グラフ（概要タブ）

- 集計はサーバの `monthlyCashflow`（相続開始月以降を除き、前月まで）。Excel 出力（`export/xlsx/monthly`）も同じで、
  グラフの見せ方を変えても数え方は変えない
- 棒の組み立ては画面だけ（`src/pages/analysis/monthlyBuckets.ts`）: 取引の無い月を0で埋める・年ごとは月ごとを畳む
- **単位は「月ごと／年ごと」**。5年（60か月）を超える案件は年ごとが既定。年は和暦（`H15年`）で、途中からの年は
  「7月から」、相続開始の年は「相続開始まで」と棒の下に書く
- 期間は「直近12か月／3年／7年／全期間」（年ごとでは12か月は選べない）。開いた直後は新しい側（基準日の直前）を見せ、
  横に流れるときは上の帯にいま見ている範囲を和暦で出す。縦軸は左に固定
- **突出した棒**（上位5%を除いた最大の3倍超）があると、縦軸をその 1.2 倍で切り、超える棒には切れ目と実額を描く
  （「実寸で表示」で戻せる。対数軸にはしない）。目盛りは万・億
- 「最大の月へ（年へ）」でその棒まで送り、一時的に色を付ける。棒を押すと**その期間の取引一覧**
  （`?tab=all&date_from=&date_to=`。相続開始の年は相続開始月の前日まで）へ移る。取引一覧の帯に
  条件に合う全件の出金計・入金計が出るので、棒の金額と見比べられる。キーボードでは下の表形式のデータの月（年）から移る
- 出金は塗り・入金は斜線（色に頼らない）

## 相続税の検討（概要タブ・カテゴリー別 Excel）

基準日（相続開始日）を入れると、概要タブの末尾と、カテゴリー別 Excel の末尾の3シート
（生前贈与の検討・相続開始直前の出金・口座外への多額の移動）に出る。**検討の材料で、加算・贈与の判定はしない**
（画面・Excel の両方にその一文を出す）。計算は `server/lib/inheritanceReview.ts` の1か所、組み立ては
`server/services/inheritanceReview.ts`（画面と Excel が同じ数字になる）。DB は増やさず、既存のシート・分類・
バックアップ JSON の形も変えない。

- **生前贈与の検討**: 加算対象期間は相続開始日で決まる（国税庁タックスアンサー No.4161・令和8年4月1日現在法令等で確認）
  - 〜R8.12.31 … 相続開始前3年以内（3年前の応当日から相続開始日まで。応当日が無ければ月末）
  - R9.1.1〜R12.12.31 … 経過措置で R6.1.1 から相続開始日まで
  - R13.1.1〜 … 相続開始前7年以内
  - 3年以内より前の部分（延びた部分）は受贈者ごとに100万円を控除するので、3年以内と延びた部分を分けて合計する
  - 分類「贈与・教育費」の出金を、相手先（摘要を正規化したもの）×暦年でまとめ、110万円は目安として並べる。
    加算対象期間より前は件数と合計だけ別枠
- **相続開始直前の出金**: 基準日の N か月前の応当日から前日まで（N は設定「相続開始直前の出金（か月）」、既定3・1〜36。
  設定は `analyzer_appsetting` の `PRE_DEATH_MONTHS`。古いバックアップには無いので既定に落ちる）。
  現金の引出し（摘要に ATM・CD・現金・引出・払戻など、または「カード」で始まる）と多額（設定の金額以上）の出金。
  口座ごとの小計つき。相続開始日以後は同じ条件で別枠
- **口座外への多額の移動**: 多額の振込・振替・送金のうち、資金移動の組（`transferPairs`）の出金側にならなかったもの。全期間・新しい順
- 行の日付・暦年・相手先の計・合計は取引一覧の絞り込みへ移り、**その行が数えた取引とちょうど同じもの**が出る
  （1件の行は日・口座・金額・摘要で、暦年と計は期間・分類・摘要で絞る）。摘要は `?desc=` の**完全一致**で、
  比べ方は検討の表のまとめ方と同じ `descriptionKey`（`server/lib/text.ts`。前後の空白を除き全角半角・かなを寄せる）。
  「入学金」の行に「入学金 2」は混ざらない。`?desc=`（値が空）は摘要の無い取引。取引一覧ではチップ「摘要が一致: …」で出て外せる
- 人が検索欄に打つ `?keyword=` は今までどおり部分一致（すべて含む）。未分類タブの組の「個別に確認」も `?desc=` で、
  組のまとめ方も同じ `descriptionKey`（全角半角や前後の空白だけ違う摘要は1つの組になる）
- 表ごとの「質問候補に入れる」は、その表の取引へまとめて付箋を付ける（`POST /cases/:id/transactions/flag-many`。
  付いているものはそのまま）

## バックアップと復元

全アプリ共通の仕組み（取るのは全体で1つ、戻すのはアプリごと）は [docker/RESTORE.md](../../docker/RESTORE.md)。

- **全体バックアップに入るもの**: DB の `pg_dump`（`bank-analyzer-postgres`）・`.env`・案件ごとの JSON（下）
  （`backup.sh` の `PG_TARGETS` / `SETTINGS_TARGETS`）
- **取る**: `docker/scripts/manage.sh backup`（全体。ふだんはウォッチドッグが自動で回すので叩かなくてよい）
- **戻す**: `docker/scripts/manage.sh restore bank-analyzer <バックアップ>`。`--yes` が無ければ一覧だけ出して
  何も変えない。実行は `--yes` を付けて、人の確認の後。戻るのは DB（`.sql`）で、JSON は流さない
- **画面で全案件を控える**: 案件一覧の「全案件をJSON書き出し」で、全案件を1つのJSONへ保存する
- **JSONから戻す**: 画面の「JSONから復元」へ、全案件JSONまたは案件ごとのJSONをドラッグ＆ドロップする。
  既存案件は上書きせず、同名なら「_復元1」などを付けて新しい案件として作る
- **案件を1件だけ戻す**: バックアップの中の `<番号>_<案件名>_backup.json` も同じ画面で読める

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
