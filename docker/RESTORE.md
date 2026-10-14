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

| アプリ | 戻るもの |
|--------|----------|
| inheritance-case-management | PostgreSQL（`itcm-postgres`）・Excel テンプレート・`.env` |
| bank-analyzer | PostgreSQL（`bank-analyzer-postgres`）・`.env` |
| private-banking | PostgreSQL（`private-banking-postgres`）・`.env` |
| stock-valuation-form | PostgreSQL（`svf-postgres`）・`.env` |
| insurance-app | SQLite（ボリューム `insurance-app-data`） |
| inheritance-tax-docs | SQLite（ボリューム `inheritance-tax-docs-data`） |

この表の元は `docker/scripts/backup.sh` 冒頭の4つの配列（`PG_TARGETS` / `SQLITE_TARGETS` /
`BIND_TARGETS` / `SETTINGS_TARGETS`）。ここに無いアプリは**戻すデータを持たない**（ソースは Git にある）。

**戻らないもの**（知らずに頼らないこと）:

- **ブラウザの中にしか無いデータ**。相続税の申告書（inheritance-tax-form）は入力を
  ブラウザの localStorage（`inheritance-tax-form:v1`）にだけ保存する。サーバーにも
  バックアップにも入らず、ブラウザのデータを消す・別の PC や別のブラウザで開くと見えない。
  残したい入力は**画面から書き出して手元に保存する**のが唯一の控え。gift-tax-simulator の
  入力（メモリのみ）はリロードで消える
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
- `apps/*/docker-compose.yml` の `external: true` を**追加も削除もしない**。
- Docker Desktop の Gordon / Docker AI / CLI hooks をグローバルに無効化しない。
- リストアを entrypoint・`apply`・`recover`・`due`・ウォッチドッグなど**自動の経路に載せない**。

## コマンド

```bash
docker/scripts/manage.sh restore                          # 端末で、アプリとバックアップを選ぶ
docker/scripts/manage.sh restore <app> [バックアップ]     # 1アプリだけ
docker/scripts/manage.sh restore --all [バックアップ]     # 対象アプリを全部
docker/scripts/manage.sh restore --env-only [app]         # 無い .env だけ置く
docker/scripts/manage.sh verify <バックアップ>            # 上書きせず復号と整合性だけ確かめる
```

- バックアップの指定は `2026-10-14_212138` / `2026-10-14`（その日の最新）/ `pre-restore_...`。
  `.tar.gz.enc` を付けてもよい。端末で省略すると一覧から選び、端末が無いと最新（pre-restore を除く）。
- `<app>` は `apps/` の下のディレクトリ名。`itcm` / `svf` の略称と、一意に決まる部分一致も通る。
- `--yes` を付けないと、**何が戻るかの一覧**（バックアップの件数と今の件数の並び、`.env` の扱い）を
  出して確認を求める。端末が無いとき（AI から叩くとき）は `--yes` が無ければそこで中止する
  ＝**`--yes` 無しで叩けば一覧を見るだけ**になる。
- `restore.bat` はダブルクリック用の同じ入口（`docker/scripts/restore.bat`）。

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
  `pre-restore_*` から同じアプリを `--env-only` ではなく `--with-env` で戻せば元の `.env` に戻る。

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

- `件数が一致しません` → **戻した後の DB が半端**。手順 C で `pre-restore` へ巻き戻すかを人に聞く
- `healthy になりません` → `docker/scripts/manage.sh logs <app>` の末尾を報告に付ける
- pre-restore の保険バックアップに失敗 → 何も変わっていない。原因を報告

### A5. 確認

```bash
docker/scripts/manage.sh status
```

そのアプリが healthy であること、`restore` の記録が `ok` であること。
画面でそのアプリを開き、戻したかったデータがあることを**人が**確かめる。

## 手順 B: 新しい PC で全部戻す

### B1. リポジトリと鍵とバックアップを置く

1. リポジトリを clone する（`tax_apps/`）。
2. 暗号鍵を `~/.tax-apps/backup.key` に置く（元の PC の控えから）。
3. バックアップ（`YYYY-MM-DD_HHMMSS.tar.gz.enc`）を `tax_apps/docker/backups/` に置く
   （外付け USB の外部コピー先などから。最新1本で足りる）。
4. `docker/scripts/manage.sh verify <バックアップ>` が `Encrypted backup is restorable` で終わること。

止まる条件: 鍵が無い／`verify` が失敗する（別の鍵で暗号化されている）。

### B2. `.env` を先に置く

```bash
docker/scripts/manage.sh restore --env-only
```

`.env` が無いまま起動すると、本番モードのアプリは新しいパスワードを生成して別の DB として
立ち上がる。**起動より先に**元の `.env` を置くのが要点。無いものだけを置き、今あるものには触らない
（確認も pre-restore も取らない）。

### B3. 起動する

```bash
docker/scripts/manage.sh start            # 元の PC が本番なら start --prod
docker/scripts/manage.sh status           # 全アプリ healthy になるまで待つ
```

### B4. データを戻す

```bash
docker/scripts/manage.sh restore --all <バックアップ>          # 一覧（何も変えない）
docker/scripts/manage.sh restore --all <バックアップ> --yes    # 実行
```

アプリごとに A4 と同じ出力が並ぶ。止まる条件も A4 と同じ。

### B5. 確認

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh drill
docker/scripts/manage.sh preflight
```

- drill の最後に `Failed: 0`。
- preflight の WARN は記録する（今回の作業と関係なければ直さない）。照合順序（チェック22）の
  WARN が出たら `docker/COLLATION-MIGRATION.md` へ。

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

1. USB を挿し、コピー先のフォルダを作る（例: `E:\tax-apps-backup`）。
2. `~/.tax-apps/backup-external-dest` の**1行目**にそのパスを書く（Git Bash なら `/e/tax-apps-backup`）。
   リポジトリの外に置くのは、公開リポジトリにドライブ名やユーザー名を載せないため。
3. `docker/scripts/manage.sh backup` を1回叩き、`External copy:` の行が出てコピー先に
   `.tar.gz.enc` が増えたことを確かめる。

注意:

- **USB のドライブ文字は挿す順番で変わる**。違う文字で認識されるとコピー先が見つからず、
  `backup-external` に `unavailable` が記録されてデスクトップに警告が出る。
  Windows の「ディスクの管理」でその USB のドライブ文字を固定しておく。
- 抜いている間のバックアップは外部へ写らない（本体の `docker/backups/` には残る）。
  挿し直した次のバックアップから再開する。警告が出続けるなら挿し忘れの合図。
- **鍵（`backup.key`）を USB に一緒に置かない**。USB を落とした人が全部読めてしまう。
  鍵の控えは別の場所（パスワードマネージャーや紙）に取っておくこと。**鍵を失うと
  USB の中身も含めてすべてのバックアップが開けなくなる**。

## 完了報告に含める内容

- 手順 A1 の未コミット変更の一覧と、触らなかったこと
- 戻したアプリと、使ったバックアップの名前
- 一覧（A3 / B4 の `--yes` 無し）の出力
- アプリごとの `件数一致` の行と `OK / Skipped / Failed`
- 作られた `pre-restore_*` の名前（巻き戻し用）
- `manage.sh status` の該当アプリの行と `restore` の記録
- `.env` を上書きしたかどうか（`--with-env` を付けたならその理由）
- 止まった場合は、止まった手順・出力の全文
