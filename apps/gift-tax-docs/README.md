# 贈与税申告 必要書類案内システム (Gift Tax Docs)

贈与税の申告に必要な書類を案内するための Web アプリケーションです。
ユーザーの状況に応じた必要書類のリストアップや、ドラッグ&ドロップによる並び替え、Excel/JSON形式でのデータ入出力機能などを提供します。

## 主な機能

### 書類管理機能
- **必要書類の案内**: 贈与の種類や特例の適用有無に応じて、必要な書類を動的に表示
- **カテゴリ管理**: 書類をカテゴリ（大分類）ごとに整理
- **中項目対応**: 各書類に対して詳細な中項目（サブアイテム）を追加可能
- **特例マーク**: 特例に関連するカテゴリを視覚的に区別

### 編集機能
- **ドラッグ&ドロップ**: カテゴリ・書類の並び替えに対応（@dnd-kit使用）
- **インライン編集**: カテゴリ名・書類名・中項目をその場で編集
- **チェックボックス**: 必要な書類を選択して印刷対象を管理
- **一括操作**: カテゴリ内の全書類を一括でチェック/解除

### データ入出力
- **Excel出力**: スタイル付きのExcelファイルとしてダウンロード（xlsx-js-style使用）
- **JSON出力**: 編集内容をJSONファイルとして保存
- **JSON取込**: 保存したJSONファイルを読み込んで編集を再開
- **印刷プレビュー**: 1段組/2段組の切り替えに対応

### 顧客・担当者情報
- **担当者名・携帯番号**: localStorage に保存、印刷時にフッターに表示
- **顧客名**: sessionStorage に保存、ファイル名やヘッダーに使用

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) (core, sortable, utilities) |
| Icons | [Lucide React](https://lucide.dev/) |
| Excel Generation | [xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style) |
| Language | TypeScript 5 |
| Runtime | Node.js 22 |

## 開発環境のセットアップ

### Docker を使用する場合（推奨）

```bash
# アプリディレクトリで実行
cd apps/gift-tax-docs

# 起動
docker compose up -d

# 再ビルド（Dockerfile変更時）
docker compose up -d --build

# ログの確認
docker logs -f gift-tax-docs

# 停止
docker compose down
```

アクセス: [http://localhost:3002/gift-tax-docs/](http://localhost:3002/gift-tax-docs/)

> **Note**: `next.config.ts` で `basePath: '/gift-tax-docs'` が設定されているため、URLにはサブパスが必要です。

## ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # メインページ
│   └── globals.css               # グローバルスタイル・印刷用CSS
├── components/                   # UIコンポーネント
│   ├── GiftTaxDocGuide.tsx       # メインコンテナ（状態管理・画面切替）
│   ├── MenuStep.tsx              # メニュー画面（担当者・顧客情報入力）
│   ├── EditableListStep.tsx      # 編集画面（ドラッグ&ドロップ対応）
│   ├── ResultStep.tsx            # 印刷プレビュー画面
│   └── ui/                       # 再利用可能なUIパーツ
│       ├── CheckboxOption.tsx    # チェックボックスオプション
│       └── ExternalLinkButton.tsx# 外部リンクボタン
├── hooks/                        # カスタムフック
│   ├── useGiftTaxGuide.ts        # アプリケーション全体の状態管理
│   └── useEditableListEditing.ts # 編集画面の状態管理（useCallback最適化）
├── constants/                    # 定数・型定義
│   ├── index.ts                  # 型定義・会社情報・外部リンク・ストレージキー
│   └── giftData.ts               # 初期データ（書類一覧・特例情報）
└── utils/                        # ユーティリティ関数
    ├── editableListUtils.ts      # リスト操作の純粋関数群
    ├── excelGenerator.ts         # Excel生成ロジック
    └── jsonExportImport.ts       # JSON入出力・バリデーション
```

## 画面遷移

```
[メニュー画面] → [編集画面] → [印刷プレビュー]
    │               │              │
    │               │              └─ 印刷 / Excel出力
    │               │
    │               └─ カテゴリ・書類の編集
    │                  ドラッグ&ドロップ
    │                  JSON出力/取込
    │
    └─ 担当者情報入力
       顧客名入力
```

## 主要コンポーネント

### EditableListStep.tsx
編集画面のメインコンポーネント。以下のサブコンポーネントで構成：

- **SortableCategoryCard**: ドラッグ可能なカテゴリカード
- **SortableDocumentItem**: ドラッグ可能な書類アイテム（ARIA対応）
- **DragOverlayItem / CategoryDragOverlay**: ドラッグ中のプレビュー表示

### useEditableListEditing.ts
編集画面の状態管理フック。`useCallback` + 関数アップデートパターンで安定した参照を提供：

- 書類・カテゴリ・中項目の編集状態管理
- ダイアログ（リセット・インポート確認）の状態管理
- JSON エクスポート/インポート処理
- `categoryEditState` / `categoryHandlers` のメモ化オブジェクト

### editableListUtils.ts
リスト操作の純粋関数群：

```typescript
// カテゴリ操作
addCategory()           // カテゴリ追加
removeCategory()        // カテゴリ削除
updateCategoryName()    // カテゴリ名変更
reorderCategories()     // カテゴリ並替え
toggleCategorySpecial() // 特例フラグ切替

// 書類操作
addDocumentToCategory() // 書類追加
removeDocument()        // 書類削除
updateDocumentText()    // 書類名変更
reorderDocuments()      // 書類並替え
toggleDocumentCheck()   // チェック状態切替

// 中項目操作
addSubItem()            // 中項目追加
removeSubItem()         // 中項目削除
updateSubItemText()     // 中項目変更
```

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
  checked: boolean;
  subItems: SubItem[];
}
```

## Docker設定

### Dockerfile（マルチステージビルド）

| ステージ | 用途 |
|---------|------|
| **base** | Node.js 22 Alpine + libc6-compat |
| **deps** | `npm ci` で依存関係インストール |
| **dev** | 開発用（ホットリロード、ポート3002） |
| **builder** | 本番ビルド（standalone出力） |
| **runner** | 本番実行用（非rootユーザー、tini、ヘルスチェック） |

### docker-compose.yml
```yaml
services:
  gift-tax-docs:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev
    ports:
      - "3002:3002"
    volumes:
      - .:/app
      - /app/node_modules  # ホストのnode_modulesで上書きしない
      - /app/.next          # ビルドキャッシュを保護
    init: true              # シグナルハンドリング
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3002/gift-tax-docs/"]
```

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用にビルド |
| `npm run start` | ビルドされたアプリケーションを実行 |
| `npm run lint` | ESLint によるコードチェック |

## ライセンス

Private - 社内利用限定
