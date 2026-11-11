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
- **略称は手で決められる**（社員の編集画面。一覧には出さない）。決めた値は `customShortName`、
  自動の値は `autoShortName` で、`shortName` は決めた値があればそちら。空に戻すと自動へ戻る。
  社員の `PUT /staff/:id` には含めない（他アプリや取込から更新されても手で決めた略称は消えない）
- フリガナはカタカナで保存（ひらがな・半角カナは入力時に寄せる）。API の一覧はフリガナ順で未入力の人は末尾、
  画面の一覧は社員番号の昇順（数字は数の大きさで比べ、番号の無い人は末尾）。台帳ID は画面に出さない
- **社員一覧の並び**: 押した列（既定は社員番号）が同じ値（空どうしを含む）なら、社員番号 → 所属（会社・部署の表示順）→
  フリガナ → 台帳ID の順で決める（二番目以降はいつも昇順）。番号がほとんど空でも部署ごとにまとまる。
  所属で並べたときだけ、部署が変わる行に部署名の小見出しを入れる。見出しはスクロールしても上に残る
- **未入力の絞り込み**: 表の上の件数の横に「フリガナ未入力」「社員番号未入力」「携帯未入力」の人数を出し（0人なら出さない）、
  押すとその人だけに絞る（`?missing=kana|employeeNo|mobile`、もう一度押すと解除）。数えるのは会社・部署・検索で絞った中。
  フリガナは姓の読みが無いか、名があるのに名の読みが無い人。編集ダイアログの「保存して次の人へ」は、
  保存する前の一覧の並びで次の人を開く（直した人が絞り込みから外れても順番が飛ばない。変更が無ければ保存せずに次へ）
- 部署は所属者（退職者を含む）がいる間は消せない。使わなくなったら「使用」を外す
- 会社は部署か所属が残っている間は消せない。会社の情報（名称・略称・郵便番号・住所・代表電話・代表者）は帳票に刷る用。
  **FAX は持たない**（どの帳票にも刷らないため、版5で列ごと消した。古い画面や JSON から `fax` が来ても黙って捨てる）
- 会社の編集ダイアログは「会社」「所在地」「連絡先・代表者」の3つに分け、会社名だけ必須。書き方の例は
  入力欄の中（placeholder）に置く。打ちかけのまま閉じようとしたら確かめる（社員のダイアログと同じ）
- 社員の生年月日は**和暦の4つの欄（元号・年・月・日）で入れる**が、**保存は西暦の `YYYY-MM-DD` のまま**
  （API・バックアップ・他アプリは和暦を知らない）。変換は `src/wareki.ts` で、改元日の表は持たず Intl に数えさせる。
  途中まで・存在しない日・元号違い（平成31年5月1日 → 令和元年5月1日）は**別の日に直さず保存を止め**、
  正しい和暦を添えて欄の下に出す。消すときは4つとも空にする
- **リポジトリは公開**なので、テストやシードに実在の社員の名前・電話番号を書かない

## API（`/staff-directory/api`）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/staff?status=active\|retired\|all` | 社員一覧（既定 active。フリガナ順）。`affiliations`（主所属が先頭）と、主所属の写し `companyId` / `departmentId` / `departmentName` / `employeeNo` |
| GET / PUT | `/staff/:id` | 1人の取得・更新 |
| POST | `/staff` | 追加（台帳ID が振られる） |
| PUT | `/staff/:id/short-name` | 略称を決める（`{ shortName }`、10文字まで。空文字で自動に戻す） |
| GET / PUT | `/staff/:id/personal` | 1人の郵便番号・住所・生年月日（`postalCode` / `address` / `birthDate`、未入力は空文字）。一覧・`/staff/:id` には出ない。**他アプリが住所・生年月日を使うときはここを1人ずつ読む**（書き込みは台帳の画面だけ） |
| GET / POST | `/departments` | 部署一覧（会社・在籍者数つき）・追加（`companyId` 必須）。`label` は他の会社に同名の部署があれば「会社略称 部署名」、無ければ部署名 |
| PUT / DELETE | `/departments/:id` | 部署の更新・削除（所属者がいれば 409） |
| GET / POST | `/companies` | 会社一覧（部署数・在籍者数つき、表示順）・追加 |
| PUT / DELETE | `/companies/:id` | 会社の更新・削除（部署か所属が残っていれば 409） |
| GET | `/links?app=itcm` | 他アプリの番号と台帳ID の対応（`entity` / `externalId` / `localId`） |
| GET | `/backup` | 台帳まるごとの JSON（住所・生年月日を含む） |
| POST | `/backup/preview` / `/backup/restore` | JSON の確認（件数だけ返し台帳は変えない）／復元（全件入替、台帳ID はファイルのまま） |
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
- **v4 → v5**（2026-11-05）: 会社の `fax` 列を消す（`ALTER TABLE … DROP COLUMN`）。入っていた値は捨てる
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

