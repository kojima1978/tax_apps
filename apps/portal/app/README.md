# Tax Apps Portal

税理士業務支援アプリケーションのポータルサイト

## 概要

複数の税務関連アプリケーションへのゲートウェイとして機能するダッシュボードです。
アプリケーション一覧は静的データ（TypeScript定数）で管理しています。

## 技術スタック

- **Framework**: Next.js 16 (App Router, Static Export)
- **Styling**: Tailwind CSS 4
- **UI**: lucide-react (アイコン)
- **本番配信**: nginx:alpine（静的HTML配信、Node.js不要）

## 開発

```bash
# Docker経由で起動（ローカルにnpm installしない）
cd apps/portal/app && docker compose up -d
```

## Docker

```bash
# ビルド
docker build -t tax-apps-portal .

# 起動
docker run -p 3000:3000 tax-apps-portal
```

## ディレクトリ構成

```
app/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ホームページ
│   ├── globals.css         # グローバルスタイル
│   └── fee-table/
│       └── page.tsx        # 料金表ページ
├── components/
│   ├── AppCard.tsx         # アプリカード
│   ├── PageContainer.tsx   # ページコンテナ
│   └── PrintButton.tsx     # 印刷ボタン
├── lib/
│   ├── applications.ts     # アプリ定義（型+データ）
│   └── fee-data.ts         # 料金表データ
├── next.config.ts          # Next.js設定
├── package.json
├── tsconfig.json
└── Dockerfile              # マルチステージビルド（node→nginx, nginx設定もinline）
```

## 登録アプリケーション

| アプリ | URL | 説明 |
|:-------|:----|:-----|
| 相続税 必要書類 | /inheritance-tax-docs/ | 相続税申告に必要な書類をご案内 |
| 贈与税 必要書類 | /gift-tax-docs/ | 贈与税申告に必要な書類をご案内 |
| 確定申告 必要書類 | /tax-docs/ | 確定申告に必要な書類をご案内 |
| 相続税計算 | /inheritance-tax-app/ | 相続税の早見表 |
| 贈与税計算 | /gift-tax-simulator/ | 贈与税計算・早見表・不動産取得税 |
| 医療法人株式評価 | /medical/ | 医療法人の株式評価システム |
| 非上場株式評価 | /shares/ | 非上場株式の評価システム |
| 退職金税額計算 | /retirement-tax-calc/ | 退職金の所得税・住民税を計算 |
| 減価償却ツール | /depreciation-calc/ | 耐用年数・簿価・期間償却を計算 |
| 預貯金分析 | /bank-analyzer/ | 預金移動の分析ツール |
| 案件管理 | /itcm/ | 相続税案件の進捗管理 |
| 料金表 | /fee-table/ | 報酬についてのご案内 |
