# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要な制約

- **ローカル環境を汚さない**: `npm install`、`npm run build` 等をローカルで実行しないこと。開発・動作確認はDocker経由で行う。

## コマンド

### Docker操作（推奨）

各アプリは個別の `docker-compose.yml` を持つ。共有ネットワーク `tax-apps-network` で接続。

```bash
# 個別アプリの起動
cd apps/<app-name> && docker compose up -d

# 個別アプリの再ビルド
cd apps/<app-name> && docker compose up -d --build

# 個別アプリの本番モード
cd apps/<app-name> && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 個別アプリのログ確認
cd apps/<app-name> && docker compose logs -f
```

compose を新しく書くときは既存ファイルの**アンカーをそのまま写すこと**
（`x-logging` / `x-autoheal-labels` / `x-healthcheck-defaults` / `x-security-opts` /
`deploy.resources`）。全アプリの全サービスに `no-new-privileges` とメモリ上限が入っている。
Node.js のアプリにメモリ上限を付けるときは `NODE_OPTIONS: --max-old-space-size=…` も一緒に置く
（V8 の既定ヒープ上限はホストの物理メモリから決まるので、コンテナ側にだけ上限を掛けると
GC の前に cgroup の上限へ当たって OOM kill になりうる）。値は上限の7割程度、1コンテナで
Node を2本動かすなら合計が上限を下回るように割る。**`preflight` のチェック17が
dev の compose を毎回突き合わせる**（上限があるのに `NODE_OPTIONS` が無い／ヒープ上限が
コンテナの上限以上、のどちらでも WARN）。本番側は上限を絞り直すファイルだけ手当てが要る
（`environment` はマージされるので、base の値が残ると本番の小さい上限を超える）。
どちらも**作り直して初めて効く**ので、compose を変えたら `manage.sh apply [app]` で反映する
（`docker restart` では反映されない）。

- **`apply` は再ビルドしない**。中身は `up -d --no-build` で、compose の設定やイメージに
  差分があるコンテナだけを作り直すので、17アプリ分でも数十秒で終わる。逆にソースの変更は
  入らない（それは `build` と `watch` の仕事）。**差分が無ければ何もしないので、コンテナを
  作り直す口としては使えない** ── `docker compose exec` でコンテナの中のファイルを直接
  書き換えた場合、`apply` でも `build`（ホストのソースが同じならイメージも同じなので
  作り直されない）でも元に戻らない。書き込み層ごと捨てたいときだけ
  `cd apps/<app> && docker compose up -d --force-recreate <service>` を手で叩く
- **停止中のアプリには触らない**。`apply` は「反映」であって「起動」ではないので、
  `stop` した直後に叩いても停止操作を壊さない
- **`build` も `apply` も、そのアプリが今動いているモードを踏襲する**（`compose_files_for_app`）。
  以前 `build` は base の `docker-compose.yml` 固定で、**本番稼働中のアプリを黙って
  dev サーバに作り替えていた**。モードを変えるのは `start` の仕事で、**1アプリだけなら
  `manage.sh start --prod <app>`（dev へ戻すのは `manage.sh start <app>`）**。
  **個別に `-f docker-compose.prod.yml` を並べて叩くのは不可** ── 本番シークレットの生成と
  `ALTER ROLE`（`ensure_production_env`）が飛ぶので、本番の entrypoint が開発用の
  既定パスワードを弾いて restart ループになる。`start` はモードの記録
  （`docker/logs/app-modes/<app>`）もその場で更新するが、生の compose は更新しないため、
  記録が古いまま `build` や `recover` が走ると切り替えたはずのアプリが元のモードへ引き戻される。
  アプリ名を付けた `start` は**全体の停止マーカーを解除しない**（1アプリの起動で全アプリの
  自動復旧を再開させないため）。マーカーがある間は復旧対象外になる旨を警告で出す
- **`manage.sh` が知っている本番の形は `docker-compose.prod.yml` のオーバーレイ1つだけ**。
  本番サービスを base の中に別サービスとして建てて `profiles` で隠す形は、どの経路からも
  届かない ── bank-analyzer-django（段階8で削除済み）がそれで、`start --prod` は「起動[本番]」と出しながら
  **Django の開発サーバを上げ続けていた**（モード記録とコンテナは dev で正しく、
  出力だけが嘘をついていたので、両方を並べて見るまで気づけなかった）。
  いまは**オーバーレイが無いアプリを「本番で起動した」と書かない**（WARN を出して
  dev として上げる）し、**`preflight` のチェック18**が `APPS` 全アプリ分の
  オーバーレイの有無を毎回突き合わせる。本番モードを足すときはオーバーレイを作ること
- **本番で必須のシークレットは2つの表から用意する**（`manage.sh`）。DB のパスワードは
  **`POSTGRES_APPS`**（既存ロールへの `ALTER ROLE` も要るため）、それ以外は
  **`PROD_SECRETS`**（Django の `DJANGO_SECRET_KEY` など）。どちらも開発用の既定値のままなら
  一意の値を生成して `.env` へ書き戻す ── 各アプリの entrypoint は既定値のままの本番起動を
  拒否し、弾かれた側は restart を繰り返すだけで画面には何も出ない。`.env` のキー名が
  `POSTGRES_PASSWORD` ではないアプリは `POSTGRES_APPS` の6番目にキー名を書く

### Dockerfile（非 root）

**`dev` ステージも本番と同じ非 root で動かす**。dev だけ root だと、コンテナ内から作られた
ファイルが root 所有でホスト側に残り、本番（非 root）から触れなくなる。書き方は共通:

```dockerfile
COPY --chown=node:node . .
RUN chown node:node /app /app/node_modules   # ← -R は付けない
USER node
```

- `COPY --chown=` は**層を増やさない**（コピー時に所有者が決まる）。末尾に
  `RUN chown -R node:node /app` を置くと `node_modules` がもう1層まるごとコピーされて
  イメージが数百MB膨らむので、`chown` は**ディレクトリだけ**に絞る
- `--chown` が要るのは `next dev` が起動時に `tsconfig.json` と `next-env.d.ts` を**書き換える**から
  （root 所有のままだと `EACCES` で即落ちる）。Vite は `node_modules/.vite` だけ、
  Next standalone は `.next/cache` だけ書く
- **名前付きボリュームがイメージ側の所有者を引き継ぐのは空のときだけ**。root 時代に作られた
  既存ボリュームは root 所有のまま残るので、切り替え時に一度だけ
  `docker compose exec -u 0 <service> chown -R node:node <mount-point>` が要る
