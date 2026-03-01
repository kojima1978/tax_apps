# 非上場株式評価アプリ (shares-valuation)

国税庁の財産評価基本通達に基づき、取引相場のない株式（非上場株式）の評価額を算出するWebアプリケーションです。

## 主な機能

- **ステップバイステップ入力** — 8ステップで基礎情報から評価結果まで段階的に入力
- **一覧入力** — 全データを1画面で一括入力し即時算出
- **類似業種比準価額 (S)** — 配当・利益・純資産の3要素による比準方式
- **純資産価額 (N)** — 相続税評価額ベースの純資産方式
- **法人税法上の時価** — 小会社方式での法人税法上の評価
- **利益0シミュレーション** — 直前期利益=0の場合の評価額試算
- **比準要素数判定** — 0要素・1要素会社の自動判定と評価方式切替
- **医療法人対応** — 配当不可の医療法人に対応した計算
- **比較表・印刷** — 評価結果の比較表表示と印刷用レイアウト
- **データ保存/復元** — JSONファイルによるエクスポート/インポート

## ステップ構成

| Step | 画面 | 内容 |
|------|------|------|
| 1 | BasicInfoForm | 会社名・課税時期・資本金・発行済株式数 |
| 2 | CompanySizeForm | 業種区分・従業員数・総資産・売上高 → 会社規模判定 |
| 3 | OwnDataForm | 自社の配当(b)・利益(c)・純資産(d) 3期分入力 |
| 4 | IndustryDataForm | 類似業種の株価(A)・配当(B)・利益(C)・純資産(D) |
| 5 | NetAssetForm | 資産・負債の帳簿価額と相続税評価額 |
| 6 | ValuationResult | 評価結果（相続税評価額ベース） |
| 7 | CorporateTaxFairValue | 法人税法上の時価 |
| 8 | ValuationSimulation | 利益0シミュレーション |
| 9 | ValuationSummary | 評価結果の比較表 |
| 10 | PrintAllSteps | 全ステップの印刷用レイアウト |

## 技術スタック

- **Vite** 6 + **React** 19 + **TypeScript** 5
- **React Router DOM** 7 — クライアントサイドルーティング
- **Tailwind CSS** v4 (`@tailwindcss/postcss`)
- **react-number-format** — 数値入力フォーマット
- **lucide-react** — アイコン
- **class-variance-authority** / **clsx** / **tailwind-merge** — スタイルユーティリティ
- **Docker**: 共通 `docker/Dockerfile.vite-static`（6アプリ共有）

## ディレクトリ構成

```
src/
├── main.tsx                        # エントリポイント（BrowserRouter basename="/shares"）
├── App.tsx                         # ルーティング定義（React Router DOM）
├── globals.css                     # グローバルスタイル
├── pages/
│   ├── HomePage.tsx                # トップページ（入力方法選択）
│   ├── Step1Page.tsx ~ Step10Page.tsx  # ステップバイステップ入力
│   └── BulkPage.tsx                # 一覧入力
├── components/
│   ├── ui/                         # 汎用UIコンポーネント
│   │   ├── Button, Card, Input, Label
│   │   ├── NumberInput             # 数値入力
│   │   ├── NumberInputWithUnit     # 単位付き数値入力
│   │   ├── PageLayout              # ページレイアウト共通
│   │   ├── PeriodInputPair         # 期間別2列入力
│   │   ├── ProfitMethodSelector    # 利益計算方法選択
│   │   ├── IndustryTypeSelector    # 業種区分選択
│   │   ├── FormNavigationButtons   # 戻る/次へボタン
│   │   ├── FormSectionHeader       # セクションヘッダー
│   │   ├── ResultPreviewHeader     # 結果プレビューヘッダー
│   │   ├── MedicalCorporationBadge # 医療法人バッジ
│   │   ├── TrendArrow              # 比準割合矢印
│   │   └── Toast                   # トースト通知
│   └── valuation/                  # 評価専用コンポーネント
│       ├── *Form.tsx               # 各ステップのフォーム
│       ├── CalculationProcessDisplay.tsx # 計算過程表示
│       ├── ValuationResult.tsx     # 評価結果表示
│       ├── ValuationSimulation.tsx # シミュレーション
│       ├── ValuationSummary.tsx    # 比較表
│       ├── ValuationBulkInput.tsx  # 一覧入力
│       ├── ValuationResultCards.tsx # 結果カード共通
│       ├── PrintAllSteps.tsx       # 印刷統合
│       └── PrintValuationStep.tsx  # 印刷用ステップ
├── hooks/
│   └── useValuationData.ts         # sessionStorageロード+リダイレクト
├── lib/
│   ├── valuation-logic.ts          # 評価計算ロジック
│   ├── format-utils.ts             # 数値フォーマット
│   ├── date-utils.ts               # 日付ユーティリティ
│   ├── data-export-import.ts       # JSON保存/復元
│   ├── dummy-data.ts               # テスト用ダミーデータ
│   └── utils.ts                    # cn() ユーティリティ
└── types/
    └── valuation.ts                # BasicInfo, Financials 型定義
```

## 開発

```bash
npm run dev       # Vite開発サーバー起動
npm run build     # TypeScript型チェック + Viteビルド
npm run preview   # ビルド成果物のプレビュー
npm run lint      # ESLint実行
```

## Docker での起動

### スタンドアロン

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

アクセス: http://localhost:3012/shares/

> 事前に `docker network create tax-apps-network` でネットワークを作成しておく必要があります。

### manage.bat 経由

```bash
manage.bat start                    # 全アプリ起動
manage.bat restart shares-valuation # このアプリのみ再起動
manage.bat build shares-valuation   # 再ビルド
manage.bat logs shares-valuation    # ログ確認
```

Gateway 経由アクセス: http://localhost/shares/
