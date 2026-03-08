# 贈与税申告 必要書類案内システム (Gift Tax Docs)

贈与税の申告に必要な書類を案内するための Web アプリケーションです。
開いた瞬間から編集・印刷できる1画面統合ビューで、ドラッグ&ドロップによる並び替え、Excel/JSON形式でのデータ入出力機能を提供します。

## 主な機能

### 書類管理機能
- **必要書類の案内**: 贈与の種類や特例の適用有無に応じて、必要な書類を動的に表示
- **カテゴリ管理**: 書類をカテゴリ（大分類）ごとに整理
- **中項目対応**: 各書類に対して詳細な中項目（サブアイテム）を追加可能
- **特例マーク**: 特例に関連するカテゴリを視覚的に区別（紫色）
- **書類検索**: カテゴリ名・書類名・中項目でリアルタイム検索

### 編集機能
- **ドラッグ&ドロップ**: カテゴリ・書類の並び替えに対応（@dnd-kit使用）
- **インライン編集**: カテゴリ名・書類名・中項目をその場で編集（Enter確定/Escape取消）
- **提出済み管理**: チェックを入れると提出済み（取消線表示）、印刷時に非表示オプション
- **全済みボタン**: カテゴリ内の全書類を一括で提出済み/未提出に切替
- **一括展開/折りたたみ**: 全カテゴリの表示状態を一括操作
- **削除確認**: 書類・カテゴリの削除時にダイアログで確認

### データ入出力
- **Excel出力**: スタイル付きのExcelファイルとしてダウンロード（xlsx-js-style使用）
- **JSON出力**: 編集内容をJSONファイルとして保存（バージョン・日時・担当者情報付き）
- **JSON取込**: 保存したJSONファイルを読み込んで編集を再開（バリデーション・プレビュー付き）
- **印刷**: 1段組/2段組の切替、全表示/提出済み非表示の切替に対応

### 顧客・担当者情報
- **担当者名・携帯番号**: localStorage に保存（ブラウザ閉じても保持）
- **顧客名・資料収集期限**: sessionStorage に保存（タブを閉じるとクリア）
- 印刷時のヘッダー・フッター、ファイル名に反映

