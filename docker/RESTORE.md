# バックアップからの復元 作業指示書

この文書は、`docker/backups/` の暗号化バックアップから**アプリ単位で**データを戻すための指示書です。
AI エージェントにそのまま渡して実行させる前提で書いています。上から順に実行し、
**「止まる条件」に当たったらその場で作業を止めて人に報告すること**。

想定する場面は2つ:

- **A. この PC で1アプリだけ戻す**（誤削除・取り込みミス・DB の論理破損）→ 手順 A
- **B. 新しい PC（または PC の入れ替え）で全部戻す** → 手順 B

## 目的

- 壊れたアプリ**だけ**を、指定したバックアップの時点へ戻す。他のアプリは止めない。
- 戻した後に**件数がバックアップと一致したこと**と、**アプリが healthy に戻ったこと**まで確かめる。
- 戻す前の状態は必ず `pre-restore_*` として残し、いつでも巻き戻せるようにする。

## 何が戻るか

**取るのは全体でまとめて1つ、戻すのはアプリごと**。アプリ単位でバックアップを取るコマンドは無い
（`manage.sh backup` が下の「入る」アプリを全部1つの暗号化アーカイブに詰める）。
各アプリ固有の注意は、右端のリンク先（各アプリの README の「バックアップと復元」）にある。

