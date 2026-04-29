# 税務業務アプリケーション統合環境

税務関連の各種業務アプリケーションを統合管理する環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 各アプリが独自の `docker-compose.yml` を持ち、`manage.sh` で一括管理
- **Nginx Gateway**: リバースプロキシによるルーティング（ポート80）
- **manage.sh**: 全アプリの起動・停止・ログ確認等を一括管理する本体スクリプト
- **backup.sh**: 全体バックアップ/リストア + ITCM定期バックアップ本体（`.bat` は Windows 補助ラッパー）

### アプリケーション一覧

| アプリ名 | パス | ゲートウェイURL | ポート | 技術スタック | 説明 |
|---------|------|----------------|--------|-------------|------|
| ポータル | `/` | http://localhost/ | 3000 | Next.js (Static) | ランチャーダッシュボード |
| 相続税計算 | `/inheritance-tax-app/` | http://localhost/inheritance-tax-app/ | 3004 | Vite + React | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax-simulator/` | http://localhost/gift-tax-simulator/ | 3001 | Vite + React | 贈与税・不動産取得税・登録免許税シミュレーション |
| 退職金税額計算 | `/retirement-tax-calc/` | http://localhost/retirement-tax-calc/ | 3013 | Vite + React | 退職金の税額計算シミュレーション |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | http://localhost/inheritance-tax-docs/ | 3003 | Vite + React | 相続税申告の必要書類ガイド |
| 非上場株式評価 | `/shares/` | http://localhost/shares/ | 3012 | Vite + React | 非上場株式の評価計算 |
| 確定申告必要書類 | `/tax-docs/` | http://localhost/tax-docs/ | 3002 | Vite + React | 確定申告書類管理 |
| 医療法人株式評価 | `/medical/` | http://localhost/medical/ | 3010 | Next.js + SQLite | 医療法人の株式評価 |
| 案件管理 | `/itcm/` | http://localhost/itcm/ | 3020/3022 | Next.js + Prisma + PostgreSQL | 相続税案件管理 |
| 減価償却計算 | `/depreciation-calc/` | http://localhost/depreciation-calc/ | 3015 | Vite + React | 中古資産の耐用年数・簿価計算 |
| 給与手取り計算 | `/salary-calc/` | http://localhost/salary-calc/ | 3016 | Vite + React | 給与・賞与の手取り計算シミュレーション |
| 減価償却資産評価 | `/asset-valuation/` | http://localhost/asset-valuation/ | 3017 | Vite + React | 相続税申告の減価償却資産評価 |
| 株式評価明細書 | `/stock-valuation-form/` | http://localhost/stock-valuation-form/ | 3014 | Vite + React | 取引相場のない株式の評価明細書 |
| 所得税計算 | `/income-tax-calc/` | http://localhost/income-tax-calc/ | 3018 | Vite + React | 所得税計算ツール |
| 銀行分析 | `/bank-analyzer/` | http://localhost/bank-analyzer/ | 3007 | Django + PostgreSQL | 預金移動分析 |

### 本番モード イメージサイズ

| 種別 | アプリ | イメージサイズ |
|------|--------|--------------|
| nginx (静的) | 15 Vite/Next.js アプリ + gateway | ~59-60MB |
| Next.js standalone | 医療法人株式評価 | ~240MB |
| Next.js + Prisma | 案件管理 | ~333MB |
| Django + Gunicorn | 銀行分析 | ~465MB |

## ディレクトリ構造

