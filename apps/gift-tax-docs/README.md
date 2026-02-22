# 贈与税申告 必要書類案内システム (Gift Tax Docs)

贈与税の申告に必要な書類を案内するための Web アプリケーションです。
開いた瞬間から編集・印刷できる1画面統合ビューで、ドラッグ&ドロップによる並び替え、Excel/JSON形式でのデータ入出力機能を提供します。

## 主な機能

### 書類管理機能
- **必要書類の案内**: 贈与の種類や特例の適用有無に応じて、必要な書類を動的に表示
- **カテゴリ管理**: 書類をカテゴリ（大分類）ごとに整理
- **中項目対応**: 各書類に対して詳細な中項目（サブアイテム）を追加可能
- **特例マーク**: 特例に関連するカテゴリを視覚的に区別

### 編集機能
- **ドラッグ&ドロップ**: カテゴリ・書類の並び替えに対応（@dnd-kit使用）
- **インライン編集**: カテゴリ名・書類名・中項目をその場で編集
- **提出済み管理**: チェックを入れると提出済み（取消線表示）、印刷時に非表示オプション
- **全済みボタン**: カテゴリ内の全書類を一括で提出済み/未提出に切替
- **一括展開/折りたたみ**: 全カテゴリの表示状態を一括操作

### データ入出力
- **Excel出力**: スタイル付きのExcelファイルとしてダウンロード（xlsx-js-style使用）
- **JSON出力**: 編集内容をJSONファイルとして保存
- **JSON取込**: 保存したJSONファイルを読み込んで編集を再開（バリデーション付き）
- **印刷**: 1段組/2段組の切替、全表示/提出済み非表示の切替に対応

### 顧客・担当者情報
- **担当者名・携帯番号**: localStorage に保存、印刷時にフッターに表示
- **顧客名**: sessionStorage に保存、ファイル名やヘッダーに使用

### ツールバー
- **外部リンク**: 国税庁チェックシート、e-Tax添付書類ページへの直接リンク
- **印刷設定**: 1段組/2段組トグル、全表示/提出済み非表示トグル
- **リセット**: 編集内容を初期状態に戻す

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Build Tool | [Vite](https://vite.dev/) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) (@tailwindcss/postcss) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) (core, sortable, utilities) |
| Icons | [Lucide React](https://lucide.dev/) |
| Excel Generation | [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style) |
| Language | TypeScript 5 |
| Production | nginx (static files) |

## ディレクトリ構成

```
src/
├── App.tsx                           # メインコンポーネント（EditableListStep描画）
├── main.tsx                          # Reactエントリポイント
├── app/
│   └── globals.css                   # グローバルスタイル・印刷用CSS
├── components/                       # UIコンポーネント
│   ├── EditableListStep.tsx          # 統合ビュー（ツールバー+入力バー+DnDリスト+印刷セクション）
│   └── ui/                           # 再利用可能なUIパーツ
│       ├── AddCategoryForm.tsx       # カテゴリ追加フォーム
│       ├── ConfirmDialog.tsx         # ダイアログ群（削除/リセット/インポート確認/エラー）
│       ├── EditableInput.tsx         # インライン編集入力（Enter確定/Escape取消）
│       ├── EditToolbar.tsx           # ツールバー（操作ボタン+外部リンク+印刷設定）
│       ├── PrintSection.tsx          # 印刷専用セクション（hidden print:block）
│       ├── SortableCategoryCard.tsx  # ドラッグ可能なカテゴリカード
│       └── SortableDocumentItem.tsx  # ドラッグ可能な書類アイテム
├── hooks/                            # カスタムフック
│   ├── useGiftTaxGuide.ts           # アプリケーション全体の状態管理
│   ├── useEditableListEditing.ts    # 編集状態管理（ダイアログ・JSON入出力含む）
│   └── useDragAndDrop.ts            # ドラッグ&ドロップのstate/refs/handlers
├── constants/                        # 定数・型定義
│   ├── index.ts                     # 型定義・会社情報・外部リンク・ストレージキー
│   └── giftData.ts                  # 初期データ（書類一覧・特例情報）
└── utils/                            # ユーティリティ関数
    ├── editableListUtils.ts          # リスト操作の純粋関数群
    ├── excelGenerator.ts             # Excel生成ロジック
    └── jsonExportImport.ts           # JSON入出力・バリデーション
```

## 画面構成（1画面統合ビュー）

```
┌──────────────────────────────────────────────────────┐
│ [Home] 贈与税申告 必要書類案内  N/M選択中             │
│ [展開][折畳][リセット] | [出力][取込]                 │ ← EditToolbar
│ [NTA][e-Tax] | [1列/2列][全表示/選択のみ] | [Excel][印刷] │
├──────────────────────────────────────────────────────┤
│ お客様名: [____]  担当者名: [____]  担当者携帯: [____] │ ← Info Bar
├──────────────────────────────────────────────────────┤
│ [DnD カテゴリ＋書類 編集エリア]                        │
│ ...                                                   │
│ [+ カテゴリ追加]                                      │
└──────────────────────────────────────────────────────┘
```

スクリーン表示部分は `no-print` クラスで印刷時に非表示、`PrintSection` が `hidden print:block` で印刷時のみ表示されます。

## データ構造

### EditableCategory
```typescript
interface EditableCategory {
  id: string;
  name: string;
  documents: EditableDocument[];
  note?: string;
  isExpanded: boolean;
  isSpecial: boolean;  // 特例カテゴリ
}
```

### EditableDocument
```typescript
interface EditableDocument {
  id: string;
  text: string;
  checked: boolean;    // true = 提出済み（取消線表示）
  subItems: SubItem[];
}
```

## Docker

### 開発環境（推奨）

```bash
# 起動
docker compose up -d

# 再ビルド（Dockerfile変更時）
docker compose up -d --build

# ログの確認
docker compose logs -f

# 停止
docker compose down
```

アクセス: [http://localhost:3002/gift-tax-docs/](http://localhost:3002/gift-tax-docs/)

> **Note**: `next.config.ts` で `basePath: '/gift-tax-docs'` が設定されているため、URLにはサブパスが必要です。

> **Note**: `manage.bat start` で全アプリを起動する場合は、Nginx Gateway 経由で http://localhost/gift-tax-docs/ からアクセスできます。

### Dockerfile（マルチステージビルド）

| ステージ | 親ステージ | 用途 |
|---------|-----------|------|
| **base** | `node:22-alpine` | セキュリティ更新・WORKDIR・テレメトリ無効化 |
| **deps** | base | `npm ci` で依存関係インストール（BuildKit cache mount） |
| **dev** | base | 開発用（ホットリロード、ポート3002） |
| **builder** | base | 本番ビルド（standalone出力、`.next/cache` mount） |
| **runner** | base | 本番実行用（非rootユーザー、tini、ヘルスチェック、ポート3002） |

全ステージで `COPY --link` を使用し、BuildKit のレイヤーキャッシュを最大化しています。

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用にビルド |
| `npm run start` | ビルドされたアプリケーションを実行 |
| `npm run lint` | ESLint によるコードチェック |

## ライセンス

Private - 社内利用限定
