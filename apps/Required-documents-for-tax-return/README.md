# 確定申告 必要書類管理システム

確定申告に必要な書類を一覧表示し、追加・編集・削除ができるWebアプリケーションです。

## 機能

- 書類リストの一覧表示・編集
- カテゴリごとの書類管理
- 書類の追加・削除・編集
- 小項目（サブアイテム）の追加
- チェックボックスで準備状況管理
- ドラッグ&ドロップによる並び替え
- Excel出力（顧客名・担当者名・携帯番号を含む）
- 印刷機能（レイアウト最適化済み）
- 顧客・担当者・年度別のデータ保存
- 担当者ごとの携帯電話番号登録
- 翌年度へのデータコピー
- 保存データ管理画面（検索・編集・削除）
- 自動保存機能
- 「標準に戻す」機能（顧客・担当者情報を保持したまま初期化）
- 担当者の検索・選択機能（コンボボックス）

## 技術スタック

### フロントエンド
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- @dnd-kit（ドラッグ&ドロップ）
- xlsx-js-style（Excel出力）
- lucide-react（アイコン）

### バックエンド
- Express.js
- better-sqlite3（SQLiteデータベース）
- TypeScript

## ディレクトリ構成

```
Required-documents-for-tax-return/
├── frontend/              # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/           # ページコンポーネント
│   │   │   ├── page.tsx   # メインページ
│   │   │   ├── layout.tsx # レイアウト
│   │   │   └── data-management/
│   │   │       └── page.tsx  # 保存データ管理画面
│   │   ├── components/    # UIコンポーネント
│   │   │   ├── MenuScreen.tsx         # トップ画面
│   │   │   ├── DocumentListScreen.tsx # 書類編集画面
│   │   │   └── YearSelector.tsx       # 年度選択
│   │   ├── data/          # 書類データ定義
│   │   │   └── taxReturnData.ts
│   │   └── utils/         # ユーティリティ
│   │       ├── api.ts     # API関数
│   │       ├── date.ts    # 日付ユーティリティ
│   │       └── exportExcel.ts # Excel出力
│   ├── Dockerfile
│   └── package.json
├── backend/               # Expressバックエンド
│   ├── src/
│   │   ├── index.ts       # APIサーバー
│   │   └── db.ts          # データベース操作
│   ├── data/              # SQLiteデータベース格納
│   ├── Dockerfile
│   ├── ER図.md            # データベース設計
│   └── package.json
├── docker-compose.yml     # ローカル開発用
└── README.md
```

## データベース設計

詳細は [backend/ER図.md](backend/ER図.md) を参照してください。

### テーブル構成
- **staff**: 担当者情報（名前、携帯電話番号）
- **customers**: 顧客情報（お客様名、担当者ID）
- **document_records**: 年度別書類データ（JSON形式で保存）

## 開発環境のセットアップ

### 前提条件
- Node.js 24以上（LTS推奨）
- npm

### インストール

```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 開発サーバーの起動

```bash
# バックエンド（ポート3001）
cd backend
npm run dev

# フロントエンド（ポート3000）
cd frontend
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## Docker での起動

### ローカル開発用

```bash
cd apps/Required-documents-for-tax-return
docker compose up -d --build
```

- フロントエンド: http://localhost:3005/tax-docs
- バックエンドAPI: http://localhost:3001

※ `docker-compose.yml` は開発用の設定になっており、`dev` ステージのイメージを使用してホットリロードが有効になっています。

### 統合環境（tax_apps全体）

```bash
cd tax_apps/docker
docker-compose up tax-docs-frontend tax-docs-backend
```

- フロントエンド: http://localhost:3005
- バックエンドAPI: http://localhost:3006
- ポータル経由: http://localhost/tax-docs/

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/health | ヘルスチェック |
| GET | /api/customers | 顧客一覧 |
| GET | /api/staff-names | 担当者一覧 |
| GET | /api/customer-names | お客様名一覧（担当者でフィルタ可能） |
| GET | /api/available-years | 年度一覧（顧客・担当者でフィルタ可能） |
| GET | /api/years | 顧客の年度一覧 |
| GET | /api/search | 顧客検索 |
| GET | /api/documents | 書類データ取得 |
| POST | /api/documents | 書類データ保存/翌年度コピー |
| GET | /api/records | 保存データ一覧（管理画面用） |
| DELETE | /api/documents/:id | 書類データ削除 |
| PUT | /api/customers | 顧客情報更新 |

## 画面構成

### 1. トップ画面（MenuScreen）
- 保存済みデータの選択・読み込み（担当者 → お客様名 → 年度の順で絞り込み）
- 新規作成（年度を選択して開始）
- 保存データ管理画面へのリンク

### 2. 書類編集画面（DocumentListScreen）
- カテゴリ別書類一覧
- 書類・小項目の追加・編集・削除
- チェックボックスで準備状況管理
- ドラッグ&ドロップで並び替え
- 保存・印刷・Excel出力
- 翌年度更新機能

### 3. 保存データ管理画面（/data-management）
- 担当者・お客様名・年度での検索・フィルタ
- 顧客情報の編集
- データの削除

### 4. 担当者管理画面（/staff）
- 担当者の新規登録・編集・削除
- 携帯電話番号の登録