- **台帳で保存すると、台帳のサーバが数秒のうちに知らせ**、その場で写し直す（下の「保存したらすぐ知らせる」）
- 知らせが届かなかったときの追いつき: 担当者・部署の一覧 API が呼ばれたとき、前回から **5分以上**たっていれば写し直す
  （`apps/inheritance-case-management/web/src/lib/staff-directory/`）。台帳が落ちていれば
  3秒で諦めて写しのまま動き、画面に理由を出す
- 写した記録（試した時刻・成功した時刻・件数・失敗の理由・未連携の人・きっかけ）は案件管理の DB の
  `StaffDirectorySyncRun` に直近20回分（＋最後の成功）残る。作り直しても消えない
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

- 写し方・記録の残し方は案件管理と同じ（台帳からの知らせ、届かなければ一覧 API が呼ばれたとき5分以上たっていれば。
  台帳が落ちていれば3秒で諦める。記録は PB の DB の `StaffDirectorySyncRun`。`apps/private-banking/src/lib/staff-directory/`）
- コードは台帳の**主所属の**社員番号、無ければ `SD-<台帳ID>`。PB のコードは全社で一意なので、
  **別の会社の人と社員番号が重なったら、重なった人は全員 `SD-<台帳ID>` になる**（台帳に居ない PB の担当者と
  重なった場合も同じ）。片方だけ番号のままにはしない（どちらが番号を得るかが並び順で決まってしまうため）。
  社員番号を入れ替えても一意制約に当たらないよう、変わる行は一度仮のコードへ退けてから書く
- 結び付けは**台帳ID だけ**（PB には取込記録が無く、名前でも結び付けない）。台帳に居ない PB の担当者は
  「未連携」になって候補から外れ、担当していた顧客は表示されたまま残る
- 顧客のバックアップの取込・全体復元は担当者を作らない（台帳ID → コードで探し、無ければエラー）
- 別の PC・本番サーバーの切替手順は下の「別の PC・本番サーバーへの導入」（PB の補足は `apps/private-banking/STAFF-CUTOVER.md`）

## 保存したらすぐ知らせる（台帳 → 案件管理・PB）

台帳のサーバ（`server/notify.ts`）は、API の書き込み（社員・部署・会社の追加・修正、略称、JSON の復元）が
成功するたびに、写しを持つアプリの `POST <app>/api/staff-directory`（本文 `{"trigger":"directory"}`）へ
コンテナ間で知らせる。送り先の一覧は `server/linkedApps.ts` の1か所（画面の `src/linkedApps.ts` もここから作る）。

- 保存の応答は待たせない。続けて保存したときは最初の保存から1.5秒待ってまとめて1回、送っている間の保存は送り終えてからもう1回
- 相手が止まっていても台帳の保存は成功のまま。失敗はログと `GET /api/notify` に残り、相手側の写し直しで追いつく
  （相手は起動後に最初に一覧が開かれたとき5分を待たずに写す。以後は5分ごと）
