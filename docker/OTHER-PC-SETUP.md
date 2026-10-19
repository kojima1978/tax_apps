# 別の PC での構築・更新 作業指示書

この文書は、**この PC 以外で tax_apps を動かす（新しく作る／最新へ更新する）**ための指示書です。
AI エージェントにそのまま渡して実行させる前提で書いています。
上から順に実行し、**「止まる条件」に当たったらその場で作業を止めて人に報告すること**。
推測で先へ進めない。

## 正しい取得元

| 項目 | 値 |
|------|----|
| リポジトリ | `https://github.com/kojima1978/tax_apps.git`（公開・認証不要） |
| ブランチ | `master`（作業ブランチは使わない。一人運用で master へ直接コミットしている） |

既にあるリポジトリが本物かどうかは、フォルダ名ではなく `origin` の URL で判断する。
`git remote get-url origin` が上の URL（末尾の `.git` の有無と、`git@github.com:kojima1978/tax_apps.git`
の SSH 形式は同じものとして扱う）でなければ、**そのフォルダは使わずに止まる**。

## 前提

- Windows + **Git for Windows（Git Bash）** + **Docker Desktop**（起動済みで `docker info` が通ること）。
- コマンドはすべて **Git Bash** で、**リポジトリのルート**（`docker/scripts/manage.sh` がある階層）から叩く。
  以下 `$REPO` はそのルートの絶対パスを指す。
- フォルダの場所は決め打ちしない（この文書の例は `~/Desktop/dev/tax_apps` だが、PC によって違ってよい）。

## 禁止事項

- **ローカルで `npm install` / `npm ci` / `npm run build` を叩かない**。ビルドとテストは全部 Docker の中。
  `apps/*/node_modules` がホストにできていたら、それは誤りの痕跡なので消してよい（`preflight` のチェック23）。
- Docker ボリュームを削除しない（`docker volume rm` / `docker compose down -v` / `manage.sh clean` を使わない）。
- DB を手で初期化・`DROP` しない。`REINDEX` を手で実行しない。
- 関係のない未コミット変更を修正・破棄・整形しない。`git add -A` / `git reset --hard` /
  `git checkout -- .` / `git stash`（ファイル指定なし）/ `git clean` を使わない。
- `git push` しない（この作業は取り込むだけ）。
- アプリを `docker compose up` で直接起動しない。**起動・反映は必ず `manage.sh` から**
  （本番のパスワード生成、モードの記録、bank-analyzer の external ボリュームの作成が `manage.sh` 側にある）。
  個別に `-f docker-compose.prod.yml` を並べて叩くのは特に不可（本番の DB パスワードが回らず restart ループになる）。
- 暗号鍵 `~/.tax-apps/backup.key` を作り直さない・リポジトリや USB に置かない。
- Docker Desktop の Gordon / Docker AI / CLI hooks をグローバルに無効化しない。

## 手順0. どの状況かを判定する

```bash
docker info >/dev/null && echo docker-ok
```

- 止まる条件: `docker-ok` が出ない（Docker Desktop を起動してもらう）。

リポジトリを探す。よくある場所から順に見て、**`origin` が正しい取得元のもの**だけを候補にする:

```bash
for d in ~/Desktop/dev/tax_apps ~/Desktop/tax_apps ~/dev/tax_apps ~/tax_apps /c/dev/tax_apps /c/tax_apps; do
  [ -f "$d/docker/scripts/manage.sh" ] && echo "$d  $(git -C "$d" remote get-url origin 2>/dev/null)"
done
```

| 結果 | 状況 | 進む先 |
|------|------|--------|
| 候補が1つ | 既存の PC | 手順A |
| 候補が無い | 新しい PC | 手順B |
| 候補が2つ以上 / 上の場所以外にありそう | 判断できない | **止まって人にどれを使うか聞く** |

候補が無いときは、人に「別の場所に置いていないか」を一度だけ確かめてから手順Bへ進む
（同じ PC に2つ作ると、どちらが動いているのか分からなくなる）。

---

## 手順A. 既存の PC を最新へ更新する

### A1. 現状の記録（何も変えない）

```bash
cd "$REPO"
git remote get-url origin
git branch --show-current
git status --short
git log --oneline -1
docker/scripts/manage.sh status
```

古い版で止まっている PC かどうかを見る（**pull の前に**。pull すると判定の材料が消える）:

