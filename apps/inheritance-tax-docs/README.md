# 相続税申告 資料準備ガイド (Inheritance Tax Docs)

相続税申告に必要な資料の準備、確認、および管理をサポートするWebアプリケーションです。

## プロジェクト概要

このアプリケーションは、複雑になりがちな相続税申告の必要書類を整理し、ユーザーが効率的に準備を進められるよう支援します。

### 主な機能
- **資料リスト管理**: 申告に必要な書類のリスト表示と状態管理
- **Excel連携**: `xlsx-js-style` を使用したExcelファイルの出力・操作機能（想定）
- **レスポンシブデザイン**: Tailwind CSS v4 を採用したモダンなUI

## 技術スタック

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: xlsx-js-style

## 開発環境のセットアップ

### 必要要件
- Node.js (v20以上推奨)
- Docker (コンテナで実行する場合)

### ローカル開発環境での実行

1. 依存関係のインストール
   ```bash
   npm install
   ```

2. 開発サーバーの起動
   ```bash
   npm run dev
   ```

3. ブラウザで確認
   [http://localhost:3000/inheritance-tax-docs](http://localhost:3000/inheritance-tax-docs) にアクセスしてください。

### Docker環境での実行

本プロジェクトは Docker Compose での実行環境が設定されています。

1. コンテナのビルドと起動
   ```bash
   docker-compose up
   ```

2. ブラウザで確認
   Docker環境で起動した場合、ポート **3003** で公開されます。
   [http://localhost:3003/inheritance-tax-docs](http://localhost:3003/inheritance-tax-docs) にアクセスしてください。

   > **Note**: `docker-compose.yml` 内でポート `3003` にマッピングされています。

## コマンド一覧

- `npm run dev`: 開発サーバーを起動
- `npm run build`: 本番用ビルドを作成
- `npm run start`: ビルドされたアプリケーションを起動
- `npm run lint`: ESLintを実行

## ディレクトリ構成

- `src/app`: Next.js App Router ページコンポーネント
- `src/components`: UIコンポーネント (メインロジック: `InheritanceTaxDocGuide.tsx`)
- `public`: 静的アセット
