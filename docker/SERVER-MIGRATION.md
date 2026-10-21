# メインサーバーの引っ越し 作業指示書

この文書は、**いま本番で使っている PC（元のサーバー）から新しい PC（新しいサーバー）へ、
データごと引っ越す**ための指示書です。AI エージェントにそのまま渡して実行させる前提で書いています。

- **第1部は元のサーバーで、第2部は新しいサーバーで行う**。AI は最初に、いまどちらの PC にいるかを
  人に確かめる（推測しない）。
- 上から順に実行し、**「止まる条件」に当たったらその場で作業を止めて人に報告すること**。
- 細かい中身は既存の手順書に任せ、この文書は順番と引っ越し固有の注意だけを持つ
  （新しい PC の構築は [OTHER-PC-SETUP.md](OTHER-PC-SETUP.md)、復元は [RESTORE.md](RESTORE.md)）。

## 全体の流れ

| # | どこで | やること |
|---|--------|----------|
| 1 | 元 | 現状を記録する（何も変えない） |
| 2 | 元 | 利用者に入力を止めてもらい、**最後のバックアップ**を取って確かめる |
| 3 | 元 | バックアップを USB へ写す。暗号鍵の控えを用意する |
| 4 | 元 | アプリを止める（新しいサーバーと二重に書き込ませない） |
| 5 | 新 | リポジトリを取得し、鍵を置く |
| 6 | 新 | `newpc` で全部戻す（`.env` → 元と同じモードで起動 → 全データ） |
| 7 | 新 | 確かめる（件数・訓練・preflight・画面） |
| 8 | 新 | 自動起動・自動復旧・外部コピー・LAN 公開を入れる |
| 9 | 元 | 新しいサーバーで使えると人が確かめてから、元の自動タスクを外す（データは消さない） |

**データが二重にならないことが一番大事**。手順2の最後のバックアップより後に元のサーバーへ
入力したものは、新しいサーバーには入らない。手順4で止めるまで、元のサーバーには入力させない。

## 前提

- 両方の PC: Windows + **Git for Windows（Git Bash）** + **Docker Desktop**（起動済みで `docker info` が通ること）。
- コマンドはすべて **Git Bash** で、**リポジトリのルート**（`docker/scripts/manage.sh` がある階層）から叩く。
- 持ち運びに **USB（または NAS）** を1つ使う。バックアップは暗号化済みの1ファイル（数十MB）。
- リポジトリ: `https://github.com/kojima1978/tax_apps.git` の `master`（公開・認証不要）。

## 禁止事項（両方の PC で）

- Docker ボリュームを削除しない（`docker volume rm` / `docker compose down -v` / `manage.sh clean` を使わない）。
  **元のサーバーのデータは引っ越しが済んだ後も消さない**（戻り先として残す）。
- DB を手で初期化・`DROP` しない。`REINDEX` を手で実行しない。
- 暗号鍵 `~/.tax-apps/backup.key` を作り直さない。**鍵をバックアップと同じ USB に置かない**。
- `.env` を手で書き換えない（本番の DB パスワードは `ALTER ROLE` で DB 側に入っている）。
- ローカルで `npm install` / `npm ci` / `npm run build` を叩かない。
- アプリを `docker compose up` で直接起動しない。**起動・停止・反映は必ず `manage.sh` から**。
- 関係のない未コミット変更を修正・破棄・整形しない。`git add -A` / `git reset --hard` /
  `git checkout -- .` / `git stash`（ファイル指定なし）/ `git clean` を使わない。
- リストア（`--yes` 付き）・`newpc`（`--check` 無し）・アプリの停止は、**人の確認を取ってから**叩く。

---

# 第1部 元のサーバーで行うこと

## 1-1. 現状を記録する（何も変えない）

```bash
cd "$REPO"
git remote get-url origin
git status --short
git log --oneline -1
git fetch -q origin && git status -sb | head -1
docker/scripts/manage.sh status
ls docker/logs/app-modes/
ls -la ~/.tax-apps/
```