```bash
git ls-files apps/bank-analyzer-django | head -1
docker inspect bank-analyzer --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>/dev/null
ls -d apps/bank-analyzer-django 2>/dev/null
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'medical|income-tax'
```

- **1行目が何か出る、または2行目に `bank-analyzer-django` を含む** → 銀行分析がまだ Django 版で動いている
  （2026-10-10 より前の版）。**ここで止まる**。この PC は先に `apps/bank-analyzer/CUTOVER.md`（Django 版 → React 版の切替）を
  人と一緒に通す必要がある（`git pull` も含めて、その手順書の順番で行う。ウォッチドッグの時刻を
  避けて始める必要があるので、この文書の続きでは進めない）。
- 1行目・2行目は該当せず3行目だけ出る → 切替は済んでいて、`CUTOVER.md` の最後の片付け
  （Git 管理外の `.env` と `data/` の削除）が残っているだけ。**消さずに報告だけ**して先へ進んでよい。
- 4行目が出る → 削除済みのアプリ（medical-stock-valuation / income-tax-calc）のコンテナが残っている。
  `manage.sh` の管理外なので**触らずに報告だけ**する（データのボリュームも消さない）。

- 出力は**全部控えておく**（完了報告に使う）。
- `git status` に出たファイルは記録だけして触らない。例外は A2 の bank-analyzer の compose だけ。
- `manage.sh watch` を開いている端末があれば、人に止めてもらう。

### A2. master を取り込む

更新前の位置を控えてから取り込む:

```bash
OLD=$(git rev-parse HEAD); echo "$OLD"
git switch master
git pull --ff-only origin master
git log --oneline -1
```

- 作業ブランチ（PR のブランチなど）にいた場合も `git switch master` でよい。そのブランチの内容が
  master にマージ済みなら、`--ff-only` で追いつける。
- **`apps/bank-analyzer/docker-compose.yml` が理由で pull が拒否された場合**: 以前はこの PC で
  ボリュームに `external: true` を手で足して運用していた。master にも同じ変更が入った
  （2026-10-19）ので、ローカルの差分がそれだけなら master 側を採る:

  ```bash
  git diff -- apps/bank-analyzer/docker-compose.yml
  ```

  差分が `external: true`（とコメント）の追加**だけ**なら、そのファイルだけ退避して取り込む:

  ```bash
  git stash push -m "local-bank-analyzer-external" -- apps/bank-analyzer/docker-compose.yml
  git pull --ff-only origin master
  grep -n "external: true" apps/bank-analyzer/docker-compose.yml
  ```

  `bank_analyzer_pgdata` の下に `external: true` があることを確かめたら、退避したものは戻さない
  （消さずに stash に残しておく。報告に stash があることを書く）。
  それ以外の差分が混ざっていたら止まる。
- 止まる条件: `--ff-only` が失敗する（この PC に push していないコミットがある）／
  上記以外のファイルで pull が拒否される。**どちらも自分で解消しない**。

取り込めたら構文を確かめる:

```bash
bash -n docker/scripts/manage.sh && bash -n docker/scripts/backup.sh && echo ok
```

### A3. 何が変わったかを見る

```bash
git log --oneline "$OLD"..HEAD
git diff --name-only "$OLD" HEAD | grep -vE '\.md$' | cut -d/ -f1-2 | sort -u
```

2つ目の出力から、作り直す対象を次の表で決める:

| 変わった場所 | やること |
|--------------|----------|
| `apps/<アプリ>/`（`docker-compose.yml` だけ） | `manage.sh apply <アプリ>` |
| `apps/<アプリ>/`（それ以外を含む） | `manage.sh build <アプリ>` |
| `docker/Dockerfile.vite-static` | これを使う7アプリ（tax-docs / gift-tax-simulator / retirement-tax-calc / depreciation-calc / asset-valuation / capital-gains-calc / inheritance-tax-form）を `build` |
| `docker/gateway/` | `manage.sh build gateway` |
| `docker/scripts/` | 作り直しは不要（次に叩いたときから新しい版が動く） |
| `apps/family-tree-sample/` / `apps/mcp-server/` | 何もしない（`manage.sh` の管理外） |

- `manage.sh status` で**止まっていたアプリは対象から外す**（`build` は止まっているアプリも起動してしまう）。
- `$OLD` と `HEAD` が同じ（取り込むものが無かった）なら A5 へ。

### A4. バックアップ → 反映

```bash
docker/scripts/manage.sh backup
```

