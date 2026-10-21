# 社員台帳 (staff-directory)

全アプリで使う社員・会社・部署の情報の置き場。各アプリは自分で社員を持たず、
**台帳ID** でここの人を参照する（名前は表示用の控えとして各アプリ側に写してよい）。

- 画面: http://localhost/staff-directory/ （社員 / 部署 / 会社）
- Port 3031、Vite + React 19 + Tailwind v4 / Express 5 + better-sqlite3
- DB: `/app/data/staff.sqlite`（ボリューム `staff-directory-data`）。
  夜間バックアップ・リストア・訓練の対象（`backup.sh` の `SQLITE_TARGETS`）

## 決めごと

- **台帳ID は振り直さない・消さない**。辞めた人は退職日を入れるだけで、一覧の既定（在籍）から外れる。
  他アプリが過去の案件で参照し続けるため、社員を消す API は無い
- **会社は複数持てる**（関連会社）。部署は会社にぶら下がり、A社の会計部とB社の会計部は別の部署。
  会社が1つの間は画面に会社名を出さない（会社の絞り込みも出ない）
- **1人が複数の会社に所属できる**（`staff_affiliations`）。所属は会社ごとに1つで、部署と社員番号を持つ。
  **主所属は必ず1つ**（所属が1つでもあれば）。他アプリへ渡す部署・社員番号は主所属のもの
- **社員番号は所属ごと**で、空でもよく後から書き換えられる（今はどのアプリも仮の番号）。
  同じ会社の中では重複できないが、別の会社なら同じ番号でよい。人の同一性は社員番号ではなく台帳ID で見る
- **氏名は姓・名・セイ・メイの4つ**（姓だけ必須）。表示用に2つ作る:
  `fullName` = 「姓 名」、`shortName` = 姓（在籍者に同じ姓の人がいれば、名の先頭から見分けられる文字数まで足す。
  例: 山田太郎・山田花子 → 「山田太」「山田花」）。API の `name` は `shortName`（狭い欄で使う前提）
- フリガナはカタカナで保存（ひらがな・半角カナは入力時に寄せる）。未入力の人は一覧の末尾
- 部署は所属者（退職者を含む）がいる間は消せない。使わなくなったら「使用」を外す
- 会社は部署か所属が残っている間は消せない。会社の情報（名称・略称・郵便番号・住所・代表電話・FAX）は帳票に刷る用
- **リポジトリは公開**なので、テストやシードに実在の社員の名前・電話番号を書かない

## API（`/staff-directory/api`）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/staff?status=active\|retired\|all` | 社員一覧（既定 active。フリガナ順）。`affiliations`（主所属が先頭）と、主所属の写し `companyId` / `departmentId` / `departmentName` / `employeeNo` |
| GET / PUT | `/staff/:id` | 1人の取得・更新 |
| POST | `/staff` | 追加（台帳ID が振られる） |
| GET / POST | `/departments` | 部署一覧（会社・在籍者数つき）・追加（`companyId` 必須）。`label` は他の会社に同名の部署があれば「会社略称 部署名」、無ければ部署名 |
| PUT / DELETE | `/departments/:id` | 部署の更新・削除（所属者がいれば 409） |
| GET / POST | `/companies` | 会社一覧（部署数・在籍者数つき、表示順）・追加 |
| PUT / DELETE | `/companies/:id` | 会社の更新・削除（部署か所属が残っていれば 409） |
| GET | `/links?app=itcm` | 他アプリの番号と台帳ID の対応（`entity` / `externalId` / `localId`） |
| GET | `/health` | DB の `SELECT 1` とファイル・フォルダの書込権限（失敗は 503） |

エラーは `{ "error": "日本語の理由" }`（入力不備 400 / 重複・参照不整合 409 / 無い 404）。
他アプリのサーバからはコンテナ間で `http://staff-directory:3031/staff-directory/api/...` を読む。
**台帳が止まっていても各アプリが動くこと**（控えの名前で表示を続ける）を前提にする。

## スキーマの版と自動移行

版は `PRAGMA user_version`（`server/db.ts` の `SCHEMA_VERSION`）。起動時に古い版の DB を見つけたら
1つのトランザクションで移す。手で叩くものは無い。

