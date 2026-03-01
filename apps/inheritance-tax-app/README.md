# 相続税シミュレーター

相続財産額に応じた相続税額をシミュレーションするツールです。早見表・詳細計算・1次2次比較・保険金シミュレーション・現金贈与シミュレーションの5つのモードを提供します。

## 機能

### 担当者情報
- ヘッダーから担当者名・電話番号を入力可能
- localStorageに保存し、印刷・Excel出力に反映

### 早見表モード（`/`）
- 相続人構成の設定（配偶者、子、直系尊属、兄弟姉妹）
- 代襲相続（孫、甥姪）のサポート
- 1次相続（配偶者あり）・2次相続（配偶者なし）の税額比較
- 配偶者控除の自動計算
- 第3順位（兄弟姉妹）の2割加算
- Excel出力・印刷対応（A3横向き）

### 計算モード（`/calculator`）
- 任意の遺産総額を入力して相続税を計算
- 配偶者の取得割合を選択（法定相続分 / 1億6千万円 / 任意額）
- 計算過程のステップ表示（基礎控除→法定相続分→速算表→按分→控除）
- 相続人別内訳テーブル（按分税額・2割加算・配偶者控除・納付税額）
- Excel出力・印刷対応（A4横向き、大きめフォント）

### 1次2次比較モード（`/comparison`）
- 1次相続と2次相続の税額を合算比較
- 配偶者の取得割合別に合計税額を比較表示（100%→0%降順）
- 配偶者固有財産の考慮（2次遺産額 = 固有 + 取得 の内訳表示）
- 行クリックで相続人別内訳パネル表示（1次/2次の取得額・納付税額）
- Excel出力対応（比較表 + 相続人別内訳の2シート構成）

### 保険金シミュレーション（`/insurance`）
- 死亡保険金の非課税枠（500万円 × 法定相続人数）を活用した節税効果の検証
- 既存保険契約と新規検討契約の2カテゴリで個別入力
- 各契約: 受取人（相続人リストから選択・重複不可）、受取保険金額、支払保険料
- 現状（既存のみ）vs 提案（既存＋新規）の2シナリオ税額比較（差額列付き）
- 比較テーブルのセクション別説明文（財産の構成・保険金の計算・税額計算・結果）
- 財産フロー表示（元の遺産→保険料→保険金→非課税→課税遺産→税額→納税後）
- 相続人別の保険内訳テーブル（受取保険金・非課税額・納付税額・納税後）
- 相続人別納税後比較テーブル（現状 vs 提案 の差額表示）
- ハイライトカード4種（保険料→保険金倍率・税金の増減・納税後財産額の増減・納税充当率）＋説明文付き
- Excel出力対応（サマリー + 契約一覧 + 相続人別内訳の3シート構成）
- 印刷対応（A4横向き、1ページ収まり最適化）

### 現金贈与シミュレーション（`/cash-gift`）
- 生前贈与（現金）による節税効果のシミュレーション
- 受取人ごとに年間贈与額・贈与年数を個別設定（受贈者の重複不可）
- 特例贈与税率（直系尊属→18歳以上の子・孫）で贈与税を自動計算
- 贈与前（現状）vs 贈与後（提案）の相続税・納税後比較
- 財産フロー表示（元の遺産→贈与→贈与税→相続税→納税後）
- 相続人別内訳テーブル（贈与額・贈与税・相続分・納付税額・納税後）
- 年数別最適贈与比較テーブル（1〜10年の最適年間贈与額と財産額の増減）
- 贈与総額が遺産総額を超えた場合の警告表示
- Excel出力対応
- 印刷対応（A4横向き）

## 技術スタック

- **フレームワーク**: React 19 + TypeScript 5
- **ビルドツール**: Vite 7
- **ルーティング**: React Router DOM 7.6
- **スタイリング**: Tailwind CSS v4 + PostCSS
- **アイコン**: Lucide React（直接 icon import）
- **Excel出力**: ExcelJS + FileSaver
- **Docker**: 共通 `docker/Dockerfile.vite-static`（6アプリ共有）
- **Lint**: ESLint 9 + typescript-eslint

## プロジェクト構成

