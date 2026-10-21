# メインサーバーの引っ越し 作業指示書

この文書は、**いま本番で使っている PC（元のサーバー）から新しい PC（新しいサーバー）へ、
データごと引っ越す**ための指示書です。AI エージェント（Claude Code / Codex など）に渡して、
**作業は AI が行い、人は判断と承認だけをする**前提で書いています。

## 取得元（URL）

| 項目 | 値 |
|------|----|
| リポジトリ（ブラウザで見る） | https://github.com/kojima1978/tax_apps |
| clone / pull に使う URL | `https://github.com/kojima1978/tax_apps.git`（公開・認証不要） |
| ブランチ | `master` |
| この文書（AI に URL で渡すとき） | https://raw.githubusercontent.com/kojima1978/tax_apps/master/docker/SERVER-MIGRATION.md |

```bash
git clone https://github.com/kojima1978/tax_apps.git    # 新しいサーバー
git pull --ff-only origin master                        # 元のサーバー（更新）
```

新しいサーバーにはまだリポジトリが無いので、AI には上の「この文書」の URL を渡して読ませる。

## AI への指示

まず**リハーサル**（第0部。元のサーバーは止めず、利用者は使い続けてよい）:

- 元のサーバーで: 「メインサーバーを新しい PC へ引っ越す。この文書の**第0部の元のサーバーの手順**をこの PC で進めて」
- 新しいサーバーで: 「この文書の**第0部の新しいサーバーの手順**をこの PC で進めて」

リハーサルが通ったら**本番**（別の日でよい）:

- 元のサーバーで: 「この文書の**第1部**をこの PC で進めて」
- 新しいサーバーで: 「この文書の**第2部**をこの PC で進めて（リハーサル済み）」
- 引っ越しが済んで数日後、元のサーバーで: 「**第3部**を進めて」

AI は最初に、**いまどちらの PC にいるかを人に確かめる**（推測しない）。

**新しいサーバーは Windows に限る**。自動起動・自動復旧（タスクスケジューラ・`docker-watchdog.ps1`）、
デスクトップの警告、ファイアウォールの設定はどれも Windows 専用で、Linux へ移すと
**バックアップも復旧も黙って止まる**（`manage.sh` / `backup.sh` と各アプリの compose は動くが、それを起こす係が居ない）。
新しいサーバーが Windows でなければ、この文書では進めずに人へ報告する（cron / systemd timer での置き換えを先に決める）。

## 進め方の決まり（AI 向け）

- **コマンドは AI が叩く**。人に「このコマンドを打ってください」「このファイルをダブルクリックしてください」と
  頼まない。`.bat` は最後に `pause` で止まるので、AI は中の `.ps1` を直接呼ぶ。
- 人に求めるのは次の3つだけ:
  1. **判断**（この文書で **【判断】** と書いた箇所。選択肢と AI の推奨を添えて聞く）
  2. **承認**（**【承認】** の箇所。何が起きるかを一言で示してから「進めてよいか」を聞く）
  3. **物理的な操作**（USB を挿す・抜く、Windows の UAC 画面で「はい」を押す、ライセンス画面で同意する）
- 管理者権限が要る PowerShell は、AI が次の形で起動する（UAC が出たら人が「はい」を押す）:

  ```bash
  powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','<コマンド>'"
  ```

- 上から順に実行し、**「止まる条件」に当たったらその場で止めて人に報告する**。推測で先へ進めない。
- 出力は全部控える（最後の完了報告に使う）。

## 全体の流れ

