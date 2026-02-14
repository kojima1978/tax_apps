# 相続税申告 資料準備ガイド

相続税申告に必要な資料の準備・確認・管理をサポートするWebアプリケーションです。

## 主な機能

### 統合ビュー（1画面完結）

テーブル上で直接 編集・削除・並べ替え・代行切替ができるWYSIWYG型の画面構成です。

| 機能 | 説明 |
|:-----|:-----|
| 書類の編集 | モーダルダイアログで書類名・説明・取得方法をカスタマイズ |
| カスタム書類追加 | 独自の書類をカテゴリに追加 |
| 具体的書類名 | 各書類に具体名をインライン追加（連続入力対応、テキストクリック編集） |
| ドラッグ&ドロップ | テーブル行のD&Dで並び順を変更 |
| 代行可否設定 | 各書類の取得代行可否をワンクリック切替 |
| 一括操作 | カテゴリ単位の一括不要/一括復元 |
| 初期化 | 書類カスタマイズを標準状態に戻す（確認ダイアログ付き、基本情報は保持） |

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | xlsx-js-style によるスタイル付きExcelファイル |
| 印刷/PDF保存 | ブラウザ印刷機能（印刷時はチェックボックス列に自動変換） |
| JSON保存 | 設定をJSONファイルとして保存（後方互換あり） |
| JSON読込 | JSONファイルから設定を復元 |

### 画面レイアウト

- **ヘッダーツールバー**: 保存・読込・Excel・印刷・初期化ボタン
- **基本情報入力**: お客様名・被相続人名・資料収集期限・担当者・担当者連絡先
- **統計バー**: 有効件数・削除済み件数・追加件数 + 全て復元ボタン
- **カテゴリテーブル群**: カテゴリごとに展開/折りたたみ可能
  - 各行: D&Dハンドル | 書類名+具体名 | 内容説明 | 取得方法 | 代行 | 操作
  - 削除した行は斜線表示（印刷時は非表示）
- **注意事項・留意事項・フッター**

## セットアップ

### Docker（推奨）

中央統合環境から起動:

```bash
cd tax_apps/docker
start.bat
```

http://localhost/inheritance-tax-docs/ でアクセスできます。

### スタンドアロンDocker

```bash
cd tax_apps/apps/inheritance-tax-docs
docker compose up -d
```

http://localhost:3003/inheritance-tax-docs/ でアクセスできます。

### ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000/inheritance-tax-docs/ でアクセスできます。

## 技術スタック

| カテゴリ | 技術 |
|:--------|:-----|
| フレームワーク | Next.js 16 (App Router, standalone) |
| UI | React 19, Tailwind CSS v4 |
| 言語 | TypeScript 5 |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| Excel出力 | xlsx-js-style |
| アイコン | Lucide React |
| Docker | Port 3003, basePath: /inheritance-tax-docs |

## プロジェクト構造

```
inheritance-tax-docs/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # メインページ
│   │   ├── layout.tsx                # ルートレイアウト
│   │   └── globals.css               # グローバルスタイル（印刷CSS含む）
│   ├── components/
│   │   ├── InheritanceTaxDocGuide.tsx # エントリポイント（hook→view+modal）
│   │   ├── UnifiedDocumentView.tsx   # 統合ビュー（ツールバー/基本情報/テーブル群）
│   │   └── ui/
│   │       ├── DocumentFormModal.tsx  # 書類追加/編集モーダル
│   │       ├── DocumentForm.tsx      # 書類入力フォーム（add/edit共通）
│   │       ├── EditableCategoryTable.tsx # カテゴリテーブル（D&D/展開/一括操作）
│   │       ├── EditableDocumentRow.tsx   # テーブル行（D&D/具体名/操作）
│   │       ├── SpecificNamesList.tsx # 具体的書類名リスト（連続入力/編集/削除）
│   │       └── DismissibleBanner.tsx # 閉じられるバナー（error/success）
│   ├── constants/
│   │   └── documents.ts             # 書類マスターデータ + 型定義
│   ├── hooks/
│   │   ├── useDocumentGuide.ts      # 全状態管理 + ハンドラー（初期化含む）
│   │   ├── useDocumentModal.ts      # モーダル状態管理
│   │   └── useJsonImport.ts         # JSONインポートロジック
│   └── utils/
│       ├── excelExporter.ts         # Excel出力（xlsx-js-style）
│       ├── jsonDataManager.ts       # JSON保存/読込/バリデーション
│       ├── helpers.ts               # isCustomDocument, formatDate等
│       └── iconMap.tsx              # アイコン名→Lucideコンポーネント変換
├── Dockerfile                        # マルチステージビルド（base/deps/dev/builder/runner）
├── docker-compose.yml                # スタンドアロンDocker設定
├── next.config.ts                    # Next.js設定（standalone, basePath）
└── package.json
```

## JSONデータ形式

保存されるJSONファイルの構造:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-02-14T00:00:00.000Z",
  "appName": "inheritance-tax-docs",
  "data": {
    "clientName": "山田 太郎",
    "deceasedName": "山田 一郎",
    "deadline": "2026-03-31",
    "personInCharge": "佐藤 花子",
    "personInChargeContact": "088-632-6228",
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