- 出力は**全部控える**（完了報告と、新しいサーバーでの突き合わせに使う）。
- `docker/logs/app-modes/` の中身が各アプリのモード（`prod` / `dev`）。新しいサーバーはバックアップに
  入ったこの記録どおりに起動する。
- 止まる条件:
  - `git status -sb` に `ahead` が出る（**push していないコミットがある**）→ 新しいサーバーには
    届かないので、人に push するか確かめる。
  - `git status --short` に未コミット変更がある → 記録だけして触らない。**それらは新しいサーバーへ
    行かない**ことを人に伝え、必要ならコミットしてもらう（AI が勝手にコミットしない）。

`~/.tax-apps/` の中身（リポジトリの外。バックアップには入らない）:

| ファイル | 新しいサーバーで | 扱い |
|----------|------------------|------|
| `backup.key` | **必須** | 手順1-3で控えを持っていく |
| `backup-settings.env` | あれば | 自動バックアップの有効・間隔・保持数。持っていくか、新しいサーバーで画面から設定し直す |
| `backup-external-dest` | 不要 | 外部コピー先は PC ごとに `set-backup-usb.bat` で選び直す |
| `bank-analyzer-*`（フォルダ） | 不要 | Django 版からの切替時の控え。元のサーバーに残しておけばよい |

## 1-2. 最後のバックアップを取る

**人に、全員がアプリへの入力を止めたことを確かめてもらってから**叩く:

```bash
docker/scripts/manage.sh backup
ls -t docker/backups/ | grep -v '^pre-restore_' | grep '\.tar\.gz\.enc$' | head -1
```

2行目が今取ったバックアップの名前（例: `2026-10-21_213000.tar.gz.enc`）。これを**引っ越しに使う
バックアップ**として控える（以下 `<バックアップ>`）。

```bash
docker/scripts/manage.sh verify <バックアップ>
```

- `Encrypted backup is restorable` で終わること。
- 止まる条件: バックアップが失敗する／`verify` が失敗する（原因を報告。鍵を作り直さない）。