- Windows の bind mount はマウント先ルートと Windows 側で作ったファイルが `0:0` の **0777** で
  見えるので uid1000 でも書ける。ただし**root 時代にコンテナ内から作られた**ディレクトリは
  `0:0` の 0755 で残るため、そこだけ一度 `chown -R` が要る（svf の `output/industry-export` が該当した）
- 本番ステージで `/app` 配下へ何も書かないアプリは `chown` すら要らず `USER node` の1行で済む
  （svf がこれ。書き込み先は `./output` と `./prisma/industry-data` の bind mount だけで、
  entrypoint の prisma も `npx` ではなく `node_modules` を直接叩くので `$HOME/.npm` も不要）。
  **これで全アプリ・全ステージが非 root**

### ソース同期（private-banking / inheritance-case-management）

この2アプリは dev でもソースを bind mount せず、**イメージ同梱物 + `docker compose watch`** で動かす。

```bash
# 編集しながら開発する間、別ターミナルで開いておく（フォアグラウンド）
docker/scripts/manage.sh watch <app-name>
```

- watch を止めている間の変更は同期されない。その場合は `manage.sh build <app-name>` で取り込む。
- `--watch` は `--detach` と併用できないため、`start` とは別プロセスで動かす設計。
- **なぜ bind mount をやめたか**: Docker Desktop for Windows の bind mount(Windows→WSL2) は起動直後の `scandir` が EFAULT を返すことがあり、Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てる。スキャンに失敗したディレクトリ配下のルートが警告1行だけ残して丸ごと欠落し、「`✓ Ready` なのに 404」のまま稼働し続ける。コンテナ内から bind mount を無くすとこの経路自体が消える。
- 同期経路が bind mount ではなくなった代わりに、Docker はオーバーレイ上位層へ直接書き込むためコンテナ内の inotify にイベントが届かない。**ポーリングが2箇所必要**: ルート表用の `WATCHPACK_POLLING`(compose の environment) と Turbopack 再コンパイル用の `watchOptions.pollIntervalMs`(next.config.ts)。
- **スキャンガード**: 上の障害は healthcheck(`/api/health`) をすり抜けるため、両アプリの `docker-entrypoint.sh` に dev 限定のガードを入れてある。dev サーバの出力を FIFO 経由で監視し `Watchpack Error (initial scan)` を見つけたら即座に落とす → `restart: unless-stopped` で再起動。next は `exec` せず子プロセスとして起動し(PID 1 はハンドラの無いシグナルを無視するため)、`docker stop` の TERM は trap で転送している。

### manage.sh / backup.sh（全アプリ統合管理）

コマンド例は `.sh` を本体として記載する。`.bat` は Windows のダブルクリック用・タスクスケジューラ用の補助ラッパーとして扱う。

- `manage.sh`: 起動、停止、再ビルド、ログ、状態確認などの管理本体
- `backup.sh`: 全体バックアップ/リストア/リストア訓練の本体
- `manage.bat`: Git Bash 経由で `manage.sh` を呼ぶ補助ラッパー
- `backup-db.bat`: Git Bash 経由で `backup.sh itcm` を呼ぶ補助ラッパー（中身は通常の `backup` と同じ）
- `restore-drill.bat`: Git Bash 経由で `backup.sh drill` を呼ぶ補助ラッパー
  - どちらも**スケジュールタスクからは呼ばれない**（2026-10-11 に固定時刻のタスクを廃止）。
    無人実行はウォッチドッグの `due` 経由で、この2つは手で叩くときの入口
- `restore.bat`: Git Bash 経由で `backup.sh restore` を呼ぶ補助ラッパー（一覧から選ぶ）
- `restore-new-pc.bat`: Git Bash 経由で `backup.sh newpc` を呼ぶ補助ラッパー（新しい PC で全部戻す）
- **リストアはアプリ単位**（`manage.sh restore <app>|--all [backup] [--yes]`、手順書は
  **`docker/RESTORE.md`**）。そのアプリのコンテナだけ止めて戻し、**件数をバックアップと照合**
  （PG はダンプの COPY 行数と全テーブルの `count(*)`、SQLite はアプリのコンテナを借りて
  テーブル数・行数）→ 起動して healthy まで待つ。drill も同じ照合関数を使う。
  以前は全アプリを一括で上書きし、件数も見ず、再起動は「手でやって」の一言だった。
  - **`.env` は無いときだけ戻す**（`--with-env` で上書き）。本番の DB パスワードは
    `ALTER ROLE` で DB 側にあるので、`.env` だけ古い版へ戻すと繋がらなくなる。
    新しい PC は `restore --env-only` → `start` → `restore --all <backup> --yes` の順。
    **これを1本にしたのが `manage.sh newpc`（`restore-new-pc.bat`）**: 確認は `y` 1回、
    起動はバックアップに入れた各アプリのモード（`app-modes/`、2026-10-15 以降の版のみ。
    それより古い版は全部 dev / 全部 prod を聞く）で `start --recorded`、healthy を待ってから
    `restore --all`。操作ロックは検証の間だけ握り、子の `restore` / `start` はそれぞれ自分で取る。
    `--check` は一覧まで出して何も変えない（この PC での確認はこれだけにすること）
  - **場所は選べる**（`--from DIR`、端末なら一覧）。`docker/backups` / `tax_apps_backup_latest/all-apps` /
    外部コピー先 / 各ドライブ直下の `tax-apps-backup`。USB から直接戻せる。`pre-restore_*` と
    作業ディレクトリはどこから戻しても `docker/backups` に作る
  - **鍵が無ければ復号の前で止まる**（`extract_encrypted_backup`）。新しい PC の `docker/backups` は
    空なので、以前は `ensure_backup_encryption_key` が新しい鍵を黙って作り、「復号できない」と
    だけ出していた
  - 端末が無いときは `--yes` が無ければ一覧を出して中止する（AI から叩いても勝手に戻らない）。
    途中で死んでも、止めたコンテナは `on_release_operation_lock` が起動し直す
  - アプリとの対応は `PG_TARGETS` の7番目・`SQLITE_TARGETS` の6番目（`apps/` の下の名前）、
    BIND / SETTINGS はパスから引く。**自動の経路には載せない**
- バックアップは `docker/backups/` を主保存先とし、最新1日分だけ `tax_apps` と同じ階層の `tax_apps_backup_latest/all-apps/` に追加コピーする
- **バックアップ対象は `backup.sh` 冒頭の4配列** (`PG_TARGETS` / `SQLITE_TARGETS` / `BIND_TARGETS` / `SETTINGS_TARGETS`) で定義する。バックアップ・リストア・ドリルはすべてここから生成されるので、DBやデータを持つアプリを足したら**必ず1行追加すること**
- **保持は日次7 + 週次4 + 月次6（GFS）**。日次7本だけでは「7日以内に気づけた障害」しか戻せない。
  取り込みミス・誤削除・論理破損は気づくまでに数週間かかることがあり、そのときには7本とも壊れた後になっている。
  週次・月次の「代表」は日次と同じ実体なので、増える容量は**日次から落ちた代表のぶんだけ**
