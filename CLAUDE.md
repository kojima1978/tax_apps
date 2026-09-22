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

- **`apply` は再ビルドしない**。イメージはそのままにコンテナだけ作り直すので、17アプリ分でも
  数十秒で終わる。逆にソースの変更は入らない（それは `build` と `watch` の仕事）
- **停止中のアプリには触らない**。`apply` は「反映」であって「起動」ではないので、
  `stop` した直後に叩いても停止操作を壊さない
- **`build` も `apply` も、そのアプリが今動いているモードを踏襲する**（`compose_files_for_app`）。
  以前 `build` は base の `docker-compose.yml` 固定で、**本番稼働中のアプリを黙って
  dev サーバに作り替えていた**。モードを変えたいときだけ `start --prod` か個別の `-f` で叩くこと

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
- `backup-db.bat`: Git Bash 経由で `backup.sh itcm` を呼ぶ補助ラッパー（日次タスク用。中身は通常の `backup` と同じ）
- `restore-drill.bat`: Git Bash 経由で `backup.sh drill` を呼ぶ補助ラッパー（週次タスク用）
- バックアップは `docker/backups/` を主保存先とし、最新1日分だけ `tax_apps` と同じ階層の `tax_apps_backup_latest/all-apps/` に追加コピーする
- **バックアップ対象は `backup.sh` 冒頭の4配列** (`PG_TARGETS` / `SQLITE_TARGETS` / `BIND_TARGETS` / `SETTINGS_TARGETS`) で定義する。バックアップ・リストア・ドリルはすべてここから生成されるので、DBやデータを持つアプリを足したら**必ず1行追加すること**
- **保持は日次7 + 週次4 + 月次6（GFS）**。日次7本だけでは「7日以内に気づけた障害」しか戻せない。
  取り込みミス・誤削除・論理破損は気づくまでに数週間かかることがあり、そのときには7本とも壊れた後になっている。
  週次・月次の「代表」は日次と同じ実体なので、増える容量は**日次から落ちた代表のぶんだけ**
- **外部コピー先は `~/.tax-apps/backup-external-dest`**（リポジトリ外、1行目がパス）。**未設定なら何もしない**
  （警告も記録も出さない）。設定されているのに書けないときだけ `backup-external` に記録が残る ──
  「設定したつもりで効いていない」が一番危ないため。リポジトリ外なのは**公開リポジトリに NAS 名や
  ユーザー名を載せられない**から、環境変数でなくファイルなのは**スケジュールタスクが環境変数を持たずに起動する**から

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
  `TEST_TARGETS` ↔ CI matrix を突き合わせている）。テストを足したら両方に1行
- 止まっているアプリと**本番モードのアプリは「飛ばした」扱い**（本番イメージに vitest が無い）。
  dev へ戻すのは `cd apps/<app> && docker compose up -d`（`build` はモードを踏襲するので prod のまま）

### 自動起動・自動復旧（Windows タスクスケジューラ）

「Docker がたまに立ち上がらない」の実体は、**自動で起動し直す経路が1つも生きていない**こと。
`restart: unless-stopped` は `docker compose stop` したコンテナを「手動停止」として記録するため、
`stop.bat` を一度でも押すと以降のデーモン再起動では二度と復帰しない。タスクは2つで対になっている:

- **`Tax Apps Startup`**（ログオン時・`register-startup-task.bat`）: Docker エンジンの起動を待ってから復旧
- **`Tax Apps Docker Watchdog`**（毎日 8:00 / 12:00 / 16:00 / 20:00・`register-docker-watchdog-task.bat`）: 落ちたら直す係

どちらも**昇格不要**（`RunLevel Limited`）。以前は UAC 必須だったが、それが原因で
一度消えると管理者ダブルクリックでしか戻せず、**実際に2回消えて数ヶ月間無防備だった**。
さらに `backup.sh` が毎日の実行時に両タスクの存在を確認し、消えていれば自動で再登録する。

- 復旧の実体は `manage.sh recover`。起動ロジックを PowerShell 側に複製せず、
  `APPS` 配列を唯一の定義元に保つ。`start` との違いは無人で定期的に呼ばれる前提から来る:
  **再ビルドしない / 落ちているアプリだけ / モードを踏襲 / 意図的な停止中は何もしない**
- **実行間隔は「1日4回の固定時刻」**（`register-docker-watchdog-task.ps1` の `$DailyTimes`）。
  `-Once + RepetitionInterval` を使わないのは、繰り返し間隔が「登録した瞬間」を起点にするため。
  `backup.sh` はタスク消失時に引数なしで自動再登録するので、その方式だと再登録のたびに
  実行時刻が深夜などへ勝手にずれる。Daily トリガーなら常に同じ時刻に落ちる。
  **間隔を変えるときは `$DailyTimes` の既定値を直すこと** — 登録済みタスクだけ変更しても、
  次に `backup.sh` が再登録した時点で既定値に戻る。
  4回なのは**復旧が2回かかる設計**だから: ある回で起動したコンテナはまだ healthcheck の
  `start_period` の中にいるので、unhealthy のまま固まった場合に再起動されるのは**次の回**。
  1日2回だとその2回目が最大12時間先で、立ち上がったが healthy にならないコンテナが
  ほぼ丸1日壊れたままになる。夜間の空きは機械自体が落ちているので放置する
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
- **定期的な掃除は `ops_docker_prune`**（`manage.sh prune` / 週次ドリルの最後）。
  **dangling イメージだけ**で `-a` は付けない（停止中のアプリのイメージまで消えて次の起動が再ビルドになる）。
  **ボリュームには絶対に触らない**（`docker volume prune` は停止中コンテナのボリュームを未使用と
  みなすので、アプリを止めている間に走ると DB ごと消える）。無人タスクを増やさないため
  ドリルの後ろにぶら下げている ── 増やすほど「消えたのに誰も気づかない」対象が増える
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
- `backup-db.bat`: 暗号化された全体バックアップ（PostgreSQL 4件 + SQLite 3件 + アップロード + テンプレート + `.env` 4件 + JSONエクスポート。日次7 + 週次4 + 月次6 で保持、タスクスケジューラ対応）
  - **暗号鍵 `~/.tax-apps/backup.key` の控えだけは手で取ること**。これを失うと
    `docker/backups/` の暗号化アーカイブは全部ただのゴミになる。鍵が無い状態で
    `backup.sh` を走らせても、暗号化済みのアーカイブが1つでもあれば新しい鍵を
    黙って作らずに中断する（指紋を `docker/backups/.backup-key-fingerprint` と突き合わせる）
- `restore-drill.bat`: 最新バックアップのリストア訓練（週次タスク対応）

```bash
# 全アプリ起動（開発モード）
docker/scripts/manage.sh start

# 全アプリ本番モード起動
docker/scripts/manage.sh start --prod

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
docker/scripts/manage.sh restore [dir]

# リストア訓練（使い捨てDBへ実際に復元して検証。引数省略で最新が対象）
docker/scripts/manage.sh drill

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
- Django (bank-analyzer-django): `python manage.py runserver 0.0.0.0:3007`

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