- 止まる条件: バックアップが失敗する（データを変える前に止まる）。
  鍵が無い（`backup.key` が見つからない）と出たら、新しい鍵を作らせずに止まる。

A3 で決めた対象を **1つずつ**叩く:

```bash
docker/scripts/manage.sh apply <アプリ>
docker/scripts/manage.sh build <アプリ>
```

- `apply` の最後が `失敗: 0` であること。`build` は `のビルドが完了しました` まで出ること。
- **どちらもそのアプリが今動いているモード（本番 / 開発）を引き継ぐ**。モードは変えない。
- bank-analyzer の DB が作り直されると、直後の数十秒は画面の health が 503 になることがある
  （DB への再接続の待ち）。1〜2分待ってから A5 で見る。
- 止まる条件: `失敗: 1` 以上／ビルドがエラーで止まる（出力の全文を報告）。

### A5. 確認

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

- `status`: A1 で動いていたアプリが全部 healthy に戻っていること。
- `preflight`: FAIL が無いこと。WARN は**内容を報告する**（自分で直さない。特にチェック22
  ＝照合順序は `docker/COLLATION-MIGRATION.md` の別作業）。
- bank-analyzer を `apply` した場合は、出力に
  `volume "bank-analyzer-postgres" already exists but was created for project` が**出なくなった**ことも見る。

---

## 手順B. 新しい PC で構築する

### B1. 置き場所を決めて取得する

置き場所は自由。ただし次の2つを守る:

- **浅いパスにする**（例: `C:\Users\<user>\Desktop\dev\tax_apps`、`C:\dev\tax_apps`）。Windows の
  260文字制限に当たると消せないファイルが残る。日本語やスペースを含むパスも避ける。
- **親フォルダに書き込めること**。バックアップの最新1日分が `tax_apps` と同じ階層の
  `tax_apps_backup_latest/` に置かれる。

```bash
mkdir -p ~/Desktop/dev && cd ~/Desktop/dev    # 場所は PC に合わせて変えてよい
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps
git remote get-url origin
git log --oneline -1
```

### B2. 元の PC のデータを持ってくるかどうか

**人に確かめる**（AI が決めない）:

| 状況 | 進む先 |
|------|--------|
| 元の PC のバックアップ（USB など）と暗号鍵 `backup.key` の控えがあり、データごと移す | `docker/RESTORE.md` の**手順 B（新しい PC で全部戻す）**。`manage.sh newpc` が `.env` → 元のモードで起動 → 全データの順に戻す。まず `--check` で一覧だけ出して人に見せる |
| データは要らない（空で始める） | B3 |

### B3. 空で起動する

開発モードか本番モードかを人に確かめてから、どちらか1つ:

```bash
docker/scripts/manage.sh start          # 開発モード
docker/scripts/manage.sh start --prod   # 本番モード
```

- 初回は全アプリのビルドで 5〜15分かかる。
- `.env` が無いアプリは `.env.example` から作られる。本番モードでは DB のパスワードなどが
  一意の値で生成されて `.env` へ書かれる。**`.env` を手で書き換えない**（DB 側と合わなくなる）。
- bank-analyzer の DB ボリューム（`bank-analyzer-postgres`）は `manage.sh` が無ければ作る。

### B4. 自動起動・自動復旧を入れる（常用する PC のみ）

人に確かめてから、エクスプローラで `docker\scripts\` の2つをダブルクリックしてもらう（昇格不要）:

- `register-startup-task.bat`（ログオン時に起動）
- `register-docker-watchdog-task.bat`（4時間毎の復旧とバックアップ）

外部コピー先（USB / NAS）を使うなら `set-backup-usb.bat`。

### B5. 確認

```bash
docker/scripts/manage.sh status
docker/scripts/manage.sh preflight
```

ブラウザで `http://localhost` を開くとポータルが出る。

---

## 完了報告に含める内容

- どちらの手順を行ったか（A / B）と、リポジトリの場所・`origin` の URL
- 取り込む前と後のコミット（`$OLD` と `git log --oneline -1`）、取り込んだコミットの一覧
- A1 の `git status` の内容と、触らなかったこと（A2 で stash を使った場合はその名前）
- A1 の古い版の判定の結果（Django 版だったか・削除済みアプリのコンテナが残っていたか）
- 反映したアプリと、`apply` / `build` それぞれの結果
- バックアップの結果
- `manage.sh status` の要約と `preflight` の Results 行、出た WARN の全文
- 止まった場合は、止まった手順・出力の全文・その時点の `manage.sh status`