- **外部コピー先は `~/.tax-apps/backup-external-dest`**（リポジトリ外、1行目がパス）。**未設定なら何もしない**
  （警告も記録も出さない）。設定されているのに書けないときだけ `backup-external` に記録が残る ──
  「設定したつもりで効いていない」が一番危ないため。リポジトリ外なのは**公開リポジトリに NAS 名や
  ユーザー名を載せられない**から、環境変数でなくファイルなのは**スケジュールタスクが環境変数を持たずに起動する**から
- **LAN 公開の守りは Windows ファイアウォールだけ**。アプリにログインは無く、Docker Desktop の中継で
  nginx の `$remote_addr` は全接続が `172.18.0.1` になる（実測）ので **nginx の allow/deny は効かない**。
  80番で待ち受けるのは `com.docker.backend.exe` で、Docker が作る「Docker Desktop Backend」
  （全ポート・全送信元）が残っているとゲートウェイのルールを LocalSubnet に絞っても素通りになる。
  両方 `-RemoteAddress LocalSubnet` にしてあり、**`preflight` のチェック19**が全送信元に戻っていないか毎回見る
  （Docker Desktop の更新で作り直されうる）
- **PostgreSQL の照合順序は `C` にする**（libc 提供の `en_US.utf8` にしない）。libc 提供の照合順序だと
  文字列の並び順が「どのイメージで動かしたか」で決まり、しかも **Alpine(musl) は照合順序の
  バージョンを返さないので `datcollversion` が NULL になり、Postgres 自身の不一致検知が無効**になる
  ── `image:` を1行変えるだけで、警告ゼロのままインデックスと比較結果が食い違う。
  bank-analyzer のボリュームは PC によって glibc 生まれ（記録 2.36）と musl 生まれ（記録なし）が
  実在し、compose の `image:` をどちらに決めても片方では誤りだった。移行は
  **`manage.sh collation <app> --yes`**（アプリだけ止めて dump → `LC_COLLATE=C` の新 DB へ復元 →
  全テーブル件数照合 → 改名で入れ替え。ボリュームは消さず旧 DB は `<db>_pre_c` で残す。
  24時間以内の backup と drill の成功が前提）。**自動の経路（entrypoint / `apply` / `recover` / `due`）
  には載せない** ── 別の PC で稼働中の DB を無人で入れ替えることになる。
  **`preflight` のチェック22**が repo 配下の稼働中 PostgreSQL を見て、`C` でないものを直し方つきで WARN する
  （コンテナは `com.docker.compose.project.working_dir` ラベルで絞る。同じ PC の別プロジェクトは見ない）。
  **移した DB が libc 依存へ戻る入口は3つあり、全部塞いである**: リストアと訓練は
  `backup.sh` の `pg_create_c_database`（`TEMPLATE template0 … LC_COLLATE 'C'`）で DB を作る
  （素の `CREATE DATABASE` は template1 の `en_US.utf8` を写すので、**リストアのたびに戻っていた**。
  訓練は復元した DB が `C` でなければ失敗にする）／ 4つの compose の DB サービスは
  `POSTGRES_INITDB_ARGS` で空のボリュームを `C` で初期化する（既存のボリュームには効かない）／
  `collation` は最後に **template1 も `C` で作り直す**（Prisma の shadow DB や手で作る DB はここを写す。
  中身が plpgsql 以外にあれば触らない。新しいものを先に作って改名で入れ替えるので、template1 が
  無くなる瞬間は無い）。DB 本体が移行済みで template1 だけ残っている場合も `collation <app> --yes` で
  template1 だけ直り（アプリは止めない）、チェック22もそこまで見る。
  この開発 PC では4件とも移行済み（2026-10-14、template1 含む。旧 DB の `<db>_pre_c` も確認後に削除済み）。**別の PC の手順は
  `docker/COLLATION-MIGRATION.md`**（AI にそのまま渡せる形）。**libc 系（alpine ↔ bookworm）を変えるのは
  移行の後** ── 先に変えると `REINDEX DATABASE` が必須になる

### テスト（manage.sh test / CI）

**ローカルに `node_modules` を作らない**ため、テストは稼働中のコンテナの中で走らせる。

```bash
docker/scripts/manage.sh test              # 対象すべて
docker/scripts/manage.sh test <app-name>   # 1アプリだけ
```

- 対象は `manage.sh` 冒頭の **`TEST_TARGETS`**（`アプリ名:コンテナ名:コマンド`）
- 同じ一覧が `.github/workflows/ci.yml` の matrix と**対**になっている。手元の Docker が
  止まっていても push した時点で必ず一度は回るようにするための、もう一方の経路
- **片方だけに足すと `preflight` のチェック16が WARN を出す**（`package.json` の `test` ↔
  `TEST_TARGETS` ↔ CI matrix を突き合わせている）。テストを足したら両方に1行。
  走査は `apps/<app>/package.json` とその1つ下まで（itcm の `web/`、portal の `app/`）
- **型検査も `test` の中で走らせる**。`package.json` の `test` は
  `npm run typecheck && vitest run` の形にすること（型検査しか無いアプリは `npm run typecheck` だけ）。
  **vitest は型を見ず、dev モードは `next build` / `vite build` を通らない**ので、
  ここから呼ばなければ型エラーの出る場所が1つも無い ── private-banking は `typecheck` が
  `prisma generate` 込みで、非 root では `EACCES`（`/app/node_modules/.prisma` は root 所有）で
  落ちる状態のまま誰にも届いていなかった。**実行時に `prisma generate` しないこと** ──
  クライアントは `npm ci` の `postinstall` でイメージに入っており、実行時に作り直すと
  書き込み層に残って `build` でも `apply` でも戻らない。`typecheck` スクリプトがあるのに
  `test` が呼んでいなければチェック16が WARN を出す
- **コンテナ名を `run@<サービス名>` と書くと使い捨てコンテナで回す**（`docker compose run --rm`）。
  常駐しないアプリ（MCP サーバー）はこれしか経路が無い ── 「コンテナが動いていないので
  飛ばしました」が毎回出るだけの登録は、登録していないのと変わらない
