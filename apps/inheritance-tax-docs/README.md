# 相続税申告 資料準備ガイド (Inheritance Tax Docs)

相続税申告に必要な資料の準備、確認、および管理をサポートするWebアプリケーションです。

## プロジェクト概要

このアプリケーションは、複雑になりがちな相続税申告の必要書類を整理し、ユーザーが効率的に準備を進められるよう支援します。

### 主な機能
- **資料リスト管理**: 申告に必要な書類のリスト表示と状態管理
- **ドラッグ&ドロップ**: 書類の並び順をドラッグ&ドロップで変更可能
- **書類の編集**: 書類名、説明、取得方法をカスタマイズ可能
- **カスタム書類追加**: 独自の書類をリストに追加可能
- **代行可否設定**: 各書類の取得代行可否を切り替え可能
- **Excel出力**: `xlsx-js-style` を使用したExcelファイルの出力機能
- **PDF保存/印刷**: ブラウザの印刷機能を使用したPDF保存
- **JSON保存/読込**: 設定をJSONファイルとして保存・復元可能
- **レスポンシブデザイン**: Tailwind CSS v4 を採用したモダンなUI

### 画面構成
1. **編集画面**: 書類の選択・編集・並べ替えを行う画面
   - 保存ボタン: 現在の設定をJSONファイルとしてダウンロード
   - 読込ボタン: JSONファイルから設定を復元
2. **結果画面（プレビュー）**: 最終的な書類リストを確認・出力する画面
   - Excel出力ボタン: Excelファイルとしてダウンロード
   - PDF保存/印刷ボタン: ブラウザの印刷ダイアログを表示
   - 保存/読込ボタン: JSON形式での設定保存・復元

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
- `src/components`: UIコンポーネント
  - `InheritanceTaxDocGuide.tsx`: メインロジック（状態管理）
  - `SelectionScreen.tsx`: 編集画面
  - `ResultScreen.tsx`: 結果画面（プレビュー/印刷用）
  - `StepIndicator.tsx`: ステップインジケーター
- `src/constants`: 定数・マスターデータ
  - `documents.ts`: 書類データの定義
- `src/utils`: ユーティリティ関数
  - `excelExporter.ts`: Excel出力機能
  - `jsonDataManager.ts`: JSON保存/読込機能
  - `iconMap.ts`: アイコンマッピング
- `public`: 静的アセット

## JSONデータ形式

保存されるJSONファイルには以下の情報が含まれます：

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-02-04T00:00:00.000Z",
  "appName": "inheritance-tax-docs",
  "data": {
    "clientName": "お客様名",
    "deceasedName": "被相続人名",
    "deadline": "2026-03-31",
    "deletedDocuments": {},
    "customDocuments": [],
    "documentOrder": {},
    "editedDocuments": {},
    "canDelegateOverrides": {}
  }
}
```
