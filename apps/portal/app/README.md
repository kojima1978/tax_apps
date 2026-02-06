# Tax Apps Portal

税理士業務支援アプリケーションのポータルサイト

## 概要

複数の税務関連アプリケーションへのゲートウェイとして機能するダッシュボードです。

## 機能

- **アプリケーション一覧**: 登録されたアプリへのクイックアクセス
- **検索**: アプリケーション名・説明で絞り込み
- **管理画面**: アプリの追加・編集・削除（入力バリデーション付き）
- **並び替え**: ドラッグ＆ドロップで表示順をカスタマイズ（localStorage保存）

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite (libsql / better-sqlite3)
- **ORM**: Prisma 7
- **Styling**: Tailwind CSS 4
- **UI**: lucide-react (アイコン)
- **DnD**: @dnd-kit

## 開発

```bash
# 依存関係インストール
npm install

# データベース初期化
npx prisma db push
npm run db:seed

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
│   ├── admin/          # 管理画面
│   ├── api/            # API Routes
│   ├── layout.tsx      # ルートレイアウト
│   ├── page.tsx        # ホームページ（DB読み取り）
│   └── globals.css     # グローバルスタイル
├── components/         # UIコンポーネント
├── lib/                # ユーティリティ（Prisma, アイコン, バリデーション, 並び順）
├── types/              # 共通型定義
└── prisma/             # スキーマ・マイグレーション・シード
```

## 登録アプリケーション

| アプリ | URL | 説明 |
|:-------|:----|:-----|
| 相続税計算 | /inheritance-tax-app/ | 相続税シミュレーション |
| 相続税申告 資料準備ガイド | /inheritance-tax-docs/ | 相続税申告の必要書類案内 |
| 案件管理 | /itcm/ | 相続税案件の進捗管理 |
| 贈与税シミュレーター | /gift-tax-simulator/ | 贈与税・間接税計算 |
| 贈与税申告 必要書類案内 | /gift-tax-docs/ | 贈与税申告の必要書類案内 |
| 間接税シミュレーター | /gift-tax-simulator/real-estate | 土地・建物取得税計算 |
| 医療法人株式評価 | /medical/ | 医療法人の株式評価 |
| 非上場株式評価 | /shares/ | 非上場株式の評価 |
| 銀行分析 | /bank-analyzer/ | 預金移動の分析 |
| 確定申告 必要書類 | /tax-docs/ | 書類確認・管理 |
