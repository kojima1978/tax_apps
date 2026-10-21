# 税務業務アプリケーション統合環境

税務関連の各種業務アプリケーションを統合管理する環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 各アプリが独自の `docker-compose.yml` を持ち、`manage.sh` で一括管理
- **Nginx Gateway**: リバースプロキシによるルーティング（ポート80）
- **manage.sh**: 全アプリの起動・停止・ログ確認等を一括管理する本体スクリプト
- **backup.sh**: 全体バックアップ/リストア/リストア訓練の本体（`.bat` は Windows 補助ラッパー）

### アプリケーション一覧

| アプリ名 | パス | ゲートウェイURL | ポート | 技術スタック | 説明 |
|---------|------|----------------|--------|-------------|------|
| ポータル | `/` | http://localhost/ | 3000 | Next.js (静的出力) + nginx | ランチャーダッシュボード（`docker/gateway` でビルド） |
| 相続税計算 | `/inheritance-tax-app/` | http://localhost/inheritance-tax-app/ | 3004 | Vite + React + Express | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax-simulator/` | http://localhost/gift-tax-simulator/ | 3001 | Vite + React | 贈与税・不動産取得税・登録免許税シミュレーション |
| 退職金税額計算 | `/retirement-tax-calc/` | http://localhost/retirement-tax-calc/ | 3013 | Vite + React | 退職金の税額計算シミュレーション |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | http://localhost/inheritance-tax-docs/ | 3003 | Vite + React + Express + SQLite | 相続税申告の必要書類ガイド |
| 相続税の申告書 | `/inheritance-tax-form/` | http://localhost/inheritance-tax-form/ | 3021 | Vite + React | 相続税の申告書 全24様式の作成・印刷 |
| 確定申告必要書類 | `/tax-docs/` | http://localhost/tax-docs/ | 3002 | Vite + React | 確定申告書類管理 |
| 案件管理 | `/itcm/` | http://localhost/itcm/ | 3020/3022 | Next.js + Hono + Prisma + PostgreSQL | 相続税案件管理 |
| 譲渡所得税計算 | `/capital-gains-calc/` | http://localhost/capital-gains-calc/ | 3019 | Vite + React | 不動産・株式等の譲渡所得税シミュレーション |
| 減価償却計算 | `/depreciation-calc/` | http://localhost/depreciation-calc/ | 3015 | Vite + React | 中古資産の耐用年数・簿価計算 |
| 減価償却資産評価 | `/asset-valuation/` | http://localhost/asset-valuation/ | 3017 | Vite + React | 相続税申告の減価償却資産評価 |
| 株式評価明細書 | `/stock-valuation-form/` | http://localhost/stock-valuation-form/ | 3014/3016 | Vite + React + Hono + Prisma + PostgreSQL | 取引相場のない株式の評価明細書 |
| 銀行分析 | `/bank-analyzer/` | http://localhost/bank-analyzer/ | 3007 | Vite + React + Hono + Prisma + PostgreSQL | 預金移動分析 |
| 保険管理 | `/insurance/` | http://localhost/insurance/ | 3030 | Next.js (standalone) + SQLite | 保険契約の管理 |
| 社員台帳 | `/staff-directory/` | http://localhost/staff-directory/ | 3031 | Vite + React + Express + SQLite | 社員・部署・事務所の情報（各アプリが台帳IDで参照） |
| ファミリーB/S | `/private-banking/` | http://localhost/private-banking/ | 3025/3026 | Next.js + Prisma + PostgreSQL | 資産承継のファミリーB/S |

### 本番モード イメージサイズ

| 種別 | アプリ | イメージサイズ（目安） |
|------|--------|--------------|
| nginx (静的) | Vite 系7アプリ + portal + gateway | ~93-104MB |
| Node（Express / Hono / Next.js） | 上記以外 | 数百MB（`docker images` で確認） |

## ディレクトリ構造

