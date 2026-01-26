# 贈与税申告 必要書類案内システム (Gift Tax Docs)

贈与税の申告に必要な書類を案内するための Web アプリケーションです。
ユーザーの状況に応じた必要書類のリストアップや、Excel 形式でのダウンロード機能などを提供します。

## 主な機能

- **必要書類の案内**: 贈与の種類や特例の適用有無に応じて、必要な書類を動的に表示します。
- **Excel 出力**: 案内された必要書類リストを Excel ファイルとしてダウンロードできます (`xlsx-js-style` を使用)。
- **レスポンシブデザイン**: Tailwind CSS v4 を使用したモダンでレスポンシブな UI。

## 技術スタック

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Excel Generation**: [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style)
- **Runtime**: Node.js

## 開発環境のセットアップ

### Docker を使用する場合 (推奨)

プロジェクトルート (`tax_apps`) の `docker-compose` を使用して起動します。
本アプリケーションはポート `3002` で動作します。

```bash
# プロジェクトルートで実行
docker compose up -d
```

アクセス: [http://localhost:3002/gift-tax-docs/](http://localhost:3002/gift-tax-docs/)

> **Note**: Nginx 経由でアクセスする場合のアドレスです。直接アクセスの場合は構成によりますが `http://localhost:3002` です。

### ローカルで直接実行する場合

依存関係をインストールして開発サーバーを起動します。

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (ポート3002を指定)
npm run dev -- -p 3002
```

## ディレクトリ構成

- `src/app`: Next.js App Router のページコンポーネント
- `src/components`: UI コンポーネント
  - `GiftTaxDocGuide.tsx`: メインコンポーネント（コンテナ）
  - `MenuStep.tsx`, `CheckStep.tsx`, `ResultStep.tsx`: 各ステップの画面コンポーネント
  - `ui/`: 汎用 UI コンポーネント
- `src/hooks`: カスタムフック
  - `useGiftTaxGuide.ts`: アプリケーションのロジックと状態管理
- `src/constants`: 定数・型定義
- `src/utils`: ユーティリティ関数
- `public`: 静的アセット

## Scripts

- `npm run dev`: 開発サーバーを起動
- `npm run build`: 本番用にビルド
- `npm run start`: ビルドされたアプリケーションを実行
- `npm run lint`: ESLint によるコードチェック
