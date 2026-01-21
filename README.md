# 税務業務アプリケーション統合環境

税務関連の各種業務アプリケーションを統合管理する開発環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 全サービスのコンテナ管理
- **Nginx**: リバースプロキシによるルーティング
- **ポート80**: 統一されたエントリーポイント

### アプリケーション一覧

| アプリ名 | パス | 直接アクセスURL | 技術スタック | 説明 |
|---------|------|----------------|-------------|------|
| ポータル | `/` | http://localhost:3000/ | Next.js (Static) | ランチャーダッシュボード |
| 相続税計算 | `/inheritance-tax-app/` | http://localhost:5173/inheritance-tax-app/ | Vite/React | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax-simulator/` | http://localhost:3001/gift-tax-simulator/ | Next.js | 贈与税シミュレーション |
| 贈与税申告書類案内 | `/gift-tax-docs/` | http://localhost:3002/gift-tax-docs/ | Next.js | 必要書類ガイド |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | http://localhost:3003/inheritance-tax-docs/ | Next.js | 必要書類ガイド |
| 不動産取得税 | `/real-estate-tax/` | http://localhost:3004/real-estate-tax/ | Next.js | 不動産取得税計算 |
| 確定申告必要書類 | `/tax-docs/` | http://localhost:3005/tax-docs/ | Next.js + Express | 確定申告書類管理 |
| 通帳OCR | `/ocr/` | http://localhost:3007/ocr/ | Next.js + FastAPI | 通帳画像のOCR |
| 医療法人株式評価 | `/medical/` | http://localhost:3010/medical/ | Next.js | 医療法人の株式評価 |
| 非上場株式評価 | `/shares/` | http://localhost:3012/shares/ | Next.js | 非上場株式の評価 |
| 案件管理 | `/itcm/` | http://localhost:3020/itcm/ | Next.js + Express + Postgres | 相続税案件管理 |
| 銀行分析 | `/bank-analyzer/` | http://localhost:8501/ | Streamlit + Ollama | 預金移動分析 |

## ディレクトリ構造

```
tax_apps/
├── apps/                          # アプリケーション群
│   ├── portal/                    # ポータルランチャー
│   ├── inheritance-tax-app/       # 相続税計算
│   ├── gift-tax-simulator/        # 贈与税計算
│   ├── inheritance-tax-docs/      # 相続税申告書類案内
│   ├── gift-tax-docs/             # 贈与税申告書類案内
│   ├── Required-documents-for-tax-return/ # 確定申告必要書類
│   ├── medical-stock-valuation/   # 医療法人株式評価
│   ├── shares-valuation/          # 非上場株式評価
│   ├── inheritance-case-management/ # 案件管理
│   ├── passbook-ocr/              # 通帳OCR
│   ├── bank-analyzer/             # 銀行分析
│   └── real-estate-tax/           # 不動産取得税
├── docker/                        # Docker設定
│   ├── docker-compose.yml
│   └── .env.example               # 環境変数テンプレート
├── nginx/                         # Nginx設定
│   ├── nginx.conf
│   └── default.conf
├── .gitignore
└── README.md
```

## セットアップ

### 前提条件
- Docker / Docker Compose
- Node.js 18+（ローカル開発時）

### Docker起動

```bash
# 1. リポジトリをクローン
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps

# 2. 環境変数を設定
cd docker
cp .env.example .env
# .envファイルを編集してパスワードを設定

# 3. コンテナ起動
docker-compose up -d
```

ブラウザで http://localhost にアクセスしてポータルを開きます。

### 個別アプリのローカル開発

```bash
cd apps/<アプリ名>
npm install
npm run dev
```

## 環境変数

### PostgreSQL（案件管理システム用）

`docker/.env`に以下を設定:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=inheritance_tax_db
```

## 技術スタック

- **フロントエンド**: Next.js 16+, React, Vite, Streamlit
- **バックエンド**: Express, FastAPI
- **データベース**: SQLite (Prisma), PostgreSQL
- **スタイリング**: Tailwind CSS
- **アイコン**: lucide-react
- **AI/ML**: Ollama (銀行分析用), PaddleOCR (通帳OCR用)

## 開発ガイドライン

- 各アプリは独立して動作可能
- 共通のNginxゲートウェイ経由でアクセス
- 環境変数は各アプリの`.env`ファイルで管理
- データベースファイル（*.db）はgit管理外
- `.env`ファイルはgit管理外（`.env.example`を参照）

## ライセンス

Private
