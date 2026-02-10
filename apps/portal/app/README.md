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
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
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
│   ├── layout.tsx      # ルートレイアウト
│   ├── page.tsx        # ホームページ
│   └── globals.css     # グローバルスタイル
├── components/         # AppCard, PageContainer
├── lib/                # アプリ定義（型+データ）
└── Dockerfile          # マルチステージビルド（node→nginx, nginx設定もinline）
```

## 登録アプリケーション

| アプリ | URL | 説明 |
|:-------|:----|:-----|
| 相続税計算 | /inheritance-tax-app/ | 相続税シミュレーション |
| 相続税 必要書類 | /inheritance-tax-docs/ | 相続税申告の必要書類案内 |
| 案件管理 | /itcm/ | 相続税案件の進捗管理 |
| 贈与税計算 | /gift-tax-simulator/ | 贈与税・間接税計算 |
| 贈与税 必要書類 | /gift-tax-docs/ | 贈与税申告の必要書類案内 |
| 間接税シミュレーター | /gift-tax-simulator/real-estate | 土地・建物取得税計算 |
| 医療法人株式評価 | /medical/ | 医療法人の株式評価 |
| 非上場株式評価 | /shares/ | 非上場株式の評価 |
| 退職金税額計算 | /retirement-tax-calc/ | 退職金の所得税・住民税計算 |
| 預貯金分析 | /bank-analyzer/ | 預金移動の分析 |
| 確定申告 必要書類 | /tax-docs/ | 書類確認・管理 |
