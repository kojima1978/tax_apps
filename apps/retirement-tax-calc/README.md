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

- **ビルドツール**: Vite 6
- **ランタイム**: React 19 + TypeScript 5
- **スタイリング**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Docker**: 共通 `docker/Dockerfile.vite-static`（6アプリ共有）

## ディレクトリ構成

```
src/
├── main.tsx                   # エントリポイント
├── App.tsx                    # メインコンポーネント（1画面完結）
├── app/
│   └── globals.css            # グローバルスタイル + 印刷スタイル
├── components/
│   ├── CheckboxField.tsx      # チェックボックス共通コンポーネント
│   ├── FormField.tsx          # フォームフィールド共通
│   ├── Header.tsx             # アプリヘッダー + 印刷ボタン
│   ├── InputWithUnit.tsx      # 入力欄+単位ラベル共通コンポーネント
│   ├── OfficerLimitSection.tsx # 役員退職金限度額
│   ├── PrintFooter.tsx        # 印刷用フッター
│   ├── ReferenceTables.tsx    # 参照表（控除額・速算表）
│   ├── ResultSection.tsx      # 計算結果テーブル
│   ├── RetirementForm.tsx     # 入力フォーム
│   └── ServiceYearsInput.tsx  # 勤続年数（直接入力/日付計算切替）
├── hooks/
│   └── useRetirementTaxForm.ts # フォーム状態管理フック
└── lib/
    ├── retirement-tax.ts      # 退職所得・税額計算ロジック
    ├── tax-rates.ts           # 年度別税率テーブル
    ├── company.ts             # 会社情報
    └── utils.ts               # フォーマットユーティリティ
```

## Docker

### 単体起動

```bash
docker compose up -d             # 起動
docker compose up -d --build     # 再ビルド
docker compose logs -f           # ログ確認
docker compose down              # 停止
```

アクセス: http://localhost:3013/retirement-tax-calc/

> 事前に `docker network create tax-apps-network` でネットワークを作成しておく必要があります。

### manage.bat 経由

```bash
manage.bat start                       # 全アプリ起動
manage.bat restart retirement-tax-calc # このアプリのみ再起動
manage.bat build retirement            # 再ビルド（部分一致可）
```

Gateway 経由アクセス: http://localhost/retirement-tax-calc/
