# 税務業務アプリケーション統合環境

税務関連の各種業務アプリケーションを統合管理する環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 各アプリが独自の `docker-compose.yml` を持ち、`manage.bat` で一括管理
- **Nginx Gateway**: リバースプロキシによるルーティング（ポート80）
- **manage.bat**: 全アプリの起動・停止・バックアップ等を一括管理するスクリプト

### アプリケーション一覧

| アプリ名 | パス | ゲートウェイURL | ポート | 技術スタック | 説明 |
|---------|------|----------------|--------|-------------|------|
| ポータル | `/` | http://localhost/ | 3000 | Next.js (Static) | ランチャーダッシュボード |
| 相続税計算 | `/inheritance-tax-app/` | http://localhost/inheritance-tax-app/ | 3004 | Vite + React | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax-simulator/` | http://localhost/gift-tax-simulator/ | 3001 | Vite + React | 贈与税・不動産取得税・登録免許税シミュレーション |
| 退職金税額計算 | `/retirement-tax-calc/` | http://localhost/retirement-tax-calc/ | 3013 | Vite + React | 退職金の税額計算シミュレーション |
| 贈与税申告書類案内 | `/gift-tax-docs/` | http://localhost/gift-tax-docs/ | 3002 | Next.js (Static) | 贈与税申告の必要書類ガイド |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | http://localhost/inheritance-tax-docs/ | 3003 | Next.js (Static) | 相続税申告の必要書類ガイド |
| 非上場株式評価 | `/shares/` | http://localhost/shares/ | 3012 | Next.js (Static) | 非上場株式の評価計算 |
| 確定申告必要書類 | `/tax-docs/` | http://localhost/tax-docs/ | 3005/3006 | Vite + React + Express | 確定申告書類管理 |
| 医療法人株式評価 | `/medical/` | http://localhost/medical/ | 3010 | Next.js + SQLite | 医療法人の株式評価 |
| 案件管理 | `/itcm/` | http://localhost/itcm/ | 3020/3021 | Next.js + Hono + PostgreSQL | 相続税案件管理 |
| 銀行分析 | `/bank-analyzer/` | http://localhost/bank-analyzer/ | 3007 | Django + PostgreSQL | 預金移動分析 |

### 本番モード イメージサイズ

| 種別 | アプリ | イメージサイズ |
|------|--------|--------------|
| nginx (静的) | 6 Vite/Next.js アプリ + gateway + portal | ~59-60MB |
| Express | 確定申告必要書類 バックエンド | ~178MB |
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
│   ├── gift-tax-docs/                 # 贈与税申告書類案内 (Next.js)
│   ├── inheritance-tax-docs/          # 相続税申告書類案内 (Next.js)
│   ├── shares-valuation/              # 非上場株式評価 (Next.js)
│   ├── Required-documents-for-tax-return/ # 確定申告必要書類 (Vite + Express)
│   ├── medical-stock-valuation/       # 医療法人株式評価 (Next.js + SQLite)
│   ├── inheritance-case-management/   # 案件管理 (Next.js + Hono + Prisma)
│   └── bank-analyzer-django/          # 銀行分析 (Django)
├── docker/                            # Docker共通設定
│   ├── gateway/                       # Nginx Gateway の docker-compose.yml
│   ├── scripts/                       # 管理スクリプト
│   │   ├── manage.bat                 # Windows用 一括管理スクリプト
│   │   ├── manage.sh                  # Linux/Mac用 管理スクリプト
│   │   └── convert_encoding.ps1       # エンコーディング変換ユーティリティ
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
- Docker / Docker Compose
- Windows環境（manage.bat 使用時）

### 一括起動（推奨）

```bash
# 1. リポジトリをクローン
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps

# 2. 開発モードで全アプリを起動
docker\scripts\manage.bat start

# 3. 本番モードで全アプリを起動
docker\scripts\manage.bat start --prod
```

> `.env` ファイルは `.env.example` から自動作成されます。

ブラウザで http://localhost/ にアクセスしてポータルを開きます。

> **注意**: 各アプリへはポータル経由またはゲートウェイURLでアクセスしてください。ポート番号を指定して直接アクセスすると、アプリケーション間リンクや静的ファイルの読み込みが正常に動作しない場合があります。

### manage.bat コマンド一覧

```
manage.bat start              全アプリを開発モードで起動
manage.bat start --prod       全アプリを本番モードで起動（ビルド付き）
manage.bat stop               全アプリを停止
manage.bat down               全アプリを停止しコンテナを削除
manage.bat restart <app>      特定アプリを再起動
manage.bat build <app>        特定アプリをビルドして起動
manage.bat logs <app>         特定アプリのログを表示
manage.bat status             全アプリの状態を表示
manage.bat backup             全データベース・データをバックアップ
manage.bat restore [dir]      バックアップからリストア
manage.bat clean              不要なコンテナ・イメージを削除
manage.bat preflight          起動前チェック（Docker, ポート等）
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

### 個別アプリのローカル開発

```bash
cd apps/<アプリ名>
npm install
npm run dev
```

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

- **フロントエンド**: Vite + React, Next.js 16+, Django Templates (Bootstrap 5)
- **バックエンド**: Express, Hono, Django
- **ORM**: Prisma (案件管理), better-sqlite3 (確定申告書類)
- **データベース**: SQLite, PostgreSQL (pgvector)
- **スタイリング**: Tailwind CSS v4
- **アイコン**: lucide-react
- **本番サーバー**: nginx:1.27-alpine (静的サイト), Gunicorn (Django)
- **コンテナ**: Docker Compose（アプリ毎の独立構成 + prod override パターン）

## 開発ガイドライン

- 各アプリは独立した `docker-compose.yml` を持ち、単体で動作可能
- 共通の Nginx Gateway 経由でポート80からアクセス
- `.env` ファイルは `manage.bat start` 時に `.env.example` から自動作成
- データベースファイル（`*.db`, `*.sqlite3`）は git 管理外
- `.env` ファイルは git 管理外

## トラブルシューティング

### 502 Bad Gateway エラー

Nginx が 502 エラーを返す場合、バックエンドアプリが起動していない可能性があります。

```bash
# コンテナの状態を確認
manage.bat status

# 特定アプリのログを確認
manage.bat logs bank-analyzer

# 特定アプリを再起動
manage.bat restart bank-analyzer

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

Next.js 16 の Turbopack がコンパイル時にクラッシュする場合:
1. Dockerfile で **Node.js 22** を使用していることを確認
2. `.next` ディレクトリをボリュームとして分離:
   ```yaml
   volumes:
     - /app/.next
   ```

## ライセンス

Private