```
tax_apps/
├── apps/                              # アプリケーション群
│   ├── portal/                        # ポータルランチャー
│   ├── inheritance-tax-app/           # 相続税計算 (Vite)
│   ├── gift-tax-simulator/            # 贈与税計算 (Vite)
│   ├── retirement-tax-calc/           # 退職金税額計算 (Vite)
│   ├── income-tax-calc/               # 所得税計算 (Vite)
│   ├── inheritance-tax-docs/          # 相続税申告書類案内 (Vite)
│   ├── shares-valuation/              # 非上場株式評価 (Vite)
│   ├── tax-docs/                      # 確定申告必要書類 (Vite)
│   ├── depreciation-calc/             # 減価償却計算 (Vite)
│   ├── salary-calc/                   # 給与手取り計算 (Vite)
│   ├── asset-valuation/              # 減価償却資産評価 (Vite)
│   ├── stock-valuation-form/          # 株式評価明細書 (Vite)
│   ├── medical-stock-valuation/       # 医療法人株式評価 (Next.js + SQLite)
│   ├── inheritance-case-management/   # 案件管理 (Next.js + Prisma + PostgreSQL)
│   └── bank-analyzer-django/          # 銀行分析 (Django)
├── docker/                            # Docker共通設定
│   ├── gateway/                       # Nginx Gateway の docker-compose.yml
│   ├── scripts/                       # 管理スクリプト
│   │   ├── manage.sh                  # 管理スクリプト本体（起動・停止・ログ等）
│   │   ├── manage.bat                 # Windows 補助ラッパー（ダブルクリックで開発モード起動）
│   │   ├── backup.sh                  # 全体バックアップ/リストア + ITCM定期バックアップ本体
│   │   ├── start-prod.bat             # ワンクリック本番モード起動
│   │   ├── stop.bat                   # ワンクリック停止
│   │   ├── status.bat                 # ワンクリック状態確認
│   │   └── backup-db.bat              # backup.sh itcm を呼び出す Windows 補助ラッパー
│   ├── data/                          # 永続化データ（git管理外）
│   ├── backups/                       # バックアップ保存先
│   ├── postgres/                      # PostgreSQL初期化SQL
│   └── .env.example                   # 環境変数テンプレート
├── nginx/                             # Nginx Gateway設定
│   ├── nginx.conf                     # メイン設定
│   ├── default.conf                   # サーバーブロック定義
│   ├── includes/                      # 分割設定ファイル
│   │   ├── upstreams.conf             # アップストリーム定義
│   │   ├── maps.conf                  # マッピング定義
│   │   ├── proxy_params.conf          # プロキシパラメータ
│   │   └── rate_limit_*.conf          # レートリミット設定
│   └── html/                          # エラーページ
├── .gitignore
├── CLAUDE.md
└── README.md
```

### 各アプリのDocker構成

各アプリは独自の `docker-compose.yml` を持ちます:

```
apps/<アプリ名>/
├── docker-compose.yml          # 開発用（ソースマウント、HMR対応）
├── docker-compose.prod.yml     # 本番用オーバーライド（runner ステージ、リソース制限）
├── Dockerfile                  # マルチステージビルド（dev / builder / runner）
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

#### かんたん操作（ダブルクリック）

| 操作 | スクリプト | 場所 |
|:-----|:---------|:-----|
| 開発モード起動 | `manage.bat` | `docker\scripts\manage.bat` をダブルクリック |
| 本番モード起動 | `start-prod.bat` | `docker\scripts\start-prod.bat` をダブルクリック |
| 停止 | `stop.bat` | `docker\scripts\stop.bat` をダブルクリック |
| 状態確認 | `status.bat` | `docker\scripts\status.bat` をダブルクリック |
| 自動バックアップ | `backup-db.bat` | `docker\scripts\backup-db.bat` をダブルクリック |

#### Git Bashでの操作

```bash
# 開発モードで全アプリを起動
./docker/scripts/manage.sh start

# 本番モードで全アプリを起動
./docker/scripts/manage.sh start --prod
```

> `.env` ファイルは `.env.example` から自動作成されます。

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
   New-NetFirewallRule -DisplayName "Tax Apps Gateway (HTTP)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
   ```

3. **LAN内の他PCからアクセス**:
   ```
   http://<ホストPCのIPアドレス>/
   http://<ホストPCのIPアドレス>/inheritance-tax-app/
   http://<ホストPCのIPアドレス>/bank-analyzer/
   ```

> **注意**: ホストPCのIPアドレスが変わった場合は、ブラウザのURLを新しいIPに変更するだけで対応できます（Docker・nginx・アプリ側の設定変更は不要）。

### manage.sh コマンド一覧