- **本番モードのアプリも回る**。本番イメージに vitest は無いので、dev ステージを使う
  使い捨てサービス **`<アプリ名>-test`** が compose にあればそちらで回す（`profiles` を付ける）。
  **`image:` を明示して本体と別のタグにすること** ── 本体のサービスが `image:` を持たないと
  compose の自動命名で dev と runner が同じタグを共有し、次の `apply` / `recover` が
  本番コンテナを dev イメージから作り直す。`-f` は渡さず base だけで起動し（＝dev ステージ）、
  `--no-deps` で稼働中の本番コンテナには触らない。以前は「飛ばしました」と出して終わりにしていて、
  **stock-valuation-form の526件が一度も走っていなかった**
- 止まっているアプリと、`<アプリ名>-test` が無い本番モードのアプリは「飛ばした」扱い。
  dev へ戻すのは `manage.sh start <app>`（`build` はモードを踏襲するので prod のまま）
- **`package.json` を直したら `manage.sh build <app>` が要る**。ソースを bind mount している
  アプリでもマウントしているのは `src` などだけで、`package.json` はイメージ同梱。
  作り直さないとコンテナは古いスクリプトを走らせ続ける（＝直したはずの型検査が回らない）

### MCP サーバー（外部の AI ツールから書き込む）

`apps/mcp-server` は **株式評価明細書へ数字を入れるための stdio MCP サーバー**。
法人税の申告書・決算書・内訳書の PDF を Claude Desktop 側に読ませ、読み取った数字を
評価案件の欄へ入れる経路。詳細は `apps/mcp-server/README.md`。

```bash
# イメージを作る（これだけ。常駐しない）
cd apps/mcp-server && docker compose --profile mcp build mcp-server
```

- **様式の知識をこちらに持たせない**。どの欄が何かは株式評価明細書が配る辞書
  （`GET /stock-valuation-form/api/field-catalog`）だけが決め、桁区切りや `△` の付け方まで
  そこから来る。写しを持つと**様式を直したとき片方だけ古いまま黙って動く**
- **書き込みは既定で試算**（`commit: true` で確定）。辞書に無いコード・自動計算欄・
  単位違い・小数混入は弾く。円→千円の換算はしない（丸めたことが誰にも見えなくなる）
- **常駐しない**ので `APPS` ではなく `UNMANAGED_APPS`、compose のサービスは
  `profiles: ["mcp"]`。MCP クライアントが `docker run -i --rm` で起動して終われば消える。
  テストだけは `TEST_TARGETS` の `run@mcp-server-test` から使い捨てコンテナで回る
- **取込中はその案件の画面を閉じておくこと**。画面の自動保存も同じ `PUT /cases/:id` を叩き、
  `data` をまるごと置き換えるので、開いたままだとブラウザ側が後から上書きする。
  同じプロセス内の書き込み同士は `src/lock.ts` が案件ごとに直列化している
  （`set_fields` と `import_balance_sheet` を同時に呼んで第5表が丸ごと消えるのを確認済み）
- dev の株式評価明細書へ繋ぐには Vite 側に `allowedHosts: ['stock-valuation-form']` が要る
  （Vite 7 は localhost 以外の `Host` を 403 で弾く）。`vite.config.ts` はイメージ同梱なので
  変更には `manage.sh build stock-valuation-form` が必要

### 自動起動・自動復旧（Windows タスクスケジューラ）

「Docker がたまに立ち上がらない」の実体は、**自動で起動し直す経路が1つも生きていない**こと。
`restart: unless-stopped` は `docker compose stop` したコンテナを「手動停止」として記録するため、
`stop.bat` を一度でも押すと以降のデーモン再起動では二度と復帰しない。タスクは2つで対になっている:

- **`Tax Apps Startup`**（ログオン時・`register-startup-task.bat`）: Docker エンジンの起動を待ってから復旧
- **`Tax Apps Docker Watchdog`**（4時間毎・0時起点・`register-docker-watchdog-task.bat`）: 落ちたら直す係＋期限切れの無人処理を実行する係

どちらも**昇格不要**（`RunLevel Limited`）。以前は UAC 必須だったが、それが原因で
一度消えると管理者ダブルクリックでしか戻せず、**実際に2回消えて数ヶ月間無防備だった**。
さらに `backup.sh` が実行時にタスクの存在を確認し、消えていれば自動で再登録する
（対象は `OPS_SCHEDULED_TASKS` の2件）。

- **無人処理の駆動元はウォッチドッグ1つだけ**。以前は `Tax Apps Daily Backup`（3:00）と
  `Tax Apps Weekly Restore Drill`（日 4:00）が別のタスクとして登録されていたが、2026-10-11 に廃止した。
  固定時刻のタスクはこの PC では追いつき実行が当てにならず（記録に残る9回のバックアップのうち
  **定刻に走ったのは1回だけ**）、代わりにログオン直後に3つ同時に発火して**1つの操作ロックを
  取り合い、通算25回ぶんの復旧が丸ごと消えていた**。意味の無い定刻のために競走だけ起こしていた
  ので、残す理由が無い。いまは `cmd_due` が `last-run` の鮮度で判定する（下の「いつ走るか」）。
  廃止済みのタスクは **`OPS_RETIRED_TASKS`**（`lib/ops-common.sh`）に残してあり、
  **登録されたまま残っている PC では `status` と `preflight` の両方が警告する** ──
  表から消しただけでは既存の登録は黙って動き続け、「競走が1台だけ残っている」が一番たちが悪い。
  自動では消さない（無人処理がスケジュールタスクを勝手に削る形はそれ自体が怖い）ので、
  解除は `unregister-backup-task.bat` / `unregister-restore-drill-task.bat`。
  **登録する口（`register-*-task.bat`）は削除済み**で、`.ps1` は `-Unregister` 以外を拒む

- 復旧の実体は `manage.sh recover`。起動ロジックを PowerShell 側に複製せず、
  `APPS` 配列を唯一の定義元に保つ。`start` との違いは無人で定期的に呼ばれる前提から来る:
  **再ビルドしない / 落ちているアプリだけ / モードを踏襲 / 意図的な停止中は何もしない**