| # | どこで | やること | 人がすること |
|---|--------|----------|--------------|
| 0 | 元→新 | **リハーサル**: 元のサーバーを止めずにその時点のバックアップを新しいサーバーへ戻し、第2部を最後まで通す | 第1部・第2部と同じ |
| 1-1 | 元 | 現状を記録する（何も変えない） | — |
| 1-2 | 元 | **master と同じ版へ更新する**（元のサーバーは古い版のまま動いている） | 【承認】更新 |
| 1-3 | 元 | 新しいサーバーの IP を決める | 【判断】同じ IP にするか |
| 1-4 | 元 | 利用者に入力を止めてもらい、**最後のバックアップ**を取って確かめる | 【承認】利用者が止めた |
| 1-5 | 元 | バックアップと鍵を USB へ写す | USB を挿す |
| 1-6 | 元 | アプリを止め、IP を明け渡す | 【承認】停止 |
| 2-1 | 新 | Git・Docker Desktop を入れる | UAC・ライセンス同意 |
| 2-2 | 新 | リポジトリを取得し、鍵を置く | USB を挿す |
| 2-3 | 新 | `newpc` で全部戻す | 【承認】一覧を見て実行 |
| 2-4 | 新 | 自動起動・自動復旧・外部コピー・ファイアウォール・IP・電源とログオンを設定する | UAC・【判断】自動ログオン |
| 2-5 | 新 | 確かめる（件数・訓練・テスト・preflight・画面） | 画面でデータを見る |
| 3 | 元 | 数日後、元の自動タスクを外す（データは消さない） | 【承認】 |
| F | 新→元 | **fleet-board（社用車の予約）**を新しいサーバーで一から立ち上げ、元を止める（[付録](#付録-fleet-board社用車の予約)） | UAC・【承認】LAN 公開・自動起動 |

**データを二重にしないことが一番大事**。1-4 の最後のバックアップより後に元のサーバーへ入力したものは
新しいサーバーに入らない。1-6 で止めるまで、元のサーバーへは入力させない。

## 禁止事項（両方の PC で）

- Docker ボリュームを削除しない（`docker volume rm` / `docker compose down -v` / `manage.sh clean` を使わない）。
  **元のサーバーのデータは引っ越しの後も消さない**（戻り先として残す）。
- DB を手で初期化・`DROP` しない。`REINDEX` を手で実行しない。
- 暗号鍵 `~/.tax-apps/backup.key` を作り直さない。中身を画面や会話に出さない。
- `.env` を手で書き換えない（本番の DB パスワードは `ALTER ROLE` で DB 側に入っている）。
- ホストで `npm install` / `npm ci` / `npm run build` を叩かない（ビルドもテストも Docker の中）。
- アプリを `docker compose up` で直接起動しない。**起動・停止・反映は必ず `manage.sh` から**。
- 関係のない未コミット変更を修正・破棄・整形しない。`git add -A` / `git reset --hard` /
  `git checkout -- .` / `git stash`（ファイル指定なし）/ `git clean` を使わない。

---

# 第0部 リハーサル

本番の前に、**元のサーバーを止めずに**新しいサーバーを最後まで組み上げて確かめる。目的は、
Git・Docker の導入、`newpc`、IP 以外の設定、確認のどこでつまずくかを、元のサーバーを止める前に全部出すこと。
つまずいたら、そこで直してから（文書の誤りなら文書を直して push してから）やり直す。
リハーサルで新しいサーバーに入ったデータは、本番の 2-3 で最後のバックアップに置き換わる。

## 0-1. 元のサーバーで（止めない）

第1部を次のとおり行う。**1-4 の「入力を止めてもらう」・1-6（停止と IP の明け渡し）はしない**。

| 手順 | リハーサルで |
|------|--------------|
| 1-1 | そのまま行う |
| 1-2 | そのまま行う（master への更新は本番でも要るので、ここで済ませる） |
| 1-3 | IP を決めるところまで（決めた内容を報告に残す。本番で使う） |
| 1-4 | **【承認】を飛ばして**バックアップを取り、`verify` する（利用者は使い続けてよい） |
| 1-5 | そのまま行う（鍵の USB は本番でもそのまま使う） |
| 1-6 | **しない** |

## 0-2. 新しいサーバーで

第2部を次のとおり行う。

| 手順 | リハーサルで |
|------|--------------|
| 2-1・2-2 | そのまま行う |
| 2-3 | 0-1 で取ったバックアップで行う |
| 2-4 | IP 以外はそのまま行う。**IP は付けない**（同じ IP にする場合、その IP はまだ元のサーバーが使っている）。自動ログオンを使うなら、再起動の確認までここで済ませる |
| 2-5 | そのまま行う。画面は `http://localhost` と、LAN の別の PC から**新しいサーバーのいまの IP**（`Get-NetIPAddress` で調べる）で開く |
| 付録 F-1 | そのまま行う。ただし **LAN 公開（`LAN Setup`）はしない**（IP がまだ決まっていない）。確認は `localhost:3035` だけ |

終わったら、新しいサーバーのアプリを止める（利用者が間違って新しいサーバーへ入力しないように）:

```bash
docker/scripts/manage.sh stop
```

fleet-board も止める（PowerShell で、fleet-board のフォルダから）: `& '.\FleetFlow Production Stop.cmd' -NoUi`。
自動起動を登録していれば次のログオンで上がるが、LAN には公開していないので他の PC からは入力されない。

- 停止マーカーが置かれるので、自動復旧は起動し直さない。本番の 2-3 の `newpc` が起動するときにマーカーは外れる。
- 報告には、つまずいた箇所・直した内容・`newpc` から `preflight` までにかかった時間（本番の停止時間の目安）を書く。

---

# 第1部 元のサーバーで行うこと

リハーサル（第0部）を済ませていれば、1-2 は `rev-list` が `0	0` であることを確かめるだけで終わる
（その後に master が進んでいれば、もう一度 1-2 を行う）。

コマンドは **Git Bash** で、**リポジトリのルート**（`docker/scripts/manage.sh` がある階層。以下 `$REPO`）から叩く。

## 1-1. 現状を記録する（何も変えない）

```bash
cd "$REPO"
git remote get-url origin
git branch --show-current
git status --short
git log --oneline -1
git fetch -q origin && git rev-list --left-right --count HEAD...origin/master
docker/scripts/manage.sh status
ls docker/logs/app-modes/ 2>/dev/null && head -n1 docker/logs/app-modes/*
ls -la ~/.tax-apps/
powershell.exe -NoProfile -Command "Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | Format-List InterfaceAlias,IPv4Address,IPv4DefaultGateway,DNSServer; Get-NetIPAddress -AddressFamily IPv4 | Where-Object PrefixOrigin -ne WellKnown | Format-Table InterfaceAlias,IPAddress,PrefixLength,PrefixOrigin"
powershell.exe -NoProfile -Command "Get-ScheduledTask -TaskName 'Tax Apps*' | Format-Table TaskName,State"
powercfg -query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | grep -a 'AC'
powercfg -query SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE | grep -a 'AC'
powershell.exe -NoProfile -Command "(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name AutoAdminLogon -ErrorAction SilentlyContinue).AutoAdminLogon"
powershell.exe -NoProfile -Command "Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -ErrorAction SilentlyContinue | Format-List ActiveHoursStart,ActiveHoursEnd"
```

- 電源・自動ログオン・Windows Update の行は 2-4 で新しいサーバーを同じにするために使う。
  スリープと休止の値は秒の16進（`0x00000000` = しない、`0x00000e10` = 1時間）。`AutoAdminLogon` は `1` なら自動ログオン
  （空・`0` ならしていない）。Git Bash では `powercfg /query` の `/` がパスに書き換えられるので、`-query` の形で叩く。
  **`DefaultPassword` の値は読まない・表示しない**。
- `rev-list` の2つの数字は「この PC にしか無いコミット数」「master にしか無いコミット数」。
- IP の行（`IPAddress` と `PrefixOrigin`）は 1-3・1-6・2-4 で使う。`PrefixOrigin` が `Dhcp` なら自動割り当て、
  `Manual` なら固定。
- 止まる条件:
  - `origin` が取得元の URL ではない／そもそも Git のフォルダではない → 人に報告（この文書では進めない）。
  - 1つ目の数字が 1 以上（**push していないコミットがある**）→ 【判断】master へ入れるか（入れるなら AI が
    `git push origin HEAD:master` を試し、拒否されたら止まる）。入れないなら、そのコミットは新しいサーバーへ行かない。
  - `git status --short` に未コミット変更がある → 【判断】ファイルの一覧を見せて、コミットして master へ入れるか、
    新しいサーバーへは持っていかないか。**AI が勝手に破棄しない**。入れる場合は、人が選んだファイルだけを
    `git add <ファイル>` して日本語のメッセージでコミットし、push する。
  - `??` で始まる行（Git の管理外のファイル）は、コミットしない限り新しいサーバーへ行かない。
    バックアップにも入らない（入るのは [RESTORE.md の「何が戻るか」](RESTORE.md#何が戻るか) の表だけ）。
    中身を確かめて人に見せ、【判断】要るものだけ 1-5 で USB へ写すか。**消さない・勝手にコミットしない**
    （例: 画面確認の副産物のアクセシビリティツリー `resources-company.yml` は不要と判断してよい）。

## 1-2. master と同じ版へ更新する

元のサーバーは古い版のまま動いている。**新しいサーバーは最新の master で作るので、先に元のサーバーを
同じ版へ上げてからバックアップを取る**（古い版のバックアップには、新しい版が戻すもの ── 各アプリの
モードの記録・社員台帳など ── が入っていないことがある）。

【承認】「元のサーバーを master の版へ更新します。更新の前に自動でバックアップを取ります」と伝えてから、
[OTHER-PC-SETUP.md の手順A（A1〜A5）](OTHER-PC-SETUP.md#手順a-既存の-pc-を最新へ更新する) を
**そのまま**行う。要点:

- A1 で銀行分析が Django 版（2026-10-10 より前の版）と判定されたら、そこで止まる。先に
  `apps/bank-analyzer/CUTOVER.md` を人と通す。
- A2 で `git pull --ff-only origin master`。拒否されたら止まる。
- A4 で `manage.sh backup` を取ってから、変わったアプリを `apply` / `build` する。
- A5 で `status` と `preflight`。A1 で動いていたアプリが全部 healthy に戻っていること。

更新の後に確かめる:

```bash
git fetch -q origin && git rev-list --left-right --count HEAD...origin/master
```

`0	0`（master と同じ）であること。

## 1-3. 新しいサーバーの IP を決める

**ブラウザの中にだけあるデータ（相続税の申告書・減価償却資産評価の下書き、担当者名などの画面の設定）は
引き継がない**（決定済み）。書き出し・読み込みはしない。

**【判断】新しいサーバーを元と同じ IP にするか**（AI の推奨: **同じ IP にする**）。

| 選択 | 利用者の PC | やること |
|------|-------------|----------|
| **同じ IP にする（推奨）** | ブックマークがそのまま使える | 1-6 で元の IP を明け渡し、2-4 で新しいサーバーに同じ IP を付ける |
| 新しい IP にする | ブックマークの付け替えが要る | 2-5 の後、利用者へ新しいアドレスを案内する |

`PrefixOrigin` が `Dhcp`（自動割り当て）で同じ IP にする場合は、もう1つ【判断】: ルーターに
「この IP を新しい PC へ固定で割り当てる」設定（DHCP 予約）を人が入れるか、新しい PC の Windows 側で
固定 IP にするか（AI の推奨: 人がルーターの設定画面を開けるならルーター側。できなければ Windows 側で AI が設定する）。

## 1-4. 最後のバックアップを取る

【承認】「利用者全員が入力を止めましたか」と人に聞き、止めたと答えてから叩く:

```bash
docker/scripts/manage.sh backup
BACKUP=$(ls docker/backups/ | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}\.tar\.gz\.enc$' | sort | tail -1); echo "$BACKUP"
docker/scripts/manage.sh verify "$BACKUP"
cat docker/backups/.backup-key-fingerprint
```

- `$BACKUP` が**引っ越しに使うバックアップ**（例: `2026-10-21_213000.tar.gz.enc`）。名前を控える。
- `verify` が `Encrypted backup is restorable` で終わること。
- 最後の行が鍵の指紋（16桁）。2-2 で新しいサーバーの鍵と突き合わせる。
- 止まる条件: バックアップが失敗する／`verify` が失敗する（鍵を作り直さない）。

入っているもの（全アプリの一覧は [RESTORE.md の「何が戻るか」](RESTORE.md#何が戻るか)）:
PostgreSQL 4件・SQLite 3件・案件管理の Excel テンプレート・`.env` 4件・各アプリのモードの記録。
ほかのアプリは保存するデータを持たない（画面だけ）。業種目データの原本はリポジトリにあり `git clone` で付いてくる。

## 1-5. バックアップと鍵を USB へ写す

人に USB を挿してもらい、AI がドライブを探す:

```bash
powershell.exe -NoProfile -Command "Get-Volume | Where-Object { \$_.DriveLetter } | Sort-Object DriveLetter | Format-Table DriveLetter,FileSystemLabel,DriveType,@{n='FreeGB';e={[math]::Round(\$_.SizeRemaining/1GB,1)}}"
```

【判断】どのドライブを使うか（以下 `X:`）。AI は本体と同じドライブ（`C:`）を選ばない。

```bash
mkdir -p /x/tax-apps-backup
cp "docker/backups/$BACKUP" /x/tax-apps-backup/
cmp "docker/backups/$BACKUP" "/x/tax-apps-backup/$BACKUP" && echo backup-copy-ok
```

`X:\tax-apps-backup` に置くのは、新しいサーバーの `newpc` が各ドライブ直下の `tax-apps-backup` を自動で見つけるため。

鍵とリポジトリ外の設定を写す。**【判断】鍵をどこへ写すか**（AI の推奨: **バックアップとは別の USB**。
同じ USB に置くと、USB を落とした人が全部読める）。この USB は引っ越しの後も**サーバーとは別の場所に保管する
鍵の控え**になる（鍵を失うと、それまでの暗号化バックアップは全部開けない。サーバーの中にしか無い状態にしない）。以下 `Y:`:

```bash
mkdir -p /y/tax-apps-key
cp ~/.tax-apps/backup.key /y/tax-apps-key/
[ -f ~/.tax-apps/backup-settings.env ] && cp ~/.tax-apps/backup-settings.env /y/tax-apps-key/
cmp ~/.tax-apps/backup.key /y/tax-apps-key/backup.key && echo key-copy-ok
```

- `backup-settings.env` は自動バックアップの有効・間隔・保持数（ポータルのバックアップ設定画面の保存先）。
- 止まる条件: `backup-copy-ok` / `key-copy-ok` が出ない。

## 1-6. アプリを止め、IP を明け渡す

【承認】「元のサーバーのアプリを止めます。これ以降、元のサーバーへは入力できません」:

```bash
docker/scripts/manage.sh stop
docker/scripts/manage.sh status
```

- `stop` は停止マーカーを置くので、ウォッチドッグもログオン時のタスクも起動し直さない。
- 自動タスクは**まだ外さない**（新しいサーバーで問題が出たとき、ここで `manage.sh start --recorded` すれば
  すぐ元どおり使える）。外すのは第3部。

1-3 で「同じ IP にする」を選び、元の IP が `Manual`（固定）なら、新しいサーバーが同じ IP を使えるよう
元のサーバーを自動割り当てへ戻す（管理者の PowerShell。`<InterfaceAlias>` は 1-1 で控えた名前）:

```bash
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','Set-NetIPInterface -InterfaceAlias \"<InterfaceAlias>\" -Dhcp Enabled; Set-DnsClientServerAddress -InterfaceAlias \"<InterfaceAlias>\" -ResetServerAddresses; Remove-NetRoute -InterfaceAlias \"<InterfaceAlias>\" -DestinationPrefix 0.0.0.0/0 -Confirm:\$false -ErrorAction SilentlyContinue'"
```

`Dhcp` だった場合は何もしない（ルーターの予約か、2-4 で新しい PC 側を固定にする）。

ここで元のサーバーの作業はいったん終わり。USB を抜いて新しいサーバーへ持っていく（物理的な操作）。

---

# 第2部 新しいサーバーで行うこと

リハーサル（第0部）を済ませた新しいサーバーでは:

- 2-1 は飛ばす（`docker info` で Docker が動いていることだけ確かめる。止まっていれば Docker Desktop を起動する）。
- 2-2 は clone の代わりに、リポジトリで `git pull --ff-only origin master` を叩く。鍵は置いてあるので、指紋が 1-4 と同じかだけ確かめる。
- 2-3 は**本番の 1-4 で取った最後のバックアップ**で行う。戻す前の状態は `pre-restore_*` として自動で残り、`.env` は既にあるので触られない。
- 2-4 は IP だけ行い、ほかは `status` でタスクが登録済みであること、`usb --show` でコピー先が設定済みであることを確かめる。
- 2-5 はそのまま全部行う。

## 2-1. Git と Docker Desktop を入れる

この時点ではまだ Git Bash が無いので、ここだけ **PowerShell** で叩く。

```powershell
winget --version
git --version
docker --version
```

無いものだけ入れる（UAC が出たら人が「はい」を押す）:

```powershell
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
winget install --id Docker.DockerDesktop -e --source winget --accept-package-agreements --accept-source-agreements
```

- Docker Desktop は WSL2 を使う。インストーラが再起動を求めたら、人に再起動してもらい、AI の作業を
  この手順から再開する（再起動の前に、今どこまで進んだかを報告に残す）。
- Docker Desktop を起動する（`Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"`）。
  初回だけ出る**利用規約への同意**は人が押す。サインインは不要（スキップしてよい）。
- 止まる条件: `winget` が無い（Microsoft Store の「アプリ インストーラー」を人に入れてもらう）。

ここから先は **Git Bash** で叩く（`"C:\Program Files\Git\bin\bash.exe"`）。

```bash
docker info >/dev/null && echo docker-ok
```

## 2-2. リポジトリを取得し、鍵を置く

置き場所は**浅いパス**（日本語・スペースを含まない。Windows の 260 文字制限に当たると消せないファイルが残る）。
既定は元のサーバーと同じ `~/Desktop/dev/tax_apps`（違う場所にするかは【判断】）:

```bash
mkdir -p ~/Desktop/dev && cd ~/Desktop/dev
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps
git log --oneline -1
```

`git log` が元のサーバーの 1-2 の後のコミットと同じか、それより新しいこと。

人に USB を挿してもらい、1-5 と同じ方法でドライブを探して鍵を置く（`Y:` は鍵を写した USB）:

```bash
mkdir -p ~/.tax-apps
cp /y/tax-apps-key/backup.key ~/.tax-apps/backup.key
[ -f /y/tax-apps-key/backup-settings.env ] && cp /y/tax-apps-key/backup-settings.env ~/.tax-apps/
sha256sum < ~/.tax-apps/backup.key | cut -c1-16
```

- 最後の行が 1-4 で控えた指紋と同じであること。
- USB 側の `tax-apps-key` は**消さない**（サーバーの外の鍵の控え）。人に、サーバーとは別の場所へ保管してもらう。
  鍵をバックアップと同じ USB に置いてしまった場合は、【判断】別の媒体へ写し直してから、バックアップ側の USB から消すか。
- 止まる条件: 鍵が無い／指紋が違う（**新しい鍵を作らない**。作るとバックアップは開けない）。

## 2-3. 全部戻す

まず一覧だけ出す（何も変えない）。`<バックアップ>` は 1-4 で控えた名前:

```bash
docker/scripts/manage.sh newpc <バックアップ> --from 'X:\tax-apps-backup' --check
```

- 整合性の確認が通ること（失敗＝鍵がそのバックアップのものではない）。
- 一覧の「本番で起動するアプリ・開発で起動するアプリ」が、1-1 で控えた `app-modes/` と同じこと。

【承認】一覧を人に見せ、「この内容で全アプリを起動してデータを戻します（初回は 5〜15分）」と伝えてから:

```bash
docker/scripts/manage.sh newpc <バックアップ> --from 'X:\tax-apps-backup' --yes
```

中身は [RESTORE.md の手順 B](RESTORE.md#手順-b-新しい-pc-で全部戻す): `.env` を置く →
元と同じモードで全アプリを起動 → healthy を待つ → 全データを戻して件数を照合。

- 成功時: アプリごとに `件数一致` の行が出て、最後に `Failed: 0`。
- 止まる条件（手で直そうとせず報告する）: healthy にならない（データは戻さずに止まる。
  `docker/scripts/manage.sh logs <app>` の末尾を付ける）／`件数がバックアップと一致しません`。

## 2-4. 常用の設定を入れる

自動起動・自動復旧・バックアップ設定画面（どれも昇格不要。`.bat` は `pause` で止まるので `.ps1` を直接呼ぶ）:

```bash
for t in register-startup-task register-docker-watchdog-task register-backup-settings-api-task; do
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "docker/scripts/$t.ps1" || echo "FAILED: $t"
done
powershell.exe -NoProfile -Command "Get-ScheduledTask -TaskName 'Tax Apps*' | Format-Table TaskName,State"
```

外部コピー先（毎回のバックアップを別のドライブへも写す）。【判断】どのドライブにするか
（AI の推奨: 引っ越しに使った USB をそのまま挿しっぱなしにする。NAS があればそちら）:

```bash
docker/scripts/manage.sh usb --set 'X:\tax-apps-backup'
docker/scripts/manage.sh usb --show
```

IP（1-3 で「同じ IP にする」を選んだ場合）。ルーターで予約したなら、PC を再起動するか
`ipconfig /renew` で取り直して、1-1 の `IPAddress` になったことを確かめるだけ。Windows 側で固定にする場合は、
1-1 で控えた値（`<IP>` / `<PrefixLength>` / `<Gateway>` / `<DNS>`）で:

```bash
powershell.exe -NoProfile -Command "Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | Format-List InterfaceAlias,IPv4Address"
powershell.exe -NoProfile -Command "Test-Connection -Count 1 -Quiet <IP>"
```

- 2行目が `True` なら、その IP はまだ誰かが使っている（元のサーバーが明け渡していない）。止まる。

```bash
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','New-NetIPAddress -InterfaceAlias \"<InterfaceAlias>\" -IPAddress <IP> -PrefixLength <PrefixLength> -DefaultGateway <Gateway>; Set-DnsClientServerAddress -InterfaceAlias \"<InterfaceAlias>\" -ServerAddresses <DNS>'"
```

ファイアウォール（LAN の他の PC から使うため。管理者の PowerShell）:

```bash
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','New-NetFirewallRule -DisplayName \"Tax Apps Gateway (HTTP)\" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private,Domain -RemoteAddress LocalSubnet; Get-NetFirewallRule -DisplayName \"Docker Desktop Backend\" -ErrorAction SilentlyContinue | Set-NetFirewallRule -EdgeTraversalPolicy Block -RemoteAddress LocalSubnet'"
powershell.exe -NoProfile -Command "Get-NetConnectionProfile | Format-Table InterfaceAlias,NetworkCategory"
```

- アプリにはログインが無く、**送信元を LAN に絞れるのはこのルールだけ**（詳しくは README の LAN 公開の節）。
- `NetworkCategory` が `Public` なら、ポート 80 のルール（`-Profile Private,Domain`）が効かず繋がらない。
  【承認】「このネットワークをプライベートにします」と伝えてから、管理者の PowerShell で
  `Set-NetConnectionProfile -InterfaceAlias "<InterfaceAlias>" -NetworkCategory Private`。

電源とログオン。**自動起動・自動復旧のタスクはログオンしている間しか動かない**（画面をロックしていても動く。
サインアウト・スリープ・休止の間は1つも動かず、バックアップも止まる）。サーバーとして置きっぱなしにするため、
電源につないでいる間はスリープも休止もしないようにする（昇格不要。画面を消す設定はそのままでよい）:

```bash
powercfg -change standby-timeout-ac 0
powercfg -change hibernate-timeout-ac 0
powercfg -query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | grep -a 'AC'
```

- 最後の行が `0x00000000` であること。

Windows Update は再起動の後、誰かがログオンするまでアプリを上げない。1-1 で控えたアクティブ時間
（この時間帯は再起動しない）を同じにする:

```bash
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','Set-ItemProperty HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings -Name ActiveHoursStart -Value <開始時>; Set-ItemProperty HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings -Name ActiveHoursEnd -Value <終了時>'"
```

**【判断】自動ログオンにするか**（1-1 で元のサーバーが `AutoAdminLogon = 1` だったなら、元と同じにするかどうか）。

| 選択 | 停電・Windows Update の再起動の後 | 気をつけること |
|------|------------------------------|----------------|
| しない（AI の推奨） | 誰かがログオンするまでアプリは止まったまま | 再起動に気づいたらログオンする。ふだんはサインアウトせず画面ロックで離れる |
| する | 電源が入れば勝手にログオンしてアプリが上がる | PC の前に座った人は誰でもそのアカウントを使える。パスワードは Windows の中に保存される |

自動ログオンにする場合、**パスワードを入れるのは人**（AI はパスワードを入力しない）。AI は
`netplwiz` を開くところまで行い、人が「ユーザーがこのコンピューターを使うには、ユーザー名とパスワードの
入力が必要」のチェックを外してパスワードを入れる。チェックの欄が無い場合は、Windows の設定の
「アカウント → サインイン オプション」で「Windows Hello サインインのみを許可する」を人がオフにしてから開き直す。
終わったら AI が 1-1 と同じ `AutoAdminLogon` の確認で `1` になったことを確かめ、再起動して
ログオン後に `manage.sh status` で全アプリが healthy に戻ることを確かめる（【承認】再起動）。

MCP サーバー（Claude Desktop などから株式評価明細書へ数字を入れる経路）を元のサーバーで使っていた場合だけ
（1-1 の時点で人に聞く）、イメージを作り、MCP クライアントの設定を [apps/mcp-server/README.md](../apps/mcp-server/README.md) のとおり書く:

```bash
docker compose -f apps/mcp-server/docker-compose.yml --profile mcp build mcp-server
```

## 2-5. 確かめる

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh backup
docker/scripts/manage.sh drill
docker/scripts/manage.sh usb --copy-now
docker/scripts/manage.sh test
docker/scripts/manage.sh preflight
```

- `status`: 元のサーバーの 1-1 で動いていたアプリが全部 healthy、モードも同じ。自動タスクが「登録済み」。
- `backup` → `drill`: **新しいサーバー自身で取った**バックアップが、使い捨ての DB へ戻せること（最後に `Failed: 0`）。
  引っ越しに使ったのは元のサーバーのバックアップなので、新しいサーバーのバックアップが働くことはここで初めて分かる。
- `usb --copy-now`: 外部コピー先へ1本写ること。
- `test`: 失敗が無いこと（飛ばしたものは報告に書く）。
- `preflight`: ERROR が 0 であること。WARN は全文を報告する（照合順序＝チェック22 は
  [COLLATION-MIGRATION.md](COLLATION-MIGRATION.md) の別作業。自分で直さない。alpine ↔ bookworm の
  切り替えはその移行の後）。

画面の確認は AI がまず行い、最後に人が見る:

```bash
for p in / /inheritance-case-management/ /bank-analyzer/ /private-banking/ /stock-valuation-form/ /insurance-app/ /inheritance-tax-docs/ /staff-directory/; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost$p")" "$p"
done
```

- 全部 `200`（`301` / `308` はリダイレクトなので `curl -L` で確かめ直す）。
- 【判断】人に、ポータル（`http://localhost`、LAN の別の PC からは `http://<IP>/`）から各アプリを開き、
  いつものデータ（案件・顧客・評価案件など）があるかを見てもらう。

利用者への案内（AI が文面を作り、人が送る）: 新しいサーバーのアドレス（同じ IP なら「変わりません」）と、
ブラウザに保存していた入力（相続税の申告書・減価償却資産評価の下書き、担当者名など）は引き継いでいないこと。

続けて [付録 F-1](#f-1-新しいサーバーで2-5-の後) で fleet-board を立ち上げる。

---

# 第3部 引っ越しが済んだ後（元のサーバー）

**新しいサーバーで数日使い、新しいサーバーの `manage.sh status` で `backup` と `drill` の記録が `ok` になり、
外部コピー先にもファイルが増えていることを確かめてから**行う。【承認】を取ってから:

```bash
for t in register-docker-watchdog-task register-startup-task register-backup-settings-api-task; do
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "docker/scripts/$t.ps1" -Unregister || echo "FAILED: $t"
done
powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','Disable-NetFirewallRule -DisplayName \"Tax Apps Gateway (HTTP)\" -ErrorAction SilentlyContinue'"
powershell.exe -NoProfile -Command "Get-ScheduledTask -TaskName 'Tax Apps*' -ErrorAction SilentlyContinue | Format-Table TaskName,State"
```

- 最後の行に何も出ないこと。
- **元のサーバーの Docker ボリューム・`docker/backups/`・`~/.tax-apps/` は消さない**。PC を処分するかどうかは人が決める。

問題が出て元へ戻すとき: 元のサーバーで `docker/scripts/manage.sh start --recorded`（モードの記録どおりに起動）。
新しいサーバーで入力したものは元には無いので、【判断】どちらを正とするか（新しいサーバーのバックアップを
元のサーバーで `restore --all` すれば寄せられる。手順は [RESTORE.md](RESTORE.md)）。同じ IP を2台に付けないこと。

続けて [付録 F-2](#f-2-元のサーバーで第3部と同じとき) で元の fleet-board を止める。

---

# 付録 fleet-board（社用車の予約）

fleet-board（画面の名前は FleetFlow）は**別のリポジトリ**のアプリで、tax_apps の `backup` / `newpc` /
自動タスク / ゲートウェイには**含まれない**（ポート 3035 で直接開く）。この付録をしなければ新しいサーバーへは移らない。

| 項目 | 値 |
|------|----|
| リポジトリ | https://github.com/kojima1978/fleet-board （clone は `https://github.com/kojima1978/fleet-board.git`、公開） |
| 置き場所（既定） | `~/Desktop/apps/fleet-board`（tax_apps とは別の階層） |
| 手順と守ることの正 | fleet-board の `README.md` の「AIエージェントで操作する場合」（この付録は**順番と止まる条件だけ**を書く） |

- **データは移さない**。2026-10 の時点で元のサーバーにも開発 PC にもテストデータしか入っていないため、
  新しいサーバーでは空の DB から始める（初回の起動が駐車区画の初期データだけを入れる）。
  fleet-board の移行パッケージ（`Migration Export` / `Import`）は使わない。
  **本格的に使い始めた後にこの文書を使う場合は、ここを見直してから進めること**（止まる条件）。
- fleet-board のコマンドは **PowerShell で、fleet-board のフォルダから**叩く（Git Bash ではコンテナの中のパスが書き換わる）。
  `.cmd` には `-NoUi` を付ける（ダイアログもブラウザも開かず、成否は終了コードで分かる）。
- **管理者 PIN**は初回の起動で生成され、出力に出る。**AI は PIN を会話・報告に書き写さない**。
  `.env.production` の `FLEETFLOW_ADMIN_PIN` に保存されたことだけを人に伝え、人が控える。
- 元のサーバーの 1-1 で、fleet-board が元のサーバーにあるか・動いているかを人に聞いて控える
  （`docker ps --filter name=fleetflow` で `fleetflow-production-*` / `fleetflow-development-*` のどちらが動いているか）。

## F-1. 新しいサーバーで（2-5 の後）

```powershell
mkdir -Force ~/Desktop/apps | Out-Null; cd ~/Desktop/apps
git clone https://github.com/kojima1978/fleet-board.git
cd fleet-board
git log --oneline -1
& '.\FleetFlow Production Start.cmd' -NoUi
(Invoke-WebRequest http://localhost:3035/api/health -UseBasicParsing).StatusCode
```

- 最後の行が `200`。止まる条件: `Start` の終了コードが 0 でない（出力の全文と
  `& '.\FleetFlow Production Diagnostics.cmd' -NoUi` の結果を報告する）。

LAN 公開。【承認】「ファイアウォールで TCP 3035 を同じ社内サブネットからだけ許可します」と伝えてから
（UAC は人が押す。`<IP>` は 2-4 で付けた IP）:

```powershell
& '.\FleetFlow LAN Setup.cmd' -NoUi -Address <IP>
& '.\FleetFlow Production Preflight.cmd' -NoUi
```

自動起動（サインイン時に本番を起動する）。【承認】「サインイン時の自動起動を登録します」と伝えてから:

```powershell
& '.\FleetFlow Production Autostart Setup.cmd' -NoUi
```

- tax_apps の自動タスクとは別物（tax_apps のウォッチドッグは fleet-board を復旧しない）。
- 【判断】人に、LAN の別の PC から `http://<IP>:3035` を開いてもらう。

## F-2. 元のサーバーで（第3部と同じとき）

元のサーバーに fleet-board が無ければ何もしない。あれば【承認】を取ってから、そのフォルダで:

```powershell
& '.\FleetFlow Production Stop.cmd' -NoUi
& '.\FleetFlow Production Autostart Setup.cmd' -NoUi -Remove
docker ps --filter name=fleetflow --format '{{.Names}} {{.Status}}'
```

- 最後の行に何も出ないこと（開発環境で動いていた場合は `docker compose stop`。`down -v` は使わない）。
- ボリューム・フォルダ・`.env.production` は消さない（第3部と同じ）。

---

## 完了報告に含める内容

- どちらの PC で、どの部・手順まで行ったか。人に求めた判断・承認と、その答え
- 元: 1-1 の出力（`git status`・`rev-list`・`app-modes/`・`status`・IP・タスク・電源・自動ログオン・アクティブ時間）、1-2 の更新の前後のコミットと
  `apply` / `build` の結果、引っ越しに使ったバックアップの名前と `verify` の結果、鍵の指紋、
  `backup-copy-ok` / `key-copy-ok`、`stop` の結果
- 新: 入れたソフトの版、リポジトリの場所とコミット、鍵の指紋の一致、`newpc --check` の一覧、
  `newpc` の件数一致の行と `OK / Skipped / Failed`、登録したタスク・外部コピー先・ファイアウォール・IP、
  `status` / `drill` / `test` / `preflight` の要約と WARN の全文、画面の `curl` の結果
- fleet-board: clone したコミット、`Start` / `LAN Setup` / `Preflight` / `Autostart` の終了コード、
  `api/health` の結果、元のサーバーで止めたか（**管理者 PIN は書かない**）
- 止まった場合は、止まった手順・出力の全文・その時点の `manage.sh status`