- **v0 → v1**（2026-10-21）: 事務所1件 → 会社1件（名前はそのまま。空なら「会社名未設定」）、
  部署はすべてその会社へ（部署ID は変えない）、社員の部署・社員番号 → 主所属1件
  （部署も番号も無い人は所属なし）、氏名とフリガナ → 最初の空白（全角含む）で姓・名に分ける。
  台帳ID・部署ID の採番は引き継ぐ。旧版の API `/office` は無くなった
- 移す前の DB は夜間バックアップに残っている。移行の後でバックアップから戻すと、起動時にもう一度移る

## 案件管理からの取込

案件管理（itcm）の担当者・部署を台帳へ写す。何度流しても同じ（取込済みは読み飛ばす）。

```bash
# 一覧だけ（DB は変わらない）
cd apps/staff-directory && docker compose exec staff-directory npm run import:itcm
# 実行
cd apps/staff-directory && docker compose exec staff-directory npm run import:itcm -- --yes
```

- 取込先は**表示順が先頭の会社**（会社が1つも無ければ止まる）。部署はその会社の中で
  **同じ名前**の部署があれば結び付け、無ければ作る
- 担当者の名前は最初の空白で姓・名に分ける（空白が無ければ全部が姓）
- 担当者は**名前では結び付けない**（苗字だけの登録が多く、同姓の別人を同じ人にしてしまう）。
  台帳に同じ名前の人がいれば注意を出したうえで別人として作る
- 取込済みの人は**上書きしない**。台帳で直したフリガナや電話が、流し直しで消えないように
- 案件管理で使用停止の担当者は、停止にした日（日本時間）を退職日にして入れる
- 社員番号は引き継ぐが、台帳で使用済み・取込内で重複するものは空にして注意を出す
- 取込元とのつながりは `external_links`（`app='itcm'`）に残る。案件管理側の同期はここを引く

## 案件管理への写し（台帳 → itcm）

案件管理の `Department` / `Assignee` は**台帳の写し**で、`staffDirectoryId` 列で台帳ID を持つ。
追加・修正・退職は台帳だけで行い、案件管理の「担当者管理」は表示と「今すぐ読み直す」だけ
（書き込みの API は 405）。

- 担当者・部署の一覧 API が呼ばれたとき、前回から **5分以上**たっていれば写し直す
  （`apps/inheritance-case-management/web/src/lib/staff-directory/`）。台帳が落ちていれば
  3秒で諦めて写しのまま動き、画面に理由を出す
- 部署の名前は `label`。**別の会社に同名の部署を作ると、案件管理の部署名が次の写しで「会社略称 部署名」に変わる**
  （1つの名前で2つの部署を区別できないため。案件管理の部署は台帳ID で結び付いているので、所属は変わらない）
- 担当者の名前は `name`（＝略称）
- 結び付けは 台帳ID → `external_links` → （部署だけ）同じ名前。**担当者は名前で結び付けない**。
  台帳に無い案件管理の担当者は「未連携」として画面に出る（ここで `import:itcm -- --yes` を流す）
- 台帳で消した部署は案件管理で使用停止にする。退職日のある人は `active=false`
- 案件管理の CSV 取込は、名簿に無い担当者・社内紹介者の行を**エラーにして取り込まない**
  （以前は担当者・部署をその場で作っていた）
- 案件管理から読む先は `STAFF_DIRECTORY_URL`（既定 `http://staff-directory:3031/staff-directory/api`）

## 個人資産管理への写し（台帳 → private-banking）

PB の `Staff` も**台帳の写し**で、`staffDirectoryId` 列で台帳ID を持つ。PB の「担当者」画面は
表示と「今すぐ読み直す」だけ（書き込みの API は 405）。部署は持たず、`department` に台帳の部署名を写す。

- 写し方は案件管理と同じ（一覧 API が呼ばれたとき5分以上たっていれば・台帳が落ちていれば3秒で諦める。
  `apps/private-banking/src/lib/staff-directory/`）
- コードは台帳の**主所属の**社員番号、無ければ `SD-<台帳ID>`。PB のコードは全社で一意なので、
  **別の会社の人と社員番号が重なったら、重なった人は全員 `SD-<台帳ID>` になる**（台帳に居ない PB の担当者と
  重なった場合も同じ）。片方だけ番号のままにはしない（どちらが番号を得るかが並び順で決まってしまうため）。
  社員番号を入れ替えても一意制約に当たらないよう、変わる行は一度仮のコードへ退けてから書く