```
tax_apps/
├── apps/                              # アプリケーション群
│   ├── portal/app/                    # ポータルランチャー（Next.js 静的出力。ビルドは docker/gateway）
│   ├── inheritance-tax-app/           # 相続税計算 (Vite + Express)
│   ├── gift-tax-simulator/            # 贈与税計算 (Vite)
│   ├── retirement-tax-calc/           # 退職金税額計算 (Vite)
│   ├── inheritance-tax-docs/          # 相続税申告書類案内 (Vite + Express + SQLite)
│   ├── inheritance-tax-form/          # 相続税の申告書 全24様式 (Vite)
│   ├── insurance-app/                 # 保険管理 (Next.js + SQLite)
│   ├── tax-docs/                      # 確定申告必要書類 (Vite)
│   ├── capital-gains-calc/            # 譲渡所得税計算 (Vite)
│   ├── staff-directory/               # 社員台帳 (Vite + Express + SQLite)
│   ├── depreciation-calc/             # 減価償却計算 (Vite)
│   ├── asset-valuation/               # 減価償却資産評価 (Vite)
│   ├── stock-valuation-form/          # 株式評価明細書 (Vite + Hono + Prisma + PostgreSQL)
│   ├── inheritance-case-management/   # 案件管理 (Next.js + Prisma + PostgreSQL)
│   ├── private-banking/               # ファミリーB/S (Next.js + Prisma + PostgreSQL)
│   ├── bank-analyzer/                 # 銀行分析 (Vite + Hono + Prisma + PostgreSQL)
│   ├── mcp-server/                    # 株式評価明細書へ書き込む MCP サーバー（常駐しない）
│   └── family-tree-sample/            # 家系図の試作（manage.sh の管理対象外）
├── docker/                            # Docker共通設定
│   ├── Dockerfile.vite-static         # Vite 系7アプリ共通の Dockerfile
│   ├── gateway/                       # Nginx Gateway + Portal の docker-compose.yml
│   ├── scripts/                       # 管理スクリプト
│   │   ├── manage.sh                  # 管理スクリプト本体（起動・停止・ログ等）
│   │   ├── manage.bat                 # Windows 補助ラッパー（ダブルクリックで開発モード起動）
│   │   ├── backup.sh                  # 全体バックアップ/リストア/リストア訓練の本体
│   │   ├── lib/                       # 共通処理（ops-common.sh: ロック・直近結果等 / compose-build.sh）
│   │   ├── docker-watchdog.ps1        # 自動復旧＋期限切れの無人処理（4時間毎）
│   │   ├── register-*-task.bat        # 自動起動・ウォッチドッグのタスク登録（unregister-*.bat で解除）
│   │   ├── start-prod.bat             # ワンクリック本番モード起動
│   │   ├── stop.bat                   # ワンクリック停止
│   │   ├── status.bat                 # ワンクリック状態確認
│   │   ├── backup-db.bat              # 手動バックアップ（backup.sh itcm を呼ぶ。中身は通常の backup と同じ）
│   │   ├── restore-drill.bat          # backup.sh drill を呼び出す Windows 補助ラッパー
│   │   ├── restore.bat                # backup.sh restore を呼び出す Windows 補助ラッパー（一覧から選ぶ）
│   │   ├── restore-new-pc.bat         # backup.sh newpc を呼び出す Windows 補助ラッパー（新しい PC で全部戻す）
│   │   └── set-backup-usb.bat         # backup.sh usb を呼び出す Windows 補助ラッパー（外部コピー先を選ぶ）
│   ├── specs/                         # 管理スクリプトの仕様書
│   ├── logs/                          # 無人処理の記録・モード記録（git管理外）
│   ├── backups/                       # バックアップ保存先（git管理外）
│   ├── RESTORE.md                     # リストアの手順書（新しい PC で全部戻す手順を含む）
│   ├── COLLATION-MIGRATION.md         # 別の PC で照合順序を C へ移す手順書
│   ├── OTHER-PC-SETUP.md              # 別の PC の更新・新規構築（AI にそのまま渡せる形）
│   └── README.md                      # Docker 環境の詳しい説明
├── nginx/                             # Nginx Gateway設定（gateway のビルドコンテキスト）
│   ├── nginx.conf                     # メイン設定
│   ├── default.conf                   # サーバーブロック定義
│   ├── includes/                      # 分割設定ファイル
│   │   ├── upstreams.conf             # アップストリーム定義（アドレスレジストリ）
│   │   ├── maps.conf                  # マッピング定義
│   │   ├── proxy_params.conf          # プロキシパラメータ
│   │   └── rate_limit_*.conf          # レートリミット設定
│   └── html/                          # エラーページ
├── .gitignore
├── AGENTS.md                          # AI エージェント向けの入口（中身は README の「AI で操作する」へ案内するだけ）
├── CLAUDE.md                          # Claude Code 向けの詳しい制約・設計の記録
└── README.md
```

