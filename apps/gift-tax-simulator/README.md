# 贈与税 比較Webアプリ

贈与税の税額シミュレーション、不動産取得税・登録免許税の計算を行うWebアプリケーションです。

## 機能

### 贈与税シミュレーター（メインページ）
- 贈与金額に対する税額計算
- 一般贈与・特例贈与の切り替え
- 一括贈与 / 2年分割 / 4年分割の比較
- 実効税率の表示
- グラフによる視覚的な比較
- A4印刷対応

### 早見表ページ
- 100万円単位の税額早見表
- 特例贈与・一般贈与を縦並びで表示
- 表示上限の切り替え（1,000万円〜3,000万円）

### 不動産取得税シミュレーター
- 取引種別（売買・新築・相続・贈与）に対応
- 土地を「宅地（特例あり）」と「その他（宅地以外）」に分離入力
- 宅地特例（1/2）・住宅用地の税額軽減に対応
- 建築年月日から控除額を自動判定
- 結果を土地（左）/建物（右）の2カラムで表示
- 計算過程の詳細表示

### 登録免許税シミュレーター
- 取引種別ごとの税率を自動適用
- 土地・建物の登録免許税を個別計算
- 住宅用家屋証明書による軽減税率に対応
- 計算過程の詳細表示

### 共通機能
- 取得税⇔登録免許税間の評価額引用（localStorage経由）
- 印刷時にページタイトル（税目名）をヘッダーに表示
- 印刷用フッター（会社情報・担当者・作成日）
- タブ形式ナビゲーション（4ページ切替）
- レスポンシブデザイン

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Build | Vite 6 |
| Language | TypeScript 5 |
| UI | React 19 |
| Routing | react-router-dom v7 |
| Chart | Chart.js + react-chartjs-2 |
| Icons | lucide-react |
| Styling | Tailwind CSS 4 |
| Container | Docker + nginx |

## 開発環境のセットアップ

### Docker（推奨）

```bash
# 起動
docker compose up -d

# 再ビルドして起動（依存関係追加時など）
docker compose up -d --build

# コンテナ再起動
docker compose restart

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

### ローカル

```bash
npm install
npm run dev
```

## アクセス

| ページ | URL |
|--------|-----|
| 贈与税シミュレーター | http://localhost:3001/gift-tax-simulator/ |
| 早見表 | http://localhost:3001/gift-tax-simulator/table |
| 不動産取得税 | http://localhost:3001/gift-tax-simulator/acquisition-tax |
| 登録免許税 | http://localhost:3001/gift-tax-simulator/registration-tax |

> **Note**: 中央統合環境（docker/docker-compose.yml）で起動する場合は、Nginx Gateway 経由で http://localhost/gift-tax-simulator/ からアクセスできます。

## プロジェクト構成

```
├── src/
│   ├── main.tsx                  # エントリーポイント
│   ├── App.tsx                   # ルーティング
│   ├── app/
│   │   └── globals.css           # グローバルスタイル
│   ├── pages/
│   │   ├── GiftTaxPage.tsx       # 贈与税シミュレーター
│   │   ├── TablePage.tsx         # 早見表
│   │   ├── AcquisitionTaxPage.tsx # 不動産取得税
│   │   └── RegistrationTaxPage.tsx # 登録免許税
│   ├── components/
│   │   ├── Navigation.tsx        # ナビゲーション（タブ形式・4ページ切替）
│   │   ├── InputSection.tsx      # 贈与税入力フォーム
│   │   ├── ResultSection.tsx     # 贈与税結果表示
│   │   ├── TaxTable.tsx          # シミュレーター用テーブル
│   │   ├── TaxChart.tsx          # 棒グラフ
│   │   ├── QuickRefTable.tsx     # 早見表用テーブル
│   │   ├── PrintFooter.tsx       # 印刷用フッター
│   │   ├── acquisition-tax/
│   │   │   ├── LandInput.tsx     # 土地入力（宅地・その他 分離入力）
│   │   │   └── BuildingInput.tsx # 建物入力（評価額・床面積・建築年月日・控除額）
│   │   └── shared/
│   │       ├── CommonInputSection.tsx  # 取引種別・計算対象トグル
│   │       ├── TaxResultBox.tsx        # 結果表示ボックス（フラット/グループ2カラム対応）
│   │       ├── CalculationDetails.tsx  # 計算過程の詳細
│   │       └── ImportButton.tsx        # 評価額引用ボタン
│   ├── hooks/
│   │   ├── useAcquisitionTaxForm.ts   # 不動産取得税フォーム
│   │   └── useRegistrationTaxForm.ts  # 登録免許税フォーム
│   └── lib/
│       ├── tax-calculation.ts    # 贈与税計算ロジック
│       ├── real-estate-tax.ts    # 不動産税計算ロジック
│       ├── utils.ts              # ユーティリティ関数
│       ├── valuation-storage.ts  # 評価額のlocalStorage管理
│       └── company.ts            # 会社情報
├── index.html                    # HTMLエントリー
├── vite.config.ts                # Vite設定
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 税額計算について

### 贈与税

#### 基礎控除
- **110万円**（暦年課税）

#### 特例贈与
直系尊属（父母・祖父母など）から、贈与を受けた年の1月1日時点で18歳以上の者への贈与。

| 基礎控除後の課税価格 | 税率 | 控除額 |
|---------------------|------|--------|
| 200万円以下 | 10% | - |
| 400万円以下 | 15% | 10万円 |
| 600万円以下 | 20% | 30万円 |
| 1,000万円以下 | 30% | 90万円 |
| 1,500万円以下 | 40% | 190万円 |
| 3,000万円以下 | 45% | 265万円 |
| 4,500万円以下 | 50% | 415万円 |
| 4,500万円超 | 55% | 640万円 |

#### 一般贈与
特例贈与以外の贈与（兄弟間、夫婦間、親から未成年の子への贈与など）。

| 基礎控除後の課税価格 | 税率 | 控除額 |
|---------------------|------|--------|
| 200万円以下 | 10% | - |
| 300万円以下 | 15% | 10万円 |
| 400万円以下 | 20% | 25万円 |
| 600万円以下 | 30% | 65万円 |
| 1,000万円以下 | 40% | 125万円 |
| 1,500万円以下 | 45% | 175万円 |
| 3,000万円以下 | 50% | 250万円 |
| 3,000万円超 | 55% | 400万円 |

### 不動産取得税
- 土地: 評価額 × 3%（宅地は評価額1/2の特例あり、住宅用地の税額軽減あり）
- 建物: 評価額 × 3%（住宅用）/ 4%（非住宅）、建築年月日に応じた控除あり
- 相続の場合は非課税

### 登録免許税
- 取引種別に応じた税率（売買1.5%〜2%、相続0.4%、贈与2%等）
- 住宅用家屋証明書ありの場合、軽減税率を適用

## ライセンス

Private - 税理士法人マスエージェント