- 結び付けは**台帳ID だけ**（PB には取込記録が無く、名前でも結び付けない）。台帳に居ない PB の担当者は
  「未連携」になって候補から外れ、担当していた顧客は表示されたまま残る
- 顧客のバックアップの取込・全体復元は担当者を作らない（台帳ID → コードで探し、無ければエラー）
- 別の PC・本番サーバーの切替手順は下の「別の PC・本番サーバーへの導入」（PB の補足は `apps/private-banking/STAFF-CUTOVER.md`）

## 別の PC・本番サーバーへの導入（AI に渡す手順）

社員台帳がまだ無い PC（本番サーバーなど）へ、段階1〜3（台帳・案件管理の写し・PB の写し）を入れる手順。
AI エージェントにそのまま渡して実行させる前提で書いている。上から順に実行し、
**「止まる条件」に当たったらその場で止めて人に報告する**。開発 PC（2026-10-21 に済）では不要。

`docker/OTHER-PC-SETUP.md` の手順A（`git pull` とバックアップ）の途中から来る。その A3 の表で
`staff-directory` / `inheritance-case-management` / `private-banking` / `gateway` を作り直す代わりに、
この4つは**ここの順番で**上げる（ほかのアプリは A3 の表どおりでよい）。順番を崩すと次のようになる:

- 案件管理を台帳より先に上げる → 担当者が全員「未連携」のまま画面に出続ける（取込を流せば直る）
- PB を台帳より先に上げる → 担当者の一覧が空になり、どの顧客にも担当者を選べない

コマンドはすべて Git Bash で、リポジトリのルートから叩く。

### 守ること

- 起動・反映は `manage.sh` から。`docker compose up` を直接叩かない
- **台帳の社員は消せない**（消す API が無い）。取込（`--yes`）の前に必ず一覧を人に見せる
- PB の顧客の担当者を AI が付け替えない。**誰がどの人かを決めるのは人**（名前が同じでも同じ人とは限らない）
- `.env`・ボリューム・DB を手で書き換えない。下の SQL は全部読むだけ

### 1. 事前の記録（何も変えない）

```bash
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E '^(staff-directory|itcm-frontend|private-banking-app)'
cat docker/logs/app-modes/inheritance-case-management docker/logs/app-modes/private-banking
```

- `staff-directory` が既に動いている → 導入済み。**ここで止まって**状況を報告する
- `itcm-frontend` / `private-banking-app` が動いていない → 止まる（取込は案件管理の画面の API を読むため）
- モードの記録（`prod` / `dev`）を控える。台帳は**案件管理と同じモード**で上げる。記録が無ければ人に聞く

PB の担当者と、その人が担当している顧客の件数を控える（切替後に人が付け替える対象になる）:

```bash
cd apps/private-banking && docker compose exec -T private-banking-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT s.id, s.\"staffCode\", s.name, s.\"isActive\", count(h.id) AS clients
FROM \"Staff\" s LEFT JOIN \"Household\" h ON h.\"staffId\" = s.id
GROUP BY s.id ORDER BY clients DESC, s.\"staffCode\";"'; cd ../..
```

### 2. 台帳を起動する

```bash
docker/scripts/manage.sh start --prod staff-directory   # 案件管理が dev なら --prod を付けない
docker/scripts/manage.sh build gateway                  # /staff-directory/ の経路を入れる
docker exec staff-directory wget -qO- http://127.0.0.1:3031/staff-directory/api/health
```

- 止まる条件: health が `"ok"` を返さない（`manage.sh logs staff-directory` の末尾を報告）

### 3. 案件管理の担当者・部署を台帳へ取り込む

**案件管理を作り直す前に**行う（取込元は今動いている案件管理の API）。まず一覧だけ:

```bash
cd apps/staff-directory
docker compose exec -T staff-directory node dist-server/cli/import-itcm.js   # 本番モード
docker compose exec -T staff-directory npm run import:itcm                   # 開発モード
```

