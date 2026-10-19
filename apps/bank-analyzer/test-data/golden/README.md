# 正解の記録（golden）

Django 版 bank-analyzer（旧 `apps/bank-analyzer-django`。段階8で削除済み）の挙動を JSON に書き出したもの。
React 版はこれと突き合わせて作った（`apps/bank-analyzer/REACT_MIGRATION_PLAN.md` の段階1）。
移行は済んだが、テストは今も毎回ここを読む（`server/__tests__/` の `importer` / `wizard` /
`classify` / `aggregate` / `golden` の各 `.test.ts`。`manage.sh test bank-analyzer` と CI の両方で回る）。
意図して正解と違えている行は、テスト側の表（`DEVIATIONS` / `TX_DEVIATIONS` / `N8_RESULTS` /
`N8_ADDED`）に1件ずつ書いてある。

**ここに入っている取引・口座・人名はすべて架空**。実データの記録はリポジトリ外
（`~/.tax-apps/bank-analyzer-golden/`）にあり、コミットしない（リポジトリは公開）。

## 構成

| パス | 中身 |
|---|---|
| `make_inputs.py` | 入力ファイルを作るスクリプト（Shift_JIS と xlsx を作るため Python） |
| `inputs/files/` | 入力の CSV / xlsx（`make_inputs.py` の出力 + Django 版の `data/dummy_csv` の3件。銀行名で始まる3つ） |
| `inputs/scenarios.json` | 案件を作って取込ウィザードに流す手順 |
| `inputs/fuzzy_texts.txt` | 表記ゆれ照合・分類にかける摘要の一覧 |
| `expected/importer/` | ファイルごとの `load_csv` と残高チェックの結果 |
| `expected/fuzzy.json` / `classify.json` | rapidfuzz の点数・分類結果（正規化しない生の文字列で照合している点に注意。React 版は切替後に正規化するようにした ── 計画書 §3 #8） |
| `expected/scenarios/<名前>/` | 各シナリオの取込の応答（`steps.json`）、取引、月次表、分析画面、出力（CSV / Excel のセル / JSON）ほか |

ID は出現順の連番（`?1`, `?2` …）に置き換え、作成日時や出力ファイル名の日付は落としてある。
2回続けて作っても1バイトも変わらないことを確認済み。

**銀行名で始まる3つの CSV は、ここにある写しが唯一の原本**。元の `data/dummy_csv` は
Git の管理外だったので、`4962355e` を取り出しても入っていない（ディレクトリは段階8で削除済み）。
`make_inputs.py` も作らないので、消すと作り直せない。

## 作り直し方

**Django 版は段階8（2026-10-10）でディレクトリもイメージも消したので、このままでは作り直せない。**
正解の JSON はここに残っているので、突き合わせ（テスト）はそのまま回る。
どうしても作り直すときは、Django 版を最後にあったコミットから取り出してイメージを作ってから
下の手順を流す。コマンドはすべて**リポジトリのルート（`tax_apps/`）から** Git Bash で叩く:

```bash
git checkout 4962355e -- apps/bank-analyzer-django
(cd apps/bank-analyzer-django && cp .env.example .env && docker compose --profile test build test)
```

- `build` だけにすること。Django 版の compose は今の React 版と同じコンテナ名
  （`bank-analyzer` / `bank-analyzer-postgres`）と同じ DB ボリュームを持つので、`up` すると
  稼働中のアプリとぶつかる
- `git checkout <commit> -- <path>` は**取り出したファイルをステージに載せる**。
  終わったら下の 5. で必ずステージごと消す（コミットしない）

Django のイメージ（`bank-analyzer-django-test:latest`）と使い捨ての PostgreSQL で動かす。
本番の DB には触らない（`dump_golden synthetic` は案件が1件でもある DB では動かない）。

```bash
ROOT="$(pwd -W 2>/dev/null || pwd)"   # tax_apps/ の絶対パス（Windows 形式）

# 1. 入力ファイル（ダミー3件以外）を作る
MSYS_NO_PATHCONV=1 docker run --rm -u 0 \
  -v "$ROOT/apps/bank-analyzer/test-data/golden:/g" \
  bank-analyzer-django-test:latest python /g/make_inputs.py /g/inputs/files

# 2. 使い捨ての DB を立てる
docker run -d --name ba-golden-pg --network tax-apps-network \
  -e POSTGRES_USER=bankuser -e POSTGRES_PASSWORD=golden -e POSTGRES_DB=bank_analyzer postgres:16-alpine

# 3. マイグレーション → 記録（analyzer は読み取り専用でマウント）
for cmd in "migrate -v0" "dump_golden synthetic --inputs /golden/inputs --out /golden/expected"; do
  MSYS_NO_PATHCONV=1 docker run --rm --network tax-apps-network \
    -v "$ROOT/apps/bank-analyzer-django/analyzer:/app/analyzer:ro" \
    -v "$ROOT/apps/bank-analyzer/test-data/golden:/golden" \
    -e DB_ENGINE=postgresql -e DB_HOST=ba-golden-pg -e DB_PASSWORD=golden -e DB_USER=bankuser -e DB_NAME=bank_analyzer \
    -e DJANGO_ALLOWED_HOSTS=testserver,localhost -e DJANGO_DEBUG=True -e FORCE_SCRIPT_NAME= \
    bank-analyzer-django-test:latest python manage.py $cmd
done

# 4. 片付け
docker rm -f ba-golden-pg

# 5. 取り出した Django 版を消す（ステージからも。.env は管理外なので rm で消える）
git rm -r -q -f apps/bank-analyzer-django; rm -rf apps/bank-analyzer-django
docker image rm bank-analyzer-django-test:latest
```