入っているもの（全アプリの一覧は [RESTORE.md の「何が戻るか」](RESTORE.md#何が戻るか)）:
PostgreSQL 4件・SQLite 3件・案件管理の Excel テンプレート・`.env` 4件・各アプリのモードの記録。
**それ以外のアプリは保存するデータを持たない**（画面だけ）ので、新しいサーバーで起動すれば同じになる。
業種目データの原本はリポジトリの `prisma/industry-data/` にあり、`git clone` で付いてくる。

## 1-3. USB へ写す・鍵の控え

USB を挿し、ドライブ文字を人に確かめる（以下 `X:`）。バックアップを写す:

```bash
mkdir -p /x/tax-apps-backup
cp docker/backups/<バックアップ> /x/tax-apps-backup/
ls -la /x/tax-apps-backup/<バックアップ>
cmp docker/backups/<バックアップ> /x/tax-apps-backup/<バックアップ> && echo copy-ok
```

- `X:\tax-apps-backup` に置くのは、新しいサーバーの `newpc` が各ドライブ直下の `tax-apps-backup` を
  自動で見つけるため。
- 止まる条件: `copy-ok` が出ない。

鍵（`~/.tax-apps/backup.key`）は**バックアップとは別の経路で**持っていく
（別の USB・パスワードマネージャー・紙など。人に方法を確かめる）。AI は鍵の中身を画面や会話に出さない。
鍵の指紋だけ控えておくと、新しいサーバーで同じ鍵かを確かめられる:

```bash
cat docker/backups/.backup-key-fingerprint
```

## 1-4. アプリを止める

**人の確認を取ってから**叩く:

```bash
docker/scripts/manage.sh stop
docker/scripts/manage.sh status
```

- `stop` は停止マーカーを置くので、ウォッチドッグもログオン時のタスクも起動し直さない。
- 自動タスク（ウォッチドッグなど）は**まだ外さない**。新しいサーバーで問題が出たら、元のサーバーで
  `manage.sh start --recorded`（または `start`）すればすぐ元どおり使える。外すのは手順9。
- ここで元のサーバーの作業はいったん終わり。**元のサーバーで入力させない**よう人に伝える。

---

# 第2部 新しいサーバーで行うこと

## 2-1. リポジトリを取得し、鍵を置く

[OTHER-PC-SETUP.md の手順B1](OTHER-PC-SETUP.md#b1-置き場所を決めて取得する) のとおり取得する
（浅いパス・日本語やスペースを含まない・親フォルダに書き込めること）:

```bash
mkdir -p ~/Desktop/dev && cd ~/Desktop/dev    # 場所は PC に合わせて変えてよい
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps
git log --oneline -1
```

- `git log` が元のサーバーの 1-1 で控えたコミットと同じか、それより新しいこと。

鍵を置く（人に渡してもらう）:

```bash
mkdir -p ~/.tax-apps
ls -la ~/.tax-apps/backup.key
```

- `~/.tax-apps/backup.key`（Windows では `%USERPROFILE%\.tax-apps\backup.key`）にあること。
- `backup-settings.env` を持ってきたなら同じフォルダに置く。
- 止まる条件: 鍵が無い（**新しい鍵を作らない**。作るとバックアップは開けない）。

## 2-2. 一覧だけ出す（何も変えない）

USB を挿し、Docker Desktop が起動していることを確かめてから:

```bash
docker info >/dev/null && echo docker-ok
docker/scripts/manage.sh newpc --check
```

- 場所の一覧に `X:\tax-apps-backup` が出て、`<バックアップ>`（1-2 で控えた名前）が選べること。
  端末が無いときは `--from` で場所を、引数でバックアップを指定する:
  `docker/scripts/manage.sh newpc <バックアップ> --from 'X:\tax-apps-backup' --check`
- 整合性の確認が通ること（失敗＝鍵がそのバックアップのものではない）。
- **一覧の「本番で起動するアプリ・開発で起動するアプリ」が、1-1 で控えた `app-modes/` と同じこと**。
- 出力を人に見せて、続けてよいか確かめる。

## 2-3. 全部戻す

**人の確認を取ってから**、ダブルクリックなら `docker\scripts\restore-new-pc.bat`、コマンドなら:

```bash
docker/scripts/manage.sh newpc <バックアップ> --from 'X:\tax-apps-backup' --yes
```

中身は [RESTORE.md の手順 B](RESTORE.md#手順-b-新しい-pc-で全部戻す): `.env` を置く →
元と同じモードで全アプリを起動 → healthy を待つ → 全データを戻して件数を照合。
初回は全アプリのビルドで 5〜15分かかる。

- 成功時: アプリごとに `件数一致` の行が出て、最後に `Failed: 0`。
- 止まる条件（手で直そうとせず報告する）: healthy にならない（データは戻さずに止まる。
  `docker/scripts/manage.sh logs <app>` の末尾を付ける）／`件数がバックアップと一致しません`。

## 2-4. 確かめる

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh drill
docker/scripts/manage.sh test
docker/scripts/manage.sh preflight
```

- `status`: 元のサーバーの 1-1 で動いていたアプリが全部 healthy、モードも同じこと。
- `drill`: 最後に `Failed: 0`。
- `test`: 失敗が無いこと（飛ばしたものは報告に書く）。
- `preflight`: FAIL が無いこと。WARN は内容を報告する（自分で直さない。照合順序＝チェック22 は
  [COLLATION-MIGRATION.md](COLLATION-MIGRATION.md)、LAN 公開＝チェック19 は 2-5）。
- 画面: ブラウザで `http://localhost` を開き、ポータルから各アプリを開いて、**人が**いつものデータ
  （案件・顧客・評価案件など）があることを確かめる。

## 2-5. 常用の設定を入れる

人に確かめてから、エクスプローラで `docker\scripts\` の次をダブルクリックしてもらう（どれも昇格不要）:

| ファイル | 役目 |
|----------|------|
| `register-startup-task.bat` | ログオン時に起動 |
| `register-docker-watchdog-task.bat` | 4時間毎の復旧と、バックアップ・訓練・掃除 |
| `register-backup-settings-api-task.bat` | ポータルのバックアップ設定画面（元のサーバーで使っていた場合） |
| `set-backup-usb.bat` | 外部コピー先（USB / NAS）を選ぶ。**引っ越しに使った USB とは別のものが望ましい** |

**LAN の他の PC から使う場合**（管理者の PowerShell で。詳しくは [README.md の LAN 公開](../README.md)）:

```powershell
New-NetFirewallRule -DisplayName "Tax Apps Gateway (HTTP)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private,Domain -RemoteAddress LocalSubnet
```

- Docker Desktop が作る「Docker Desktop Backend」のルールも `-RemoteAddress LocalSubnet` に絞る
  （全送信元のままだと上のルールを素通りする）。`preflight` のチェック19 が WARN を出さなくなれば済み。
- 事務所のネットワークが「パブリック」と判定されていたら「プライベート」に変える。
- **利用者の PC のブックマークの宛先が変わる**（`http://<新しいサーバーの IP>/`）。新しいサーバーの IP を
  `ipconfig` で調べて人に伝える。IP を固定するかはルーター側の話なので人に任せる。

Claude Desktop などから MCP サーバー（`apps/mcp-server`）を使っていた場合は、新しいサーバーで
イメージを作り直し、MCP クライアントの設定を写す（[apps/mcp-server/README.md](../apps/mcp-server/README.md)）。

```bash
docker compose -f apps/mcp-server/docker-compose.yml --profile mcp build mcp-server
```

最後にもう一度:

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

自動タスクの行が「登録済み」になっていること。翌日以降、`status` に `backup` の記録が `ok` で
付き、外部コピー先にもファイルが増えていくことを確かめる。

---

# 第3部 引っ越しが済んだ後（元のサーバー）

**新しいサーバーで数日使って問題が無いと人が確かめてから**行う。

1. 元のサーバーの自動タスクを外す（エクスプローラで `docker\scripts\` の次をダブルクリック）:
   `unregister-docker-watchdog-task.bat` / `unregister-startup-task.bat`。
   バックアップ設定画面のタスクは PowerShell で
   `powershell -File docker\scripts\register-backup-settings-api-task.ps1 -Unregister`。
2. 元のサーバーのファイアウォールで 80番の許可ルール（`Tax Apps Gateway (HTTP)`）を無効にする
   （止めたサーバーへ繋ぎに行く PC が無いようにするため）。
3. **元のサーバーの Docker ボリューム・`docker/backups/`・`~/.tax-apps/` は消さない**。
   処分する場合は、新しいサーバーで少なくとも1回自動バックアップと訓練が `ok` になり、
   外部コピー先にも写っていることを確かめてから、人が判断する。

問題が出て元へ戻すとき: 元のサーバーで `docker/scripts/manage.sh start --recorded`
（モードの記録どおりに起動）。新しいサーバーで入力したものは元には無いので、どちらを正とするかを
人が決める（新しいサーバーのバックアップを元のサーバーで `restore --all` すれば寄せられる）。

---

## 完了報告に含める内容

- どちらの PC で、どの部・手順まで行ったか
- 元: 1-1 の出力（`git status`・`app-modes/`・`status`）、引っ越しに使ったバックアップの名前、
  `verify` の結果、USB への `copy-ok`、`stop` の結果
- 新: リポジトリの場所とコミット、`newpc --check` の一覧、`newpc` の件数一致の行と
  `OK / Skipped / Failed`、`status` / `drill` / `test` / `preflight` の要約と WARN の全文
- 登録したタスクと外部コピー先、ファイアウォールの設定、新しいサーバーの IP
- 止まった場合は、止まった手順・出力の全文・その時点の `manage.sh status`