| アプリ | 全体バックアップに入るもの | 画面からの別の経路（手元の控え） | 詳細 |
|--------|----------|----------|------|
| inheritance-case-management | PostgreSQL（`itcm-postgres`）・Excel テンプレート（`templates/`）・`.env` | 設定 → バックアップ（JSON） | [README](../apps/inheritance-case-management/README.md#バックアップと復元) |
| bank-analyzer | PostgreSQL（`bank-analyzer-postgres`）・`.env`・案件ごとの JSON | 「JSONから復元」 | [README](../apps/bank-analyzer/README.md#バックアップと復元) |
| private-banking | PostgreSQL（`private-banking-postgres`）・`.env` | `/backup` / `/restore`（全体・1世帯の JSON） | [README](../apps/private-banking/README.md#バックアップと復元) |
| stock-valuation-form | PostgreSQL（`svf-postgres`）・`.env` | 業種目データは Git（`prisma/industry-data`）にもある | [README](../apps/stock-valuation-form/README.md#バックアップと復元) |
| insurance-app | SQLite（ボリューム `insurance-app-data`） | 「バックアップ・復元」（SQLite ファイル） | [README](../apps/insurance-app/README.md#バックアップと復元) |
| inheritance-tax-docs | SQLite（ボリューム `inheritance-tax-docs-data`。アップロードした参考資料のファイルも同じボリュームに入る） | JSON の書き出し・読込 | [README](../apps/inheritance-tax-docs/README.md) |
| staff-directory | SQLite（ボリューム `staff-directory-data`） | なし | [README](../apps/staff-directory/README.md#バックアップと復元) |
| inheritance-tax-form | **入らない**（入力はブラウザの localStorage `inheritance-tax-form:v1` だけ） | 「バックアップを書き出す／バックアップから復元」（JSON） | [README](../apps/inheritance-tax-form/README.md#バックアップと復元) |
| asset-valuation | **入らない**（作業の下書き・プリセットはブラウザの localStorage） | 結果画面の「JSONバックアップ」→ 最初の画面の「JSONファイルから復元」 | [README](../apps/asset-valuation/README.md#バックアップと復元) |
| tax-docs | **入らない**（編集内容はサーバーに保存しない） | 「ファイルに保存／ファイルを読込」（JSON） | [README](../apps/tax-docs/README.md#バックアップと復元) |
| gift-tax-simulator | **入らない**（贈与税の入力はメモリでリロードで消える。不動産3ページの入力だけブラウザの localStorage） | なし | [README](../apps/gift-tax-simulator/README.md#バックアップと復元) |
| inheritance-tax-app / retirement-tax-calc / capital-gains-calc / depreciation-calc | **入らない**（保存するデータが無い） | なし | 各アプリの README の「バックアップと復元」 |
| mcp-server | **入らない**（書き込み先は株式評価明細書の DB） | — | [README](../apps/mcp-server/README.md#バックアップと復元) |
| ゲートウェイ・ポータル | **入らない**（設定はすべて Git） | — | — |

「入る」側の元は `docker/scripts/backup.sh` 冒頭の4つの配列（`PG_TARGETS` / `SQLITE_TARGETS` /
`BIND_TARGETS` / `SETTINGS_TARGETS`）。DB やデータを持つアプリを足したら、**配列に1行・この表に1行・
そのアプリの README に「バックアップと復元」**を足す。ソースはどのアプリも Git にある。

**戻らないもの**（知らずに頼らないこと）:

- 表で「入らない」アプリの、**ブラウザの中にしか無いデータ**。ブラウザのデータを消す・別の PC や
  別のブラウザで開くと見えない。残したい入力は**画面から書き出して手元に保存する**のが唯一の控え
- bank-analyzer の夜間 JSON（`*.json`）。バックアップには入っているが `restore` は流さない
  （DB の `.sql` が本体）。JSON から戻すときは bank-analyzer の画面の「JSONから復元」を使う
- Excel テンプレートは**上書きで重ねる**（バックアップに無いファイルは消さない）。
  後から足したテンプレートは戻した後も残る

## 前提

- 作業はリポジトリのルート（`tax_apps/`）で、**Git Bash** から行う。
- 暗号鍵 `~/.tax-apps/backup.key` があること。**これが無いとどのバックアップも開けない**。
- 戻すアプリの DB コンテナが**起動していること**（PostgreSQL は動いたまま `psql` で流し込む）。
  止まっていたら `docker/scripts/manage.sh start <app>` してから。
- 所要時間の目安は、戻す前の保険バックアップ（全アプリ分）で数分＋1アプリ1〜2分。
  止まるのは**そのアプリだけ**（PostgreSQL のアプリは DB 以外、SQLite のアプリは全部）。

## 禁止事項

- Docker ボリュームを削除しない（`docker volume rm` / `docker compose down -v` / `manage.sh clean` を使わない）。
  リストアは**中身を入れ替える**操作で、ボリュームを作り直す必要は無い。
- DB を手で初期化・`DROP` しない。`REINDEX` を手で実行しない。
- `pre-restore_*` を**人の確認の前に**消さない（巻き戻しの唯一の手段）。
- `--with-env` を**理由なく付けない**（下の「.env の扱い」）。
- 関係のない未コミット変更を修正・破棄・整形しない。`git add -A` / `git reset --hard` /
  `git checkout -- .` / `git stash`（ファイル指定なし）を使わない。
- `apps/*/docker-compose.yml` の `external: true` を**追加も削除もしない**（bank-analyzer の DB ボリュームは
  master で external。無ければ `manage.sh` が作る）。
- Docker Desktop の Gordon / Docker AI / CLI hooks をグローバルに無効化しない。
- リストアを entrypoint・`apply`・`recover`・`due`・ウォッチドッグなど**自動の経路に載せない**。

## コマンド

```bash
docker/scripts/manage.sh restore                          # 端末で、アプリとバックアップを選ぶ
docker/scripts/manage.sh restore <app> [バックアップ]     # 1アプリだけ
docker/scripts/manage.sh restore --all [バックアップ]     # 対象アプリを全部
docker/scripts/manage.sh restore --env-only [app]         # 無い .env だけ置く
docker/scripts/manage.sh verify <バックアップ>            # 上書きせず復号と整合性だけ確かめる
docker/scripts/manage.sh restore ... --from <フォルダ>   # docker/backups 以外（USB など）から戻す
docker/scripts/manage.sh newpc [--check] [--from <フォルダ>]  # 新しい PC で全部戻す（手順 B）
```

- バックアップの指定は `2026-10-14_212138` / `2026-10-14`（その日の最新）/ `pre-restore_...`。
  `.tar.gz.enc` を付けてもよい。端末で省略すると一覧から選び、端末が無いと最新（pre-restore を除く）。
- `<app>` は `apps/` の下のディレクトリ名。`itcm` / `svf` の略称と、一意に決まる部分一致も通る。
- `--yes` を付けないと、**何が戻るかの一覧**（バックアップの件数と今の件数の並び、`.env` の扱い）を
  出して確認を求める。端末が無いとき（AI から叩くとき）は `--yes` が無ければそこで中止する
  ＝**`--yes` 無しで叩けば一覧を見るだけ**になる。
- `restore.bat` はダブルクリック用の同じ入口（`docker/scripts/restore.bat`）。
- **バックアップの場所は選べる**。端末で `--from` もバックアップ名も付けずに叩くと、バックアップが
  入っているフォルダを番号で出す: `docker/backups`（本体・世代あり）／`tax_apps_backup_latest/all-apps`
  （同じディスクの最新の写し）／外部コピー先（`~/.tax-apps/backup-external-dest`）／各ドライブ直下の
  `tax-apps-backup`（USB を挿せば見つかる）。`[m]` でフォルダを打ち込むこともできる（`E:\...` でもよい）。
  **USB から直接戻せるので、`docker/backups` へ写す必要は無い**。戻す前の保険（`pre-restore_*`）は
  どこから戻しても `docker/backups` に作られる。

`--yes` の中身（スクリプトが自動で行う）:

1. バックアップを一時ディレクトリへ復号し、SHA-256 で整合性を確かめる
2. **現在の全データを `pre-restore_YYYY-MM-DD_HHMMSS` として暗号化バックアップ**（失敗したら中止）
3. そのアプリのコンテナを止める（`.sql` から戻す PostgreSQL のコンテナだけは動かしたまま）
4. PostgreSQL は `psql` で流し込み、**ダンプの行数と全テーブルの実件数を照合**する
5. SQLite はボリュームの中身を入れ替える／テンプレートと `.env` を置く
6. 止めたコンテナを起動し、**healthy になるまで待つ**（既定 240 秒、`RESTORE_HEALTH_TIMEOUT`）
7. SQLite はアプリのコンテナを借りて**件数をバックアップと照合**する
8. 結果を `docker/logs/last-run/restore` に記録する（`manage.sh status` に出る）

戻す前から止まっていたアプリは**起動しない**（止めていた理由を壊さないため）。途中で処理が
死んでも、止めたコンテナは操作ロックの解放時に起動し直される。

### .env の扱い

- **既定は「無いときだけ戻す」**。今ある `.env` と中身が違っても上書きしない（一覧に
  「今のものを残す（上書きは --with-env）」と出る）。
- 理由: 本番モードのアプリは `.env` の DB パスワードを起動時に生成して `ALTER ROLE` で DB に
  合わせている。`.env` だけ古い版へ戻しても **DB のパスワードは戻らない**ので、上書きすると
  繋がらなくなる（DB の中身を戻しても、パスワードはロールのものが残る）。
- `--with-env` は「`.env` を誤って書き換えた・消した」ときだけ使う。付けて繋がらなくなったら、
  `pre-restore_*` から同じアプリを `--with-env` で戻せば元の `.env` に戻る（`--env-only` は既にある `.env` に
  触らないので使えない。DB も戻す直前の状態に戻る＝そのリストアごと取り消しになる）。

## 手順 A: この PC で1アプリだけ戻す

### A1. 未コミット変更の確認

```bash
git status --short
```

未コミット変更は**記録だけして触らない**。

### A2. どの時点へ戻すかを決める

```bash
ls docker/backups/ | grep -E '^(pre-restore_)?[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}'
docker/scripts/manage.sh verify <バックアップ>
```

- 保持は日次7 + 週次4 + 月次6。**壊れる前の最後の版**を人に確かめてから選ぶ（AI が推測で選ばない）。
- `verify` が `Encrypted backup is restorable` で終わること。
- 止まる条件: `verify` が失敗する（`Could not decrypt backup`。`Key finger` と `Recorded` が違えば鍵がそのアーカイブのものではない）。

### A3. 一覧を見る（何も変えない）

```bash
docker/scripts/manage.sh restore <app> <バックアップ>
```

端末が無いので一覧を出して中止する。出力を報告用に控え、次を確かめる:

- テーブル数・行数が「バックアップ」と「今」で並ぶ。**バックアップ側が極端に少ない（0 行など）なら止まる**
- `.env` の行が「今のものと同じ」か「今のものを残す」になっている（`--with-env` を付けていない）
- 止まる条件: `が止まっています`（→ `manage.sh start <app>` してからやり直す）／一覧にアプリが出ない

### A4. 戻す

```bash
docker/scripts/manage.sh restore <app> <バックアップ> --yes
```

成功時の出力に次が含まれること:

- `pre-restore` の保険バックアップの成功
- PostgreSQL: `<dump>.sql（件数一致: N テーブル / M 行）`
- SQLite: `件数一致 N テーブル / M 行`
- 最後に `Failed: 0`

止まる条件（手で直そうとせず報告する）:

- `件数がバックアップと一致しません` → **戻した後の DB が半端**。手順 C で `pre-restore` へ巻き戻すかを人に聞く
- `healthy になりません` → `docker/scripts/manage.sh logs <app>` の末尾を報告に付ける
- pre-restore の保険バックアップに失敗 → 何も変わっていない。原因を報告

### A5. 確認

```bash
docker/scripts/manage.sh status
```

そのアプリが healthy であること、`restore` の記録が `ok` であること。
画面でそのアプリを開き、戻したかったデータがあることを**人が**確かめる。

## 手順 B: 新しい PC で全部戻す

**`docker/scripts/restore-new-pc.bat` をダブルクリックする**のが入口（中身は `manage.sh newpc`）。
下の「手で行う場合」の中身（`.env` → 起動 → `restore --all`）を1回の確認（`y`）でまとめて行う。

### B1. 置くもの

1. Docker Desktop と Git for Windows を入れ、リポジトリを clone する（`tax_apps/`）。
2. 暗号鍵を `%USERPROFILE%\.tax-apps\backup.key`（Git Bash では `~/.tax-apps/backup.key`）に置く
   （元の PC の控えから）。**鍵が無いと先へ進まない**（新しい鍵を黙って作ることもしない）。
3. バックアップの入った USB を挿す。`docker/backups/` へ写さなくてよい（場所は一覧から選べる）。
4. Docker Desktop を起動しておく。

### B2. `restore-new-pc.bat` をダブルクリック

画面の流れ:

1. Docker と鍵の確認
2. **バックアップの場所を選ぶ**（見つかったフォルダが件数と最新の日時つきで並ぶ。USB は
   `X:\tax-apps-backup` なら自動で出る。違う場所なら `[m]` で打ち込む）
3. **どのバックアップか選ぶ**（普通は一番上＝最新）
4. 復号と整合性の確認（ここで失敗したら何も変えずに終わる＝鍵がそのアーカイブのものではない）
5. **これから行うことの一覧**: 置く `.env`、本番で起動するアプリ・開発で起動するアプリ
6. `y` を打つと実行: `.env` を置く → 全アプリを元の PC と同じモードで起動 → healthy を待つ →
   全アプリのデータを戻す（A4 と同じ件数照合）→ 結果

- モードは 2026-10-15 以降のバックアップに入っている（`app-modes/`）。それより古いバックアップでは
  「全部開発／全部本番」を聞く（コマンドなら `--dev` / `--prod`）。この PC で既に `start` した
  アプリは、そのときの記録が優先される。
- 最初は**確認だけ**でもよい: `docker/scripts/manage.sh newpc --check`（場所の一覧・整合性・
  一覧を出して終わる。何も変えない）。
- コマンドで叩くなら `manage.sh newpc [バックアップ] [--from <フォルダ>]`。端末が無いときは
  `--yes` が無ければ一覧を出して中止する。

止まる条件（手で直そうとせず報告する）: 鍵が無い／整合性の確認に失敗／起動したアプリが
healthy にならない（データは戻さずに止まる）／A4 と同じ止まる条件。

### B3. 確認

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh drill
docker/scripts/manage.sh preflight
```

- drill の最後に `Failed: 0`。
- 自動起動・自動復旧のタスクを登録する: `register-startup-task.bat` と
  `register-docker-watchdog-task.bat`（どちらも昇格不要）。
- preflight の WARN は記録する（今回の作業と関係なければ直さない）。照合順序（チェック22）の
  WARN が出たら `docker/COLLATION-MIGRATION.md` へ。

### 手で行う場合（newpc の中身）

```bash
docker/scripts/manage.sh verify <バックアップ>                         # 整合性
docker/scripts/manage.sh restore --env-only <バックアップ> --from <フォルダ>   # .env を先に置く
docker/scripts/manage.sh start --prod       # または start。手で行う場合はモードの記録が無いのでどちらかを選ぶ
docker/scripts/manage.sh status             # 全アプリ healthy になるまで待つ
docker/scripts/manage.sh restore --all <バックアップ> --from <フォルダ>        # 一覧（何も変えない）
docker/scripts/manage.sh restore --all <バックアップ> --from <フォルダ> --yes  # 実行
```

`.env` が無いまま起動すると、本番モードのアプリは新しいパスワードを生成して別の DB として
立ち上がる。**起動より先に**元の `.env` を置くのが要点（無いものだけを置き、今あるものには触らない）。
`start --recorded` が読む記録（`docker/logs/app-modes/`）は newpc ならバックアップから置かれるが、
手で行う場合は無いので `start` か `start --prod` を選ぶ。

## 手順 C: 戻したのを取り消す（pre-restore へ巻き戻す）

リストアのたびに、戻す直前の全データが `pre-restore_YYYY-MM-DD_HHMMSS` として残っている。
同じコマンドでそれを指定すれば戻す前の状態になる:

```bash
docker/scripts/manage.sh restore <app> pre-restore_YYYY-MM-DD_HHMMSS --yes
```

（この操作自体もまた新しい `pre-restore_*` を作るので、行き来しても失われない。）
`pre-restore_*` は世代に積まれず、7日で消える。

## 外部コピー先（外付け USB）

`docker/backups/` は同じディスクにあるので、ディスクの故障やランサムウェアでバックアップごと消える。
バックアップのたびに暗号化アーカイブを別のドライブへも写す:

1. USB を挿し、**`docker/scripts/set-backup-usb.bat` をダブルクリック**する
   （中身は `manage.sh usb`）。
2. ドライブの一覧（種類・名前・空き容量つき）から番号を選ぶ。`<ドライブ>:\tax-apps-backup` が
   作られ、書き込めるかを確かめてから設定が保存される。NAS など任意のフォルダは `m` で打ち込む。
   **この PC の本体と同じドライブを選ぶと警告して確認する**（同じディスクでは守りにならない）。
3. 「いちばん新しいバックアップを今すぐ写しますか？」に `Y` で、その場で1本写る。
   以降はバックアップのたびに自動で写る。

コマンドで叩くなら:

```bash
docker/scripts/manage.sh usb                    # 一覧から選ぶ（端末が無いときは今の設定を出すだけ）
docker/scripts/manage.sh usb --show             # 今の設定と、コピー先が見えているか
docker/scripts/manage.sh usb --set 'E:\tax-apps-backup'   # 直接指定（E: だけなら E:\tax-apps-backup）
docker/scripts/manage.sh usb --copy-now         # 最新のバックアップを今すぐ写す
docker/scripts/manage.sh usb --off              # 外部コピーをやめる（USB の中身は消さない）
```

設定は `~/.tax-apps/backup-external-dest`（1行目がパス、2行目が `# id:`）。リポジトリの外に置くのは、
公開リポジトリにドライブ名やユーザー名を載せないため。手で書いても動く（`# id:` が無い古い形は、
次に写したときに目印が付く）。

注意:

- **USB のドライブ文字は挿す順番で変わるが、追いかける**。コピー先のフォルダには目印
  （`.tax-apps-backup-id`）が置かれ、設定の `# id:` と同じ値を持つ。設定のパスが見つからないときは
  他のドライブの同じフォルダを探し、**目印が一致したときだけ**そこへ写して設定を書き換える
  （同じフォルダ名の別の USB は採らない）。見つからなければ `backup-external` に `unavailable` が
  記録されてデスクトップに警告が出る。NAS のように文字が変わると追えない場所もあるので、
  Windows の「ディスクの管理」でドライブ文字を固定しておくとなお良い。
- 抜いている間のバックアップは外部へ写らない（本体の `docker/backups/` には残る）。
  挿し直した次のバックアップから再開する。警告が出続けるなら挿し忘れの合図。
- **鍵（`backup.key`）を USB に一緒に置かない**。USB を落とした人が全部読めてしまう。
  鍵の控えは別の場所（パスワードマネージャーや紙）に取っておくこと。**鍵を失うと
  USB の中身も含めてすべてのバックアップが開けなくなる**。

## 完了報告に含める内容

- 手順 A1 の未コミット変更の一覧と、触らなかったこと
- 戻したアプリと、使ったバックアップの名前
- 一覧（A3、または newpc / `restore --all` の `--yes` 無し）の出力
- アプリごとの `件数一致` の行と `OK / Skipped / Failed`
- 作られた `pre-restore_*` の名前（巻き戻し用）
- `manage.sh status` の該当アプリの行と `restore` の記録
- `.env` を上書きしたかどうか（`--with-env` を付けたならその理由）
- 止まった場合は、止まった手順・出力の全文
