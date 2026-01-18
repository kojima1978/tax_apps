# 確定申告 必要書類管理システム

確定申告に必要な書類を一覧表示し、追加・編集・削除ができるWebアプリケーションです。

## 機能

- 書類リストの一覧表示・編集
- カテゴリごとの書類管理
- 書類の追加・削除・編集
- チェックボックスによる準備状況管理
- ドラッグ&ドロップによる並び替え
- Excel出力
- 印刷機能
- 顧客・担当者・年度別のデータ保存
- 翌年度へのデータコピー
- 保存データ管理画面（検索・編集・削除）

## 技術スタック

### フロントエンド
- Next.js 16
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
├── frontend/          # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/       # ページコンポーネント
│   │   ├── components/# UIコンポーネント
│   │   ├── data/      # 書類データ定義
│   │   └── utils/     # ユーティリティ
│   ├── Dockerfile
│   └── package.json
├── backend/           # Expressバックエンド
│   ├── src/
│   │   ├── index.ts   # APIサーバー
│   │   └── db.ts      # データベース操作
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml # ローカル開発用
└── README.md
```

## 開発環境のセットアップ

### 前提条件
- Node.js 20以上
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
cd Required-documents-for-tax-return
docker-compose up --build
```

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001

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
| GET | /api/customer-names | お客様名一覧 |
| GET | /api/available-years | 年度一覧 |
| GET | /api/documents | 書類データ取得 |
| POST | /api/documents | 書類データ保存/翌年度コピー |
| GET | /api/records | 保存データ一覧（管理画面用） |
| DELETE | /api/documents/:id | 書類データ削除 |
| PUT | /api/customers | 顧客情報更新 |

## 画面構成

1. **トップ画面（MenuScreen）**
   - 保存済みデータの選択・読み込み
   - 新規作成

2. **書類編集画面（DocumentListScreen）**
   - カテゴリ別書類一覧
   - 書類の追加・編集・削除
   - チェック・並び替え
   - 保存・印刷・Excel出力

3. **保存データ管理画面（/data-management）**
   - 担当者・お客様名・年度での検索
   - 顧客情報の編集
   - データの削除
