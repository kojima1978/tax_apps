# Portal Launcher Gateway

税理士業務支援アプリケーション統合プラットフォーム

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。
Docker Composeを使用して、すべてのアプリケーションを一元的に起動・管理し、Nginx Gatewayを通じてアクセスします。

## アーキテクチャ

```
                    ┌─────────────────┐
                    │   Nginx Gateway │
                    │    (Port 80)    │
                    └───┬────┬────┬───┘
                        │    │    │
      ┌─────────────────┘    │    └─────────────────┐
      │                      │                      │
      ▼                      ▼                      ▼
┌───────────────┐  ┌──────────────────┐   ┌───────────────┐
│  Portal Site  │  │   Applications   │   │   Backends    │
│  (Port 3000)  │  │ (Medical/Shares) │   │   (API/DB)    │
└───────────────┘  └──────────────────┘   └───────────────┘
```

## クイックスタート

### 1. 環境変数の設定

`.env`ファイルを作成し、必要な環境変数を設定します。

```bash
# docker/.env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=inheritance_tax_db
```

### 2. 起動

```bash
# dockerディレクトリに移動
cd docker

# Windowsの場合
start.bat

# または直接実行
docker compose up -d --build
```

### 3. アクセス

ブラウザで以下のURLにアクセスしてください。

**メインポータル:** [http://localhost](http://localhost)

### 4. 停止

```bash
# Windowsの場合
stop.bat

# または直接実行
docker compose down
```

## サービス・アクセス一覧

Nginx Gateway (Port 80) を経由して各アプリケーションにアクセスします。

| アプリケーション | ゲートウェイURL | 直接ポート(Debug用) | 説明 |
|------------------|----------------|-------------------|------|
| **Portal Site** | [`http://localhost/`](http://localhost/) | 3000 | メインポータル・ダッシュボード |
| **Inheritance Tax** | [`http://localhost/inheritance-tax-app/`](http://localhost/inheritance-tax-app/) | 5173 | 相続税計算アプリ |
| **Gift Tax Simulator** | [`http://localhost/gift-tax-simulator/`](http://localhost/gift-tax-simulator/) | 3001 | 贈与税計算シミュレーター |
| **Gift Tax Docs** | [`http://localhost/gift-tax-docs/`](http://localhost/gift-tax-docs/) | 3002 | 贈与税申告 必要書類案内 |
| **Inheritance Tax Docs** | [`http://localhost/inheritance-tax-docs/`](http://localhost/inheritance-tax-docs/) | 3003 | 相続税申告 資料準備ガイド |
| **Real Estate Tax** | [`http://localhost/real-estate-tax/`](http://localhost/real-estate-tax/) | 3004 | 不動産取得税計算システム |
| **Tax Docs** | [`http://localhost/tax-docs/`](http://localhost/tax-docs/) | 3005 | 確定申告 必要書類案内 |

| **Medical Stock** | [`http://localhost/medical/`](http://localhost/medical/) | 3010 | 医療法人株式評価システム |
| **Shares Valuation** | [`http://localhost/shares/`](http://localhost/shares/) | 3012 | 非上場株式評価システム |
| **ITCM** | [`http://localhost/itcm/`](http://localhost/itcm/) | 3020 | 相続税案件管理システム |
| **Bank Analyzer** | [`http://localhost/bank-analyzer/`](http://localhost/bank-analyzer/) | 8501 | 相続銀行分析システム |

## ディレクトリ構造

```
tax_apps/
├── apps/                       # アプリケーションコード
│   ├── bank-analyzer/
│   ├── gift-tax-docs/
│   ├── gift-tax-simulator/
│   ├── inheritance-case-management/
│   ├── inheritance-tax-app/
│   ├── inheritance-tax-docs/
│   ├── medical-stock-valuation/

│   ├── portal/
│   ├── real-estate-tax/
│   ├── Required-documents-for-tax-return/
│   └── shares-valuation/
├── docker/                     # Docker設定
│   ├── docker-compose.yml
│   └── .env
└── nginx/                      # Nginx設定
    ├── default.conf
    └── nginx.conf
```

## 開発・トラブルシューティング

### コンテナの状態確認
```bash
docker ps
```

### 全サービスの再構築
コードの変更を反映させる場合などに実施します。
```bash
docker compose up -d --build --force-recreate
```

### ログ確認
```bash
# Gateway (Nginx) のログ
docker logs gateway_nginx

# 特定のアプリのログ
docker logs portal_app
docker logs medical-stock-valuation
```

## 技術スタック
- **Frontend**: Next.js 16, React 19, Vite
- **Backend**: FastAPI, Express, Node.js
- **Database**: PostgreSQL, SQLite
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Node.js**: v22 LTS（v24はTurbopackとの互換性問題あり）

## トラブルシューティング

### 502 Bad Gateway

```bash
# 全コンテナの状態確認
docker ps -a

# portal_appが再起動を繰り返す場合
docker logs portal_app --tail=50

# Nginxをリロード
docker exec gateway_nginx nginx -s reload
```

### Windows環境での注意点

Windows + Docker Desktop環境では、ボリュームマウントでファイル監視が正常に動作しないことがあります。
Next.jsアプリには以下の設定が必要です:

```yaml
environment:
  - WATCHPACK_POLLING=true
volumes:
  - ../apps/portal/app:/app
  - /app/node_modules
  - /app/.next  # ビルドキャッシュを分離
```

### Node.js バージョン

Next.js 16 (Turbopack) は Node.js 24 との互換性問題があります。
各アプリのDockerfileでは **Node.js 22** を使用してください:

```dockerfile
FROM node:22-slim
```

### Portal App (Prisma 7対応)

Portal AppはPrisma 7を使用しており、Docker環境では`libsql`の代わりに`better-sqlite3`を使用します。
Dockerfileでビルド時に以下の処理を行います:

1. `@prisma/adapter-libsql`と`@libsql/client`をpackage.jsonから除外
2. `@prisma/adapter-better-sqlite3`をインストール
3. Docker用の`prisma.config.ts`と`lib/prisma.ts`を生成

```dockerfile
# Docker用のprisma.tsを作成（better-sqlite3ドライバを使用）
RUN npm install @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3
```

### Shares Valuation

非上場株式評価システムは`public`フォルダを使用しないため、Dockerfileから該当のCOPY命令を削除しています。