- 住所・生年月日（`/staff/:id/personal`）と復元の確かめ（`/backup/preview`）は写しに関係しないので知らせない
- 送り先は環境変数 `LINKED_APP_ORIGINS` で変えられる。未設定なら `http://itcm-frontend:3020` と
  `http://private-banking-app:3025`（本番も同じコンテナ名）。`off` で全部止める。
  `itcm=http://host:3020,private-banking=off` のように1つずつ差し替え・停止もできる（形が違えば起動時に落ちる）
- アプリ側の `GET <app>/api/staff-directory` は記録を読むだけで写さない。写すのは台帳からの知らせ・一覧を開いたときの5分ごと・手動（「今すぐ読み直す」・PB の復元）の3つだけ

## 連携の状況（`/staff-directory/links`）

ヘッダーの「連携」。台帳の変更が各アプリへ届いているかを台帳の側から見る（見るだけで、写し方は変えない）。
アプリの一覧は `src/linkedApps.ts` の1か所にあり、復元の影響確認と共用する。

- **写しを持つアプリ**（案件管理・資産・負債管理）: 各アプリの `GET <app>/api/staff-directory` を3秒で読み、
  状態（正常／失敗／未実行／確かめられない＝アプリが止まっている）・**最後に写せた時刻と最後に試した時刻を分けて**
  （失敗中は「〇分前から古いまま」）・きっかけと件数・失敗の理由・直近の記録・未連携の担当者と直し方を出す。
  「今すぐ読み直す」は同じ URL へ POST（待つのは10秒まで）
- 各アプリの欄に、台帳からの知らせの最後の結果（届いて写し直した／届いたが写せなかった／届かなかった）も出す
  （`GET /staff-directory/api/notify`。これだけは台帳のメモリにあり、台帳を作り直すと消える）
- 画面を開いているあいだ30秒ごとに読み直す。GET は記録を読むだけなので、この画面を開いても写しは走らない
- **台帳を直接読むアプリ**は一覧だけ（写しを持たないので、台帳の変更は次に画面を開いたときに見える）
- **担当件数を読むアプリ**（下の「社員ごとの担当件数」）ごとに、件数を読めたか（読めないアプリは一覧で「—」）

## 社員ごとの担当件数（読むだけ）

退職・異動のときに「この人はまだ何を抱えているか」を台帳から見るための仕組み。**数えて見せるだけ**で、
担当の付け替えはしない（引き継ぎ先は人が各アプリの画面で決める）。

- 各アプリが `GET <basePath>/api/staff-directory/workload` で、台帳ID・役割ごとの件数（進行中／すべて）・
  そのアプリの一覧をその人で絞るリンクだけを返す。**氏名・顧客名は返さない**。形と組み立ては
  共有部品 `shared/staff-workload/`（各アプリへ `bash shared/sync.sh` で配る。サーバーの写しは `server/shared/`）
- 読む先の一覧は `server/linkedApps.ts` の `WORKLOAD_SOURCES`（案件管理・PB・株式評価明細書・預貯金分析）。
  画面がゲートウェイの下から4つまとめて3秒で読み、読めないアプリは「—」にして一覧は止めない（`src/workload.ts`）

| アプリ | 役割 | 進行中の数え方 | リンク先 |
|---|---|---|---|
| 案件管理 | 担当・社内紹介 | 見送り・入金済を除く | 案件一覧（`?assigneeId=` / `?internalReferrerId=`、全年度） |
| 資産・負債管理（PB） | 担当 | すべて（終わりが無い） | 顧客一覧（`?staffId=`） |
| 株式評価明細書 | 担当 | ゴミ箱を除く | 会社一覧（`?assignee=staff:<台帳ID>`） |
| 預貯金分析 | 担当 | すべて | 案件一覧（`?assignee=staff:<台帳ID>`） |

- 社員一覧の「担当」列は、読めたアプリの**担当（進行中）の合計**。社内紹介は数えず、マウスを載せると出る内訳にだけ出す。
  列見出しで並べ替えられる（最初は多い順）