- **実行間隔は「4時間毎・0時アンカーの繰り返し」**（`register-docker-watchdog-task.ps1` の
  `$IntervalHours`）。一度は「1日4回の固定時刻（Daily トリガー）」にしていたが、これは誤り。
  Daily トリガーはその時刻に PC が起きていなければ `StartWhenAvailable` の追いつき実行しか
  頼りが無く、**この PC ではそれが当てにならない** — 2026-09-28 は 08/12/16/20 の4回すべてが
  追いつきもせず捨てられ、`NextRunTime` が翌日へ飛んだ。繰り返しトリガーには
  その失敗の形が無い（復帰後、間隔以内に必ず次の tick が来る）。
  アンカーを `(Get-Date).Date` = 00:00 に固定するのが要点で、これで当初 Daily へ逃げた理由
  （`-Once -At (Get-Date)` は登録した瞬間が起点なので、`backup.sh` が再登録するたびに
  実行時刻が深夜へ勝手にずれる）も同時に消える。**間隔を変えるときは `$IntervalHours` の
  既定値を直すこと** — 登録済みタスクだけ変更しても、次に `backup.sh` が再登録した時点で
  既定値に戻る。24 を割り切る値しか受け付けない（割り切れないと毎日 tick の時刻がずれる）。
  4時間なのは**復旧が2回かかる設計**だから: ある回で起動したコンテナはまだ healthcheck の
  `start_period` の中にいるので、unhealthy のまま固まった場合に再起動されるのは**次の回**。
  1日2回だとその2回目が最大12時間先で、立ち上がったが healthy にならないコンテナが
  ほぼ丸1日壊れたままになる
- **「いつ走るか」はスケジュールではなく `last-run` の記録が決める**（`backup.sh due` /
  `manage.sh due`）。ここのタスクは全部 `LogonType Interactive` なので、ログオンセッションが
  無い間は1つも動かない。「毎日 3:00」のようなトリガーは、その時刻に PC が起きていなければ
  追いつき実行が頼りで、記録に残る9回のバックアップのうち**定刻に走ったのは1回だけ**、
  2026-09-22 と 2026-09-28 は丸ごと失われた。そこでタスクの役目を
  **「ウォッチドッグを起こすこと」だけ**に縮め、期限切れ（バックアップ20時間・訓練168時間・
  掃除144時間・ループ検知3時間）のものをウォッチドッグが実行する。起こされる回数が増えても新しい成功記録があればスキップする
  ので二重には走らない（＝「日次」が「PC を使った日に1回」になる）。
  **しきい値は `OPS_WATCHED_RESULTS` の警告しきい値より必ず小さく保つこと**
  （20h < 30h / 168h < 192h / 144h < 192h / 3h < 24h）。逆転すると「警告を出してから実行する」順序になる。
  **差は「取りこぼし1回ぶん」より大きく取ること** ── 掃除は 168h 周期で動かしていたのに警告が
  192h だったため、1回落ちるだけで警告が確定する幅しか無かった
- **`due` の4項目は互いの成否に依存させない**。ドリルが失敗した回に掃除まで一緒に止まると、
  駆動元が1つしか無かった以前の形に戻る
- **実行はアラートより先**（`docker-watchdog.ps1` は `Invoke-DueUnattendedWork` →
  `Update-FailureAlert` の順）。以前はバックアップとウォッチドッグが別々のスケジューラで
  競走していて、ログオン直後のウォッチドッグが**バックアップがまだ一度も走れていない時点で**
  「バックアップ停止」をデスクトップに出していた。しきい値を緩めて隠すのではなく、
  1つのプロセスで順番を固定して競走そのものを消している
- **殺された回も必ず記録を残す**。タスクスケジューラは `ExecutionTimeLimit` を超えた回を
  コンソール制御イベントで終わらせる（`LastTaskResult=3221225786` = `STATUS_CONTROL_C_EXIT`）。
  これは **PowerShell の `finally` を飛ばす**ので、ロック解放・`last-run` への記録・
  デスクトップ警告のどれも通らない ── 2026-10-11 に4つのタスクのうち3つがこの終わり方をしていて、
  **13アプリが落ちているのに `last-run` は全部 `ok` のまま**だった。守りは3枚:
  `Console.CancelKeyPress` / `AppDomain.ProcessExit` の即時記録、**次の回が残ったロックから
  死を見つけて `killed` を記録する**（これが保証の本体。`TerminateProcess` には前者が間に合わない）、
  生きている持ち主が45分以上握っていたら `lock-stuck` を記録して警告。
  **ハンドラは必ずコンパイル済みの C#（`Add-Type`）で書くこと** ── どちらのイベントも
  ランスペースの付いていないスレッドで発火するため、**スクリプトブロックを
  デリゲートにキャストすると無言で何もしない**（実測。記録もロック解放も一切起きなかった）
- **殺された回の残骸は「次の回」が掃く**。リストア訓練は復号した平文（4つの DB の
  ダンプ・顧客名の入った JSON・`.env` 4件）を `docker/backups/.restore-work.XXXXXX` に
  展開する。後始末は `on_release_operation_lock` が `trap ... EXIT INT TERM` で消すが、
  上の `taskkill /T /F` で終わった回は **trap が1つも走らない** ── 2026-10-04 の中断で
  できた 17MB の平文が、暗号化アーカイブの隣に **9日間そのまま残っていた**（`.gitignore` の
  `docker/backups/` で git には入らないが、暗号化している意味はその1件で消える）。
  いまは `extract_encrypted_backup` の入口で `sweep_stale_restore_work` が前の回の残骸を
  掃き（`restore` と `drill` の両方がここを通る。**鍵の確認より先に**掃くので、鍵が無くて
  早期に戻る回でも平文は消える）、消した件数を drill の `last-run` の detail に `swept=N` で
  出す ── 黙って消すと「毎回殺されている」ことが誰にも見えなくなる。
- **内側のタイムアウトは外側より必ず小さく保つ**（`docker-watchdog.ps1`）。
  `AppRecoveryTimeoutSeconds`(600) + `DueWorkTimeoutSeconds`(1200) ≒ 35分 <
  ウォッチドッグのロックの陳腐化(45分) < タスクの `ExecutionTimeLimit`(90分)。
  以前は due が3600・ロックが30分で**逆転していた**ため、長いが正当な回が自分のロックを
  次の回に奪われ、ログには `Removing stale watchdog lock` が2日で4回出ていた。
  ロックの持ち主は **PID の生存も見る**（bash 側のロックは元からそうだった）。
  Windows は PID を再利用するのでプロセス名も確かめる
- **子プロセスは「木ごと」殺し、パイプは待つ前から読む**（`Invoke-ProcessWithTimeout`）。
  `Stop-Process` は直接の子（`cmd.exe`）しか終わらせず、**実際に詰まっている Git Bash の孫が
  生き残って共有の操作ロックを握り続ける**ので `taskkill /T /F`。また
  `WaitForExit` の後からパイプを読むと数KBで固まるため（`recover` は17アプリ分で遥かに超える）、
  `ReadToEndAsync()` を**待つ前に**始める。`Start-Process -PassThru` は `ExitCode` を
  返さないので使わない（実測）
