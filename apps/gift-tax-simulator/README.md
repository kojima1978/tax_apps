# 贈与税 比較Webアプリ

贈与税の税額をシミュレーションし、一括贈与と分割贈与を比較するWebアプリケーションです。

## 機能

- 贈与金額に対する税額計算
- 一般贈与・特例贈与の切り替え
- 一括贈与 / 2年分割 / 4年分割の比較
- 実効税率の表示
- グラフによる視覚的な比較
- 印刷機能

## 技術スタック

- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI**: React 19
- **Chart**: Chart.js + react-chartjs-2
- **Styling**: Tailwind CSS 4

## 開発環境のセットアップ

### Docker（推奨）

```bash
# 開発サーバー起動
docker compose --profile dev up

# バックグラウンドで起動
docker compose --profile dev up -d

# ログ確認
docker compose logs -f

# 停止
docker compose --profile dev down
```

### ローカル

```bash
npm install
npm run dev
```

## 本番環境

```bash
# ビルドと起動
docker compose --profile prod up -d

# 停止
docker compose --profile prod down
```

## アクセス

開発・本番ともに以下のURLでアクセスできます：

http://localhost:3001/gift-tax-simulator/

## プロジェクト構成

```
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # メインページ
│   └── globals.css         # グローバルスタイル
├── components/
│   ├── Header.tsx          # ヘッダー（印刷ボタン）
│   ├── InputSection.tsx    # 入力フォーム
│   ├── ResultSection.tsx   # 結果表示
│   ├── TaxTable.tsx        # 税額テーブル
│   └── TaxChart.tsx        # 棒グラフ
├── lib/
│   ├── tax-calculation.ts  # 税額計算ロジック
│   └── utils.ts            # ユーティリティ関数
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 税額計算について

- 基礎控除: 110万円
- 税率表: 国税庁の速算表に基づく
- 特例贈与: 直系尊属から18歳以上への贈与
- 一般贈与: その他の贈与

## ライセンス

Private
