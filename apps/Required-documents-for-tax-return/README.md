# 確定申告 必要書類管理システム

確定申告に必要な書類を一覧表示し、追加・編集・削除ができるWebアプリケーションです。

## 機能

### 書類編集
- カテゴリ別書類管理（追加・編集・削除・復元）
- 書類・小項目（サブアイテム）の追加・編集・削除
- チェックボックスで準備状況管理（チェック済みは薄表示）
- カテゴリ一括チェック / 一括解除
- ドラッグ&ドロップによる並び替え（カテゴリ・書類）
- 全カテゴリ展開 / 折りたたみ
- 書類検索（リアルタイムフィルタ + ハイライト表示）
- 自動保存（30秒デバウンス）
- Ctrl+S キーボードショートカット
- 未保存変更の警告（beforeunload）
- Toast通知（保存成功・エラー・自動保存）

### 出力
- 印刷機能（1列・2列レイアウト切替、レイアウト最適化済み）
- Excel出力（顧客名・担当者名・携帯番号を含む、スタイル付き）
- JSON入出力（顧客単位エクスポート / インポート）

### データ管理
- 顧客管理（お客様名・お客様コード・担当者の紐付け）
- 担当者管理（名前・担当者コード・携帯電話番号の登録）
- 年度別のデータ保存
- 翌年度へのデータコピー
- 保存データ管理画面（検索・ソート・ページネーション・編集・削除）
- 「標準に戻す」機能（初期リストへリセット）
- 全データバックアップ・復元（JSON）

## 技術スタック

### フロントエンド
- Vite 6 + React 19 + TypeScript 5
- React Router DOM 7（クライアントサイドルーティング）
- Tailwind CSS v4 (`@tailwindcss/postcss`)
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
- バックエンドAPI: http://localhost:3006/api/

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

本番では `VITE_API_URL=/tax-docs-api`（相対パス）が自動設定されます。

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

バックエンドAPIが http://localhost:3006 で起動します。

#### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

フロントエンドが http://localhost:3005/tax-docs/ で起動します。

## 環境変数

### フロントエンド

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `VITE_API_URL` | `http://localhost:3006` | バックエンドAPIのURL |

### バックエンド

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `PORT` | `3006` | APIサーバーのポート番号 |
| `NODE_ENV` | - | `development` or `production` |
| `TZ` | `Asia/Tokyo` | タイムゾーン |

### CORS許可オリジン（バックエンド）

バックエンドは以下のオリジンからのリクエストを許可します:

- `http://localhost:3005` — フロントエンド開発サーバー（Docker）
- `http://127.0.0.1:3005` — 同上（loopback）

## ディレクトリ構成

```
Required-documents-for-tax-return/
├── frontend/                  # Viteフロントエンド
│   ├── src/
│   │   ├── main.tsx           # エントリポイント
│   │   ├── App.tsx            # ルーティング（React Router DOM）
│   │   ├── app/
│   │   │   └── globals.css    # グローバルスタイル（Toast アニメーション等）
│   │   ├── pages/             # ページコンポーネント
│   │   │   ├── CustomerDashboardPage.tsx  # 顧客ダッシュボード（トップ画面）
│   │   │   ├── CustomerDetailPage.tsx     # 顧客詳細（年度選択）
│   │   │   ├── DocumentEditorPage.tsx     # 書類編集ページ（保存・自動保存）
│   │   │   ├── CustomerCreatePage.tsx     # 顧客作成
│   │   │   ├── CustomerEditPage.tsx       # 顧客編集
│   │   │   ├── CustomersPage.tsx          # 顧客一覧
│   │   │   ├── StaffPage.tsx              # 担当者一覧
│   │   │   ├── StaffCreatePage.tsx        # 担当者作成
│   │   │   ├── StaffEditPage.tsx          # 担当者編集
│   │   │   └── DataManagementPage.tsx     # 保存データ管理
│   │   ├── components/        # UIコンポーネント
│   │   │   ├── DocumentListScreen.tsx     # 書類編集画面（メイン）
│   │   │   ├── AdminMenu.tsx              # 管理メニュー
│   │   │   ├── CustomerCard.tsx           # 顧客カード
│   │   │   ├── FormPageLayout.tsx         # フォームページ共通レイアウト
│   │   │   ├── PageShell.tsx              # ページ共通ラッパー（max-w-7xl）
│   │   │   ├── Toast.tsx                  # Toast通知
│   │   │   ├── ListPage.tsx               # 汎用一覧ページ
│   │   │   ├── FormErrorDisplay.tsx       # フォームエラー表示
│   │   │   ├── CodeInput.tsx               # コード入力（数字のみ、maxLength指定）
│   │   │   ├── SearchableSelect.tsx       # 検索可能セレクト
│   │   │   ├── SelectField.tsx            # セレクトフィールド
│   │   │   ├── SubmitButton.tsx           # 送信ボタン（デフォルトスタイル付き）
│   │   │   ├── FullScreenLoader.tsx       # 全画面ローダー
│   │   │   ├── ErrorBoundary.tsx          # エラーハンドリング
│   │   │   └── document-list/             # 書類リスト関連
│   │   │       ├── EditorToolbar.tsx          # ツールバー（保存・検索・展開等）
│   │   │       ├── SortableCategory.tsx       # ドラッグ可能カテゴリ
│   │   │       ├── SortableDocumentItem.tsx   # ドラッグ可能書類
│   │   │       ├── SubItemComponent.tsx       # サブアイテム
│   │   │       ├── HighlightText.tsx          # 検索ハイライト
│   │   │       ├── AddCategorySection.tsx     # カテゴリ追加
│   │   │       ├── MissingCategoriesRestore.tsx # 削除カテゴリ復元
│   │   │       ├── PrintHeader.tsx            # 印刷ヘッダー
│   │   │       ├── PrintFooter.tsx            # 印刷フッター
│   │   │       └── buildHandlers.ts           # ハンドラーオブジェクト構築
│   │   ├── hooks/             # カスタムフック
│   │   │   ├── useDocumentListEditing.ts  # 書類編集ロジック
│   │   │   ├── useDataManagement.ts       # データ管理ロジック
│   │   │   ├── useAutoSave.ts             # 自動保存
│   │   │   ├── useBeforeUnloadWarning.ts  # 未保存警告
│   │   │   ├── useCtrlSave.ts             # Ctrl+S ショートカット
│   │   │   └── useToast.ts                # Toast通知管理
│   │   ├── data/              # 書類データ定義
│   │   │   └── taxReturnData.ts
│   │   ├── types/             # 型定義
│   │   │   └── index.ts
│   │   └── utils/             # ユーティリティ
│   │       ├── api.ts                # API関数
│   │       ├── date.ts               # 日付ユーティリティ
│   │       ├── documentUtils.ts      # 書類生成ヘルパー
│   │       ├── error.ts              # エラーメッセージ
│   │       ├── exportExcel.ts        # Excel出力
│   │       ├── jsonExportImport.ts   # JSONバックアップ・復元
│   │       └── keyboard.ts           # キーボードイベント
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
├── docs/                      # ドキュメント
│   ├── ER図.md                # ER図（Mermaid）
│   └── 仕様書.md              # アプリケーション仕様書
├── docker-compose.yml         # 開発用
├── docker-compose.prod.yml    # 本番用オーバーライド
└── README.md
```