- **無人で走る処理は必ず結果を1件残す**（`docker/logs/last-run/<名前>`、`ops_write_last_result`）。
  `manage.sh status` と `preflight` がこれを読んで「一度も記録が無い」「ok 以外」
  「古すぎる」を出す。**バックアップ・ドリル・復旧・ウォッチドッグの失敗が誰にも届かず
  数ヶ月見逃された**のが発端なので、無人処理を足したらここへの記録も必ず足すこと
- **見張る対象と鮮度のしきい値は `OPS_WATCHED_RESULTS` 1箇所**（`lib/ops-common.sh`）。
  以前は `status` と `preflight` が別々に同じ表を持っていて、preflight 側にバックアップの行が
  無かったため `status=failed` でも素通りしていた。**無人処理を足したらここに1行足す**
- **異常がある間はデスクトップに `TAX-APPS-ALERT.txt` を置き続ける**。記録を書いても、見えるのは
  `status` / `preflight` を叩いた人だけで、毎日失敗し続けても画面には何も出ない ── これが
  数ヶ月見逃した当のもの。中身は `last-run` から毎回作り直す**派生物**なので、直れば次の自動実行で
  勝手に消える（消し忘れの嘘が残らない）。変化したときだけトースト通知も出す（追加インストール不要）。
  **「一度も記録が無い」では出さない**（導入直後や未使用の項目で鳴り続けるため）
- **`manage.sh alert` は Docker に触れず操作ロックも取らない**。`docker-watchdog.ps1` が終了直前に
  これを呼ぶため ── 「Docker がそもそも上がらなかった」回は bash 側の処理が1つも走らないので、
  放っておくとウォッチドッグ自身の失敗が誰にも届かない
- **画面のリロードループは `manage.sh loop-check`**（無人は `due` の4番目・既定3時間）。
  2026-10-13、private-banking の画面が**毎秒4回リロードし続ける**状態が数十分続いた。連鎖は
  「コンテナの作り直し → ゲートウェイが `_next/static` に 502（HTML の `50x.html`）→ ブラウザが
  `Refused to execute script (MIME type text/html)` でレンダリングごと失敗 → Next の dev
  クライアントはそれ以降、変更通知をソフト更新ではなく `location.reload()` で処理する
  （`hot-reloader-app.js` の `SERVER_COMPONENT_CHANGES` は `hadRuntimeError` のとき完全リロード）
  → リロード後も同じエラーが再現するので抜け出せない」。JS/CSS を求めてきた相手に HTML を
  返す側は `@next_static_unavailable`（502 等）と `@next_static_missing`（404）で塞いだが、
  **これはループを止めない** ── ブラウザは 2xx でない応答の本文を `<script>` として実行しないので、
  HTML をやめてもチャンクは読めず画面は壊れる（＝ `hadRuntimeError` は同じように立つ）。
  塞いだのは「本文を読む側が HTML を解析して別のエラーに化ける」経路と、落ち方を5経路で
  揃えることだけ。そして **「なぜ dev サーバが毎回変更通知を出し続けたのか」は
  未解明のまま終わった** ── 気づいたのが数十分後で、調べようとしたときには当のコンテナを
  作り直してしまっていてログが残っていなかった。そこで検知と**証拠の採取**を無人側へ置いた。
  判定はゲートウェイのアクセスログ（`access.log` は `/dev/stdout` への symlink なので
  ファイルとしては読めず、`docker logs` から読む）で、**同じ画面が1分に60回以上**なら検知
  （実測値は345回/分。人が押せる回数とは桁が違う）。`_next/` と `/api/` と拡張子付きは数えない。
  見つけたら `docker/logs/reload-loop/<日時>/` にゲートウェイのログとそのアプリの dev サーバの
  ログを丸ごと残す（10件まで・`logs/` は git 管理外）。**窓は5時間**でウォッチドッグの間隔
  （4時間）より広く取ってあるので、tick と tick の間だけ起きて収まったループも拾える代わりに、
  **直ったあとも窓から外れるまで警告が残る**（見逃すより遅れて消えるほうを選んでいる）。
  URL からアプリを引く表は持たず `upstreams.conf` の `$app_backend` レジストリを読む
- **定期的な掃除は `ops_docker_prune`**（手で叩くなら `manage.sh prune`、無人は `due` の3番目）。
  **dangling イメージだけ**で `-a` は付けない（停止中のアプリのイメージまで消えて次の起動が再ビルドになる）。
  **dangling の保持は168h**（`TAX_APPS_PRUNE_IMAGE_UNTIL`）── 掃除の周期（144h）より長いので
  どの dangling も最低1周は残る。以前は720hで、**248件・UNIQUE SIZE 18.3GB を1ヶ月抱えていた**。
  **ボリュームには絶対に触らない**（`docker volume prune` は停止中コンテナのボリュームを未使用と
  みなすので、アプリを止めている間に走ると DB ごと消える）。専用のスケジュールタスクは作らず
  既に起きているウォッチドッグに乗せる ── 無人タスクを増やすほど「消えたのに誰も気づかない」
  対象が増える
- **ビルドキャッシュの prune に絞り込みのフラグを渡してはいけない**。Docker Desktop の
  builder（driver=docker）では `--max-used-space` / `--reserved-space` / `--filter until=…`
  のどれを渡しても**何も消さずに終了コード 0 を返す**（実測）。ここは
  `--max-used-space 10GB` だったため、**毎回成功を記録しながら1バイトも消さず 61.22GB まで
  積み上がっていた**（素の `docker builder prune --force` に替えた途端 19.06GB 消えた）。
  素の prune は刻めないので、**`docker buildx du` の Private が上限
  （`TAX_APPS_PRUNE_CACHE_MAX` 既定10GB）を超えたときだけ丸ごと落とす**形にしてある。
  見るのは Reclaimable ではなく **Private** ── Reclaimable はイメージと共有している層を
  含むので、落としてもそのぶんは減らない（`docker system df` の Build Cache の
  RECLAIMABLE 列と一致するのは Private）。対話式の `clean-cache` も同じ理由でフラグ無し
- **消した量は `OPS_PRUNE_DETAIL` に入れて `last-run` の detail に残す**
  （`manage.sh status` に `images 0B / cache 68.47MB kept` のように出る）。
  成功したかどうかだけでは、上の「フラグを渡すと無言で何もしない」が見えない
- **終了コードを握り潰す書き方をしないこと**。`docker ... | sed` のようなパイプは
  `set -o pipefail`（`manage.sh` / `backup.sh` の両方で有効）が無ければ sed の
  終了コードしか返さない。有効なので現状は検知できているが、`lib/ops-common.sh` 自身は
  `set` を持たない（呼び出し側のオプションに乗っている）ので、確実にしたいときは
  コマンド置換で受けてから `|| rc=$?` で見るか `PIPESTATUS` を読む
