# 贈与税 比較Webアプリ

贈与税の税額シミュレーション、不動産取得税・登録免許税の計算を行うWebアプリケーションです。

## 機能

### 贈与税シミュレーター（メインページ）
- 贈与金額に対する税額計算
- 一般贈与・特例贈与の切り替え
- 一括贈与 / 2年分割 / 4年分割の比較
- 実効税率の表示
- 棒グラフによる視覚的な比較（Chart.js）
- 未入力時のガイド表示（空状態UI）
- A4印刷対応

### 早見表ページ
- 100万円単位の税額早見表
- 特例贈与・一般贈与を縦並びで表示
- 表示上限の切り替え（1,000万円〜3,000万円）
- A3印刷対応

### 分割年数別 税額比較
- 1〜20年分割した場合の合計税額を一覧・グラフで比較
- 最適な分割年数をハイライト表示（「最安」バッジ）
- 非課税となる年数に「非課税」バッジ表示
- 一般贈与・特例贈与の切り替え対応
- 未入力時のガイド表示（空状態UI）

### 不動産取得税シミュレーター
- 取引種別（売買・新築・相続・贈与）に対応
- 土地を「宅地（特例あり）」と「その他（宅地以外）」に分離入力
- 宅地特例（1/2）・住宅用地の税額軽減に対応
- 建築年月日から控除額を自動判定（1976年〜現在の閾値テーブル）
- 結果を土地/建物の2カラムグループで表示
- 計算過程の詳細表示（トグル）
- 相続の場合は非課税メッセージ表示

### 登録免許税シミュレーター
- 取引種別ごとの税率を自動適用
- 土地・建物の登録免許税を個別計算
- 住宅用家屋証明書による軽減税率に対応
- 居住用チェックで条件分岐
- 計算過程の詳細表示（トグル）

### 共通機能
- 取得税⇔登録免許税間の評価額引用（localStorage経由）
- 印刷時にページタイトル（税目名）をヘッダーに表示
- 印刷用フッター（会社情報・担当者名入力・作成日）
- タブ形式ナビゲーション（5ページ切替、lucide-reactアイコン付き）
- 全角数字→半角自動変換、カンマ区切り自動フォーマット
- レスポンシブデザイン（モバイル対応）

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Build | Vite 6.3 |
| Language | TypeScript 5.9 |
| UI | React 19.2 |
| Routing | react-router-dom v7 |
| Chart | Chart.js 4.5 + react-chartjs-2 5.3 |
| Icons | lucide-react |
| Styling | Tailwind CSS v4 + カスタムCSS |
| Container | Docker (Node 22-alpine → nginx 1.27-alpine) |

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
| 分割年数比較 | http://localhost:3001/gift-tax-simulator/year-comparison |
| 不動産取得税 | http://localhost:3001/gift-tax-simulator/acquisition-tax |
| 登録免許税 | http://localhost:3001/gift-tax-simulator/registration-tax |

> **Note**: `manage.bat start` で全アプリを起動する場合は、Nginx Gateway 経由で http://localhost/gift-tax-simulator/ からアクセスできます。

## プロジェクト構成

```
├── src/
│   ├── main.tsx                  # エントリーポイント
│   ├── App.tsx                   # ルーティング（5ルート）
│   ├── app/
│   │   └── globals.css           # グローバルスタイル（CSS変数・印刷用・レスポンシブ）
│   ├── pages/
│   │   ├── GiftTaxPage.tsx       # 贈与税シミュレーター
│   │   ├── TablePage.tsx         # 早見表
│   │   ├── YearComparisonPage.tsx # 分割年数別 税額比較
│   │   ├── AcquisitionTaxPage.tsx # 不動産取得税
│   │   └── RegistrationTaxPage.tsx # 登録免許税
│   ├── components/
│   │   ├── Navigation.tsx        # ナビゲーション（タブ形式・5ページ切替）
│   │   ├── InputSection.tsx      # 贈与税入力フォーム（金額・区分・計算ボタン）
│   │   ├── ResultSection.tsx     # 贈与税結果表示（空状態UI付き）
│   │   ├── TaxTable.tsx          # シミュレーター用テーブル（3パターン比較）
│   │   ├── TaxChart.tsx          # 棒グラフ（lazy load）
│   │   ├── QuickRefTable.tsx     # 早見表用テーブル
│   │   ├── YearComparisonTable.tsx # 年数比較テーブル（最安/非課税バッジ）
│   │   ├── YearComparisonChart.tsx # 年数比較棒グラフ（lazy load）
│   │   ├── PrintFooter.tsx       # 印刷用フッター
│   │   ├── acquisition-tax/
│   │   │   ├── LandInput.tsx     # 土地入力（宅地・その他 分離入力）
│   │   │   └── BuildingInput.tsx # 建物入力（評価額・床面積・建築年月日・控除額）
│   │   └── shared/
│   │       ├── CommonInputSection.tsx  # 取引種別・計算対象トグル
│   │       ├── TaxResultBox.tsx        # 結果表示ボックス（フラット/グループ2カラム対応）
│   │       ├── CalculationDetails.tsx  # 計算過程の詳細（トグル表示）
│   │       └── ImportButton.tsx        # 評価額引用ボタン
│   ├── hooks/
│   │   ├── useAcquisitionTaxForm.ts   # 不動産取得税フォーム状態管理
│   │   ├── useFormattedInput.ts       # 数値入力フォーマット
│   │   ├── useRegistrationTaxForm.ts  # 登録免許税フォーム状態管理
│   │   └── useValuationImport.ts      # 評価額引用（localStorage）
│   └── lib/
│       ├── tax-calculation.ts    # 贈与税計算ロジック（速算表・年数比較・パターン比較）
│       ├── real-estate-tax.ts    # 不動産税計算ロジック（取得税・登録免許税）
│       ├── utils.ts              # ユーティリティ（formatCurrency, formatYen, normalizeNumberString等）
│       ├── valuation-storage.ts  # 評価額のlocalStorage管理
│       └── company.ts            # 会社情報定数
├── index.html                    # HTMLエントリー（Google Fonts: Noto Sans JP, Roboto Mono）
├── vite.config.ts                # Vite設定（base, @alias, lucide-react alias, manualChunks）
├── docker-compose.yml            # 開発用（Vite dev server, port 3001）
├── docker-compose.prod.yml       # 本番オーバーライド（nginx, memory 256M）
└── package.json
```

### Docker構成

共通 `docker/Dockerfile.vite-static`（Viteアプリ共有）を使用。

| ステージ | 用途 |
|---------|------|
| `base` | Node 22-alpine、共通設定 |
| `deps` | npm ci（キャッシュマウント付き） |
| `dev` | Vite dev server（ホットリロード） |
| `builder` | `npm run build`（本番ビルド） |
| `runner` | nginx 1.27-alpine（静的ファイル配信、gzip、セキュリティヘッダー） |

開発時は `dev` ターゲット（`src/` と `index.html` をボリュームマウント）、本番は `runner` ターゲット（ビルド済みdistをnginxで配信）。

### 本番環境

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` でビルドターゲットを `runner`（nginx）に切り替え、ボリュームマウントを無効化、メモリ制限を256Mに縮小。

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
- 端数処理: 課税標準額は千円未満切捨、税額は百円未満切捨（最低1,000円）

## ライセンス

Private - 税理士法人マスエージェント
