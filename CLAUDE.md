# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

税務関連の業務アプリケーション群。各アプリは独立しており、個別にビルド・デプロイ可能。全UIは日本語。

## 重要な制約

- **ローカル環境を汚さない**: `npm install`、`npm run build` 等をローカルで実行しないこと。開発・動作確認はDocker経由で行う。

## コマンド

### Docker操作（推奨）
```bash
# 全サービス起動
cd docker && docker compose up -d

# ビルドし直して起動
cd docker && docker compose up -d --build

# 特定サービスのみ再ビルド
cd docker && docker compose up -d --build <service-name>

# ログ確認
cd docker && docker compose logs -f <service-name>

# 停止
cd docker && docker compose down

# 本番モード
cd docker && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 個別アプリの起動（スタンドアロン）
```bash
cd apps/<app-name> && docker compose up -d
```

### 個別アプリのスクリプト（Docker内で実行）
- Next.js系: `npm run dev` / `npm run build` / `npm run lint`
- Vite (inheritance-tax-app): `npm run dev` / `npm run build` / `npm run lint`
- Hono API (inheritance-case-management/api): `npm run dev` / `npm run test` (vitest) / `npm run db:generate` / `npm run db:push`
- Express (Required-documents-for-tax-return/backend): `npm run dev` / `npm run build`
- Django (bank-analyzer-django): `python manage.py runserver 0.0.0.0:3007`

## アーキテクチャ

### アプリケーション一覧とポート

| アプリ | パス | ポート | スタック |
|-------|------|--------|---------|
| portal | `/` | 3000 | Next.js (静的エクスポート→nginx) |
| inheritance-tax-app | `/inheritance-tax-app/` | 3004 | Vite/React |
| gift-tax-simulator | `/gift-tax-simulator/` | 3001 | Next.js + Chart.js |
| gift-tax-docs | `/gift-tax-docs/` | 3002 | Vite/React + @dnd-kit + xlsx-js-style |
| inheritance-tax-docs | `/inheritance-tax-docs/` | 3003 | Vite/React + @dnd-kit + xlsx-js-style |
| tax-docs (frontend) | `/tax-docs/` | 3005 | Next.js + @dnd-kit + xlsx-js-style |
| tax-docs (backend) | `/tax-docs-api/` | 3006 | Express + better-sqlite3 |
| medical-stock-valuation | `/medical/` | 3010 | Next.js + SQLite (Prisma) |
| shares-valuation | `/shares/` | 3012 | Next.js + react-number-format |
| retirement-tax-calc | `/retirement-tax-calc/` | 3013 | Next.js |
| inheritance-case-management (web) | `/itcm/` | 3020 | Next.js + React Query + React Table |
| inheritance-case-management (api) | `/itcm-api/` | 3021 | Hono + Prisma + PostgreSQL |
| bank-analyzer-django | `/bank-analyzer/` | 3007 | Django + pandas + Bootstrap |

### ディレクトリ構成

```
apps/                    # 各アプリケーション（独立）
docker/                  # 統合Docker Compose設定
  docker-compose.yml     # 開発用（全サービス起動）
  docker-compose.prod.yml # 本番オーバーライド
nginx/                   # Nginxゲートウェイ設定
```

各アプリは独自の `Dockerfile`、`docker-compose.yml`（スタンドアロン起動用）、`package.json` を持つ。

### インフラ

- **Nginxゲートウェイ**: ポート80でリバースプロキシ、パスベースルーティング
- **Docker Compose**: `docker/docker-compose.yml` で全サービス＋ゲートウェイを管理
- **DB**: PostgreSQL（案件管理、bank-analyzer）、SQLite（medical-stock-valuation, tax-docs）
- **環境変数**: `docker/.env`（`.env.example`参照）

### 技術スタック共通事項

- **フロントエンド**: Next.js 16.x (App Router) / Vite 7.x、React 19.x、TypeScript 5.x
- **スタイリング**: Tailwind CSS v4 (@tailwindcss/postcss)
- **アイコン**: lucide-react
- **DnD**: @dnd-kit（gift-tax-docs, inheritance-tax-docs, tax-docs）
- **Excel出力**: xlsx-js-style（書類案内系）、exceljs（inheritance-tax-app）
- **数値入力**: react-number-format（shares-valuation, medical-stock-valuation）
- **パッケージマネージャー**: npm（各アプリ個別）

### アプリ内の典型的なディレクトリ構成（Next.js系）

```
app/             # App Routerページ
components/      # UIコンポーネント
  ui/            # 汎用UIコンポーネント
hooks/           # カスタムフック
lib/             # ユーティリティ関数・定数・計算ロジック
```

### コーディング規約（既存コードから読み取れるパターン）

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