- **無人処理が「失敗したのに ok」と書ける経路を残さないこと**。終了コードで見分けられない
  失敗があるなら、件数を detail に書いてウォッチドッグ側で見る。`manage.sh recover` が
  これで、1アプリの `docker compose up` が失敗してもコマンド自体は成功するため
  **`failed=N` を summary 行に出して**ウォッチドッグが拾う（以前は err を1行出すだけで、
  記録には「復旧しました」しか残らなかった）。同じ形の見落としを
  `Restart-UnhealthyTaxAppsContainers`（再起動の失敗・4時間後もまだ unhealthy）と
  `ensure_watchdog_task`（タスクの再登録の失敗）にも足してある ── 後者は
  **数ヶ月タスクが消えたままだった当のもので、失敗は watchdog.log の1行だけだった**
- **「直し方」まで出さない失敗は4時間毎に同じ失敗を積み上げるだけ**。`recover` は
  `up -d --no-build` なので、**イメージそのものが無いアプリは何回走っても直らない**。
  2026-10-11 は13アプリがこれ（コンテナもイメージも消えていた）で、`recover` を呼べたとしても
  失敗を13回積むだけだった。いまは先に `docker compose config --images` と
  `docker image inspect` で見分け、`RECOVER_RESULT` に **`noimage=N`** を足して
  「`build <app>` が要る」と名前で出す（ウォッチドッグもこの内訳を見てアラートに書く）。
  **`up` が 0 を返しても起動しているとは限らない**（作成で止まる・すぐ落ちる）ので、
  `ps --status running --services` の件数を定義サービス数と突き合わせてから ok にする
- **`preflight` のチェック20は「上がっているべきものが上がっているか」を見る**。
  2026-10-11、13アプリがコンテナもイメージも無い状態で落ちていたのに **preflight の
  全項目が通った** ── この向きの項目が1つも無かった。モードが記録されているアプリ
  （一度も `start` していないものはチェック15の担当）について稼働サービス数を数え、
  落ち方を3つに分けて直し方ごと出す: イメージが無い（`build` が要る）／作成のまま
  （`up -d --force-recreate`）／ただ落ちている（`recover` で足りる）。
  停止マーカーがある間は何も言わない。**チェック21**はウォッチドッグのロックが
  死んだプロセスのまま残っていないかを見る（残っている間、自動復旧は1回も走っていない）
- **無人処理を「別の無人処理の付属物」にしてはいけない**。掃除は長らく `cmd_drill` の
  最後の1行だった。ドリル自身の記録はその手前で書かれるので、2026-10-04 にドリル成功の直後
  （ビルドキャッシュの削除中）にプロセスが落ちたとき、**ドリルは ok のまま掃除だけ記録を失った**。
  そして掃除を呼ぶ経路が「次に成功する週次ドリル」しか無かったため、4時間毎にウォッチドッグが
  起きているのに**9日間直せなかった**（手で叩く以外に消す手段が無い警告が9日間デスクトップに
  残った）。いまは `cmd_due` の独立した項目（`DUE_PRUNE_HOURS` 既定144h）なので、中断されても
  数時間後の次の回で再試行される。**警告しきい値との差も周期より大きく取ること** ──
  以前は駆動元が 168h 周期で警告が 192h、つまり1回取りこぼすだけで警告が確定する幅だった
- **共通処理は `docker/scripts/lib/ops-common.sh` に置く**（色・ログローテーション・
  直近結果・操作ロック・`to_win_path` / `task_exists`）。`manage.sh` と `backup.sh` の
  両方から source する。**同じ実装を2つ持つとロックの意味が無くなる**（別々のロックを
  取り合う形になる）ため、ロック周りは特にここ以外に書かないこと
- **操作ロックは「待ってから諦める」**（`acquire_operation_lock <action> [秒]`）。
  以前は取れなければ即座に終了していたので、ログオン直後に溜まったタスクが
  衝突して**週次のドリルが2回連続で丸ごと飛んでいた**。端末から手で叩いたときは
  待たず（`ops_default_lock_wait` が `[[ -t 1 ]]` で判定）、無人実行のときだけ待つ
- **モードはアプリ単位で記録する**（`docker/logs/app-modes/`）。このリポジトリは実際には
  混在稼働していて、一部のアプリだけ個別に `-f docker-compose.prod.yml` 付きで起動されている。
  全体で1つのモードにすると、落ちた本番アプリを dev サーバとして作り直してしまう。
  判定は推測ではなく `com.docker.compose.project.config_files` ラベル（起動に使った `-f` の一覧そのもの）。
  **落ちてからでは調べようがない**ので、`status` と `recover` が動いているうちに毎回採取する
- `stop` / `down` / `clean` は停止マーカー（`docker/logs/tax-apps-stopped-intentionally`）を置く。
  これが無いと `stop.bat` の直後にウォッチドッグが起動し直して停止操作が成立しない。`start` で解除
- ウォッチドッグとの連絡は `RECOVER_RESULT` の1行のみ **ASCII** で出す（日本語ログ行はコンソールの
  コードページ次第で拾えなくなるため）。**復旧しなかった場合は必ず WARN でログに残す** —
  黙って何もしない状態こそが今回数ヶ月見逃された当のもの
- 未登録・モード未記録は `manage.sh status` と `preflight` の両方に出る

ヘルパースクリプト（ダブルクリック用）:
- `start-prod.bat`: ワンクリックで本番モード起動
- `stop.bat`: ワンクリックで停止
- `status.bat`: ワンクリックで状態確認
- `register-startup-task.bat` / `register-docker-watchdog-task.bat`: 自動起動・自動復旧タスクの登録
  （`unregister-*.bat` で解除）
- `backup-db.bat`: 暗号化された全体バックアップ（PostgreSQL 4件 + SQLite 2件 + アップロード + テンプレート + `.env` 4件 + JSONエクスポート。日次7 + 週次4 + 月次6 で保持。無人実行はウォッチドッグの `due` 経由で、これは手動の入口）
  - **暗号鍵 `~/.tax-apps/backup.key` の控えだけは手で取ること**。これを失うと
    `docker/backups/` の暗号化アーカイブは全部ただのゴミになる。鍵が無い状態で
    `backup.sh` を走らせても、暗号化済みのアーカイブが1つでもあれば新しい鍵を
    黙って作らずに中断する（指紋を `docker/backups/.backup-key-fingerprint` と突き合わせる）
- `restore-drill.bat`: 最新バックアップのリストア訓練（無人実行は `due` 経由。これは手動の入口）