- 「退職者の担当あり N名」のチップは、退職日を過ぎた人のうち担当（進行中）が残っている人。どのタブでも出し、押すと
  退職の一覧をその人たちに絞る（`?status=retired&assigned=1`）。一覧ではその人の件数を赤で出す
- 編集画面の「担当している案件」にアプリごとの件数と、進行中が1件以上ある役割だけリンク（飛んだ先の一覧と件数が合う）。
  退職日を入れたのに担当が残っていれば、アプリ別の件数とリンクを添えて注意を出す（退職予定は橙・退職は赤。保存は止めない）
- 所属を変えた（会社・部署・主所属の変更、所属の追加・削除）ときは、編集画面に「担当は人に付いているので、異動しても
  各アプリの担当は変わりません」といまの担当件数を1行で出す。担当の付け替えはしない（各アプリで行う）

## 部署・会社の画面の人数と担当

社員一覧と同じデータ（台帳の全員＋上の担当件数）を画面で足すだけで、API は増やしていない（`src/orgStats.ts`）。

- **人数**（在籍・うち退職予定）は、社員一覧の絞り込みと同じく**どれか1つの所属が当たれば数える**
  （兼務先の部署にも入る。押した先の一覧と人数が合うように）。「うち退職予定 N名」は0なら出さず、押すと `?department=<id>&retiring=1`
- **担当（進行中）**は**主所属でだけ数える**（兼務で二重に足さないため。だから部署の合計は会社の合計と一致する）。
  在籍の人の分を出し、退職予定の人の分は「うち」、退職日を過ぎた人に残っている分は「ほかに退職者の担当」として分けて出す
  （後者は `?status=retired&assigned=1&department=<id>` へ）
- **読めないアプリが1つでもあれば、担当の合計は「—」**にして、どのアプリが読めないかを上に注記する。
  社員一覧の1人ずつの欄はアプリ別の内訳で欠けが分かるが、合計には内訳が無いので、欠けたまま足すと少なく見えるだけになる
- 部署名・在籍の人数を押すと `?department=<id>` の社員一覧へ。在籍0人で「使用」のままの部署には、外せる旨を薄く添える
- 会社はカードで並べる（会社名・略称、所在地、代表電話・代表者、部署数・在籍・担当）。**帳票に刷る項目
  （郵便番号・所在地・代表電話・代表者）の空きはカードの帯と「未入力」で出す**（略称は空なら会社名を刷るので数えない）。
  会社名・在籍から `?company=<id>` の社員一覧へ、部署数から部署の画面のその会社の節（`/departments#company-<id>`）へ
- 社員・部署・会社・連携の4画面は見出し・説明・主のボタンを `PageHeader` でそろえ、幅は外枠（`max-w-5xl`）に任せる。
  縦スクロールバーの有無で中身が左右にずれないよう `scrollbar-gutter: stable`

## 退職日と退職予定

- 退職日は**最後に在籍する日**。その日までは在籍、**翌日から退職**として扱う。日付は日本時間で決める
- 未来の日付を入れた人は「退職予定」── 在籍の一覧・案件管理と PB の担当者の候補（写しの `active`）・
  台帳を直接読むアプリの候補（`/staff?status=active`）に残る。過去の日付は今までどおり退職
- 判定は `shared/staff-retirement/retirement.ts` の1か所だけ（`bash shared/sync.sh` で台帳の `server/shared`・
  案件管理・PB へ写す）。台帳の SQL は `openDb` が登録する `is_retired(retired_on)` を通して同じ関数を使う
- 日付をまたいだときは、台帳は問い合わせのたびに判定するので自然に切り替わる。案件管理・PB の写しは5分ごとの
  写し直し（と起動時の写し）で `active` が翌日の判定に追いつく（保存時の知らせは日付をまたいでも来ないため）
- 社員一覧の「退職予定 N名」チップで退職予定の人だけに絞れる（`?retiring=1`。担当が残っている人がいれば「担当あり M名」も添える）。
  行の所属欄に「11月30日 退職予定」のしるし、担当件数は橙で出す。編集画面は「退職予定（〇日後）」

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

## 各アプリの画面部品（`shared/staff-directory/`）