## データベース設計

詳細は [docs/ER図.md](docs/ER図.md) を参照してください。

### テーブル構成（第3正規形）
- **staff**: 担当者情報（名前、担当者コード、携帯電話番号）
- **customers**: 顧客情報（お客様名、お客様コード、担当者ID → staff外部キー）
- **document_records**: 年度別書類データ（JSON形式で保存）

### リレーション
- staff 1 → N customers（担当者 → 顧客、ON DELETE SET NULL）
- customers 1 → N document_records（顧客 → 年度別書類データ、ON DELETE CASCADE）
- 担当者名はJOINで取得（`LEFT JOIN staff ON customers.staff_id = staff.id`）

## Docker 構成

### マルチステージビルド

両Dockerfileは用途別のステージを持ちます:

| ステージ | 用途 | 備考 |
|---------|------|------|
| `base` | 共通ベース | Node.js 22 Alpine |
| `deps` | 依存関係インストール | BuildKit cache mount で高速化 |
| `dev` | 開発サーバー | ホットリロード対応 |
| `builder` | ビルド | Viteビルド / TypeScript コンパイル |
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
| GET | /api/customers/:id/documents/:year | 書類データ取得（IDベース） |
| POST | /api/customers/:id/documents/:year | 書類データ保存 / 翌年度コピー（IDベース） |
| GET | /api/documents | 書類データ取得（レガシー: staffName指定） |
| POST | /api/documents | 書類データ保存 / 翌年度コピー（レガシー） |
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

全ページ共通で `max-w-7xl`（1280px）のワイドレイアウトを採用。

### 1. 顧客ダッシュボード（/）
- 顧客カード一覧（年度バッジ、担当者、最終更新日表示）
- お客様名・お客様コード検索、担当者ドロップダウンフィルタ
- お客様登録リンク
- 折りたたみ式管理メニュー（担当者・顧客・データ管理・バックアップ・復元）

### 2. 顧客詳細（/customers/:id）
- 保存済み年度の一覧
- 年度を選択して書類編集を開始

### 3. 書類編集画面（/customers/:id/years/:year）
- カテゴリ別書類一覧（展開/折りたたみ）
- 書類・小項目の追加・編集・削除
- チェックボックスで準備状況管理（チェック済みは薄表示 + 取り消し線）
- カテゴリ一括チェック / 全解除ボタン
- ドラッグ&ドロップで並び替え
- リアルタイム書類検索（ハイライト付き）
- 自動保存（30秒）、Ctrl+S 手動保存
- Toast通知による保存結果表示
- 未保存変更の警告（ブラウザ閉じ / 戻る操作時）
- 保存・変更破棄・標準に戻す・翌年度コピー
- 印刷・Excel出力・JSON入出力

### 4. 保存データ管理画面（/data-management/）
- 担当者・お客様名・年度での検索・フィルタ
- ソート（担当者・お客様名・年度・更新日）
- ページネーション（20件/ページ）
- 顧客情報のインライン編集
- データの削除

### 5. 担当者管理画面（/staff/）
- 担当者の新規登録・編集・削除
- 担当者コード・携帯電話番号の登録・表示

### 6. 顧客管理画面（/customers/）
- 顧客の新規登録・編集・削除
- お客様コードの登録・表示
- 担当者の紐付け