```bash
# 全アプリ起動（開発モード）
docker/scripts/manage.sh start

# 全アプリ本番モード起動
docker/scripts/manage.sh start --prod

# 1アプリだけモードを切り替えて起動（混在稼働はこちら）
docker/scripts/manage.sh start --prod <app-name>
docker/scripts/manage.sh start <app-name>

# 特定アプリのみ再ビルド（稼働中のモードを踏襲）
docker/scripts/manage.sh build <app-name>

# compose の変更をコンテナへ反映（再ビルドなし・引数なしで全アプリ）
docker/scripts/manage.sh apply [app-name]

# ソース変更をコンテナへ同期（対応アプリのみ・フォアグラウンド）
docker/scripts/manage.sh watch <app-name>

# ログ確認
docker/scripts/manage.sh logs <app-name>

# 全アプリ停止
docker/scripts/manage.sh stop

# 落ちているアプリだけ起動し直す（ウォッチドッグ用・再ビルドなし）
docker/scripts/manage.sh recover

# 状態確認
docker/scripts/manage.sh status

# テスト（稼働中のコンテナの中で実行・引数省略で対象すべて）
docker/scripts/manage.sh test [app-name]

# 全体バックアップ / リストア
docker/scripts/manage.sh backup
docker/scripts/manage.sh restore [app|--all] [backup] [--yes]   # docker/RESTORE.md

# リストア訓練（使い捨てDBへ実際に復元して検証。引数省略で最新が対象）
docker/scripts/manage.sh drill

# 期限切れの無人処理だけ実行（バックアップ20時間・訓練168時間・掃除144時間・ループ検知3時間。ウォッチドッグ用）
docker/scripts/manage.sh due

# 画面のリロードループの検知（ゲートウェイのログを読むだけ・ロックも取らない）
docker/scripts/manage.sh loop-check

# 無人向けの掃除（確認なし・ボリュームには触らない）
docker/scripts/manage.sh prune

# デスクトップの警告ファイルを作り直す（Docker 不要・ロックも取らない）
docker/scripts/manage.sh alert
```

### 個別アプリのスクリプト（Docker内で実行）
- Next.js系 / Vite系: `npm run dev` / `npm run build` / `npm run lint`
- 案件管理 (inheritance-case-management/web): `npm run dev` / `npm run db:generate` / `npm run db:push`
- 確定申告書類 (tax-docs): Vite フロントエンドのみ（バックエンドなし）
- 株式評価明細書 (stock-valuation-form): `npm run dev:all`（Vite 3014 + API 3114 を並走）/ `npm run build` + `npm run build:server`。本番は Node が 3014 で両方を配信
  - 業種目データの原本は `prisma/industry-data/*.json`（Git 管理）。起動時のシードが**未登録の年分だけ**取り込むので、`git pull` した環境は起動するだけで復元される。画面から年分を足したり訂正したら `docker compose exec stock-valuation-form npm run industry:save` で同ディレクトリへ書き戻してコミットすること（書き戻さないと Docker ボリュームの中だけの存在になる）。**個々の会社の情報はDBにしか無く、ここには入らない**（リポジトリは公開）
  - **登録済みの年分をアーカイブの内容で入れ直す**: `docker compose exec stock-valuation-form npm run industry:reseed`（引数なしは**何をするかの一覧だけ**でDBは変わらない。実行は `-- --yes`、年を絞るなら `-- 2026 --yes`）。`git pull` で `prisma/industry-data` の中身が直っても起動時のシードは登録済みの年分を読み飛ばすので、その反映口がこれ。**触るのはアーカイブのある年分だけ**で、ファイルの無い年分（画面から登録して `industry:save` していないもの）には手を出さず一覧に「触れない」として出す。起動時に環境変数で全年分を消して入れ直す仕組み（`SEED_FORCE`）は廃止した ── 環境変数はコンテナに残り続け（`docker compose restart` は environment を評価し直さない）、再起動のたびに全消し→再取込が走るため
  - **公表PDF（国税庁の別紙）からの取込**: PDFを `./output` に置いて `docker compose exec stock-valuation-form npm run industry:pdf -- output/<file>.pdf`。奇数ページ＝業種目マスタ＋B・C・D＋前年11月分・12月分、偶数ページ＝当年の各月株価（上段）と2年平均（下段）という構造を座標で読み、アーカイブと同じ形のJSONにする。**登録済みアーカイブとの差分まで出す**のが本体で、「増えた月」と「名称・内容・B・C・Dが改訂されていないこと」を確かめてから次に叩くコマンドを指示する。別紙は毎月更新されるが増えるのは月の列だけなので、通常は `-- <pdf> --only-new-months` で増えた月だけのファイルを作り → `industry:import -- <file> --months-only` → `industry:save`。マスタが改訂されていた場合だけアーカイブを差し替えて `industry:reseed`。変換は `pdfjs-dist`（devDependencies）に依存するので**開発イメージでしか動かない**（本番は `npm install --omit=dev`）
  - 業種目データの持ち運び: `npm run industry:export`（全年分を `output/industry-export/` へ。手元への控え用）/ `npm run industry:import -- <file>`。管理画面の「JSONで入出力」タブと同じ経路。「年分だけを消す」APIは無いので、登録済みの年分へは `--months-only` で月別株価だけ上書きする（まるごと入れ直すなら上の `industry:reseed`）
- 銀行取引分析 (bank-analyzer): `npm run dev:all`（Vite 3007 + API 3107 を並走）/ `npm run build` + `npm run build:server`。本番は Node が 3007 で両方を配信
  - Django 版の置き換え。段階7（2026-10-10）で名前・ポート・DB ボリュームをそのまま引き継ぎ、段階8（同日）で Django 版のディレクトリと DB の `auth_*` / `django_*` を削除した（コードは `4962355e` に残る）。まだ Django 版で動いている別の PC の切替手順は `apps/bank-analyzer/CUTOVER.md`
  - **DB は Django が作った表（`analyzer_*`）をそのまま使う**。スキーマの変更はマイグレーションを手で書いて `migrate deploy`（entrypoint が起動時に流す）。`prisma db push` / `migrate dev` は本番 DB に叩かない
  - 夜間バックアップの JSON は `npm run backup:json`（出力先は環境変数 `OUTPUT_DIR`）。`backup.sh` が稼働中のコンテナの中で呼ぶ。**ファイル名と中身は Django 版の管理コマンドと同じ形に保つこと** ── 過去のバックアップと同じフォルダに並び、どちらも画面の「JSONから復元」で読める（`version` は `1.0` / `1.1` の両対応）

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