### UI/UX
- **ダークモード**: ワンクリックでライト/ダーク切替（localStorage保存）
- **レスポンシブ**: PC表示はインラインツールバー、モバイルはハンバーガーメニュー
- **トースト通知**: 操作結果のフィードバック（成功/エラー/情報の3種）
- **プログレスバー**: カテゴリごとの提出進捗を視覚表示
- **アクセシビリティ**: ARIA属性、キーボード操作、prefers-reduced-motion対応
- **外部リンク**: 国税庁チェックシート、e-Tax添付書類ページへの直接リンク

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Build Tool | [Vite](https://vite.dev/) 6.x |
| UI Library | [React](https://react.dev/) 19.x |
| Language | TypeScript 5.x |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 (@tailwindcss/postcss) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) (core, sortable, utilities) |
| Icons | [Lucide React](https://lucide.dev/) |
| Excel Generation | [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style) |
| Production | nginx 1.27 (静的ファイル配信) |

## ディレクトリ構成

```
src/
├── App.tsx                           # メインコンポーネント（EditableListStep描画）
├── main.tsx                          # Reactエントリポイント
├── app/
│   └── globals.css                   # グローバルスタイル・印刷用CSS・アニメーション定義
├── components/
│   ├── EditableListStep.tsx          # 統合ビュー（ツールバー+入力バー+DnDリスト+印刷+ダイアログ）
│   └── ui/
│       ├── AddCategoryForm.tsx       # カテゴリ追加フォーム
│       ├── ConfirmDialog.tsx         # ダイアログ群（削除/リセット/インポート確認/エラー）
│       ├── EditableInput.tsx         # インライン編集・追加入力（Enter確定/Escape取消）
│       ├── EditToolbar.tsx           # ツールバー（操作ボタン+検索+外部リンク+印刷設定）
│       ├── EmptyState.tsx            # 空状態・検索結果なし表示
│       ├── PrintSection.tsx          # 印刷専用セクション（hidden print:block）
│       ├── SortableCategoryCard.tsx  # ドラッグ可能なカテゴリカード（ヘッダー+プログレスバー）
│       ├── SortableDocumentItem.tsx  # ドラッグ可能な書類アイテム（チェック+中項目）
│       ├── Toast.tsx                 # トースト通知コンテナ
│       └── VerticalDivider.tsx       # ツールバー用区切り線
├── hooks/
│   ├── useGiftTaxGuide.ts           # アプリ全体の状態管理（ストレージ永続化・印刷・Excel出力）
│   ├── useEditableListEditing.ts    # 編集オーケストレーター（サブhookを統合）
│   ├── useCategoryEditing.ts        # カテゴリの編集・追加・展開・特例切替
│   ├── useDocumentEditing.ts        # 書類の編集・追加・チェック
│   ├── useSubItemEditing.ts         # 中項目の編集・追加・削除
│   ├── useDeleteConfirm.ts          # 削除確認ダイアログの状態管理
│   ├── useJsonImportExport.ts       # JSON入出力・インポートダイアログ
│   ├── useDragAndDrop.ts            # ドラッグ&ドロップのstate/refs/handlers
│   ├── useDarkMode.ts               # ダークモード状態（localStorage永続化）
│   └── useToast.ts                  # トースト通知（自動消去タイマー付き）
├── constants/
│   ├── index.ts                     # 型定義・会社情報・外部リンク・ストレージキー
│   └── giftData.ts                  # 初期データ（基本必須書類・財産種類・特例）
└── utils/
    ├── editableListUtils.ts          # リスト操作の純粋関数群（イミュータブル更新）
    ├── excelGenerator.ts             # Excel生成ロジック（スタイル付き）
    └── jsonExportImport.ts           # JSON入出力・バリデーション（5MB制限）
```

## 画面構成（1画面統合ビュー）

```
┌──────────────────────────────────────────────────────┐
│ [Home] 贈与税申告 必要書類案内  N/M選択中  [🔍][🌙] │
│ [展開][折畳][リセット] | [出力][取込]                 │ ← EditToolbar
│ [NTA][e-Tax] | [未提出のみ][1列/2列] | [Excel][印刷] │
├──────────────────────────────────────────────────────┤
│ お客様名:[___] 期限:[___] 担当者名:[___] 携帯:[___]  │ ← Info Bar
├──────────────────────────────────────────────────────┤
│ [DnD カテゴリ＋書類 編集エリア]                        │
│ ┌── カテゴリA（通常：緑） ──── N/M [全済み] ──┐    │
│ │ ☐ 書類1                    [+][✎][🗑]      │    │
│ │   └ 中項目1-1              [✎][✕]          │    │
│ │ ☑ 書類2（取消線）                           │    │
│ │ [+ 書類を追加]                               │    │
│ └──────────────────────────────────────────────┘    │
│ ┌── 【特例】カテゴリB（紫） ── N/M [全済み] ──┐    │
│ │ ℹ 注記テキスト                               │    │
│ │ ☐ 書類3                                     │    │
│ └──────────────────────────────────────────────┘    │
│ [+ カテゴリ追加]                                      │
│ ※チェックを入れると提出済み（取り消し線）になります   │
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
  note?: string;        // 注記（特例カテゴリ等）
  isExpanded: boolean;  // 展開状態
  isSpecial: boolean;   // 特例カテゴリ（紫色表示）
}
```

### EditableDocument
```typescript
interface EditableDocument {
  id: string;
  text: string;
  checked: boolean;    // true = 提出済み（取消線表示）
  subItems: SubItem[]; // 中項目リスト
}
```

### SubItem
```typescript
interface SubItem {
  id: string;
  text: string;
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

> **Note**: `vite.config.ts` で `base: '/gift-tax-docs/'` が設定されているため、URLにはサブパスが必要です。

> **Note**: `manage.bat start` で全アプリを起動する場合は、Nginx Gateway 経由で http://localhost/gift-tax-docs/ からアクセスできます。

### Dockerfile

共通 `docker/Dockerfile.vite-static`（複数アプリ共有）を使用しています。

| ステージ | 親ステージ | 用途 |
|---------|-----------|------|
| **base** | `node:22-alpine` | セキュリティ更新・WORKDIR |
| **deps** | base | `npm ci` で依存関係インストール（BuildKit cache mount） |
| **dev** | base | 開発用（Viteホットリロード、ポート3002） |
| **builder** | base | Viteビルド（静的ファイル出力） |
| **runner** | `nginx:1.27-alpine` | 本番実行用（静的ファイル配信） |

### 本番環境

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` でビルドターゲットを `runner`（nginx）に切り替え、ボリュームマウントを無効化、メモリ制限を縮小します。

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | Vite開発サーバーを起動 |
| `npm run build` | TypeScript型チェック + Viteビルド |
| `npm run preview` | ビルド成果物のプレビュー |
| `npm run lint` | ESLint によるコードチェック |

## 仕様書

詳細な仕様は [docs/spec.md](docs/spec.md) を参照してください。

## ライセンス

Private - 社内利用限定
