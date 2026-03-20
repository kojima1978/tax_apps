# 相続税申告 資料準備ガイド

相続税申告に必要な資料の準備・確認・管理をサポートするWebアプリケーションです。

## ページ構成

react-router-dom によるSPAルーティング（basename: `/inheritance-tax-docs`）。

| パス | ページ | 説明 |
|:-----|:-------|:-----|
| `/` | 相続税申告 資料準備ガイド | 相続税申告に必要な全書類の管理（11カテゴリ・56書類） |
| `/simplified` | 相続税シミュレーション 資料準備ガイド（簡易版） | シミュレーション用に必要最小限の書類（1カテゴリ・3書類） |
| `/unlisted-stock` | 取引相場のない株式 必要書類のご案内 | 非上場株式評価に必要な書類の管理（4カテゴリ・23書類） |

3ページはすべて同一の `DocumentGuidePage` コンポーネントを共有し、`PageConfig` で差分（タイトル、カテゴリデータ、入力ラベル、注意事項等）を設定。機能は完全に同一。

## 主な機能

### 統合ビュー（全ページ共通）

テーブル上で直接 編集・削除・並べ替え・代行切替ができるWYSIWYG型の画面構成です。

| 機能 | 説明 |
|:-----|:-----|
| 書類の編集 | モーダルダイアログで書類名・説明・取得方法をカスタマイズ |
| カスタム書類追加 | 独自の書類をカテゴリに追加 |
| 具体的書類名 | テーブルサブ行で具体名を表示（連続入力・テキストクリック編集・D&D並べ替え対応） |
| ドラッグ&ドロップ | 書類行・具体名行それぞれD&Dで並び順を変更（ネストDndContext） |
| 代行可否設定 | 各書類の取得代行可否をワンクリック切替 |
| 提出済みチェック | 書類ごとのチェックボックス + 提出日自動記録 + カテゴリ単位の「全済み」3段階ボタン |
| メモ | 各書類にメモを追加・編集（印刷時にも表示） |
| 緊急フラグ | 書類に緊急マークを設定（赤バッジ表示、Excel出力に【急】プレフィックス） |
| 対象外設定 | 不要な書類を対象外に（半透明+バッジ表示、印刷にも反映） |
| カテゴリ無効化 | カテゴリ単位で対象外に設定（印刷時は非表示） |
| 書類・カテゴリ削除 | 確認ダイアログ付きの削除 |
| 印刷非表示 | 提出済み書類を印刷時に非表示にするトグル |
| 未保存状態管理 | 変更検知（未保存バッジ + amber背景）、最終保存時刻表示、ページ離脱時の警告 |
| フィルター/検索 | 未提出のみ・代行可のみ・緊急のみ・対象外非表示・書類名検索 |
| 初期化 | 書類カスタマイズを標準状態に戻す（確認ダイアログ付き、基本情報は保持） |

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | xlsx-js-style によるスタイル付きExcelファイル（提出済みは`[済]`+チェック表示、緊急は`【急】`+赤背景） |
| 印刷/PDF保存 | ブラウザ印刷機能（印刷専用ヘッダー・親子連番・チェック列付き） |
| JSON保存 | 設定をJSONファイルとして保存（Ctrl+S ショートカット対応） |
| JSON読込 | JSONファイルから設定を復元（旧データの後方互換あり）。ページごとにappNameで識別 |

### 画面レイアウト

- **テーマカラー**: 緑（emerald）ベース
- **レイアウト**: フル幅レイアウト。ヘッダー・基本情報・ツールバーは画面端まで背景を伸ばし、内側コンテンツは `max-w-7xl`（80rem）で中央配置。全列（内容説明・取得方法含む）を常時表示
- **ヘッダーツールバー**: グラデーション背景（emerald系）、保存（未保存バッジ+最終保存時刻表示）・読込・Excel・印刷・初期化ボタン + ナビリンク
- **基本情報入力**: お客様名（or 対象法人名）・被相続人名・資料収集期限・担当者・担当者連絡先
- **ツールバー**: 全展開/折りたたみ + フィルター/検索（緊急のみ含む） + 印刷非表示トグル
- **注意事項**: ページ固有の案内（PageConfig.noticeItems で定義）
- **カテゴリテーブル群**: カテゴリごとに展開/折りたたみ可能
  - ヘッダー: アイコン + 丸数字 + カテゴリ名 + 緊急バッジ + 全済みボタン + 無効化/削除ボタン
  - 各行: D&Dハンドル | チェックボックス | 書類番号+書類名+バッジ群 | 内容説明 | 取得方法 | 代行 | 操作（メモ/緊急/対象外/編集/削除）
  - 具体名サブ行: 親子連番（例: 1-1, 1-2）+ colSpan=3で3列にまたがり表示 + D&D並べ替え
  - 提出済み行は取消線+テキスト薄表示 + 提出日バッジ
  - カテゴリ左ボーダーにカラーアクセント