`expected/` を消してから流すこと（古いファイルが残る）。ただし `inputs/files/` は消さない
（上のとおりダミー3件は作り直せない）。作り直したら `manage.sh test bank-analyzer` を回し、
落ちた行がテスト側の表で説明できるものだけかを確かめる。実データ版は本番 DB を
`pg_dump` で使い捨て DB へ複製し、`dump_golden real --out <リポジトリ外>` で書き出す。
分類・削除などの書き込みを伴う記録はトランザクションごと巻き戻すので、複製の中身も変わらない。

## 取込ウィザードの再現について

`dump_golden` はサーバに直接 JSON を投げるのではなく、**画面（`import_wizard.html`）が送るものと
同じ形**を組み立てて送る。画面は表から行を作り直すため、生の解析結果とは違う:

- 摘要の空欄は `''`、残高の空欄は `0`（1ファイルでも残高列が無ければ全ファイル `null`）
- 「重複スキップ」にチェックがあれば重複行を**画面側で**落とし、`skipDuplicates` を送る
- 口座番号が読み取れないファイルは画面が先へ進ませない。記録では手入力した想定で
  `9` + 手順番号6桁（例 `9000002`）を入れ、`steps.json` の `typed_account` に残している

## Django の挙動で、React 版では直したもの

計画書 §3 で「直す」と決めたもの。React 版はここ（と下の #6・#7・#8・#10）だけ正解と違ってよい
（テストは `importer.test.ts` の `DEVIATIONS`）。

| # | 入力ファイル | Django の結果 | React 版 |
|---|---|---|---|
| 1 | `e01_leading_zero_account.csv` | 口座番号 `0012345` → `12345` | 文字列のまま |
| 2 | `e02_blank_balance.csv` | 空欄の残高が `0` で保存され、残高不整合になる | 残高なし |
| 3 | `e03` / `e13` / `e13b` / `e21` / `e22` | 日付の書式が行ごとに違うと**ファイルごと失敗**（西暦どうし `2021-04-03` と `2021/4/4` でも、空行1つでも、xlsx の日付セルと文字列の混在でも） | 行ごとに判定。空行は読み飛ばす |
| 4 | `e04_decimal_amount.csv` | `100.7` → `100` | エラーにして行番号を出す |
| 5 | `e05_us_date.csv` | `04/03/2021` を4月3日と読む | エラー |

## 段階1で見つかった、そのほかの挙動（計画書 §3 の #6〜#10）

決着（2026-10-07 承認、#8・#10 は 2026-10-10 に変更）: #6・#7 は直した、#8・#10 は切替後に直した、
#9 は Django と同じ。

- **#6 プレビューで重複が出ない**（直した）: CSV に口座番号列があると、番号が数値のまま重複キーに入り、
  DB 側（文字列）と一致しない。画面には重複が1件も出ないが、取込時にサーバが文字列で
  判定し直すので黙ってスキップされる（`transfer` / `overlap_import_all` の `steps.json`）。
  ファイル名から口座番号を拾った場合は正しく出る（`dummy` の2回目: 55件中55件）
- **#7 「重複スキップ」を外しても重複は取り込まれない**（直した。チェックどおりに動く）: 画面は `skipDuplicates` を送るが、
  サーバは `duplicateAction`（既定 `skip`）を読む（`overlap_import_all`: 8行中2行だけ取込）
- **#8 分類は文字の正規化をしない**: キーワード一致も rapidfuzz も生の文字列で照合する
  （半角カナの摘要は全角のキーワードに当たらない）。NFKC はキーワード絞り込み用の
  検索列にだけ掛かっている
  （React 版は切替後に、分類も摘要・キーワードの両方を検索列と同じ規則でそろえるようにした ──
  計画書 §3 #8。違ってよい行はテストの `N8_RESULTS` / `N8_ADDED` / `TX_DEVIATIONS`）
- **#9 同じ口座番号は銀行が違っても1口座にまとまる**（`e20_multi_bank.csv`。React 版も同じ）。口座は
  案件内で口座番号だけで識別している
- **#10** `e15`: 全角数字の金額 `１２３` はファイルごと失敗。`e16`: 列名 `年月日` / `払戻` /
  `お預り` / `残高` は読めない。`e14`: `令和3年4月1日` は読めない。
  （React 版は切替後にどれも読めるようにした ── 計画書 §3 #10。`e11` の `△100` も負号として読む）
  `e15b`: `-100` は出金 −100 として保存される
