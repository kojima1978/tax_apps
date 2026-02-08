# 相続税申告 資料準備ガイド (Inheritance Tax Docs)

相続税申告に必要な資料の準備、確認、および管理をサポートするWebアプリケーションです。

## プロジェクト概要

このアプリケーションは、複雑になりがちな相続税申告の必要書類を整理し、ユーザーが効率的に準備を進められるよう支援します。

### 主な機能
- **統合ビュー**: テーブル上で直接 編集・削除・並べ替え・代行切替ができるWYSIWYG型の1画面構成
- **ドラッグ&ドロップ**: テーブル行のドラッグ&ドロップで書類の並び順を変更
- **書類の編集**: モーダルダイアログで書類名、説明、取得方法をカスタマイズ
- **カスタム書類追加**: モーダルダイアログで独自の書類をリストに追加
- **具体的書類名**: 各書類に具体的な名称（例：三菱UFJ銀行 普通口座）をインライン追加
- **代行可否設定**: 各書類の取得代行可否をワンクリックで切り替え
- **一括操作**: カテゴリ単位の一括不要/一括復元
- **Excel出力**: `xlsx-js-style` を使用したスタイル付きExcelファイルの出力
- **印刷/PDF保存**: ブラウザの印刷機能を使用（印刷時は自動でチェックボックス列に変換）
- **JSON保存/読込**: 設定をJSONファイルとして保存・復元（後方互換あり）
- **レスポンシブデザイン**: Tailwind CSS v4 を採用したモダンなUI

### 画面構成
統合ビュー（1画面）で以下の操作をすべて実行できます：
- **ヘッダーツールバー**: 保存・読込・Excel出力・印刷ボタン
- **基本情報入力**: お客様名・被相続人名・資料収集期限
- **カテゴリテーブル群**: カテゴリごとに展開/折りたたみ可能なテーブル
  - 各行: DnDハンドル | 書類名+具体名 | 内容説明 | 取得方法 | 代行 | 操作
  - 削除した行は斜線表示（印刷時は非表示）
- **注意事項・留意事項・フッター**

## 技術スタック

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, standalone output)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **DnD**: [@dnd-kit/core](https://dndkit.com/) + @dnd-kit/sortable
- **Excel**: [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style)

## 開発環境のセットアップ

### 必要要件
- Node.js (v22以上推奨)
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

#### スタンドアロン（このアプリのみ）
```bash
docker compose up -d
```
ポート **3003** で公開されます: [http://localhost:3003/inheritance-tax-docs](http://localhost:3003/inheritance-tax-docs)

#### 統合環境（全アプリ）
```bash
cd ../../docker
docker compose up -d
```
Nginx Gateway 経由でポート **80** から全アプリにアクセスできます。

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm run start` | ビルドされたアプリケーションを起動 |
| `npm run lint` | ESLintを実行 |

## ディレクトリ構成

```
src/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # ルートレイアウト
│   ├── page.tsx          # メインページ
│   └── globals.css       # グローバルスタイル（印刷CSS含む）
├── components/
│   ├── InheritanceTaxDocGuide.tsx  # エントリポイント（hook + render）
│   ├── UnifiedDocumentView.tsx     # 統合ビュー（ツールバー/基本情報/テーブル群/注意事項）
│   └── ui/
│       ├── DocumentForm.tsx        # 書類入力フォーム（追加/編集共通）
│       ├── DocumentFormModal.tsx   # フォームモーダル
│       ├── EditableCategoryTable.tsx # カテゴリテーブル（DnD/展開/一括操作）
│       └── EditableDocumentRow.tsx  # テーブル行（DnD/具体名/操作ボタン）
├── constants/
│   └── documents.ts      # 書類マスターデータ + 型定義（DocChanges, IconName等）
├── hooks/
│   ├── useDocumentGuide.ts  # 全状態管理 + ハンドラー
│   └── useJsonImport.ts     # JSONインポートロジック
└── utils/
    ├── excelExporter.ts   # Excel出力（xlsx-js-style）
    ├── jsonDataManager.ts # JSON保存/読込/バリデーション
    ├── helpers.ts         # ユーティリティ（isCustomDocument, formatDate等）
    └── iconMap.tsx        # アイコン名→Lucideコンポーネント変換
```

## JSONデータ形式

保存されるJSONファイルには以下の情報が含まれます：

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-02-09T00:00:00.000Z",
  "appName": "inheritance-tax-docs",
  "data": {
    "clientName": "お客様名",
    "deceasedName": "被相続人名",
    "deadline": "2026-03-31",
    "deletedDocuments": {},
    "customDocuments": [],
    "documentOrder": {},
    "editedDocuments": {},
    "canDelegateOverrides": {},
    "specificDocNames": {
      "doc_id": ["三菱UFJ銀行 普通口座", "ゆうちょ銀行 通常貯金"]
    }
  }
}
```
