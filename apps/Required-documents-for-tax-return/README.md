# 確定申告 必要書類管理システム

確定申告に必要な書類を一覧表示し、追加・編集・削除ができるWebアプリケーションです。

## 機能

- 書類リストの一覧表示・編集
- カテゴリごとの書類管理（カテゴリの追加・削除・復元）
- 書類の追加・削除・編集
- 小項目（サブアイテム）の追加
- チェックボックスで準備状況管理
- ドラッグ&ドロップによる並び替え（カテゴリ・書類）
- Excel出力（顧客名・担当者名・携帯番号を含む、スタイル付き）
- JSON入出力（顧客単位 / 全データバックアップ・復元）
- 印刷機能（1列・2列レイアウト切替、レイアウト最適化済み）
- 顧客・担当者・年度別のデータ保存
- 担当者管理（名前・携帯電話番号の登録）
- 顧客管理（お客様名・担当者の紐付け）
- 翌年度へのデータコピー
- 保存データ管理画面（検索・ソート・ページネーション・編集・削除）
- 「標準に戻す」機能（顧客・担当者情報を保持したまま初期化）
- 担当者の検索・選択機能（コンボボックス）

## 技術スタック

### フロントエンド
- Next.js 16（App Router / standalone出力）
- React 19
- TypeScript
- Tailwind CSS v4
- @dnd-kit（ドラッグ&ドロップ）
- xlsx-js-style（Excel出力）
- lucide-react（アイコン）

### バックエンド
- Node.js 22 LTS
- Express.js
- better-sqlite3（SQLiteデータベース / WALモード）
- TypeScript

### インフラ
- Docker（マルチステージビルド / BuildKit）
- Docker Compose（開発 / 本番オーバーライド）

## セットアップ

### 方法1: Docker（推奨）

#### 前提条件
- Docker / Docker Compose

#### 開発環境

```bash
docker compose up -d --build
```

- フロントエンド: http://localhost:3005/tax-docs/
- バックエンドAPI: http://localhost:3006

ソースコードはボリュームマウントされており、変更時にホットリロードされます。

> **Note**: `manage.bat start` で全アプリを起動する場合は、Nginx Gateway 経由で http://localhost/tax-docs/ からアクセスできます。

```bash
# ログ確認
docker compose logs -f

# 停止
docker compose down

# データも含めて完全削除
docker compose down -v
```

#### 本番環境

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

本番ビルドでは `runner` ステージの軽量イメージが使用されます。

`VITE_API_URL` を環境変数で上書きできます:

```bash
VITE_API_URL=https://api.example.com docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 方法2: ローカル開発（Docker不使用）

#### 前提条件
- Node.js 22 以上
- npm

#### バックエンド

```bash
cd backend
npm install
npm run dev
```

バックエンドAPIが http://localhost:3001 で起動します。

#### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

フロントエンドが http://localhost:3000/tax-docs/ で起動します。

## 環境変数

### フロントエンド

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | バックエンドAPIのURL |
| `NEXT_TELEMETRY_DISABLED` | `1` | Next.jsテレメトリの無効化 |
| `WATCHPACK_POLLING` | `true` | Docker内でのファイル変更検知（開発時） |

### バックエンド

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `PORT` | `3001` | APIサーバーのポート番号 |
| `NODE_ENV` | - | `development` or `production` |
| `TZ` | `Asia/Tokyo` | タイムゾーン |

### CORS許可オリジン（バックエンド）

バックエンドは以下のオリジンからのリクエストを許可します:

- `http://localhost:3000` — フロントエンド開発サーバー（ローカル）
- `http://127.0.0.1:3000` — 同上（loopback）
- `http://localhost:3005` — フロントエンド開発サーバー（Docker）

## ディレクトリ構成