```
src/
├── pages/
│   ├── TablePage.tsx               # 早見表ページ
│   ├── CalculatorPage.tsx          # 相続税計算ページ
│   ├── ComparisonPage.tsx          # 1次2次相続比較ページ
│   ├── InsurancePage.tsx           # 保険金シミュレーションページ
│   └── CashGiftPage.tsx            # 現金贈与シミュレーションページ
├── components/
│   ├── calculator/
│   │   ├── CalculationResult.tsx   # 計算結果サマリー
│   │   ├── CalculationSteps.tsx    # 計算過程ステップ表示
│   │   ├── CalculatorExcelExport.tsx # 計算結果Excel出力
│   │   ├── HeirBreakdownTable.tsx  # 相続人別内訳テーブル
│   │   ├── ProgressiveTaxBreakdown.tsx # 超過累進税率の内訳表示
│   │   └── SpouseAcquisitionSettings.tsx # 配偶者取得割合設定
│   ├── comparison/
│   │   ├── ComparisonTable.tsx     # 1次2次比較テーブル
│   │   ├── ComparisonDetailPanel.tsx # 相続人別内訳パネル
│   │   └── ComparisonExcelExport.tsx # 比較結果Excel出力
│   ├── insurance/
│   │   ├── InsuranceContractList.tsx # 保険契約入力リスト
│   │   ├── InsuranceSummaryCard.tsx  # シミュレーション結果サマリー
│   │   ├── InsuranceFlowSteps.tsx   # 財産フロー（ステップ表示）
│   │   ├── InsuranceHeirTable.tsx    # 相続人別保険内訳・手取り比較
│   │   └── InsuranceExcelExport.tsx  # 保険シミュレーションExcel出力
│   ├── gift/
│   │   ├── CashGiftRecipientList.tsx # 贈与受取人入力リスト
│   │   ├── CashGiftSummaryCard.tsx   # 贈与シミュレーション結果サマリー
│   │   ├── CashGiftFlowSteps.tsx    # 財産フロー（ステップ表示）
│   │   ├── CashGiftHeirTable.tsx     # 相続人別贈与内訳
│   │   ├── CashGiftYearComparison.tsx # 年数別最適贈与比較テーブル
│   │   └── CashGiftExcelExport.tsx   # 贈与シミュレーションExcel出力
│   ├── heirs/
│   │   ├── Rank2Settings.tsx       # 第2順位：直系尊属
│   │   ├── RankHeirSettings.tsx    # 第1/3順位共通（子・兄弟姉妹）
│   │   └── SpouseSettings.tsx      # 配偶者設定
│   ├── BracketRateTable.tsx         # 加重平均適用税率テーブル
│   ├── CalculateButton.tsx          # 計算ボタン共通
│   ├── CautionBox.tsx              # 注意書きボックス
│   ├── CurrencyInput.tsx           # 金額入力（万円 + フォーマット表示）
│   ├── EstateInput.tsx            # 遺産総額入力（共通）
│   ├── ExcelExport.tsx             # 早見表Excel出力
│   ├── ExcelExportButton.tsx       # Excel出力ボタン共通
│   ├── FlowSteps.tsx               # 財産フロー共通コンポーネント
│   ├── Header.tsx                  # ヘッダー（タブナビゲーション＋担当者入力）
│   ├── HeirNetComparisonTable.tsx   # 相続人別手取り比較テーブル共通
│   ├── HeirSettings.tsx            # 相続人設定メイン
│   ├── PrintHeader.tsx             # 印刷専用ヘッダー
│   ├── RadioGroup.tsx              # ラジオボタングループ共通
│   ├── RangeSettings.tsx           # シミュレーション範囲設定
│   ├── ScenarioComparisonCard.tsx   # シナリオ比較サマリーカード共通
│   ├── SectionHeader.tsx           # セクション見出し共通
│   ├── StatusCard.tsx              # ステータスカード共通（success/warning/error）
│   ├── TaxBracketTable.tsx          # 速算表テーブル
│   ├── TaxTable.tsx                # 税額一覧テーブル
│   └── tableStyles.ts              # テーブルスタイル定数
├── contexts/
│   └── StaffContext.tsx            # 担当者情報（localStorage連携）
├── hooks/
│   ├── useCashGiftSimulation.ts    # 贈与シミュレーション状態管理hook
│   ├── useCleanOptions.ts          # 選択肢変更時の無効値クリーンアップhook
│   ├── useColumnHover.ts           # テーブル列ホバーハイライトhook
│   ├── useExcelExport.ts           # Excel出力状態管理hook
│   ├── useInsuranceSimulation.ts   # 保険シミュレーション状態管理hook
│   └── useUniqueOptions.ts         # 選択肢の重複防止hook
├── constants/
│   ├── cautionMessages.ts          # 各ページの注意事項メッセージ
│   └── index.ts                    # 定数（税率テーブル、基礎控除、会社情報等）
├── types/
│   └── index.ts                    # 型定義
├── utils/
│   ├── comparisonCalculator.ts     # 1次2次比較計算ロジック
│   ├── giftCalculator.ts           # 贈与シミュレーション計算ロジック
│   ├── insuranceCalculator.ts      # 保険金シミュレーション計算ロジック
│   ├── reapportionTax.ts           # 税額按分ロジック
│   ├── excelStyles.ts              # Excel共通スタイル・ワークブック生成・保存
│   ├── formatters.ts               # フォーマット関数
│   ├── heirUtils.ts                # 相続人ユーティリティ
│   ├── idGenerator.ts              # ID生成
│   ├── taxCalculator.ts            # 税額計算ロジック
│   └── index.ts                    # barrel export
├── App.tsx                         # ルーティング定義
└── main.tsx                        # エントリポイント
```

## 開発環境

### Docker（推奨）

#### 単体起動（このアプリのみ）