- **留意事項・フッター**: 事務所住所・連絡先

### 印刷対応

- 印刷専用ヘッダー（タイトル・発行日・事務所名・基本情報）自動表示
- 書類番号を太字で強調 + 具体名は親子連番形式（1. → 1-1, 1-2）
- 提出済みチェックマーク表示
- カラーアクセント（左ボーダー）は印刷時に非表示
- 操作ボタン・フィルター等は印刷時に非表示

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
| ルーティング | react-router-dom 7 |
| D&D | @dnd-kit/core + @dnd-kit/sortable |
| Excel出力 | xlsx-js-style |
| アイコン | Lucide React |
| Docker | Port 3003, basePath: /inheritance-tax-docs |

## プロジェクト構造

```
inheritance-tax-docs/
├── src/
│   ├── App.tsx                          # ルーティング定義（/, /simplified, /unlisted-stock）
│   ├── main.tsx                         # Reactエントリポイント（BrowserRouter）
│   ├── globals.css                      # グローバルスタイル（印刷CSS・グラデーション）
│   ├── components/
│   │   ├── DocumentGuidePage.tsx         # 汎用ラッパー（hook→view+modal接続）
│   │   ├── InheritanceTaxDocGuide.tsx    # 資料準備ガイド（PAGE_CONFIG定義のみ）
│   │   ├── SimplifiedGuidePage.tsx       # 簡易版ページ（PAGE_CONFIG定義のみ）
│   │   ├── UnlistedStockGuidePage.tsx    # 非上場株式ページ（PAGE_CONFIG定義のみ）
│   │   ├── UnifiedDocumentView.tsx       # 統合ビュー（基本情報/テーブル群/フッター）
│   │   └── ui/
│   │       ├── ToolbarHeader.tsx         # ヘッダー + ツールバーボタン（data-driven配列）
│   │       ├── FilterToolbar.tsx         # 展開/折りたたみ・フィルター・検索パネル
│   │       ├── ConfirmDialog.tsx         # 汎用確認ダイアログ（削除/初期化）
│   │       ├── DismissibleBanner.tsx     # 閉じられるバナー（error/success）
│   │       ├── DocumentForm.tsx          # 書類入力フォーム（add/edit共通）
│   │       ├── DocumentFormModal.tsx     # 書類追加/編集モーダル
│   │       ├── EditableCategoryTable.tsx # カテゴリテーブル（CategoryHeader + D&D + サブ行）
│   │       ├── EditableDocumentRow.tsx   # テーブル行（useMemoState + チェック/D&D/操作）
│   │       └── SpecificNamesList.tsx     # 具体名テーブルサブ行（親子連番・D&D並べ替え・連続入力）
│   ├── constants/
│   │   ├── documents.ts                 # 資料準備ガイドの書類マスターデータ + 共有型定義
│   │   ├── simplifiedDocuments.ts       # 簡易版の書類マスターデータ
│   │   ├── unlistedStockDocuments.ts    # 非上場株式の書類マスターデータ
│   │   ├── pageConfig.ts               # PageConfig型定義 + inputRows/printInfoFieldsファクトリ
│   │   └── excelStyles.ts              # Excelスタイル定義 + 行追加ヘルパー
│   ├── hooks/
│   │   ├── useDocumentGuide.ts          # 全状態管理 + ハンドラー（categories引数で汎用化）
│   │   ├── useDocumentModal.ts          # モーダル状態管理（categories引数で汎用化）
│   │   ├── useFilterState.ts            # フィルター/検索状態管理 + FilterCriteria型定義
│   │   └── useJsonImport.ts             # JSONインポートロジック（appName検証対応）
│   └── utils/
│       ├── company.ts                   # 事務所情報（COMPANY_INFO）
│       ├── excelExporter.ts             # Excel出力ロジック（スタイルはexcelStyles.tsから参照）
│       ├── helpers.ts                   # フォーマット・Record操作ユーティリティ（deleteKeys, createBooleanToggle等）
│       ├── iconMap.tsx                  # アイコン名→Lucideコンポーネント変換
│       └── jsonDataManager.ts           # JSON保存/読込/バリデーション（appName対応）
├── docs/
│   └── 仕様書.md                        # アプリケーション仕様書
├── docker-compose.yml                   # スタンドアロンDocker設定
├── docker-compose.prod.yml              # 本番オーバーライド（nginx静的配信）
├── vite.config.ts                       # Vite設定（basePath, エイリアス）
└── package.json
```

