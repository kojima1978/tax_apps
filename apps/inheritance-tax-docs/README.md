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
| 提出済みチェック | 書類ごとのチェックボックス + カテゴリ単位の「全済み」3段階ボタン |
| 書類・カテゴリ削除 | 確認ダイアログ付きの永久削除（Trash2アイコン） |
| 印刷非表示 | 提出済み書類を印刷時に非表示にするトグル（Eye/EyeOff） |
| 初期化 | 書類カスタマイズを標準状態に戻す（確認ダイアログ付き、基本情報は保持） |

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | xlsx-js-style によるスタイル付きExcelファイル（提出済みは`[済]`+`☑`表示） |
| 印刷/PDF保存 | ブラウザ印刷機能（印刷専用ヘッダー自動表示、チェック列付き） |
| JSON保存 | 設定をJSONファイルとして保存 |
| JSON読込 | JSONファイルから設定を復元（旧データの後方互換あり） |

### 画面レイアウト

- **ヘッダーツールバー**: 保存・読込・Excel・印刷・初期化ボタン
- **基本情報入力**: お客様名・被相続人名・資料収集期限・担当者・担当者連絡先
- **統計バー**: `N / M 提出済み` ピルバッジ + 追加件数 + 印刷非表示トグル
- **注意事項**: 原本・代行・身分関係書類の案内
- **カテゴリテーブル群**: カテゴリごとに展開/折りたたみ可能
  - ヘッダー: 丸数字+カテゴリ名 + 全済みボタン + 書類追加 + カテゴリ削除
  - 各行: D&Dハンドル | チェックボックス | 書類名+具体名 | 内容説明 | 取得方法 | 代行 | 操作（編集/削除）
  - 提出済み行は取消線+テキスト薄表示
- **留意事項・フッター**: 事務所住所・連絡先

## セットアップ

### Docker（推奨）

```bash
cd tax_apps/docker/scripts
manage.bat start
```

http://localhost/inheritance-tax-docs/ でアクセスできます（Nginx Gateway 経由）。

個別起動も可能です:

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
| ビルドツール | Vite 6 |
| UI | React 19, Tailwind CSS v4 |
| 言語 | TypeScript 5.9 |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| Excel出力 | xlsx-js-style |
| アイコン | Lucide React |
| Docker | Port 3003, basePath: /inheritance-tax-docs |

## プロジェクト構造

```
inheritance-tax-docs/
├── src/
│   ├── App.tsx                       # メインコンポーネント
│   ├── main.tsx                      # Reactエントリポイント
│   ├── app/
│   │   └── globals.css               # グローバルスタイル（印刷CSS含む）
│   ├── components/
│   │   ├── InheritanceTaxDocGuide.tsx # エントリポイント（hook→view+modal）
│   │   ├── UnifiedDocumentView.tsx    # 統合ビュー（ツールバー/基本情報/テーブル群）
│   │   └── ui/
│   │       ├── ConfirmDialog.tsx      # 汎用確認ダイアログ（削除/初期化）
│   │       ├── DismissibleBanner.tsx  # 閉じられるバナー（error/success）
│   │       ├── DocumentForm.tsx       # 書類入力フォーム（add/edit共通）
│   │       ├── DocumentFormModal.tsx  # 書類追加/編集モーダル
│   │       ├── EditableCategoryTable.tsx # カテゴリテーブル（D&D/展開/全済み/削除）
│   │       ├── EditableDocumentRow.tsx   # テーブル行（チェック/D&D/具体名/操作）
│   │       └── SpecificNamesList.tsx  # 具体的書類名リスト（連続入力/編集/削除）
│   ├── constants/
│   │   └── documents.ts              # 書類マスターデータ + 共有型定義
│   ├── hooks/
│   │   ├── useDocumentGuide.ts       # 全状態管理 + ハンドラー
│   │   ├── useDocumentModal.ts       # モーダル状態管理
│   │   └── useJsonImport.ts          # JSONインポートロジック
│   └── utils/
│       ├── company.ts                # 事務所情報（COMPANY_INFO）
│       ├── excelExporter.ts          # Excel出力（xlsx-js-style）
│       ├── helpers.ts                # isCustomDocument, formatDate, toCircledNumber等
│       ├── iconMap.tsx               # アイコン名→Lucideコンポーネント変換
│       └── jsonDataManager.ts        # JSON保存/読込/バリデーション
├── Dockerfile                        # マルチステージビルド
├── docker-compose.yml                # スタンドアロンDocker設定
├── vite.config.ts                    # Vite設定（basePath, エイリアス）
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
    "customDocuments": [],
    "documentOrder": { "cat_01": ["doc_01", "doc_02"] },
    "editedDocuments": {},
    "canDelegateOverrides": {},
    "specificDocNames": {
      "doc_id": ["三菱UFJ銀行 普通口座", "ゆうちょ銀行 通常貯金"]
    },
    "checkedDocuments": { "doc_01": true }
  }
}
```
