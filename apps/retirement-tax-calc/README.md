# 退職金 税額計算シミュレーター

退職金にかかる所得税・復興特別所得税・住民税を計算するシミュレーターです。

## 機能

- **3パターン比較**: 退職金額を最大3パターン入力し、税額を横並びで比較
- **退職区分**: 一般退職手当等 / 特定役員退職手当等 / 短期退職手当等
- **勤続年数**: 直接入力 または 勤続開始日・退職日から自動計算（1年未満切上げ）
- **障害者退職加算**: 退職所得控除額に100万円を加算
- **役員退職金限度額**: 最終月額報酬 × 功績倍率 × 勤続年数（役職プリセット付き）
- **限度額超過警告**: 支給額が限度額を超えた場合に警告表示
- **税率年度選択**: 令和6年・令和7年の税率テーブルに対応
- **参照表**: 退職所得控除額表・速算表（該当行ハイライト、国税庁出典リンク）
- **印刷対応**: A4印刷レイアウト

## 税額計算ロジック

| 項目 | 計算方法 |
|:-----|:---------|
| 退職所得控除額（20年以下） | 40万円 × 勤続年数（最低80万円） |
| 退職所得控除額（20年超） | 800万円 + 70万円 ×（勤続年数 − 20年） |
| 課税退職所得金額（一般） | （支給額 − 控除額）× 1/2（1,000円未満切捨て） |
| 課税退職所得金額（特定役員） | 支給額 − 控除額（1/2なし） |
| 所得税 | 速算表により算出（100円未満切捨て） |
| 復興特別所得税 | 所得税 × 2.1% |
| 住民税 | 課税退職所得金額 × 10%（市民税6% + 県民税4%） |

## 技術スタック

- **Framework**: Next.js 16.1.2 (App Router)
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4
- **Runtime**: React 19.2.3

## ディレクトリ構成

```
retirement-tax-calc/
├── app/
│   ├── globals.css          # グローバルスタイル + 印刷スタイル
│   ├── layout.tsx           # ルートレイアウト
│   └── page.tsx             # メインページ（1画面完結）
├── components/
│   ├── Header.tsx           # アプリヘッダー + 印刷ボタン
│   ├── RetirementForm.tsx   # 入力フォーム
│   ├── ServiceYearsInput.tsx # 勤続年数（直接入力/日付計算切替）
│   ├── OfficerLimitSection.tsx # 役員退職金限度額
│   ├── CheckboxField.tsx    # チェックボックス共通コンポーネント
│   ├── ResultSection.tsx    # 計算結果テーブル
│   ├── ReferenceTables.tsx  # 参照表（控除額・速算表）
│   └── PrintFooter.tsx      # 印刷用フッター
├── hooks/
│   └── useRetirementTaxForm.ts # フォーム状態管理フック
├── lib/
│   ├── retirement-tax.ts    # 退職所得・税額計算ロジック
│   ├── tax-rates.ts         # 年度別税率テーブル
│   └── utils.ts             # フォーマットユーティリティ
├── Dockerfile               # マルチステージビルド（Port: 3013）
└── package.json
```

## Docker

### スタンドアロン（推奨）

```bash
# 起動
docker compose up -d

# 再ビルド
docker compose up -d --build

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

アクセス: http://localhost:3013/retirement-tax-calc/

> **Note**: 中央統合環境（docker/docker-compose.yml）で起動する場合は、Nginx Gateway 経由で http://localhost/retirement-tax-calc/ からアクセスできます。