```bash
# 起動
docker compose up -d

# 再ビルド（package.json, Dockerfile, nginx設定等の変更時）
docker compose up -d --build

# ログ確認
docker compose logs -f

# 再起動
docker compose restart

# 停止
docker compose down
```

アクセス: http://localhost:3004/inheritance-tax-app/

> 事前に `docker network create tax-apps-network` でネットワークを作成しておく必要があります。

#### manage.bat 経由（全アプリ統合管理）

`docker\scripts\manage.bat` を使うと、Gateway を含む全アプリを一括管理できます。

```bash
# 全アプリ起動
manage.bat start

# このアプリのみ再起動
manage.bat restart inheritance-tax-app

# このアプリのみ再ビルドして起動
manage.bat build inheritance-tax-app

# このアプリのログ確認
manage.bat logs inheritance-tax-app

# 全アプリ停止
manage.bat stop
```

Gateway 経由アクセス: http://localhost/inheritance-tax-app/

> アプリ名は部分一致で指定可能です（例: `manage.bat restart inheritance-tax`）。

#### コード変更後の反映方法

| 変更内容 | 開発モード | 本番モード |
|:---------|:----------|:----------|
| `src/` 内のコード（`.tsx`, `.ts`, `.css`） | 自動反映（Vite HMR） | 再ビルドが必要 |
| `package.json`（依存関係の追加・更新） | 再ビルドが必要 | 再ビルドが必要 |
| `Dockerfile`, nginx設定 | 再ビルドが必要 | 再ビルドが必要 |
| `index.html` | 自動反映（ボリュームマウント） | 再ビルドが必要 |

**開発モード** — ソースコード変更は自動反映されます（`src/` と `index.html` がマウント済み）。反映されない場合:

```bash
manage.bat restart inheritance-tax-app
```

**開発モード（再ビルドが必要な場合）**:

```bash
# manage.bat 経由
manage.bat build inheritance-tax-app

# または docker compose 直接
docker compose up -d --build
```

**本番モード** — コード変更後は必ず再ビルドが必要です（ソースマウントなし、ビルド成果物がイメージに内包されるため）:

```bash
# manage.bat 経由（全アプリ）
manage.bat start --prod

# 単体で再ビルド
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

本番ではViteビルド成果物をnginx（1.27-alpine）で配信します。メモリ上限256MBで動作します。

### ローカル

```bash
npm install
npm run dev
```

## 税額計算ロジック

### 基礎控除
```
3,000万円 + 600万円 × 法定相続人数
```

### 税率テーブル

| 課税遺産総額 | 税率 | 控除額 |
|-------------|------|--------|
| 1,000万円以下 | 10% | - |
| 3,000万円以下 | 15% | 50万円 |
| 5,000万円以下 | 20% | 200万円 |
| 1億円以下 | 30% | 700万円 |
| 2億円以下 | 40% | 1,700万円 |
| 3億円以下 | 45% | 2,700万円 |
| 6億円以下 | 50% | 4,200万円 |
| 6億円超 | 55% | 7,200万円 |

### 法定相続分

| 相続人構成 | 配偶者 | その他 |
|-----------|--------|--------|
| 配偶者＋子 | 1/2 | 1/2 |
| 配偶者＋直系尊属 | 2/3 | 1/3 |
| 配偶者＋兄弟姉妹 | 3/4 | 1/4 |

### 死亡保険金の非課税限度額
```
非課税限度額 = 500万円 × 法定相続人数
```

各相続人の非課税額:
```
非課税限度額 × (その相続人の受取保険金額 / 相続人全体の受取保険金合計)
```

### 保険金シミュレーションの計算モデル

| シナリオ | 遺産額の調整 | 保険金 |
|---------|-------------|--------|
| 現状（既存のみ） | 遺産額そのまま | 既存契約の保険金のみ |
| 提案（既存＋新規） | 遺産額 − 新規保険料 | 全契約の保険金 |

課税遺産額 = 調整後遺産額 + (保険金合計 − 非課税額)

### 贈与税の計算（特例贈与税率）

| 基礎控除後の課税価格 | 税率 | 控除額 |
|-------------------|------|--------|
| 200万円以下 | 10% | - |
| 400万円以下 | 15% | 10万円 |
| 600万円以下 | 20% | 30万円 |
| 1,000万円以下 | 30% | 90万円 |
| 1,500万円以下 | 40% | 190万円 |
| 3,000万円以下 | 45% | 265万円 |
| 4,500万円以下 | 50% | 415万円 |
| 4,500万円超 | 55% | 640万円 |

基礎控除: 年間110万円/受贈者

### 現金贈与シミュレーションの計算モデル

| シナリオ | 遺産額 | 贈与の扱い |
|---------|--------|-----------|
| 現状（贈与なし） | 遺産額そのまま | なし |
| 提案（贈与あり） | 遺産額 − 総贈与額 | 贈与税を別途計算 |

総負担 = 相続税 + 贈与税合計
納税後財産額 = 遺産額 − 総負担

## ライセンス

(C) 2026 税理士法人マスエージェント