```
Required-documents-for-tax-return/
├── frontend/                  # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/               # ページ
│   │   │   ├── page.tsx       # メインページ（メニュー＋書類編集）
│   │   │   ├── layout.tsx     # ルートレイアウト
│   │   │   ├── staff/         # 担当者管理
│   │   │   │   ├── page.tsx           # 一覧
│   │   │   │   ├── create/page.tsx    # 新規作成
│   │   │   │   └── [id]/edit/page.tsx # 編集
│   │   │   ├── customers/     # 顧客管理
│   │   │   │   ├── page.tsx           # 一覧
│   │   │   │   ├── create/page.tsx    # 新規作成
│   │   │   │   └── [id]/edit/page.tsx # 編集
│   │   │   └── data-management/
│   │   │       └── page.tsx   # 保存データ管理画面
│   │   ├── components/        # UIコンポーネント
│   │   │   ├── MenuScreen.tsx           # トップ画面
│   │   │   ├── DocumentListScreen.tsx   # 書類編集画面
│   │   │   ├── ListPage.tsx             # 汎用一覧ページ（担当者・顧客共通）
│   │   │   ├── FormErrorDisplay.tsx     # フォームエラー表示
│   │   │   ├── SearchableSelect.tsx     # 検索可能セレクト
│   │   │   ├── ErrorBoundary.tsx        # エラーハンドリング
│   │   │   ├── Toast.tsx                # 通知表示
│   │   │   └── document-list/           # 書類リスト関連
│   │   │       ├── SortableCategory.tsx     # ドラッグ可能カテゴリ
│   │   │       ├── SortableDocumentItem.tsx # ドラッグ可能書類
│   │   │       └── SubItemComponent.tsx     # サブアイテム
│   │   ├── hooks/             # カスタムフック
│   │   │   └── useDocumentListEditing.ts    # 書類編集ロジック
│   │   ├── data/              # 書類データ定義
│   │   │   └── taxReturnData.ts
│   │   ├── types/             # 型定義
│   │   │   └── index.ts
│   │   └── utils/             # ユーティリティ
│   │       ├── api.ts                # API関数
│   │       ├── date.ts               # 日付ユーティリティ
│   │       ├── documentUtils.ts      # 書類生成ヘルパー
│   │       ├── exportExcel.ts        # Excel出力
│   │       └── jsonExportImport.ts   # JSONバックアップ・復元
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── backend/                   # Expressバックエンド
│   ├── src/
│   │   ├── index.ts           # APIサーバー・ルーティング
│   │   ├── db.ts              # データベース操作
│   │   └── types.ts           # 型定義
│   ├── data/                  # SQLiteデータベース格納
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── ER図.md                # データベース設計
│   └── package.json
├── docker-compose.yml         # 開発用
├── docker-compose.prod.yml    # 本番用オーバーライド
└── README.md
```

## データベース設計

詳細は [backend/ER図.md](backend/ER図.md) を参照してください。

### テーブル構成
- **staff**: 担当者情報（名前、携帯電話番号）
- **customers**: 顧客情報（お客様名、担当者ID）
- **document_records**: 年度別書類データ（JSON形式で保存）

### リレーション
- staff 1 → N customers（担当者 → 顧客）
- customers 1 → N document_records（顧客 → 年度別書類データ）
- customers 削除時、document_records は CASCADE 削除

## Docker 構成

### マルチステージビルド

両Dockerfileは用途別のステージを持ちます:

| ステージ | 用途 | 備考 |
|---------|------|------|
| `base` | 共通ベース | Node.js 22 Alpine |
| `deps` | 依存関係インストール | BuildKit cache mount で高速化 |
| `dev` | 開発サーバー | ホットリロード対応 |
| `builder` | ビルド | Next.js standalone / TypeScript コンパイル |
| `prod-deps` | 本番依存関係 | devDependencies 除外（バックエンドのみ） |
| `runner` | 本番実行 | tini + 非rootユーザー + ヘルスチェック |

### ボリューム

| ボリューム名 | マウント先 | 用途 |
|-------------|-----------|------|
| `tax-docs-data` | `/app/data` | SQLiteデータベースの永続化 |

## API エンドポイント

### ヘルスチェック

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/health | ヘルスチェック |

### 担当者

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/staff | 担当者一覧 |
| POST | /api/staff | 担当者作成 |
| PUT | /api/staff/:id | 担当者更新 |
| DELETE | /api/staff/:id | 担当者削除 |
| GET | /api/staff-names | 担当者名一覧 |

### 顧客

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/customers | 顧客一覧 |
| POST | /api/customers | 顧客作成 |
| PUT | /api/customers/:id | 顧客更新 |
| DELETE | /api/customers/:id | 顧客削除（CASCADE） |
| GET | /api/customer-names | お客様名一覧（担当者フィルタ可） |
| GET | /api/search | 顧客検索 |

### 書類データ

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/documents | 書類データ取得 |
| POST | /api/documents | 書類データ保存 / 翌年度コピー |
| DELETE | /api/documents/:id | 書類データ削除 |
| GET | /api/records | 保存データ一覧（管理画面用） |
| GET | /api/years | 顧客の年度一覧 |
| GET | /api/available-years | 年度一覧（フィルタ可） |

### バックアップ

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/backup/export | 全データバックアップ（JSON） |
| POST | /api/backup/import | バックアップ復元 |

## 画面構成

### 1. トップ画面（MenuScreen）
- 担当者 → お客様名 → 年度の順で絞り込み・読み込み
- 新規作成（年度を選択して開始）
- 全データバックアップ・復元
- 担当者管理・顧客管理・保存データ管理画面へのリンク

### 2. 書類編集画面（DocumentListScreen）
- カテゴリ別書類一覧（展開/折りたたみ）
- 書類・小項目の追加・編集・削除
- チェックボックスで準備状況管理
- ドラッグ&ドロップで並び替え
- 保存・印刷・Excel出力・JSON入出力
- 翌年度コピー・標準に戻す

### 3. 保存データ管理画面（/data-management/）
- 担当者・お客様名・年度での検索・フィルタ
- ソート（担当者・お客様名・年度・更新日）
- ページネーション（20件/ページ）
- 顧客情報のインライン編集
- データの削除

### 4. 担当者管理画面（/staff/）
- 担当者の新規登録・編集・削除
- 携帯電話番号の登録・表示

### 5. 顧客管理画面（/customers/）
- 顧客の新規登録・編集・削除
- 担当者の紐付け
