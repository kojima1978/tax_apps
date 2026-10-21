# Tax Apps - Docker Environment

税理士業務支援アプリケーション統合プラットフォーム

## 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [クイックスタート](#クイックスタート)
- [管理コマンド](#管理コマンド)
- [開発モードと本番モード](#開発モードと本番モード)
- [コード更新時の対応](#コード更新時の対応git-pull)
- [データ管理](#データ管理)
- [トラブルシューティング](#トラブルシューティング)
- [リファレンス](#リファレンス)

---

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。各アプリケーションは独立した Docker Compose プロジェクトとして運用され、共有ネットワーク (`tax-apps-network`) を通じて Nginx Gateway 経由でアクセスします。

| 特徴 | 説明 |
|:-----|:-----|
| **障害分離** | 1つのアプリがクラッシュしても他に影響しない |
| **個別操作** | アプリ単位で起動・停止・リビルドが可能 |
| **共有ネットワーク** | `tax-apps-network` で全コンテナが通信 |
| **統一アクセス** | Nginx Gateway が全アプリへルーティング |

## アーキテクチャ

```
                         ┌─────────────────────┐
                         │    Nginx Gateway    │
                         │      (Port 80)      │
                         │  - Reverse Proxy    │
                         │  - Rate Limiting    │
                         │  - Gzip Compression │
                         └──────────┬──────────┘
                                    │
                           tax-apps-network（外部ネットワーク）
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌───────────────────┐
│  Portal App   │         │  Frontend Apps  │         │   Backend APIs    │
│  (nginx:alpine│         │  (Next.js/Vite) │         │  (Express/        │
│   Port 3000)  │         │                 │         │   Hono)           │
└───────────────┘         └─────────────────┘         └─────────┬─────────┘
                                                                │
                                                       ┌────────┴────────┐
                                                       │   Databases     │
                                                       │  (PostgreSQL/   │
                                                       │   SQLite)       │
                                                       └─────────────────┘

※ 各ボックスはそれぞれ独立した docker-compose プロジェクト
※ DB依存アプリ（ITCM, bank-analyzer等）は同一プロジェクト内にDBを含む
```

---

## クイックスタート

### 前提条件

| ソフトウェア | 確認コマンド | 備考 |
|:-----------|:------------|:-----|
| [Git](https://git-scm.com/downloads) | `git --version` | ソースコードの取得・更新に使用 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | コンテナの実行環境 |

> Docker Desktop をインストールすると `docker compose` コマンドも一緒に入ります。

### 初回セットアップ（git clone〜起動まで）

> 別の PC で構築・更新するときは **`docker/OTHER-PC-SETUP.md`**（AI エージェントにそのまま渡せる手順書。
> 既存の PC の更新と、新しい PC での構築の両方）。

#### Step 1. リポジトリをクローン

```bash
git clone https://github.com/kojima1978/tax_apps.git
```

#### Step 2. Docker Desktop を起動

タスクバーにクジラのアイコンが表示され、**"Docker Desktop is running"** になるまで待ちます。

#### Step 3. manage.bat をダブルクリック

エクスプローラーで `tax_apps\docker\scripts\` フォルダを開き、`manage.bat` をダブルクリックします。

**これだけで完了です。** 内部で以下が自動的に行われます:

| 順番 | 処理 | 説明 |
|:-----|:-----|:-----|
| 1 | Docker 起動確認 | Docker Desktop が起動しているか確認 |
| 2 | ネットワーク作成 | `tax-apps-network` を自動作成（未作成時のみ） |
| 3 | 順次起動 | DB依存アプリ → フロントエンドアプリ → Gateway の順に起動 |
| 4 | 状態表示 | 全コンテナの状態を一覧表示 |

> 初回はDockerイメージのビルドがあるため、5〜15分ほどかかります。
> 2回目以降はキャッシュが効くため、数十秒で起動します。

#### Step 4. ブラウザでアクセス

http://localhost を開くとポータル画面が表示されます。

### 停止するとき

`stop.bat` をダブルクリック、または Git Bash で:

```bash
./manage.sh stop
```

データは Docker ボリュームに保存されているため、停止してもデータは消えません。

### 完全削除（アンインストール）

```bash
./manage.sh clean
```

二段階で確認されます:

| Step | 削除対象 | 確認 |
|:-----|:---------|:-----|
| Step 1 | コンテナ、Docker イメージ、ネットワーク | Y/N |
| Step 2 | Docker ボリューム（PostgreSQL, SQLite データ） | `DELETE DATA` 入力 |

> Step 1 のみ実行して Step 2 をスキップすれば、データを残したままコンテナだけ削除できます。
> 削除後に `./manage.sh start` を実行すれば、再セットアップされます。

ソースコードごと完全に削除する場合は、上記の後にフォルダを削除します:

```bash
cd ..\..\..\
rd /s /q tax_apps
```

---

## 管理コマンド

管理スクリプトは `tax_apps\docker\scripts\` にあります。コマンド例は `manage.sh` を本体として記載し、`.bat` は Windows のダブルクリック用補助スクリプトとして扱います。

| スクリプト | 環境 | 説明 |
|-----------|------|------|
| `manage.sh` | Linux / Git Bash | 全機能搭載（本体） |
| `manage.bat` | Windows (CMD) | `manage.sh` を Git Bash 経由で呼び出す補助ラッパー（ダブルクリックで開発モード起動） |
| `backup.sh` | Linux / Git Bash | 全体バックアップ/リストア/リストア訓練の本体 |
| `backup-db.bat` | Windows (CMD) | `backup.sh itcm` を Git Bash 経由で呼び出す補助ラッパー（**手で叩くときの入口**。スケジュールタスクからは呼ばれない） |
| `restore-drill.bat` | Windows (CMD) | `backup.sh drill` を Git Bash 経由で呼び出す補助ラッパー（同じく手動の入口） |
| `restore.bat` | Windows (CMD) | `backup.sh restore` を Git Bash 経由で呼び出す補助ラッパー（場所・アプリ・バックアップを一覧から選ぶ。USB からも直接戻せる） |
| `restore-new-pc.bat` | Windows (CMD) | `backup.sh newpc` を Git Bash 経由で呼び出す補助ラッパー（**新しい PC で全部戻す**: `.env` → 元のモードで起動 → 全アプリのデータ。`docker/RESTORE.md` 手順 B） |
| `set-backup-usb.bat` | Windows (CMD) | `backup.sh usb` を Git Bash 経由で呼び出す補助ラッパー（**外部コピー先（USB / NAS）をドライブの一覧から選ぶ**） |
| `unregister-backup-task.bat` / `unregister-restore-drill-task.bat` | Windows (CMD) | **廃止したタスクを既存 PC から外す**ためだけに残してあるラッパー（登録側は削除済み） |
| `start-prod.bat` | Windows (CMD) | ワンクリックで本番モード起動 |
| `stop.bat` | Windows (CMD) | ワンクリックで全アプリ停止 |
| `status.bat` | Windows (CMD) | ワンクリックで状態確認 |
| `docker-watchdog.ps1` | Windows PowerShell | Docker Desktop の応答確認・自動再起動・unhealthy コンテナ再起動 |
| `docker-watchdog.bat` | Windows (CMD) | 手動実行用の watchdog ラッパー（`-DryRun` 等の動作確認用。タスクスケジューラからは `.ps1` が直接呼ばれる） |
| `register-docker-watchdog-task.ps1` | Windows PowerShell | Docker watchdog タスクを登録（既定 4時間毎・0時起点、`-Unregister` で解除） |
| `register-docker-watchdog-task.bat` | Windows (CMD) | watchdog タスク登録のラッパー（ダブルクリックで登録。昇格不要） |
| `unregister-docker-watchdog-task.bat` | Windows (CMD) | watchdog タスク解除のラッパー（ダブルクリックで解除。昇格不要） |

> **前提**: [Git for Windows](https://gitforwindows.org/) がインストールされていること（`bash` コマンドが必要）。

### かんたん操作（ダブルクリック）

| 操作 | スクリプト | 説明 |
|:-----|:---------|:-----|
| 開発モード起動 | `manage.bat` | ダブルクリックするだけで全アプリを開発モードで起動 |
| 本番モード起動 | `start-prod.bat` | ダブルクリックするだけで全アプリを本番モードで起動 |
| 停止 | `stop.bat` | ダブルクリックするだけで全アプリを停止 |
| 状態確認 | `status.bat` | ダブルクリックするだけで状態を確認 |
| バックアップ（手動） | `backup-db.bat` | `backup.sh itcm` を呼び出す補助。PostgreSQL 4件・SQLite 2件・アップロード・テンプレート・設定・JSONエクスポート。無人実行はウォッチドッグの `due` 経由 |
| リストア訓練（手動） | `restore-drill.bat` | 最新のバックアップを使い捨て環境へ実際に復元し、本当に戻せるか検証。無人実行は同じく `due` 経由 |
| Docker自動復旧 | `docker-watchdog.bat` | `docker info` が連続失敗した場合に Docker Desktop を再起動し、unhealthy コンテナも再起動 |

> 詳細操作は下記「コマンド一覧」を参照してください。Windows のコマンドプロンプトから実行する場合は、補助ラッパーとして `manage.bat` に読み替えできます。

### コマンド一覧

| コマンド | 説明 |
|---------|------|
| `./manage.sh start` | 全アプリを開発モードで起動 |
| `./manage.sh start --prod` | 全アプリを本番モードでビルド＋起動 |
| `./manage.sh start [--prod] <app>` | 1アプリだけモードを切り替えて起動（**混在稼働はこちら**。個別に `-f docker-compose.prod.yml` を並べるのは不可） |
| `./manage.sh stop` | 全アプリを停止（逆順） |
| `./manage.sh down` | 全アプリを停止してコンテナ削除（逆順） |
| `./manage.sh restart <app>` | 指定アプリのみ再起動 |
| `./manage.sh build <app>` | 指定アプリを再ビルドして起動（**稼働中のモードを踏襲**） |
| `./manage.sh apply [app]` | compose の変更をコンテナへ反映（再ビルドなし・停止中は触らない・引数なしで全アプリ） |
| `./manage.sh watch <app>` | 指定アプリのソース変更をコンテナへ同期（対応アプリのみ・フォアグラウンド） |
| `./manage.sh logs <app>` | 指定アプリのログ表示 |
| `./manage.sh status` | 全アプリの状態表示 |
| `./manage.sh test [app]` | **稼働中のコンテナの中で**テストを実行（省略時は対象すべて） |
| `./manage.sh recover` | 落ちているアプリだけ起動し直す（**再ビルドしない・モードを踏襲・意図的な停止中は何もしない**。ウォッチドッグ用） |
| `./manage.sh backup` | 全データベース・データをバックアップ |
| `./manage.sh restore [app\|--all] [backup] [--yes]` | アプリ単位でリストア（件数照合・healthy 待ちつき。手順は `docker/RESTORE.md`） |
| `./manage.sh verify <backup>` | バックアップの復号とSHA-256照合（上書きなし） |
| `./manage.sh drill [backup]` | リストア訓練。使い捨てDBへ実際に復元して検証（既定は最新） |
| `./manage.sh collation [app] [--yes]` | PostgreSQL の照合順序を libc 非依存の `C` へ移す（引数なしは一覧、`--yes` なしは手順の表示だけ。**手でだけ叩く**。手順は `COLLATION-MIGRATION.md`） |
| `./manage.sh due` | 期限切れの無人処理だけ実行（バックアップ20時間・訓練168時間・掃除144時間・ループ検知3時間。ウォッチドッグ用） |
| `./manage.sh loop-check` | 画面のリロードループを検知（ゲートウェイのログを読むだけ・**Docker の操作ロックも取らない**） |
| `./manage.sh clean` | コンテナ・イメージ・ボリュームのクリーンアップ |
| `./manage.sh clean-cache [--all]` | Docker Build Cache の安全な削除 |
| `./manage.sh prune` | 無人向けの掃除（確認なし・**ボリュームには触らない**） |
| `./manage.sh alert` | デスクトップの警告ファイルを作り直す（Docker 不要） |
| `./manage.sh preflight` | 起動前環境チェック |

起動・再ビルド・テスト（使い捨てコンテナの `run --build`）の Compose は、呼び出した場所にかかわらずリポジトリ直下を作業ディレクトリにして実行します。`start-prod.bat` は `docker/scripts` から呼び出すため、そのままでは共有の `docker/Dockerfile.vite-static` が Bake の既定の読み取り範囲外になります。Compose 5.6.0 と Buildx 0.37.2 では共有 Dockerfile 自体への許可が渡らず、`failed to execute bake: exit status 1` で停止することを確認しました（[上流の不具合報告](https://github.com/docker/compose/issues/14285)、[上流の修正](https://github.com/docker/compose/pull/14325)）。

`lib/compose-build.sh` がビルド時だけ作業場所をリポジトリ直下に固定し、共有 Dockerfile を読み取り範囲に含めます。Compose ファイルは絶対パスの `-f` で指定するため、ビルドコンテキストや本番オーバーレイは変わりません。呼び出し元の作業場所も変更せず、ビルドエラーの終了コードをそのまま返します。再試行や一時 Bake 定義の生成は不要です。ビルドを伴う `docker compose` がこの関数を通らずに書かれると、CI の `tests/compose-build.test.sh` が行番号つきで落とします（`test` だけ漏れていて、7アプリのテストが止まっていた）。

手で叩くときも同じで、7つの Vite アプリ（`docker/Dockerfile.vite-static` を使うもの）を `cd apps/<app> && docker compose up -d --build` で作り直すと同じエラーで止まります。リポジトリ直下から `docker compose -f apps/<app>/docker-compose.yml up -d --build` とするか、`manage.sh build <app>` を使ってください。`BUILDX_BAKE_ENTITLEMENTS_FS=0` で確認ごと外す回避は不要です。

### アプリ名の指定

`restart`, `build`, `apply`, `logs` コマンドではアプリ名を**部分一致**で指定できます:

```bash
./manage.sh restart inheritance-tax-docs  # フルネーム
./manage.sh restart bank-analyzer         # 部分一致
./manage.sh logs gift-tax-sim             # 部分一致
./manage.sh build retirement              # 部分一致
```

> **曖昧性警告**: 複数のアプリが一致する場合（例: `tax` → inheritance-tax-docs, retirement-tax-calc 等）、エラーメッセージと候補一覧が表示されます。より具体的な名前を指定してください。

### 使用例

```bash
./manage.sh start                         # 全アプリを開発モードで起動
./manage.sh start --prod                  # 全アプリを本番モードで起動
./manage.sh status                        # 状態確認
./manage.sh build bank-analyzer           # 特定アプリを再ビルド
./manage.sh logs inheritance-tax-docs      # ログ確認
./manage.sh restart retirement-tax-calc   # 再起動
./manage.sh backup                        # バックアップ
./manage.sh test                          # 対象アプリすべてのテストをコンテナ内で実行
./manage.sh test stock-valuation-form     # 1アプリだけテスト
./manage.sh clean-cache                   # Build Cache だけを確認付きで削除
./manage.sh preflight                     # 起動前チェック
```

### テスト

テストは**ローカルに `node_modules` を作らない**ため、稼働中のコンテナの中で走らせます。

```bash
./manage.sh test                          # 対象すべて
./manage.sh test private-banking          # 1アプリだけ
```

- 対象は `docker/scripts/manage.sh` 冒頭の **`TEST_TARGETS`**（`アプリ名:コンテナ名:コマンド`）で定義します
- 同じ一覧が `.github/workflows/ci.yml` の matrix と**対**になっています。push したときに必ず一度は
  回るようにするための、もう一方の経路です
- **片方だけに足すと `preflight` のチェック16が WARN を出します**（`package.json` に `test` があるのに
  `TEST_TARGETS` に無い、あるいは CI の matrix に無い、を検出）
- 止まっているアプリと**本番モードで動いているアプリは「飛ばした」扱い**になります（本番イメージには
  devDependencies＝vitest が入っていないため）。失敗にはしません。dev へ戻すには
  `cd apps/<app> && docker compose up -d`（`manage.sh build` はモードを踏襲するので prod のままです）

### コマンドプロンプトの開き方

| 方法 | 手順 |
|:-----|:-----|
| **アドレスバー** | エクスプローラーで `docker\scripts` フォルダを開き、アドレスバーに `cmd` と入力して Enter |
| **右クリック（Win11）** | フォルダ内の空白部分を右クリック →「ターミナルで開く」 |
| **Shift+右クリック（Win10）** | フォルダ内の空白部分を Shift + 右クリック →「コマンド ウィンドウをここで開く」 |

---

## 開発モードと本番モード

### 比較

| 項目 | 開発モード (`start`) | 本番モード (`start --prod`) |
|:-----|:--------------------|:---------------------------|
| サーバー | Vite dev / Next.js dev / tsx watch | Nginx（静的）/ Node（Express・Hono・Next standalone） |
| ソースマウント | あり（ホットリロード対応）※ private-banking / inheritance-case-management を除く | なし（イメージに内包） |
| 最適化 | なし | minify, tree-shaking, gzip |
| 非rootユーザー | 全アプリ | 全アプリ |
| メモリ使用量 | 多い（512M〜） | 少ない（64M〜256M） |
| ビルド | 不要（キャッシュ起動） | 必要（初回・更新時） |

### ソース同期（private-banking / inheritance-case-management）

この2アプリは**開発モードでもソースを bind mount しません**。イメージに同梱したソースで動き、編集内容は `docker compose watch` で同期します。

```bash
# 編集しながら開発する間、別ターミナルで開いておく（フォアグラウンド、Ctrl+C で終了）
./manage.sh watch private-banking
```

| 項目 | 内容 |
|:-----|:-----|
| なぜ bind mount をやめたか | Docker Desktop for Windows の bind mount（Windows→WSL2）は起動直後の `scandir` が EFAULT を返すことがあり、Next.js のルート表が静かに欠落する（「`✓ Ready` なのに 404」）。コンテナ内から bind mount を無くすとこの経路自体が消える |
| なぜ `start` と別プロセスか | `--watch` は `--detach` と併用できないため（`docker compose watch --no-up` をフォアグラウンドで実行） |
| 初期同期 | **しない**。watch を止めている間の編集は `./manage.sh build <app>` で取り込む |
| sync 対象 | `src/`, `public/` |
| rebuild 対象 | `prisma/`, `package.json`, `package-lock.json`, `next.config.ts` |
| ポーリング設定 | Docker がオーバーレイ上位層へ直接書くためコンテナ内 inotify が発火しない。ルート表用に `WATCHPACK_POLLING=true`（compose）、Turbopack 再コンパイル用に `watchOptions.pollIntervalMs`（`next.config.ts`）の**両方**が必要 |
| 例外 | ITCM の `./templates`（Excel テンプレート）はビルドコンテキスト外のため bind mount のまま |

### 本番モードで起動

```bash
# 全アプリ
./manage.sh start --prod

# 個別アプリ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans
```

`manage.sh start --prod` は Private Banking の初回起動時に固有のデータベースパスワードを
`.env` へ自動生成します。開発モードで作成済みの PostgreSQL ボリュームがある場合も、
DB 内のロールへ同じパスワードを同期してから Web コンテナを起動します。
シークレット初期化を含むため、Private Banking を本番モードで起動する場合は
Compose コマンドの直接実行ではなく `manage.sh start --prod` を使用してください。

個別アプリの例:

```bash
docker compose -f apps\inheritance-tax-docs\docker-compose.yml -f apps\inheritance-tax-docs\docker-compose.prod.yml up -d --build --remove-orphans
```

### 開発モードに戻す

```bash
./manage.sh start
```

`--build` なしで既存の開発イメージを使用します。

### docker-compose.prod.yml の仕組み

各アプリに `docker-compose.prod.yml`（オーバーライドファイル）が用意されています。開発用の `docker-compose.yml` を本番向けに上書きします。

**主な上書き内容:**

| 設定 | 開発 → 本番 |
|:-----|:------------|
| `build.target` | `dev` → `runner`（全アプリ共通） |
| `volumes` | ソースマウント削除（データボリュームのみ残す） |
| `command` | 本番サーバーコマンドに変更 |
| `deploy.resources` | メモリ制限を本番向けに削減 |

### アプリ別の本番構成

| アプリ | 本番サーバー | 備考 |
|:------|:------------|:-----|
| Gift Tax Simulator / Tax Docs / Retirement Tax Calc / Depreciation Calc / Asset Valuation / Capital Gains Calc / Inheritance Tax Form | nginx:1.27-alpine | 共通の `docker/Dockerfile.vite-static` |
| Portal（gateway の portal-app） | nginx:1.27-alpine | Next.js の静的出力 |
| Inheritance Tax App | Node（Express） | |
| Inheritance Tax Docs | Node（Express + SQLite） | |
| Stock Valuation Form | Node（Hono + Prisma） | 画面と API を 3014 で両方配信 |
| Bank Analyzer | Node（Hono + Prisma） | 画面と API を 3007 で両方配信 |
| ITCM | Node（Next.js standalone） | |
| Private Banking | Node（Next.js） | |
| Insurance App | Node（Next.js standalone + SQLite） | |

本番ステージはすべて `runner`、全アプリに `docker-compose.prod.yml` があります（`preflight` のチェック18が毎回確かめます）。

### Dockerfile マルチステージ構成

全アプリの Dockerfile は複数ステージで構成されています:

```
base → deps → dev        （開発サーバー）
              └→ builder → runner   （本番サーバー）
```

| ステージ | 用途 | 使用イメージ |
|:---------|:-----|:------------|
| `base` / `deps` | 依存関係インストール | node:22-alpine |
| `dev` | 開発サーバー（ホットリロード） | node:22-alpine |
| `builder` | 本番ビルド（`npm run build`） | node:22-alpine |
| `runner` | 本番サーバー | nginx:1.27-alpine / node:22-alpine |

#### 非 root で動かす

本番ステージ（`runner`）は元から非 root（`node` / `nextjs` など）でしたが、
**`dev` ステージも非 root**に揃えてあります。dev だけ root だと、コンテナ内から作られたファイルが
root 所有でホスト側に残り、**本番（非 root）から触れなくなる**ためです。

書き方は全アプリ共通です。

```dockerfile
COPY --chown=node:node . .
RUN chown node:node /app /app/node_modules
USER node
```

- `COPY --chown=` は**層を増やしません**（コピー時に所有者が決まるだけ）。一方で
  末尾に `RUN chown -R node:node /app` を置くと `node_modules` のツリーが丸ごともう1層コピーされ、
  イメージが数百MB単位で膨らみます。そのため `chown` は**ディレクトリだけ**に絞っています
- `COPY --chown` が要るのは、`next dev` が起動時に `tsconfig.json` と `next-env.d.ts` を**書き換える**ためです
  （root 所有のままだと `EACCES` で即落ちます）。Vite は `node_modules/.vite` だけ、
  Next standalone は `.next/cache` だけ書きます
- **名前付きボリュームがイメージ側の所有者を引き継ぐのは、ボリュームが空のときだけ**です。
  root で動いていた頃に作られた既存ボリュームは root 所有のまま残るので、切り替え時に一度だけ
  `docker compose exec -u 0 <service> chown -R node:node <mount-point>` が要ります
- Windows の bind mount は、マウント先のルートと Windows 側で作られたファイルが `0:0` の **0777** で
  見えるため、uid 1000 でも書けます。ただし**root で動いていた頃にコンテナ内から作られた**
  ディレクトリは `0:0` の 0755 で残るので、これも一度だけ `chown -R` が必要です

---

## コード更新時の対応（git pull）

### Step 1. 最新コードを取得

取得元は `https://github.com/kojima1978/tax_apps.git` の `master` です（公開・認証不要）。

```bash
cd tax_apps
git remote get-url origin        # https://github.com/kojima1978/tax_apps.git であること
git pull --ff-only https://github.com/kojima1978/tax_apps.git master
```

`--ff-only` で拒否されたら、この PC 側にコミットや未コミットの変更が重なっています。`git stash` や `git reset --hard` で片付けず、中身を確かめてから進めてください（別の PC の手順は [OTHER-PC-SETUP.md](OTHER-PC-SETUP.md)）。

### Step 2. 変更内容に応じて再起動

#### ソースコードのみの変更（`.ts`, `.tsx` 等）

開発モードではソースコードがホストからコンテナにマウントされていて、Vite 系6アプリ（`Dockerfile.vite-static`）・bank-analyzer・stock-valuation-form・inheritance-tax-app・inheritance-tax-docs はポーリングで**自動で反映されます**。private-banking / inheritance-case-management は `./manage.sh watch <app-name>` の間だけ同期され、insurance-app（開発モードのとき）は再起動で取り込みます:

```bash
./manage.sh restart <app-name>
```

#### 依存関係・Dockerfile の変更を含む場合

`package.json`、`Dockerfile`、`docker/Dockerfile.vite-static` 等が変更された場合は**リビルドが必要**です（`build` はそのアプリが今動いているモードを踏襲します）:

```bash
./manage.sh build <app-name>
```

#### Nginx 設定の変更

Nginx 設定ファイル（`nginx.conf`, `default.conf`, `includes/`）はコンテナにマウントされているため、リビルド不要でリロードできます:

```bash
docker exec tax-apps-gateway nginx -s reload
```

> 本番モードではソースマウントがないため、コード変更後は `./manage.sh build <app-name>` で再ビルドしてください（本番のまま作り直されます）。compose ファイルだけの変更は `./manage.sh apply <app-name>`（再ビルドなし）で反映できます。

---

## データ管理

### 永続化

DBなどの永続データは Docker Named Volume またはバインドマウントに保存されます。`./manage.sh stop` や `./manage.sh down` を実行しても、Named Volume とバインドマウント上のデータは消えません。

| ボリューム名 | サービス | 内容 |
|:------------|:---------|:-----|
| `inheritance-case-management_postgres_data` | itcm-postgres | ITCM用 PostgreSQL データ |
| `bank-analyzer-postgres` | bank-analyzer-postgres | 銀行分析用 PostgreSQL |

データを完全に削除したい場合は `./manage.sh clean` の Step 2 を実行してください。

### バックアップ

```bash
./manage.sh backup
```

`docker\backups\2026-02-22_153000.tar.gz.enc` のようなAES-256暗号化ファイルとして保存されます
（保持は**日次7本 + 週次4本 + 月次6本**。下記「世代保持」）。
あわせて、リポジトリと同じ階層の `tax_apps_backup_latest\all-apps\` に最新1日分だけ追加コピーされます。

| # | データ | 方式 | 備考 |
|:--|:------|:-----|:-----|
| 1 | ITCM PostgreSQL | `pg_dump`（SQLダンプ） | コンテナ停止中はボリューム tar バックアップ |
| 2 | Bank Analyzer PostgreSQL | `pg_dump`（SQLダンプ） | 同上 |
| 3 | Private Banking PostgreSQL | `pg_dump`（SQLダンプ） | 同上 |
| 4 | Stock Valuation Form PostgreSQL | `pg_dump`（SQLダンプ） | 同上。業種目マスタと各社データ |
| 5 | SQLite 2アプリ | `better-sqlite3 backup` + `PRAGMA integrity_check` | 稼働中も整合性のあるスナップショットを取得 |
| 6 | ITCM Excel テンプレート | `cp` | `apps/inheritance-case-management/templates/`。`.gitignore` 対象なので Git には無い |
| 7 | 設定ファイル | `cp` | ITCM / Bank Analyzer / Private Banking / Stock Valuation Form の `.env` |
| 8 | Bank Analyzer 案件別JSON | `npm run backup:json` | 画面のJSONバックアップと同じ形式 |

#### 暗号鍵の保管（ここだけは自動化できない）

暗号鍵は既定でリポジトリ外の `~/.tax-apps/backup.key` に初回実行時に作成されます。
**鍵を失うと、7日分のバックアップすべてが復元不能な塊になります。**

```
C:\Users\<user>\.tax-apps\backup.key   ← この1ファイルだけ、外部媒体へ控えを取る
```

- アクセス制限した**外部媒体**（USBメモリ等）へ鍵**だけ**を保管してください。
- **バックアップファイルと鍵を同じ場所に置かないこと。** 同じディスクに置けば、ディスクが
  飛んだときに両方同時に失われ、暗号化した意味がなくなります。
- 鍵が無い状態でバックアップを実行しても、**もう新しい鍵は自動生成されません**。
  既存の `*.tar.gz.enc` が1つでもあればエラーで止まります。以前は黙って新しい鍵を作っていて、
  翌日のバックアップは何事もなく成功する一方、過去のアーカイブは全て読めなくなっていました
  （しかも気づけるのは、いざ復元が必要になった当日だけ）。
- どの鍵で暗号化したかの目印を `docker/backups/.backup-key-fingerprint`
  （sha256 の先頭16桁）に残します。鍵がすり替わると復号前に警告が出ます。

#### 世代保持（GFS）

保持は **日次7本 + 週次4本 + 月次6本**です（`FULL_BACKUP_RETENTION_DAYS` /
`WEEKLY_BACKUP_RETENTION_WEEKS` / `MONTHLY_BACKUP_RETENTION_MONTHS` で変更可）。

日次7本だけでは「**7日以内に気づけた障害**」しか戻せません。取り込みミス・誤削除・DBの論理破損は
静かに進むので、気づくまでに数週間かかることがあり、そのときには7本すべてが壊れた後の状態になっています。

- 週次は各週（月曜起点）の最も新しい1本、月次は各月の最も新しい1本を「代表」として残します
- 代表は日次と同じ実体を指すので、増える容量は**日次から落ちた代表のぶんだけ**です
- `pre-restore_*`（リストア直前の退避）は対象外で、従来どおり日数だけで消えます

#### 外部コピー（別ドライブ／NAS）

同じPCの `docker\backups\` にしか無いバックアップは、**ドライブが壊れた瞬間にバックアップごと消えます**。
ランサムウェアなら暗号化済みアーカイブごと持って行かれます。

コピー先を設定すると、毎回のバックアップの最後に暗号化アーカイブが1本コピーされます。

**設定は `docker\scripts\set-backup-usb.bat` をダブルクリック**（中身は `manage.sh usb`）。
ドライブの一覧から番号で選ぶと `<ドライブ>:\tax-apps-backup` を作り、書き込めるかを確かめてから
保存し、そのまま最新のバックアップを1本写せます。手順は [`RESTORE.md`](RESTORE.md) の「外部コピー先」。

```bash
./manage.sh usb --show                     # 今の設定と、見えているか
./manage.sh usb --set 'E:\tax-apps-backup' # 直接指定（NAS のパスも可）
./manage.sh usb --copy-now                 # 最新を今すぐ写す
./manage.sh usb --off                      # やめる（コピー先の中身は消さない）
```

設定の実体は `C:\Users\<user>\.tax-apps\backup-external-dest`（1行目がパス、2行目が `# id:`）。

- **未設定なら何もしません**（警告も記録も出ません）。使わない環境では存在しないのと同じです
- 設定されているのに書けないときだけ記録が残り、デスクトップの警告にも出ます。
  「設定したつもりで効いていない」が一番危ないためです
- 設定をリポジトリ外に置くのは、**リポジトリが公開**で NAS 名やユーザー名を含むパスを載せられないからです。
  環境変数ではなくファイルなのは、スケジュールタスクが環境変数を持たずに起動するためです
- **ドライブ文字が変わっても追いかけます**。コピー先には目印 `.tax-apps-backup-id` を置き、
  設定のパスが見つからないときは他のドライブの同じフォルダを探して、**目印が一致したときだけ**
  そこへ写して設定を書き換えます（同じ名前の別の USB は採りません）
- **本体と同じドライブを選ぶと警告して確認します**（同じディスクでは守りになりません）
- コピー先でも同じ GFS（日次7 + 週次4 + 月次6）で世代を絞ります
- **鍵は一緒に置かないこと**（上記「暗号鍵の保管」）。外部コピー先にも置かれるのは暗号化済みアーカイブだけです

> DBを持つアプリを追加したら、`backup.sh` 冒頭の `PG_TARGETS` / `SQLITE_TARGETS` / `BIND_TARGETS` /
> `SETTINGS_TARGETS` に1行足すこと。バックアップ・リストア・リストア訓練はすべてこの配列から生成されます。

### リストア

**手順書は [`RESTORE.md`](RESTORE.md)**（新しい PC で全部戻す手順・巻き戻し・外付け USB の設定もここ）。

```bash
./manage.sh restore                              # 端末でアプリとバックアップを選ぶ
./manage.sh restore bank-analyzer 2026-10-14     # 1アプリだけ（その日の最新）
./manage.sh restore --all 2026-10-14_212138      # 全部（--yes が無ければ一覧だけ出して止まる）
./manage.sh restore --env-only                   # 無い .env だけ置く（新しい PC の最初の一手）
./manage.sh verify 2026-10-14_212138.tar.gz.enc  # 上書きせず復号・整合性検証
```

- **そのアプリのコンテナだけを止めて**戻し、起動して healthy になるまで待つ（他のアプリは動き続ける）。
  `.sql` から戻す PostgreSQL のコンテナだけは動かしたまま `psql` で流し込む
- 戻した後に**件数をバックアップと照合**する（PostgreSQL はダンプの行数と全テーブルの実件数、
  SQLite はテーブル数と行数）。リストア訓練も同じ照合を使う
- 確認の画面には、バックアップの件数と今の件数が並んで出る
- 上書き前に現在データの `pre-restore_YYYY-MM-DD_HHMMSS` を自動作成する（失敗したら中止）。
  取り消すときはそれを指定して同じコマンドを叩く
- **`.env` は無いときだけ戻す**。今あるものと違っても上書きしない（DB のパスワードは
  `.env` を戻しても変わらないため）。上書きするなら `--with-env`
- 戻す前から止まっていたアプリは起動しない

### リストア訓練（drill）

`verify` は「復号できてハッシュが一致する」ことまでしか保証しません。ダンプが本当にリストア可能な SQL かどうかは別問題なので、`drill` が使い捨て環境へ実際に復元して確かめます。

```bash
./manage.sh drill                                # 最新のバックアップが対象
./manage.sh drill 2026-02-22_153000.tar.gz.enc   # 直接指定
```

- **PostgreSQL**: 使い捨ての `pgvector/pgvector:0.8.7-pg16-bookworm` コンテナを起動し、`psql -v ON_ERROR_STOP=1` でダンプを流し込む。銀行分析の既存 DB に登録済みの `vector` 拡張も復元できるイメージを使う。復元後にテーブル数と行数を数え、0件なら失敗扱い
- **SQLite**: 展開したコピーを稼働中コンテナの `/tmp` へ置き、readonly で開いて `integrity_check` とテーブル数を確認（`better-sqlite3` がアプリイメージにしか無いため。コンテナ停止中はスキップ）
- **稼働中のDBには一切触れません**。ドリル用コンテナは `tax-apps-network` に繋がず、ポートも公開しません

1件でも失敗すると終了コード 1 を返します。

**前の回の残骸は入口で掃きます**。ドリルは復号した平文（DBのダンプ・顧客名の入った JSON・`.env`）を
`docker/backups/.restore-work.XXXXXX` に展開します。後始末は `trap ... EXIT INT TERM` ですが、
タスクスケジューラに殺された回は trap が1つも走りません ── 2026-10-04 の中断でできた 17MB の平文が、
暗号化アーカイブの隣に**9日間そのまま残っていました**。いまは `sweep_stale_restore_work` が
`extract_encrypted_backup` の入口で（＝`restore` と `drill` の両方で、**鍵の確認より先に**）前の回の
残骸を消し、消した件数を `last-run` の detail に `swept=N` で出します。黙って消すと「毎回殺されている」
ことが誰にも見えなくなるためです。

**Docker の掃除は `due` の独立した項目です**（以前はドリルの最後の1行でした）。ドリル自身の記録は
その手前で書かれるため、2026-10-04 にドリル成功の直後（ビルドキャッシュの削除中）に落ちた回は
**ドリルは ok のまま掃除だけ記録を失い**、呼ぶ経路が「次に成功する週次ドリル」しか無かったので
4時間毎にウォッチドッグが起きているのに**9日間直せませんでした**。いまは中断されても数時間後の
次の回で再試行されます。

**専用のスケジュールタスクはありません（2026-10-11 に廃止）。**

以前は `Tax Apps Weekly Restore Drill` が毎週日曜4:00に登録されていましたが、固定時刻のタスクは
ログオン直後にウォッチドッグと同時に発火して**同じ操作ロックを取り合い、どちらかの回が丸ごと消えて**
いました（通算25回）。いまはウォッチドッグが4時間毎に「前回の成功から168時間以上経っていれば取る」
（`manage.sh due`）ので、駆動元は1つだけです。既に登録済みの PC では
`unregister-restore-drill-task.bat` で外してください（`manage.sh status` と `preflight` が
残っていることを警告します）。手で今すぐ試すなら `restore-drill.bat`。

### 自動バックアップ（タスクスケジューラ）

#### ポータルから設定する

ポータルの「バックアップ設定」から、次の項目をまとめて確認・変更できます。

- 自動バックアップの有効・無効と実行間隔
- 日次・週次・月次の保持数
- USB、外付けディスク、NASへの追加コピー先
- 最終実行結果、暗号鍵、復元テスト、最近のバックアップ
- 全アプリの手動バックアップ
- 保存場所・バックアップ・対象アプリを選んで復元（全対象アプリの一括復元も可能）

「バックアップから復元」では、最初に「復元内容を確認」で復号・整合性と件数を確認します。
確認に成功してから上書きの了承をチェックすると復元ボタンが使えます。確認は15分有効で、
選択したファイルや対象が変われば再確認が必要です。復元前の `pre-restore_*` 退避、
復元後の件数照合・起動確認には既存の復元処理を使用します。現在の `.env` は保持します。
処理中・完了・失敗と詳細結果は画面に表示され、画面を閉じても開始済みの処理は続きます。

初回だけ `docker\scripts\register-backup-settings-api-task.bat` を実行します。設定サービスは
`127.0.0.1:8765` だけで待ち受け、ログオン時に現在のユーザー権限で起動します。
設定はリポジトリ外の `C:\Users\<user>\.tax-apps\backup-settings.env` に保存されます。
画面を使わなくても従来どおり `backup-db.bat` と `manage.sh backup` を利用できます。

`backup-db.bat` は互換コマンド `backup.sh itcm` を通じて、通常の `backup` と同じ暗号化済み全体バックアップを作成します。
**無人実行はウォッチドッグの `due` 経由**で、この入口は手で叩くとき用です。

```bash
./backup.sh itcm                           # Git Bashで実行（本体）
backup-db.bat                              # Windows補助。手でダブルクリックするとき用
```

| 項目 | 内容 |
|:-----|:-----|
| 対象 | PostgreSQL、SQLite、アップロード、設定、JSONエクスポート |
| SQLite方式 | オンラインバックアップ後に `PRAGMA integrity_check` |
| 暗号化 | AES-256-CBC、PBKDF2（200,000 iterations） |
| 保存先 | `docker\backups\YYYY-MM-DD_HHMMSS.tar.gz.enc` |
| 保持期間 | 日次7 + 週次4 + 月次6（GFS。古い暗号化ファイルは自動削除） |
| 追加保存先 | `tax_apps_backup_latest\all-apps\`（最新1日分） |

**専用のスケジュールタスクはありません（2026-10-11 に廃止）。**

以前は `Tax Apps Daily Backup` が毎日3:00に登録されていましたが、PC が 3:00 に起動していない場合の
`-StartWhenAvailable` の追いつき実行はこの PC では当てになりませんでした ── **記録に残る9回のうち
定刻に走ったのは1回だけ**で、2026-09-22 と 2026-09-28 は追いつきもせず丸ごと失われています。
定刻に意味が無いのに、ログオン直後にウォッチドッグと同時に発火して**同じ操作ロックを取り合う**
害だけが残っていたので（通算25回ぶんの復旧がそれで消えていた）、二重化をやめて駆動元を
ウォッチドッグ1つに統合しました。**4時間毎に「前回の成功から20時間以上経っていれば取る」**
（`manage.sh due`）ので、PC を使った日には必ず1回取れます。`manage.sh preflight` は暗号化
バックアップが30時間以上更新されていない場合と、直近の実行が失敗していた場合に警告します。
既に登録済みの PC では `unregister-backup-task.bat` で外してください。

> OneDrive等の同期フォルダに保存する場合は、`backup.sh` 実行時に `BACKUP_BASE` または `LATEST_BACKUP_BASE` を指定してください。

### Docker Desktop Watchdog（4時間毎・0時起点）

Docker Desktop 自体がクラッシュ、または `docker info` に応答しない状態になった場合に、Docker Desktop の再起動を試みる watchdog を用意しています。あわせて**期限切れの無人処理（バックアップ20時間・リストア訓練168時間・掃除144時間・ループ検知3時間）を実行する唯一の役**でもあります。

**かんたん登録（推奨）**: `register-docker-watchdog-task.bat` をダブルクリックするだけ（昇格不要）。

**手動登録**:

```powershell
cd C:\Users\sashi\Desktop\dev\tax_apps\docker\scripts
powershell -NoProfile -ExecutionPolicy Bypass -File .\register-docker-watchdog-task.ps1
```

**かんたん解除**: `unregister-docker-watchdog-task.bat` をダブルクリックするだけ（昇格不要）。

**手動解除**:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\register-docker-watchdog-task.ps1 -Unregister
```

> 昇格は不要です（`RunLevel=Limited`）。以前は管理者権限を必須にしていましたが、タスクが消えたときに管理者ダブルクリックでしか戻せず、実際に2度消えて長期間無防備になったため廃止しました。

登録されるタスクの既定値:

| 項目 | 内容 |
|:-----|:-----|
| タスク名 | `Tax Apps Docker Watchdog` |
| 実行時刻 | 0:00 起点で4時間毎（`-IntervalHours 6` のように変更可・24 を割り切る値のみ）。PC 停止中に tick を跨いだ場合は、復帰後の次の tick（最大4時間後）で実行 |
| 実行条件 | ログオン中の現在ユーザーで実行（`RunLevel=Limited` で昇格不要） |
| 多重起動 | 新しいインスタンスを開始しない |
| ログ | `docker\logs\docker-watchdog.log`（1MB でローテーション・`.1`〜`.3` を保持） |
| 直近結果 | `docker\logs\last-run\watchdog`（`manage.sh status` / `preflight` が表示） |
| 状態ファイル | `docker\logs\docker-watchdog.state.json`（直近の再起動時刻を記録） |
| 監視判定 | `docker info` が2回連続で失敗（タイムアウト or 非0終了）したら復旧処理を実行 |
| 復旧手順 | ① Docker関連プロセス kill（`Docker Desktop`, `com.docker.backend`, `com.docker.build`, `docker-sandbox`, `docker`） → ② `com.docker.service` 再起動（管理者権限が必要） → ③ `wsl --shutdown` で WSL バックエンドをリセット → ④ `Docker Desktop.exe` 起動 → ⑤ 最大300秒間 healthy 待機 |
| クールダウン | 直近45分以内に再起動済みなら復旧処理をスキップ（`docker-watchdog.state.json` を削除すれば即座に解除） |

手動確認:

```powershell
.\docker-watchdog.bat -DryRun
```

> Docker が正常なときも毎回 `manage.sh recover` を呼び、落ちているアプリだけを起動し直します（再ビルドせず、アプリごとの dev/prod モードを踏襲し、`stop` 直後など意図的な停止中は何もしません）。`restart: unless-stopped` は `stop` したコンテナを「手動停止」として記録してしまい二度と復帰しないため、これが無いと復旧経路が1つも生きていない状態になります。
> 登録時に既存タスクがある場合は自動的に上書き更新され、登録後に次回実行時刻が表示されます。

> **なぜ「固定時刻」ではなく「繰り返し」か**: Daily トリガーは、その時刻に PC が起きていなければ `StartWhenAvailable` の追いつき実行しか頼りがありません。この PC ではそれが当てにならず、2026-09-28 は 08/12/16/20 の**4回すべてが追いつきもせず捨てられ**、`NextRunTime` が翌日へ飛びました。繰り返しトリガーにはその失敗の形がなく、復帰後は間隔以内に必ず次の tick が来ます。アンカーを `(Get-Date).Date`（= 0:00）に固定しているのが要点で、これで「`-Once -At (Get-Date)` は登録した瞬間が起点なので再登録のたびに実行時刻が深夜へずれる」という当初の問題も起きません。
>
> **なぜ4時間か**: 復旧は設計上2回の実行で1組になります。1回目が起動したコンテナは healthcheck の `start_period` 中なので `unhealthy` として拾われず、再起動の対象になるのは次の実行です。2回/日だとその「次」が最大12時間先で、起動はしたが healthy にならないコンテナが半日放置されていました。変更は `register-docker-watchdog-task.ps1` の `$IntervalHours` の**既定値**を直すこと（登録済みタスクだけ変えても、`backup.sh` がタスク消失時に引数なしで再登録した時点で既定値に戻ります）。
>
> **無人処理の実行役でもあります**: 復旧のあとに `manage.sh due` を呼び、前回の成功から20時間以上経っていればバックアップ、168時間以上経っていればリストア訓練、144時間以上経っていれば Docker の掃除、3時間以上経っていれば画面のリロードループの検知を実行します（4項目は互いの成否に依存しません）。**これはデスクトップの警告ファイルを書き直す前**に行われます。以前はバックアップとウォッチドッグが別々のスケジューラで競走していて、ログオン直後のウォッチドッグが「バックアップがまだ一度も走れていない時点」で「バックアップ停止」を警告していました。

#### 配線の確認（重要）

unhealthy コンテナの自動再起動は、次の**2つが揃って初めて動作**します。

| # | 要素 | 場所 | 欠けたときの症状 |
|:--|:-----|:-----|:-----------------|
| ① | `tax-apps.autoheal: "true"` ラベル | 各アプリの `docker-compose.yml`（`x-autoheal-labels` アンカー） | そのコンテナだけ永久に再起動されない |
| ② | スケジュールタスク登録 | Windows タスクスケジューラ | 全コンテナが再起動されない |

どちらも欠けていること自体はエラーにならないため、`./manage.sh status` の末尾で常時確認できるようにしています。

```
自動復旧（ウォッチドッグ）:
  スケジュールタスク: 登録済み（Tax Apps Docker Watchdog）
  autoheal ラベル: 稼働中の healthcheck 付きコンテナすべてに付与済み
```

★ が付いた項目が未配線です。①は compose を直して `up -d` でコンテナを再作成、②は `register-docker-watchdog-task.bat` をダブルクリックして登録します。

新しいアプリを追加するときは、healthcheck を定義したら**必ず同じサービスにラベルも付ける**こと（`labels: *autoheal-labels`）。

動作確認は使い捨てコンテナで行えます。

```bash
docker run -d --name autoheal-probe --label tax-apps.autoheal=true \
  --health-cmd "exit 1" --health-interval=3s --health-retries=1 alpine:3 sleep 300
```

unhealthy になった後に `.\docker-watchdog.bat` を実行すると、ログに `Restarting unhealthy Tax Apps container: autoheal-probe` → `Container restarted` が出ます。確認後は `docker rm -f autoheal-probe` で削除してください。

### 失敗に気づくしくみ

無人で走るもの（バックアップ・外部コピー・リストア訓練・掃除・復旧・ウォッチドッグ）は、
終了時に成否を1件だけ `docker\logs\last-run\<名前>` へ書きます。`status` と `preflight` が毎回これを読みます。

ただしそれが見えるのは `status` か `preflight` を**叩いた人だけ**です。毎日失敗し続けても画面には何も出ません。
実際にそれで数ヶ月見逃しました。そこで異常が1件でもある間は、**デスクトップに `TAX-APPS-ALERT.txt` を置き続けます**。

```
TAX-APPS-ALERT.txt      ← 異常が1件でもある間だけ、デスクトップに置かれる
```

- 中身は `last-run` から毎回作り直す**派生物**です。直れば次の自動実行で勝手に消えるので、
  **消し忘れの嘘が残りません**（自分で消しても、原因が直っていなければ次の実行でまた出ます）
- 異常の定義は「`status` が `ok` 以外」＝失敗、「最後の成功が古すぎる」＝停止です。
  **「一度も記録が無い」では出しません**（導入直後や未使用の項目で鳴り続けるため）
- 内容が前回と変わったときだけ Windows のトースト通知も出ます（追加インストールは不要）
- 見張る対象と鮮度のしきい値は `docker/scripts/lib/ops-common.sh` の **`OPS_WATCHED_RESULTS` 1箇所**だけです。
  **無人処理を足したらここに1行足すこと**
- 手動で作り直すには `./manage.sh alert`。**Docker に触れず操作ロックも取らない**ので、
  エンジンが落ちている最中でも呼べます。ウォッチドッグが終了直前にこれを呼ぶのはそのためです
  （「Docker がそもそも上がらなかった」回は bash 側の処理が1つも走らないので、
  放っておくとウォッチドッグ自身の失敗が誰にも届きません）

---

## トラブルシューティング

### コンテナが起動しない

```bash
./manage.sh logs <app-name>               # ログ確認
./manage.sh status                        # 全体の状態確認
```

### 502 Bad Gateway

対象アプリのコンテナが停止中または起動失敗しています。Gateway 自体は動的DNS解決を使用しているため、特定アプリが停止していてもクラッシュしません。

```bash
./manage.sh status                        # 全体の状態確認（停止中のアプリを特定）
./manage.sh logs <app-name>               # 問題のアプリのログ確認
./manage.sh build <app-name>              # 再ビルドして起動
```

### データベース接続エラー

```bash
./manage.sh logs inheritance-case-management  # ITCM ログ
./manage.sh logs bank-analyzer                # Bank Analyzer ログ

# 直接接続テスト
docker exec -it itcm-postgres psql -U postgres -d inheritance_tax_db
docker exec -it bank-analyzer-postgres psql -U bankuser -d bank_analyzer
```

### ホットリロードが効かない

Windows + Docker Desktop 環境では、ボリュームマウントでファイル監視が正常に動作しないことがあります:

```bash
./manage.sh restart <app-name>
```

**private-banking / inheritance-case-management はこの方法では反映されません。** この2アプリはソースを bind mount しておらず、`watch` を起動している間だけ同期されます（詳細は [ソース同期](#ソース同期private-banking--inheritance-case-management)）。

```bash
./manage.sh watch <app-name>
```

watch を止めている間に編集した分は同期されないため、その場合は `./manage.sh build <app-name>` でイメージに取り込みます。

### `✓ Ready` と出ているのに一部のルートだけ 404

Next.js の dev サーバはルート表を watchpack の初期スキャン結果から組み立てます。Docker Desktop for Windows の bind mount は起動直後の `scandir` が EFAULT を返すことがあり、失敗したディレクトリ配下のルートが**警告1行だけ残して丸ごと欠落**します。`/api/health` は生き残るため healthcheck は healthy のままです。

上記2アプリでは bind mount を廃止して原因経路を除去済みですが、万一再発した場合に備え、dev 起動時のみ `docker-entrypoint.sh` が出力を監視し、`Watchpack Error (initial scan)` を検知したらコンテナを落とします（`restart: unless-stopped` で再起動）。

```bash
docker logs <container> 2>&1 | grep "Watchpack Error (initial scan)"
```

> Turbopack のポーリングが出す `watch error ([...]): Io(Os { code: 2, kind: NotFound })` は `.next-internal` の一時ファイル起因で無害です。上記とは別物なので混同しないこと。

### 特定アプリだけ起動したい

全アプリを起動する必要はありません。アプリ名を付けて `start` します（ネットワークと bank-analyzer の external ボリュームは無ければ作られます）:

```bash
./manage.sh start gateway      # Gateway + Portal
./manage.sh start inheritance-tax-docs     # 必要なアプリだけ起動
```

`docker compose up -d` を直接叩くこともできますが、モードの記録（`docker/logs/app-modes/`）が更新されず、bank-analyzer は external ボリュームが無い PC では起動できません。

### ネットワークエラー

全コンテナは `tax-apps-network` という外部ネットワークで通信します。ネットワークが存在しない場合:

```bash
docker network create tax-apps-network
```

---

## リファレンス

### サービス一覧

| アプリケーション | Gateway URL | Port | 技術 | 説明 |
|:----------------|:------------|:-----|:-----|:-----|
| Portal | http://localhost/ | 3000 | Next.js（静的出力）+ Nginx | メインポータル |
| Gift Tax Simulator | http://localhost/gift-tax-simulator/ | 3001 | Vite | 贈与税計算シミュレーター |
| Inheritance Tax Docs | http://localhost/inheritance-tax-docs/ | 3003 | Vite + Express + SQLite | 相続税 資料ガイド |
| Inheritance Tax App | http://localhost/inheritance-tax-app/ | 3004 | Vite + Express | 相続税計算 |
| Bank Analyzer | http://localhost/bank-analyzer/ | 3007 | React + Hono + PostgreSQL | 銀行分析 |
| Retirement Tax | http://localhost/retirement-tax-calc/ | 3013 | Vite | 退職金税額計算 |
| Stock Valuation Form | http://localhost/stock-valuation-form/ | 3014 | Vite + Hono + PostgreSQL | 株式評価明細書 |
| Depreciation Calc | http://localhost/depreciation-calc/ | 3015 | Vite | 減価償却計算 |
| Asset Valuation | http://localhost/asset-valuation/ | 3017 | Vite | 減価償却資産評価 |
| Capital Gains Calc | http://localhost/capital-gains-calc/ | 3019 | Vite | 譲渡所得税計算 |
| Inheritance Tax Form | http://localhost/inheritance-tax-form/ | 3021 | Vite | 相続税の申告書 全24様式 |
| ITCM | http://localhost/itcm/ | 3020 | Next.js + PostgreSQL | 案件管理システム |
| Private Banking | http://localhost/private-banking/ | 3025 | Next.js + Prisma + PostgreSQL | ファミリーB/S |
| Insurance App | http://localhost/insurance/ | 3030 | Next.js (standalone) + SQLite | 保険管理 |
| Staff Directory | http://localhost/staff-directory/ | 3031 | Vite + Express + SQLite | 社員台帳 |

### バックエンドサービス

| サービス | Port | 説明 |
|:--------|:-----|:-----|
| itcm-postgres | 3022 | ITCM用 PostgreSQL |
| private-banking-postgres | 3026 | ファミリーB/S用 PostgreSQL |
| bank-analyzer-postgres | 5432 (内部) | 銀行分析用 PostgreSQL（ボリュームは external。`manage.sh` が無ければ作る） |
| svf-postgres | 3016 | 株式評価明細書の業種目DB・案件用 PostgreSQL |

### 起動順序

manage.sh は以下の順序でアプリを起動します（停止は逆順）:

| # | アプリ | 備考 |
|:--|:------|:-----|
| 1 | inheritance-case-management | PostgreSQL + Next.js |
| 2 | bank-analyzer | PostgreSQL + Hono + React |
| 4 | insurance-app | SQLite + Next.js |
| 5 | private-banking | PostgreSQL + Next.js |
| 6 | inheritance-tax-app | Vite + Express |
| 7 | gift-tax-simulator | Vite |
| 8 | inheritance-tax-docs | Vite + Express + SQLite |
| 9 | retirement-tax-calc | Vite |
| 10 | depreciation-calc | Vite |
| 11 | asset-valuation | Vite |
| 12 | stock-valuation-form | PostgreSQL + Hono + Vite |
| 13 | capital-gains-calc | Vite |
| 14 | inheritance-tax-form | Vite |
| 15 | staff-directory | Vite + Express + SQLite |
| 16 | gateway | Nginx + Portal（管理対象アプリ起動後に起動） |

### ポートマップ

ホストへ publish するポートは `127.0.0.1` に限定しています。LAN など外部端末からは直接アクセスできず、同一PC上のブラウザまたは Gateway 経由で利用します。

| Port | サービス | Compose プロジェクト |
|:-----|:---------|:-------------------|
| 80 | Nginx Gateway | docker/gateway |
| 3000 | Portal | docker/gateway |
| 3001 | Gift Tax Simulator | apps/gift-tax-simulator |
| 3003 | Inheritance Tax Docs | apps/inheritance-tax-docs |
| 3004 | Inheritance Tax App | apps/inheritance-tax-app |
| 3007 | Bank Analyzer | apps/bank-analyzer |
| 3013 | Retirement Tax Calc | apps/retirement-tax-calc |
| 3014 | Stock Valuation Form | apps/stock-valuation-form |
| 3015 | Depreciation Calc | apps/depreciation-calc |
| 3016 | Stock Valuation Form PostgreSQL | apps/stock-valuation-form |
| 3017 | Asset Valuation | apps/asset-valuation |
| 3019 | Capital Gains Calc | apps/capital-gains-calc |
| 3020 | ITCM Web | apps/inheritance-case-management |
| 3021 | Inheritance Tax Form | apps/inheritance-tax-form |
| 3022 | ITCM PostgreSQL | apps/inheritance-case-management |
| 3025 | Private Banking | apps/private-banking |
| 3026 | Private Banking PostgreSQL | apps/private-banking |
| 3030 | Insurance App | apps/insurance-app |
| 3031 | Staff Directory | apps/staff-directory |

### Preflight Check

`./manage.sh preflight` で起動前の環境チェックを実行できます。`start` コマンドからも Docker 起動確認が自動実行されます。
既に Tax Apps が起動中の場合、そのポートは外部競合ではなく Tax Apps 使用中として扱われます。

| # | チェック項目 | 判定 |
|:--|:------------|:-----|
| 1 | Docker Desktop 起動確認 | ERROR（致命的） |
| 2 | `docker compose` コマンド確認 | ERROR（致命的） |
| 3 | docker-compose.yml ファイル存在確認（`APPS` 配列の全16件） | OK / WARN |
| 4 | Compose config 検証 | OK / WARN |
| 5 | Nginx 設定ファイル存在確認 | OK / WARN |
| 6 | ITCM `.env` ファイル存在確認 | OK / WARN |
| 7 | 暗号化バックアップの鮮度・暗号鍵・平文ディレクトリの残存 | OK / WARN |
| 8 | スケジュールタスク2件（ウォッチドッグ・ログオン時の自動起動）の登録確認 | OK / WARN |
| 9 | ポート競合検出（Tax Apps 自身の使用ポートは除外） | OK / WARN |
| 10 | ホストディスク空き容量（5GB未満で警告） | OK / WARN |
| 11 | Docker daemon メモリ（4GB未満で警告） | OK / WARN |
| 12 | Docker ディスク使用量表示 | OK / WARN |
| 13 | `docker-entrypoint.sh` を使うイメージの CRLF ガード（`FROM` の継承を辿って確認） | OK / WARN |
| 14 | 無人処理の直近結果（`OPS_WATCHED_RESULTS` の全件。成否と経過時間） | OK / WARN |
| 15 | 一覧の取りこぼし（`apps/` と `APPS`、`VOLUMES` と実ボリューム、`backup.sh` の対象配列の突き合わせ） | OK / WARN |
| 16 | テストの登録漏れ（`package.json` の `test` / `typecheck` ↔ `TEST_TARGETS` ↔ CI の matrix） | OK / WARN |
| 17 | メモリ上限と V8 のヒープ上限のズレ（上限があるのに `NODE_OPTIONS` が無い／ヒープ上限がコンテナの上限以上） | OK / WARN |
| 18 | 本番オーバーレイの欠け（`APPS` 全アプリ分の `docker-compose.prod.yml` の有無） | OK / WARN |
| 19 | ゲートウェイに外から届くファイアウォールの穴（80番のルールが全送信元に戻っていないか） | OK / WARN |
| 20 | **記録されたモードがあるのに上がっていないアプリ**（落ち方を3つに分けて直し方ごと出す） | OK / WARN |
| 21 | 持ち主の死んだウォッチドッグのロックの残存（残っている間、自動復旧は1回も走っていない） | OK / WARN |
| 22 | DB の照合順序が libc 依存でないか（`C` 以外、および DB が `C` でも template1 が libc 依存の場合） | OK / WARN |
| 23 | ホスト側に湧いた `node_modules`（`apps/<app>` とその1つ下まで） | OK / WARN |

> 14・15・16 は「手書きの一覧がいつの間にか実体とズレる」「無人処理が黙って飛ぶ」を見張るためのものです。実際に、週次のリストア訓練が2週続けてロック衝突で飛んでも `preflight` は何も言わず（当時はバックアップ**ファイルの日付**しか見ていなかった）、`VOLUMES` には存在しないボリュームが2件載る一方で実在するデータボリューム2件が抜けていました（`clean` が「全データを削除します」と表示しながら2アプリ分を残していた）。

> 20・21 は「**上がっているべきものが上がっているか**」を見るためのものです。2026-10-11、13アプリが
> コンテナもイメージも無い状態で落ちていたのに preflight の全項目が通りました —— この向きの項目が
> 1つも無かったためです。20 は落ち方を「イメージが無い（`build` が要る）／作成のまま
> （`up -d --force-recreate`）／ただ落ちている（`recover` で足りる）」に分けて名前ごと出します
> （停止マーカーがある間は何も言いません）。21 のロックが残っている間、自動復旧は1回も走りません。

> 23 は「**.gitignore 済みなので `git status` に出ないゴミ**」を見張るためのものです。このリポジトリは
> npm をホストで動かさないので、`apps/` の下の `node_modules` は何にも使われません。2026-10-13 には
> 3アプリで合計 1.6GB まで育っていて、誰も気づいていませんでした。**見つけたらその場で消すこと** ──
> ほかへ退避すると、パスが 260 文字を超えた時点で Windows では `rm` でもエクスプローラでも消せなくなります
> （`@prisma/engines` の下が実際にそうなり、短いパスへ rename してからでないと消せませんでした）。

### Docker Build Cache Cleanup

`./manage.sh clean-cache` はコンテナ、イメージ、ボリューム、DBデータを削除せず、Docker Build Cache だけを確認付きで削除します。

| コマンド | 内容 |
|:---------|:-----|
| `./manage.sh clean-cache` | 使われていない Build Cache を削除（イメージと共有している層は残る） |
| `./manage.sh clean-cache --all` | 未使用の Build Cache をすべて削除（次回ビルドは遅くなる可能性あり） |
| `./manage.sh prune` | 無人向け。確認なしで dangling イメージ（168時間以上前）を削除し、ビルドキャッシュは Private が 10GB を超えたときだけ丸ごと落とす |

`prune` は消していいものしか消しません。

- **dangling イメージだけ**（`-a` は付けない）。`-a` は「停止中のコンテナが使うはずのイメージ」まで
  消すため、prod で止めてあるアプリが次の起動でいきなり再ビルドになります
- **ビルドキャッシュの prune に絞り込みのフラグを渡してはいけません**。Docker Desktop の
  builder（driver=docker）では `--max-used-space` / `--reserved-space` / `--filter until=…`
  のどれを渡しても**何も消さずに終了コード 0 を返します**（実測）。ここは `--max-used-space 10GB`
  だったため、**毎回成功を記録しながら1バイトも消さず 61.22GB まで積み上がっていました**
  （フラグ無しの `docker builder prune --force` に替えた途端 19.06GB 消えました）。素の prune は
  刻めないので、`docker buildx du` の **Private** が上限（既定10GB）を超えたときだけ丸ごと落とします
- **ボリュームには絶対に触りません**。`docker volume prune` は停止中のコンテナのボリュームを
  未使用とみなすので、アプリを止めている間に走ると DB ごと消えます
- 消した量は `last-run` の detail に残ります（`manage.sh status` に `images 0B / cache 68.47MB kept`
  のように出る）。成否だけでは上の「フラグを渡すと無言で何もしない」が見えません
- 無人側は**ウォッチドッグの `due` から独立した項目として**呼ばれます（前回の成功から144時間
  以上経っていれば実行。成否は `prune` として記録）。以前はリストア訓練の最後にぶら下げていた
  ため、訓練成功の直後に落ちると掃除だけ記録を失い、次の週次訓練まで直せませんでした

### Gateway 機能

| 機能 | 説明 |
|:-----|:-----|
| 動的DNS解決 | Docker DNS resolver + 変数で起動時のホスト名依存を排除。コンテナ未起動でも Gateway は起動し、該当サービスのみ 502 を返す |
| Gzip圧縮 | CSS, JS, JSON等を自動圧縮 |
| レート制限 | API 60req/s (burst=30), 一般 300req/s (burst=100) |
| セキュリティヘッダー | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| ヘルスチェック | `/health`（liveness）、`/ready`（readiness）エンドポイント |

### Docker Compose 共通設定

| 設定 | 内容 |
|:-----|:-----|
| ログローテーション | 10MB × 3ファイル |
| リソース制限 | deploy.resources による memory limit/reservation（Gateway/Portal は 256M/64M）と PID 上限（256）。**全アプリの全サービスに上限あり** |
| 実行時保護 | **全アプリの全サービスに `no-new-privileges`**（各 compose の `x-security-opts` アンカー）。Gateway/Portal はさらに非root、read-only root filesystem、全 capability drop |
| ヘルスチェック | 全サービスに設定。コンテナ内の自己診断は IPv6 誤判定を避けるため `127.0.0.1` を使用 |
| 自動復旧 | `tax-apps.autoheal=true` ラベル付きの unhealthy コンテナを、ホスト側の `docker-watchdog.ps1` が再起動（Docker socket はコンテナへ渡さない）。ラベルとスケジュールタスク登録の**両方**が必要で、配線状況は `manage.sh status` の末尾で確認する（[配線の確認](#配線の確認重要)） |
| 依存関係管理 | service_healthy 条件 |
| 外部ネットワーク | `tax-apps-network` で全コンテナ間通信 |

> **新しいアプリを足すときの2点**
>
> - `security_opt` と memory 上限は `x-security-opts` / `deploy.resources` を既存 compose からそのまま写す。
>   以前は bank-analyzer とゲートウェイにしか `no-new-privileges` が無く、private-banking は
>   本番用の override にだけ書かれていた（＝dev で動かしている間と postgres 側は素通し）。
> - **Node.js のアプリに memory 上限を付けるときは `NODE_OPTIONS: --max-old-space-size=…` を必ず一緒に置く。**
>   V8 の既定ヒープ上限はホストの物理メモリから決まるので、コンテナ側にだけ上限を掛けると
>   「GC が走る前に cgroup の上限へ当たって OOM kill」になりうる。上限の 3/4 程度を目安にする。
>
> どちらも**コンテナを作り直して初めて効く**。反映は `./manage.sh apply [app]`（再ビルドなし、
> アプリごとの dev/prod モードを踏襲、停止中のアプリには触らない）。`docker restart` では反映されない。

### ヘルスチェック方式

| 対象 | 方式 | 備考 |
|:-----|:-----|:-----|
| Gateway | `curl --fail` | nginx Dockerfile に curl 追加 |
| Portal (prod) | `wget --spider` | nginx:alpine 内蔵 |
| Next.js / Express 系 (dev) | `node -e "fetch(...)"` | Node.js 内蔵 |
| Vite 系 (dev) | `wget --spider` | BusyBox 内蔵 |
| PostgreSQL | `pg_isready -U <user> -d <db>` | PostgreSQL 内蔵 |

DB を持つアプリの healthcheck は、アプリの `/api/health` を叩いて **DB まで確かめる**。
DB が使えなければ 503 を返すので、コンテナは unhealthy になりウォッチドッグの再起動対象になる
（以前は DB を見ていない・見ても 200 を返すアプリがあり、DB が落ちても healthy のままだった）。

| DB | health が見るもの | 503 の本文 |
|:---|:-----------------|:-----------|
| PostgreSQL（itcm・bank-analyzer・private-banking・stock-valuation-form） | `SELECT 1` | itcm は `database: 'disconnected'`、他は `error: 'database unreachable'`。どれもログに `[health] DB に接続できません:` |
| SQLite（insurance-app・inheritance-tax-docs・staff-directory） | `SELECT 1` に加えて、DB ファイルとそのフォルダに**書けるか**（`W_OK`。DB には何も書かない） | `database: 'EACCES'` など（エラーコード） |

SQLite で書込権限まで見るのは、`SELECT 1` だけだと「開けて読めるが書けない」状態（リストアで所有者が
ずれた場合など）を見逃すため。6アプリとも、DB 停止や `chmod` で 503 になり、戻せば再起動なしに
200 へ戻ることを実測済み。

### 技術スタック

| カテゴリ | 技術 |
|:---------|:-----|
| Frontend | Next.js 16.1〜16.4, React 19, Vite 6.3〜7.3, Tailwind CSS v4（inheritance-tax-app のみ v3） |
| Backend | Next.js API Routes, Hono, Express, Prisma |
| Database | PostgreSQL 16（alpine。bank-analyzer のみ pgvector の bookworm）、照合順序 `C`, SQLite |
| Infrastructure | Docker, Nginx 1.27 |
| Node.js | v22 LTS |

### ディレクトリ構造

```
tax_apps/
├── apps/                       # アプリケーションコード（各アプリに docker-compose.yml と docker-compose.prod.yml）
│   ├── portal/app/             # ポータル（Next.js の静的出力。ビルドと起動は docker/gateway）
│   ├── gift-tax-simulator/     # 贈与税計算
│   ├── inheritance-tax-docs/   # 相続税資料ガイド（Express + SQLite）
│   ├── inheritance-tax-app/    # 相続税計算（Express）
│   ├── inheritance-case-management/  # 案件管理
│   │   ├── web/                #   Next.js + Hono + Prisma
│   │   └── .env                #   PostgreSQL認証情報（git管理外）
│   ├── insurance-app/          # 保険管理（SQLite）
│   ├── private-banking/        # ファミリーB/S（Next.js + Prisma + PostgreSQL）
│   ├── retirement-tax-calc/    # 退職金税額計算
│   ├── depreciation-calc/      # 減価償却計算
│   ├── capital-gains-calc/     # 譲渡所得税計算
│   ├── asset-valuation/        # 減価償却資産評価
│   ├── stock-valuation-form/   # 株式評価明細書（Hono + Prisma + PostgreSQL）
│   ├── inheritance-tax-form/   # 相続税の申告書 全24様式
│   ├── bank-analyzer/          # 銀行分析（Hono + Prisma + PostgreSQL。DB ボリュームは external）
│   └── mcp-server/             # 株式評価明細書へ書き込む stdio MCP サーバー（常駐しない）
├── docker/                     # Docker 管理
│   ├── Dockerfile.vite-static  # Vite系アプリ共通Dockerfile（7アプリ）
│   ├── gateway/                # Gateway Compose プロジェクト
│   │   ├── docker-compose.yml  #   Nginx + Portal
│   │   └── docker-compose.prod.yml  #   本番オーバーライド
│   ├── scripts/                # 管理スクリプト
│   │   ├── manage.sh           #   管理スクリプト本体（全機能）
│   │   ├── manage.bat          #   Windows 補助ラッパー（ダブルクリックで開発モード起動）
│   │   ├── backup.sh           #   全体バックアップ/リストア/リストア訓練の本体
│   │   ├── lib/                #   共通処理（ops-common.sh / compose-build.sh / notify-failure.ps1）
│   │   ├── tests/              #   スクリプトのテスト
│   │   ├── start-prod.bat      #   ワンクリック本番モード起動
│   │   ├── stop.bat            #   ワンクリック停止
│   │   ├── status.bat          #   ワンクリック状態確認
│   │   ├── backup-db.bat       #   backup.sh itcm を呼び出す Windows 補助ラッパー（手動の入口）
│   │   ├── restore-drill.bat   #   backup.sh drill を呼び出す Windows 補助ラッパー（手動の入口）
│   │   ├── restore.bat         #   backup.sh restore を呼び出す Windows 補助ラッパー
│   │   ├── restore-new-pc.bat  #   backup.sh newpc を呼び出す Windows 補助ラッパー（新しい PC で全部戻す）
│   │   ├── set-backup-usb.bat  #   backup.sh usb を呼び出す Windows 補助ラッパー（外部コピー先を選ぶ）
│   │   ├── register-startup-task.bat/.ps1         #  ログオン時の自動起動タスク登録（昇格不要）
│   │   ├── register-docker-watchdog-task.bat/.ps1 #  ウォッチドッグのタスク登録（昇格不要）
│   │   ├── unregister-*.bat    #   タスクの解除（backup / restore-drill は廃止したタスクの解除用）
│   │   ├── docker-watchdog.ps1 #   Docker Desktop 監視/復旧本体
│   │   └── docker-watchdog.bat #   watchdog Windows 補助ラッパー
│   ├── specs/                  # 仕様書
│   │   └── manage-script-spec.md #  管理スクリプト仕様書
│   ├── RESTORE.md              # リストア手順書
│   ├── COLLATION-MIGRATION.md  # 照合順序 C への移行（別の PC 用）
│   ├── OTHER-PC-SETUP.md       # 別の PC の更新・新規構築（AI にそのまま渡せる形）
│   ├── backups/                # バックアップ保存先（git管理外）
│   ├── logs/                   # last-run・app-modes・ウォッチドッグのログ（git管理外）
│   └── README.md               # このファイル
└── nginx/                      # Nginx 設定（gateway のビルドコンテキスト）
    ├── Dockerfile              # Nginx イメージ
    ├── nginx.conf              # グローバル設定
    ├── default.conf            # ルーティング設定
    ├── robustness-checklist.md # 堅牢性チェックリスト
    ├── includes/               # 共通設定（upstreams.conf のアドレスレジストリなど）
    ├── html/                   # カスタムエラーページ（404 / 429 / 50x / 503）
    └── readme.md               # Nginx説明
```