- 止まる条件: `案件管理から読めませんでした` が出る
- 出た一覧（部署・担当者の新規の件数と名前）を**人に見せ、了承を得てから**同じコマンドに `--yes` を付けて実行する
  （本番は `node dist-server/cli/import-itcm.js --yes`、開発は `npm run import:itcm -- --yes`）
- もう一度 `--yes` 無しで流し、`新規 0` になったことを確かめて `cd ../..`

### 4. 案件管理を写しへ切り替える（段階2）

```bash
docker/scripts/manage.sh build inheritance-case-management
docker exec itcm-frontend wget -qO- http://127.0.0.1:3020/itcm/api/assignees > /dev/null   # 一覧を読ませて写しを走らせる
cd apps/inheritance-case-management && docker compose exec -T itcm-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*), count(*) FILTER (WHERE \"staffDirectoryId\" IS NULL) FROM \"Assignee\";"'; cd ../..
```

- 最後の出力は `全員の数|未連携の数`。**未連携が 0** であること
- 止まる条件: 未連携が 1 以上（手順3の取込から漏れている。名前を `SELECT name FROM "Assignee" WHERE "staffDirectoryId" IS NULL` で出して報告）

### 5. PB の担当者を台帳に登録してもらう（人の作業）

手順1で控えた PB の担当者のうち、`clients` が 1 以上で**台帳に居ない人**がいれば、人に社員台帳の画面
（`http://<サーバー>/staff-directory/`）で登録してもらう。手順6の後に顧客を付け替える先になる。
同じ人かどうかは AI が名前で決めない（一覧を見せて人に確かめる）。居なければ飛ばしてよい。

### 6. PB を写しへ切り替える（段階3）

```bash
docker/scripts/manage.sh build private-banking
docker exec private-banking-app wget -qO- http://127.0.0.1:3025/private-banking/api/staff > /dev/null   # 写しを走らせる
cd apps/private-banking && docker compose exec -T private-banking-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT s.\"staffCode\", s.name, count(h.id) AS clients
FROM \"Staff\" s LEFT JOIN \"Household\" h ON h.\"staffId\" = s.id
WHERE s.\"staffDirectoryId\" IS NULL GROUP BY s.id ORDER BY clients DESC;"'; cd ../..
```

- 出てくるのは**未連携の担当者**（PB に元々いた人）。これは想定どおりで、失敗ではない
- 止まる条件: `manage.sh logs private-banking` に `社員台帳に接続できませんでした` が出る

### 7. 確認と報告

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

報告に含めるもの:

- 手順1〜6の各出力（取込の一覧と件数、手順4の `全員|未連携`）
- 手順6の未連携の担当者と担当件数 ── **`clients` が 1 以上の人の顧客は、人が画面で付け替える**。
  顧客を開いて「本人情報」の担当者欄で台帳の人を選ぶ。担当者を空にした顧客は「データ品質」で
  まとめて設定できる（一括設定の対象は担当者が空の顧客だけ）
- `clients` が 0 の未連携の人は残しておいても候補に出ないので、そのままでよい

戻し方と PB 側の細かい挙動は `apps/private-banking/STAFF-CUTOVER.md`。

## バックアップと復元

全アプリ共通の仕組み（取るのは全体で1つ、戻すのはアプリごと）は [docker/RESTORE.md](../../docker/RESTORE.md)。

- **全体バックアップに入るもの**: SQLite のボリューム `staff-directory-data`（`backup.sh` の `SQLITE_TARGETS`）
- **取る**: `docker/scripts/manage.sh backup`（全体。ふだんはウォッチドッグが自動で回すので叩かなくてよい）
- **戻す**: `docker/scripts/manage.sh restore staff-directory <バックアップ>`。`--yes` が無ければ一覧だけ出して
  何も変えない。実行は `--yes` を付けて、人の確認の後
- 画面からの書き出しは無い。**台帳を古い時点へ戻すと、その後に足した社員が消える**ので、写しを持つ
  案件管理・個人資産管理の側に「台帳に無い台帳ID」が残りうる。戻した後はその2アプリの担当者表示を確かめる

## テスト

```bash
docker/scripts/manage.sh test staff-directory
```

使い捨ての `staff-directory-test` コンテナで型検査 + vitest（DB は `:memory:`）。