台帳を読む画面側の部品は `shared/staff-directory/` に原本を1つだけ置き、各アプリの
`src/shared/staff-directory/` へ写して使う（Docker のビルドがアプリのディレクトリの中しか見ないため）。

```bash
bash shared/sync.sh          # 原本を各アプリへ写す（写し先は sync.sh の TARGETS）
bash shared/sync.sh --check  # 写しがずれていれば 1 で終わる（CI）
```

**写しは直さない**（次の sync で黙って消える）。原本を直して sync し、写しも一緒にコミットする。

| ファイル | 中身 |
|---|---|
| `operator.ts` | 操作者（いま画面を使っている人）。選んだ台帳ID は `tax-apps:operator-id` に置き、同じブラウザの全アプリで共通 |
| `OperatorPicker.tsx` | 画面右上の操作者ボタンと選ぶダイアログ。`usage` に「このアプリでは何に使うか」を渡す。`variant="dark"` は暗いヘッダー用 |
| `AssigneePicker.tsx` | 案件の担当者を選ぶダイアログ（先頭に「自分」「最近選んだ人」） |
| `StaffPickerDialog.tsx` | 上の2つの共通部分（検索・部署別の一覧・↑↓で移動・Enter で先頭に決定） |
| `assignee.ts` | 担当者の検索・並び・部署分け・「自分の担当」などの絞り込み（テストはここ） |
| `company.ts` / `CompanySwitcher.tsx` | 帳票に刷る事務所情報と会社の切り替え。連絡先の行（`getContactLine`）は `TEL …` だけ |

操作者の決めごと:

- **記録に送るのは自分で選んだ人だけ**（`selectedOperatorHeaders()`）。`useOperator().operator` は
  未選択でも一覧の先頭の人を返す表示用の値なので、ヘッダーには使わない ── 必要書類管理がこれで
  先頭の人の名前を監査ログに残していた。画面で「選んだ人」を見るときも `selected`（未選択は null）
- 台帳に届かないときも操作者ボタンは隠さず「社員台帳に未接続」と出す（選べないのか、選ばなくてよいのかが分からなくなるため）
- 「選択を外す」で未選択へ戻せる（共用の PC で前の人の名前のまま記録しないため）
- いま使っているのは銀行取引分析（分類の変更履歴）・株式評価明細書（「自分の担当」の絞り込み）・
  必要書類管理（書類マスタの保存・公開・復元の履歴）

## バックアップと復元

全アプリ共通の仕組み（取るのは全体で1つ、戻すのはアプリごと）は [docker/RESTORE.md](../../docker/RESTORE.md)。

- **全体バックアップに入るもの**: SQLite のボリューム `staff-directory-data`（`backup.sh` の `SQLITE_TARGETS`）
- **取る**: `docker/scripts/manage.sh backup`（全体。ふだんはウォッチドッグが自動で回すので叩かなくてよい）
- **戻す**: `docker/scripts/manage.sh restore staff-directory <バックアップ>`。`--yes` が無ければ一覧だけ出して
  何も変えない。実行は `--yes` を付けて、人の確認の後
- **画面からの JSON 書き出し・復元**: ヘッダーの「JSONで書き出し」「JSONから復元」。復元するファイルはダイアログの欄へドロップするか、
  欄をクリックして選ぶ。復元は件数を見せてから
  確定し、直前に今の中身を「復元前の控え」として書き出す。**JSON には住所・生年月日が入る**ので置き場所に注意。
  FAX を持っていた頃（版5より前）に書き出した JSON もそのまま戻せる（FAX だけ捨てる）
- **台帳を古い時点へ戻すと、その後に足した社員が消える**ので、写しを持つ
  案件管理・個人資産管理の側に「台帳に無い台帳ID」が残りうる。戻した後はその2アプリの担当者表示を確かめる

## テスト

```bash
docker/scripts/manage.sh test staff-directory
```

使い捨ての `staff-directory-test` コンテナで型検査 + vitest（DB は `:memory:`）。