### 各アプリのDocker構成

各アプリは独自の `docker-compose.yml` を持ちます:

```
apps/<アプリ名>/
├── docker-compose.yml          # 開発用（ソースマウント）
├── docker-compose.prod.yml     # 本番用オーバーライド（runner ステージ、リソース制限）
├── Dockerfile                  # マルチステージビルド（dev / builder / runner。Vite 系7アプリは docker/Dockerfile.vite-static）
└── ...
```

## セットアップ

### 前提条件
- [Git for Windows](https://gitforwindows.org/)（`.bat` 補助ラッパーが Git Bash を使用）
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 一括起動（推奨）

```bash
# 1. リポジトリをクローン
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps
```

> 別の PC を更新する・新しく構築するときは [docker/OTHER-PC-SETUP.md](docker/OTHER-PC-SETUP.md)（AI にそのまま渡せる手順書）を使ってください。

#### かんたん操作（ダブルクリック）

| 操作 | スクリプト | 場所 |
|:-----|:---------|:-----|
| 開発モード起動 | `manage.bat` | `docker\scripts\manage.bat` をダブルクリック |
| 本番モード起動 | `start-prod.bat` | `docker\scripts\start-prod.bat` をダブルクリック |
| 停止 | `stop.bat` | `docker\scripts\stop.bat` をダブルクリック |
| 状態確認 | `status.bat` | `docker\scripts\status.bat` をダブルクリック |
| 手動バックアップ（自動はウォッチドッグが実行） | `backup-db.bat` | `docker\scripts\backup-db.bat` をダブルクリック |
| 新しい PC で全部戻す | `restore-new-pc.bat` | `docker\scripts\restore-new-pc.bat` をダブルクリック（手順は `docker/RESTORE.md`） |
| 外部コピー先（USB）を選ぶ | `set-backup-usb.bat` | USB を挿して `docker\scripts\set-backup-usb.bat` をダブルクリック |

#### Git Bashでの操作

```bash
# 開発モードで全アプリを起動
./docker/scripts/manage.sh start

# 本番モードで全アプリを起動
./docker/scripts/manage.sh start --prod
```

> PostgreSQL を使う4アプリの `.env` は `.env.example` から自動作成されます。本番モードで起動すると、開発用の既定パスワードのままなら `manage.sh` が一意の値を生成して `.env` へ書き戻します。

ブラウザで http://localhost/ にアクセスしてポータルを開きます。

> **注意**: 各アプリへはポータル経由またはゲートウェイURLでアクセスしてください。ポート番号を指定して直接アクセスすると、アプリケーション間リンクや静的ファイルの読み込みが正常に動作しない場合があります。

### 社内LAN経由のアクセス

同一LAN内の他PCからアクセスする場合:

1. **ホストPCのIPアドレスを確認**:
   ```bash
   ipconfig
   # 例: 192.168.100.129
   ```

2. **Windowsファイアウォールでポート80を許可**（管理者権限のPowerShellで実行）:
   ```powershell
   New-NetFirewallRule -DisplayName "Tax Apps Gateway (HTTP)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private,Domain -RemoteAddress LocalSubnet
   ```
   アプリにはログインが無く、**送信元を絞れるのはこのルールだけ**（Docker Desktop の中継で
   nginx からは全接続が同じアドレスに見えるため、nginx 側の allow/deny は効かない）。
   `-Profile` と `-RemoteAddress` を外すと、外出先の公衆 Wi-Fi でも同じ店の誰からでも開ける。
   事務所のネットワークが「パブリック」と判定されていると繋がらないので、その場合は
   Windows の設定でそのネットワークを「プライベート」にする。

3. **LAN内の他PCからアクセス**:
   ```
   http://<ホストPCのIPアドレス>/
   http://<ホストPCのIPアドレス>/inheritance-tax-app/
   http://<ホストPCのIPアドレス>/bank-analyzer/
   ```

> **注意**: ホストPCのIPアドレスが変わった場合は、ブラウザのURLを新しいIPに変更するだけで対応できます（Docker・nginx・アプリ側の設定変更は不要）。

### manage.sh コマンド一覧

```
./docker/scripts/manage.sh start                全アプリを開発モードで起動
./docker/scripts/manage.sh start --prod         全アプリを本番モードで起動（ビルド付き）
./docker/scripts/manage.sh start [--prod] <app> 1アプリだけモードを切り替えて起動（混在稼働はこちら）
./docker/scripts/manage.sh stop                 全アプリを停止
./docker/scripts/manage.sh down                 全アプリを停止しコンテナを削除
./docker/scripts/manage.sh restart <app>        特定アプリを再起動
./docker/scripts/manage.sh build <app>          特定アプリを再ビルドして起動（稼働中のモードを踏襲）
./docker/scripts/manage.sh apply [app]          compose の変更をコンテナへ反映（再ビルドなし）
./docker/scripts/manage.sh watch <app>          ソース変更をコンテナへ同期（対応アプリのみ・フォアグラウンド）
./docker/scripts/manage.sh logs <app>           特定アプリのログを表示
./docker/scripts/manage.sh status               全アプリの状態を表示
./docker/scripts/manage.sh start --recorded     全アプリをアプリごとに記録されたモードで起動（記録が無ければ開発）
./docker/scripts/manage.sh test [app]           稼働中のコンテナの中でテストを実行
./docker/scripts/manage.sh recover              落ちているアプリだけ起動し直す（ウォッチドッグ用）
./docker/scripts/manage.sh backup               全データベース・データをバックアップ（backup.sh に委譲）
./docker/scripts/manage.sh restore [app|--all] [backup] [--yes]
                                                アプリ単位でリストア（件数照合・healthy 待ちつき。手順は docker/RESTORE.md）
./docker/scripts/manage.sh newpc [--check]      新しい PC で全部戻す（.env → 起動 → 全アプリ restore。--check は一覧だけ）
./docker/scripts/manage.sh usb [--set|--show|--copy-now|--off]
                                                バックアップの外部コピー先（USB 等）を選ぶ
./docker/scripts/manage.sh verify <file>        暗号化バックアップを復号・整合性検証
./docker/scripts/manage.sh drill [file]         リストア訓練（使い捨てDBへ実際に復元して検証）
./docker/scripts/manage.sh due                  期限切れの無人処理だけ実行（ウォッチドッグ用）
./docker/scripts/manage.sh loop-check           画面のリロードループを検知（ゲートウェイのログを読むだけ）
./docker/scripts/manage.sh prune                無人向けの掃除（確認なし・ボリュームには触らない）
./docker/scripts/manage.sh alert                デスクトップの警告ファイルを作り直す（Docker 不要）
./docker/scripts/manage.sh clean                不要なコンテナ・イメージを削除
./docker/scripts/manage.sh clean-cache [--all]  Docker Build Cache だけを確認付きで削除
./docker/scripts/manage.sh collation [app] [--yes]
                                                PostgreSQL の照合順序を C へ移す（手でだけ叩く。手順は docker/COLLATION-MIGRATION.md）
./docker/scripts/manage.sh preflight            起動前チェック（Docker, ポート等）
./docker/scripts/backup.sh itcm                 backup と同じ全体バックアップ（backup-db.bat の入口）
```

バックアップはAES-256暗号化して `docker/backups/` に**日次7＋週次4＋月次6（GFS）**で保持し、最新1日分だけ `tax_apps` と同じ階層の `tax_apps_backup_latest/all-apps/` に追加コピーします。暗号鍵はリポジトリ外の `~/.tax-apps/backup.key` に保存されます（**これを失うと暗号化アーカイブは全部ただのゴミになる**ので、控えだけは手で取ること）。

`backup` / `drill` / `prune` / `loop-check` は固定時刻のスケジュールタスクではなく、**4時間毎のウォッチドッグが `due` で「前回の成功から経ったもの」だけ**を実行します（バックアップ20時間・訓練168時間・掃除144時間・ループ検知3時間）。結果は `docker/logs/last-run/` に残り、異常がある間はデスクトップに `TAX-APPS-ALERT.txt` が置かれます。

### 開発モード vs 本番モード

| | 開発モード (`start`) | 本番モード (`start --prod`) |
|---|---|---|
| ビルド | dev ステージ（ソースはマウント） | `docker compose ... --build`（runner ステージ） |
| ソースコード | ホストからマウント<br>※private-banking / inheritance-case-management は `watch` で同期 | イメージ内に含む |
| Dockerfile ターゲット | `dev` | `runner` |
| 用途 | ローカル開発 | デプロイ・動作検証 |

### アプリ個別の起動

1アプリだけ起動・再ビルドするときも `manage.sh` を使います（ネットワークと bank-analyzer の external ボリュームを無ければ作り、モードの記録も更新するため）。

```bash
./docker/scripts/manage.sh start inheritance-tax-docs     # 開発モードで起動
./docker/scripts/manage.sh build inheritance-tax-docs     # 再ビルド（稼働中のモードを踏襲）
./docker/scripts/manage.sh logs inheritance-tax-docs
# http://localhost/inheritance-tax-docs/ にアクセス
```

> ローカル環境を汚さないため、`npm install` や `npm run dev` はホスト側では実行しません。必要な作業は Docker コンテナ内または Docker Compose 経由で行います。

## AI で操作する（立ち上げ・本番・開発・トラブルシューティング）

Claude Code や Codex などの AI エージェントに、この PC の立ち上げ・モード切替・障害対応を任せるための節です。
AI は**この節を最初に読み、ここに書いた手順だけで作業する**こと（`AGENTS.md` からもここへ案内しています）。
別の PC を新しく作る・最新へ更新するときは、この節ではなく [docker/OTHER-PC-SETUP.md](docker/OTHER-PC-SETUP.md) を渡してください。

### 頼み方の例

| 頼みたいこと | AI への指示の例 | 使う手順 |
|:-----|:-----|:-----|
| 開発環境を立ち上げる | 「tax_apps を開発モードで立ち上げて」 | [立ち上げ](#立ち上げ) |
| 本番環境を立ち上げる | 「tax_apps を本番モードで立ち上げて」 | [立ち上げ](#立ち上げ) |
| 1アプリだけ切り替える | 「株式評価明細書だけ本番にして」「保険管理を開発に戻して」 | [1アプリだけモードを切り替える](#1アプリだけモードを切り替える) |
| コードの変更を反映する | 「git pull したので反映して」「compose を直したので反映して」 | [変更を反映する](#変更を反映する) |
| バックアップを取る・確かめる | 「今すぐバックアップを取って」「最新のバックアップが戻せるか訓練して」 | [バックアップと復元](#バックアップと復元) |
| データを戻す | 「保険管理を昨日のバックアップへ戻したい。一覧を見せて」 | [バックアップと復元](#バックアップと復元) → [docker/RESTORE.md](docker/RESTORE.md) |
| 調子が悪い | 「〇〇の画面が開かない。原因を調べて直して」「デスクトップに TAX-APPS-ALERT.txt が出ている」 | [トラブルシューティング](#トラブルシューティングai-向け) |

### AI が守ること

- コマンドは **Git Bash** で、**リポジトリのルート**（`docker/scripts/manage.sh` がある階層）から叩く
- **起動・停止・反映は必ず `manage.sh` から**。`docker compose up` を直接叩かない。特に `-f docker-compose.prod.yml` を
  個別に並べるのは不可（本番の DB パスワードが回らず restart ループになる）
- ホストで `npm install` / `npm ci` / `npm run build` / `npm run dev` を叩かない（ビルドもテストも Docker の中）
- 次のものは**実行前に必ず人に確認する**（どれもデータを書き換える）:
  `restore` / `newpc` / `collation` / `clean` / `down` / `stop`（ほかの人が使っている最中のことがある）
- 次のものは**頼まれても実行しない**: Docker ボリュームの削除（`docker volume rm` / `down -v`）、DB の初期化・`DROP`、
  確かめないままの `REINDEX`、暗号鍵 `~/.tax-apps/backup.key` の作り直し・移動、`.env` のパスワードの手書き換え、
  `docker/backups/pre-restore_*` の手動削除
- git は指定したファイルだけを扱う（`git add -A` / `git reset --hard` / `git stash` / `git clean` を使わない）。
  関係の無い未コミット変更が常にある前提で動く。`git push` は頼まれたときだけ
- 終わったら、**叩いたコマンド・`status` の結果・直らなかったもの**を報告する。直せなかったものを「直した」と書かない

### 立ち上げ

```bash
./docker/scripts/manage.sh preflight       # 1. 起動前チェック。FAIL があればそこで止めて報告する
./docker/scripts/manage.sh start           # 2a. 開発モード
./docker/scripts/manage.sh start --prod    # 2b. 本番モード（初回はビルドで数分〜十数分かかる）
./docker/scripts/manage.sh status          # 3. 全アプリが running / healthy か確認
./docker/scripts/manage.sh test            # 4. （任意）テスト。止まっているアプリは「飛ばした」になる
```

- アプリごとに記録されたモード（混在稼働）のまま全部上げ直すなら `start --recorded`
- 立ち上がったら http://localhost/ でポータルが開くことを確かめる。`status` で healthy にならないアプリが
  あれば [トラブルシューティング](#トラブルシューティングai-向け) へ
- 常用する PC で自動起動・自動復旧がまだ入っていなければ（`status` / `preflight` に「未登録」と出る）、
  `docker\scripts\register-startup-task.bat` と `register-docker-watchdog-task.bat` を実行する（昇格不要）

### 1アプリだけモードを切り替える

```bash
./docker/scripts/manage.sh start --prod <app>   # 本番へ
./docker/scripts/manage.sh start <app>          # 開発へ戻す
```

`build` と `apply` は**今のモードを踏襲する**ので、モードを変える口は `start` だけ。
アプリ名は `apps/` の下のフォルダ名（ゲートウェイは `gateway`）。

### 変更を反映する

取得元は `https://github.com/kojima1978/tax_apps.git` の `master`（公開・認証不要。作業ブランチは使わない）。
まず `origin` がそこを指しているか確かめてから取り込む:

```bash
git remote get-url origin                  # https://github.com/kojima1978/tax_apps.git であること（SSH 形式 git@github.com:kojima1978/tax_apps.git も同じもの）
OLD=$(git rev-parse HEAD)                  # 取り込む前の位置を控える
git pull --ff-only https://github.com/kojima1978/tax_apps.git master
git diff --stat "$OLD" HEAD                # 何が変わったか → 下の表から反映方法を選ぶ
```

- `origin` が違う URL なら、そのフォルダでは作業せずに止まって報告する
- `--ff-only` で拒否されたら（この PC にコミットや未コミットの変更が重なっている）、**自分で解消せず**報告する。
  `git stash` / `git reset --hard` で片付けない

| 何が変わったか | 叩くもの |
|:-----|:-----|
| ソース（`.ts` / `.tsx` 等）で、開発モード | 多くのアプリは自動で反映（下の [ファイル監視](#windows-docker-でのファイル監視問題) を参照）。private-banking / inheritance-case-management は `manage.sh watch <app>`（フォアグラウンド）か `build <app>` |
| ソースで、本番モード | `manage.sh build <app>` |
| `package.json` / `Dockerfile` / `docker/Dockerfile.vite-static` / `vite.config.ts` などイメージ同梱のもの | `manage.sh build <app>` |
| `docker-compose*.yml`（環境変数・メモリ上限など） | `manage.sh apply [app]`（`docker restart` では反映されない） |
| `nginx/nginx.conf` / `default.conf` / `includes/` / `html/` | `docker exec tax-apps-gateway nginx -t && docker exec tax-apps-gateway nginx -s reload`（マウントしているので再ビルド不要） |
| `apps/portal/` | `manage.sh build gateway`（ポータルはゲートウェイのイメージに入っている） |

別の PC を更新するときは [docker/OTHER-PC-SETUP.md](docker/OTHER-PC-SETUP.md) の手順A（取り込む前の記録とバックアップを含む）を使う。

### バックアップと復元

**取るのは全体でまとめて1つ、戻すのはアプリごと**。どのアプリの何が入るか（入らないアプリと、その画面からの
控えの取り方）は [docker/RESTORE.md の「何が戻るか」](docker/RESTORE.md#何が戻るか) の表が唯一の一覧で、
アプリ固有の注意は各アプリの README の「バックアップと復元」にある。

```bash
./docker/scripts/manage.sh backup                        # 全体バックアップ（暗号化。docker\scripts\backup-db.bat も同じ）
./docker/scripts/manage.sh status                        # 直近のバックアップ・訓練の結果（last-run）
./docker/scripts/manage.sh verify <バックアップ>          # 上書きせず、復号と整合性だけ確かめる
./docker/scripts/manage.sh drill                         # 使い捨ての DB へ実際に戻して件数を照合（本番には触らない）
./docker/scripts/manage.sh restore <app> <バックアップ>   # 戻す内容の一覧だけ（--yes が無ければ何も変えない）
./docker/scripts/manage.sh restore <app> <バックアップ> --yes   # 実行（人の確認の後）
```

- **ふだんは何もしなくてよい**: ウォッチドッグが `due` で、バックアップ（20時間）とリストア訓練（168時間）を
  期限切れのときに自動で回す。保持は日次7・週次4・月次6。外付け USB への写しは `manage.sh usb`（`set-backup-usb.bat`）
- **確認なしで叩いてよい**のは `backup` / `status` / `verify` / `drill` と、`--yes` の無い `restore`（一覧だけ）
- **人の確認が要る**のは `restore ... --yes` と `newpc`（どの時点へ戻すかは人が決める）。戻す前の状態は
  `pre-restore_*` として自動で残り、[docker/RESTORE.md](docker/RESTORE.md) の手順 C で巻き戻せる
- 新しい PC で全部戻すのは `docker\scripts\restore-new-pc.bat`（`manage.sh newpc`。まず `newpc --check`）
- **暗号鍵 `~/.tax-apps/backup.key` の控えは人が手で取る**。これが無いとバックアップは1つも戻せない。AI は鍵を作り直さない

### トラブルシューティング（AI 向け）

**まず見るだけで調べる**（どれも何も変えない）:

```bash
./docker/scripts/manage.sh status          # 落ちているアプリ・モード・無人処理の直近結果
./docker/scripts/manage.sh preflight       # 設定の食い違いを直し方つきで出す
./docker/scripts/manage.sh logs <app>      # そのアプリのログ
```

あわせて `docker/logs/last-run/`（無人処理の結果）とデスクトップの `TAX-APPS-ALERT.txt`（異常がある間だけ置かれる）を読む。
`preflight` と `status` は多くの場合**直し方のコマンドまで出す**ので、まずそれに従う。

**症状ごとの直し方**:

| 症状 | 見分け方 | 直し方 |
|:-----|:-----|:-----|
| 画面が 502 | `status` でそのアプリが止まっている | `manage.sh recover`（落ちているものだけ起動し直す）→ だめなら `logs <app>` を読んで原因を報告 |
| 全アプリが落ちている | `status` で軒並み停止 | 停止マーカー `docker/logs/tax-apps-stopped-intentionally` がある（＝誰かが `stop` した。`status` にも出て、`recover` は `RECOVER_RESULT status=stopped-intentionally` で何もしない）なら `start` で上げる前に人に確認。無ければ `recover` |
| イメージが無い | `recover` の結果や `preflight` に `noimage` / 「build が要る」 | `manage.sh build <app>` |
| 作成のまま起動しない | `preflight` のチェック20が「作成のまま」 | `cd apps/<app> && docker compose up -d --force-recreate <service>` |
| restart を繰り返す | `logs <app>` に既定パスワードを拒否する旨 | 個別に `-f docker-compose.prod.yml` で上げられている。`manage.sh start --prod <app>` で上げ直す |
| `✓ Ready` なのに一部が 404 | Next.js 系で `Watchpack Error (initial scan)` | `manage.sh restart <app>`（private-banking / itcm は自動で落ちて立ち直る） |
| 画面がリロードを繰り返す | `manage.sh loop-check` が検知 | 証拠は `docker/logs/reload-loop/` に残る。**コンテナを作り直す前に**そのフォルダを確かめて報告する |
| DB に繋がらない | `logs <app>` に接続エラー、health が 503 | DB コンテナの状態を `status` で確認。`.env` は書き換えない |
| バックアップ・訓練の失敗 | `status` の last-run が ok 以外 | `logs` と `docker/logs/last-run/<名前>` の detail を報告。鍵の作り直しはしない |

ここに無い症状は [docker/README.md のトラブルシューティング](docker/README.md#トラブルシューティング) と
[この README のトラブルシューティング](#トラブルシューティング) を見る。それでも分からなければ、調べた結果を報告して止まる
（推測で設定を書き換えない）。データを戻す必要があるときの手順は [docker/RESTORE.md](docker/RESTORE.md)（実行は人の確認の後）。

## 環境変数

### PostgreSQL（4アプリ）

各アプリの `.env` に設定します（`.env.example` から自動作成。git 管理外）。本番起動時は `manage.sh` が開発用の既定パスワードを一意の値へ置き換えて書き戻し、DB 側にも `ALTER ROLE` で反映します（**以降 `.env` を手で書き換えないこと**）。

| アプリ | `.env` | ユーザー / DB | ホスト側ポート |
|--------|--------|--------------|---------------|
| 案件管理 | `apps/inheritance-case-management/.env` | `postgres` / `inheritance_tax_db` | 3022 |
| 銀行分析 | `apps/bank-analyzer/.env` | `bankuser` / `bank_analyzer` | なし（内部のみ） |
| ファミリーB/S | `apps/private-banking/.env` | `postgres` / `private_banking` | 3026（`DB_PORT`） |
| 株式評価明細書 | `apps/stock-valuation-form/.env` | `postgres` / `stock_valuation` | 3016（`DB_PORT`） |

```env
# 例: apps/inheritance-case-management/.env.example
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me_local_only
POSTGRES_DB=inheritance_tax_db
```

## 技術スタック

- **フロントエンド**: Vite 6.3〜7.3 + React 19, Next.js 16.1〜16.4
- **バックエンド**: Next.js API Routes, Hono, Express
- **ORM**: Prisma
- **データベース**: SQLite, PostgreSQL 16（alpine。bank-analyzer のみ pgvector の bookworm）、照合順序は `C`
- **スタイリング**: Tailwind CSS v4（inheritance-tax-app のみ v3）
- **アイコン**: lucide-react
- **本番サーバー**: nginx:1.27-alpine (静的サイト), Node.js
- **コンテナ**: Docker Compose（アプリ毎の独立構成 + prod override パターン）

> **Note**: データベースファイル（`*.db`, `*.sqlite3`）と `.env` ファイルは git 管理外です。

## トラブルシューティング

### 502 Bad Gateway エラー

Nginx が 502 エラーを返す場合、バックエンドアプリが起動していない可能性があります。

```bash
# コンテナの状態を確認
./docker/scripts/manage.sh status

# 特定アプリのログを確認
./docker/scripts/manage.sh logs bank-analyzer

# 特定アプリを再起動
./docker/scripts/manage.sh restart bank-analyzer

# gateway を再起動（全アプリ起動後にDNS解決エラーが出る場合）
docker restart tax-apps-gateway
```

### Windows Docker でのファイル監視問題

Windows の bind mount ではコンテナ内にファイル変更の通知が届かないため、開発モードの各アプリはポーリングで監視しています。アプリによって扱いが違います:

| アプリ | 編集の取り込み方 |
|--------|-----------------|
| Vite 系7アプリ（`docker/Dockerfile.vite-static` を使うもの: gift-tax-simulator / retirement-tax-calc / tax-docs / capital-gains-calc / depreciation-calc / asset-valuation / inheritance-tax-form） | ポーリング設定済み。自動で反映 |
| bank-analyzer / stock-valuation-form / inheritance-tax-app / inheritance-tax-docs | ポーリング設定済み。自動で反映 |
| private-banking / inheritance-case-management | bind mount せず `manage.sh watch <app>` で同期（止めている間の変更は `build`） |
| insurance-app（開発モードのとき） | `manage.sh restart <app>` で取り込む |

> 本番モードで動いているアプリはソースをマウントしないので、どれも `manage.sh build <app>` で取り込みます。

### npm ci の lockfile エラー

`package-lock.json` が `package.json` と不整合の場合、開発モードの起動時にエラーになります。

```bash
# Docker 内で lockfile を再生成（ローカルに npm 不要）
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/apps/<アプリ名>:/work" -w /work node:22-alpine sh -c "npm install --package-lock-only"
```

### Next.js Turbopack のクラッシュ

Next.js 16 の Turbopack が開発モードのコンパイル時にクラッシュする場合（private-banking, inheritance-case-management。portal は静的出力なので該当しない）:
1. Dockerfile で **Node.js 22** を使用していることを確認
2. `.next` ディレクトリをボリュームとして分離:
   ```yaml
   volumes:
     - /app/.next
   ```

### LAN経由アクセス時の注意（HTTP環境）

LAN IPアドレス経由（例: `http://192.168.x.x/`）でアクセスする場合、ブラウザは「非セキュアコンテキスト」として扱います。以下の対応が済んでいます:

| 問題 | 対応済み | 対象 |
|------|---------|------|
| `crypto.randomUUID()` が使えない | `crypto.getRandomValues()` ベースのフォールバック実装 | inheritance-tax-app, inheritance-tax-docs, tax-docs |

> `localhost` からのアクセスではこれらの問題は発生しません。

## ライセンス

Private
