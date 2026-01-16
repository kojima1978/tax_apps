# 業務アプリケーション開発環境

税務関連の各種業務アプリケーションを統合管理する開発環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 全サービスのコンテナ管理
- **Nginx**: リバースプロキシによるルーティング
- **ポート80**: 統一されたエントリーポイント

### アプリケーション一覧

| アプリ名 | パス | ポート | 技術スタック | 説明 |
|---------|------|--------|-------------|------|
| ポータル | `/` | 3000 | Next.js | ランチャーダッシュボード |
| 相続税計算 | `/inheritance-tax-app/` | 5173 | Vite/React | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax/` | 3001 | Next.js | 贈与税シミュレーション |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | 3003 | Next.js | 必要書類ガイド |
| 贈与税申告書類案内 | `/gift-tax-docs/` | 3002 | Next.js | 必要書類ガイド |
| 医療法人株式評価 | `/medical/` | 3010 | Next.js | 医療法人の株式評価 |
| 非上場株式評価 | `/shares/` | 3012 | Next.js | 非上場株式の評価 |
| 案件管理 | `/itcm/` | 3020 | Next.js + Express | 相続税案件管理 |
| 通帳OCR | `/ocr/` | 3000 | Next.js + FastAPI | 通帳画像のOCR |
| 銀行分析 | `/bank-analyzer/` | 8501 | Streamlit | 預金移動分析 |
| 不動産取得税 | `/real-estate-tax/` | 3004 | Next.js | 不動産取得税計算 |

## ディレクトリ構造

```
dev/
├── apps/                          # アプリケーション群
│   ├── portal/                    # ポータルランチャー
│   ├── inheritance-tax-app/       # 相続税計算
│   ├── gift-tax/                  # 贈与税計算
│   ├── inheritance-tax-docs/      # 相続税申告書類案内
│   ├── gift-tax-docs/             # 贈与税申告書類案内
│   ├── medical-stock-valuation/   # 医療法人株式評価
│   ├── shares-valuation/          # 非上場株式評価
│   ├── inheritance-case-management/ # 案件管理
│   ├── passbook-ocr/              # 通帳OCR
│   ├── bank-analyzer/             # 銀行分析
│   └── real-estate-tax/           # 不動産取得税
├── docker/                        # Docker設定
│   └── docker-compose.yml
├── nginx/                         # Nginx設定
│   ├── nginx.conf
│   └── default.conf
└── README.md
```

## セットアップ

### 前提条件
- Docker / Docker Compose
- Node.js 18+（ローカル開発時）

### Docker起動

```bash
cd docker
docker-compose up -d
```

ブラウザで http://localhost にアクセスしてポータルを開きます。

### 個別アプリのローカル開発

```bash
cd apps/<アプリ名>
npm install
npm run dev
```

## 技術スタック

- **フロントエンド**: Next.js, React, Vite, Streamlit
- **バックエンド**: Express, FastAPI
- **データベース**: SQLite (Prisma), PostgreSQL
- **スタイリング**: Tailwind CSS
- **アイコン**: lucide-react
- **AI/ML**: Ollama (銀行分析用)

## 開発ガイドライン

- 各アプリは独立して動作可能
- 共通のNginxゲートウェイ経由でアクセス
- 環境変数は各アプリの`.env`ファイルで管理
- データベースファイルはgit管理外