### アーキテクチャ

```
App.tsx (react-router-dom)
├── / → InheritanceTaxDocGuide (PAGE_CONFIG定義)
├── /simplified → SimplifiedGuidePage (PAGE_CONFIG定義)
└── /unlisted-stock → UnlistedStockGuidePage (PAGE_CONFIG定義)
        │
        └── DocumentGuidePage (汎用ラッパー)
            ├── useDocumentGuide(categories, appName, filenamePrefix)
            │   └── useDocumentModal(categories)
            ├── UnifiedDocumentView(pageConfig, state, handlers)
            │   ├── useFilterState() — フィルター/検索状態管理
            │   ├── ToolbarHeader — ヘッダー+ツールバーボタン
            │   ├── FilterToolbar — 展開/折りたたみ・フィルター・検索
            │   └── EditableCategoryTable (カテゴリ単位)
            │       ├── CategoryHeader (ヘッダー・緊急バッジ・操作ボタン)
            │       ├── SortableDocumentRow / StaticDocumentRow (書類行)
            │       │   └── useMemoState (メモ状態管理)
            │       └── SpecificNamesTableRows (具体名サブ行)
            │           └── SortableNameRow (D&D対応具体名行)
            └── DocumentFormModal (書類追加/編集)
```

### PageConfig による差分設定

各ページコンポーネントは `PAGE_CONFIG` を定義し `DocumentGuidePage` に渡すだけの薄いラッパーです。`createInputRows()` / `createPrintInfoFields()` ファクトリで共通部分を再利用します。

| 設定項目 | 説明 |
|:---------|:-----|
| title / subtitle / printSubtitle | ページタイトル・サブタイトル |
| appName / filenamePrefix | JSON/Excelのファイル識別・命名 |
| excelTitle | Excelシートタイトル |
| categories | 書類マスターデータ（CategoryData[]） |
| navLinks | ヘッダー内ナビリンク |
| inputRows | 基本情報入力フィールド定義 |
| printInfoFields | 印刷用情報フィールド定義 |
| noticeItems | 注意事項（HTML文字列配列） |

### Dockerfile

共通 `docker/Dockerfile.vite-static`（Viteアプリ共有）を使用しています。開発時は Vite ホットリロード、本番は nginx で静的ファイル配信。SPA対応: `try_files $uri $uri/ /inheritance-tax-docs/index.html`。

### 本番環境

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` でビルドターゲットを `runner`（nginx）に切り替え、ボリュームマウントを無効化、メモリ制限を縮小します。

## JSONデータ形式

保存されるJSONファイルの構造（全ページ共通フォーマット、appNameで識別）:

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-03-20T00:00:00.000Z",
  "appName": "inheritance-tax-docs",
  "data": {
    "clientName": "山田 太郎",
    "deceasedName": "山田 一郎",
    "deadline": "2026-03-31",
    "personInCharge": "佐藤 花子",
    "personInChargeContact": "088-632-6228",
    "customDocuments": [],
    "documentOrder": { "identity": ["mynumber", "identity_doc", "heir_inkan"] },
    "editedDocuments": {},
    "canDelegateOverrides": {},
    "specificDocNames": {
      "cash_tsucho": ["三菱UFJ銀行 普通口座", "ゆうちょ銀行 通常貯金"]
    },
    "checkedDocuments": { "mynumber": true },
    "checkedDates": { "mynumber": "2026/03/01" },
    "documentMemos": { "mynumber": "コピー済み" },
    "excludedDocuments": {},
    "urgentDocuments": { "cash_zandaka": true },
    "disabledCategories": {}
  }
}
```

appName一覧:
- `inheritance-tax-docs` — 資料準備ガイド
- `inheritance-tax-docs-simplified` — 簡易版
- `unlisted-stock-docs` — 非上場株式 必要書類のご案内