```
./docker/scripts/manage.sh start             全アプリを開発モードで起動
./docker/scripts/manage.sh start --prod      全アプリを本番モードで起動（ビルド付き）
./docker/scripts/manage.sh stop              全アプリを停止
./docker/scripts/manage.sh down              全アプリを停止しコンテナを削除
./docker/scripts/manage.sh restart <app>     特定アプリを再起動
./docker/scripts/manage.sh build <app>       特定アプリをビルドして起動
./docker/scripts/manage.sh logs <app>        特定アプリのログを表示
./docker/scripts/manage.sh status            全アプリの状態を表示
./docker/scripts/manage.sh backup            全データベース・データをバックアップ（backup.sh に委譲）
./docker/scripts/manage.sh restore [dir]     バックアップからリストア（backup.sh に委譲）
./docker/scripts/manage.sh clean             不要なコンテナ・イメージを削除
./docker/scripts/manage.sh preflight         起動前チェック（Docker, ポート等）
./docker/scripts/backup.sh itcm              ITCM定期バックアップ（JSONエクスポート含む）
```

### 開発モード vs 本番モード

| | 開発モード (`start`) | 本番モード (`start --prod`) |
|---|---|---|
| ビルド | なし（ソースマウント） | `docker compose ... --build` |
| ソースコード | ホストからマウント（HMR対応） | イメージ内に含む |
| Dockerfile ターゲット | `dev` | `runner` |
| nginx系イメージサイズ | ~800MB (Node.js + ソース) | ~60MB (nginx + dist) |
| 用途 | ローカル開発 | デプロイ・動作検証 |

### アプリ個別のDocker起動

各アプリは独立した `docker-compose.yml` を持っているため、単体でも起動可能です。

```bash
cd apps/inheritance-tax-docs
docker compose up -d
# http://localhost:3003/inheritance-tax-docs/ にアクセス
```

### 個別アプリの開発

```bash
cd apps/<アプリ名>
docker compose up -d
docker compose logs -f
```

> ローカル環境を汚さないため、`npm install` や `npm run dev` はホスト側では実行しません。必要な作業は Docker コンテナ内または Docker Compose 経由で行います。

## 環境変数

### PostgreSQL（案件管理システム用）

`apps/inheritance-case-management/.env` に設定（`.env.example` から自動作成）:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_2024
POSTGRES_DB=inheritance_tax_db
```

### Bank Analyzer (Django)

`apps/bank-analyzer-django/.env` に設定（`.env.example` から自動作成）:

```env
DJANGO_SECRET_KEY=dev-secret-key-not-for-production
DJANGO_DEBUG=True
DB_PASSWORD=dev-password-change-in-production
```

## 技術スタック

- **フロントエンド**: Vite 6〜7 + React 19, Next.js 16+, Django Templates (Bootstrap 5)
- **バックエンド**: Next.js API Routes, Django
- **ORM**: Prisma (案件管理)
- **データベース**: SQLite, PostgreSQL 16 Alpine
- **スタイリング**: Tailwind CSS v4
- **アイコン**: lucide-react
- **本番サーバー**: nginx:1.27-alpine (静的サイト), Gunicorn (Django)
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

Windows でボリュームマウントを使用する場合、ファイル変更の検出に問題が発生することがあります。
各アプリの `docker-compose.yml` にて `WATCHPACK_POLLING=true` が設定されているため、追加の手順は不要です。

### npm ci の lockfile エラー

`package-lock.json` が `package.json` と不整合の場合、開発モードの起動時にエラーになります。

```bash
# Docker 内で lockfile を再生成（ローカルに npm 不要）
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/apps/<アプリ名>:/work" -w /work node:22-alpine sh -c "npm install --package-lock-only"
```

### Next.js Turbopack のクラッシュ

Next.js 16 の Turbopack がコンパイル時にクラッシュする場合（portal, medical-stock-valuation, inheritance-case-management）:
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
| `crypto.randomUUID()` が使えない | `crypto.getRandomValues()` ベースのフォールバック実装 | inheritance-tax-app, inheritance-tax-docs |
| Django の `ALLOWED_HOSTS` エラー (400) | ワイルドカード `*` を許可（開発モード） | bank-analyzer-django |
| Django の COOP ヘッダー警告 | `SECURE_CROSS_ORIGIN_OPENER_POLICY = None` で無効化 | bank-analyzer-django |

> `localhost` からのアクセスではこれらの問題は発生しません。

## ライセンス

Private
