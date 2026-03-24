# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Next.js系 / Vite系: `npm run dev` / `npm run build` / `npm run lint`
- Hono API (inheritance-case-management/api): `npm run dev` / `npm run test` (vitest) / `npm run db:generate` / `npm run db:push`
- Express (Required-documents-for-tax-return/backend): `npm run dev` / `npm run build`
- Django (bank-analyzer-django): `python manage.py runserver 0.0.0.0:3007`

## コーディング規約

- 3箇所以上の重複はユーティリティ関数・コンポーネントに抽出（DRY原則）
- データ駆動UI: 繰り返しJSXは定数配列 + `.map()` で生成
- フック抽出: 複数のuseState + ハンドラはカスタムフックに切り出し
- ファクトリパターン: CRUD API/ルートの共通化（`createCrudApi<T>`, `createCrudRouter`等）
- useMemo活用: IIFE `{(() => { ... })()}` は useMemo に置き換え
- コミットメッセージ・コメント: 日本語コンテキストで記述
