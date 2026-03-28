# 相続税シミュレーター

相続財産額に応じた相続税額をシミュレーションするツールです。6つのモードで計算・比較・節税検証を行えます。

## 機能一覧

| モード | パス | 概要 |
|--------|------|------|
| 相続税計算 | `/` | 任意の遺産総額から相続税を詳細計算 |
| 1次2次比較 | `/comparison` | 配偶者取得割合別に1次・2次相続の合計税額を比較 |
| 保険金 | `/insurance` | 死亡保険金の非課税枠を活用した節税効果を検証 |
| 現金贈与 | `/cash-gift` | 生前贈与による節税効果をシミュレーション |
| 分割シミュレーション | `/split` | 各相続人の取得額を変動させて税額変化を一覧比較 |
| 早見表 | `/table` | 相続人構成別の税額早見表・加重平均税率表 |

### 共通機能

- **ポータルに戻る**: ヘッダー左端にホームアイコン+リンク
- **担当者情報**: ヘッダーから担当者名・電話番号を入力（localStorage保存、印刷に反映）
- **印刷対応**: 全ページA4/A3横向き印刷に最適化（PrintHeader、ページ分割）
- **バリデーション**: 入力不備時にエラー箇所へスクロール＋エラーパネル表示
- **結果アニメーション**: 計算結果のフェードイン表示＋自動スクロール

### 相続税計算（`/`）

- 配偶者の取得割合を選択（法定相続分 / 1億6千万円 / 任意額）
- 計算過程のステップ表示（基礎控除→法定相続分→速算表→按分→控除）
- 超過累進税率の内訳表示
- 相続人別内訳テーブル（按分税額・2割加算・配偶者控除・納付税額）
- サマリーカード（納付税額合計・相続税負担率・加重平均適用税率）

### 1次2次比較（`/comparison`）

- 配偶者の取得割合別に合計税額を比較表示（100%→0%降順）
- 配偶者固有財産の考慮（2次遺産額 = 固有 + 取得 の内訳表示）
- 行クリックで相続人別内訳パネル表示（1次/2次の取得額・納付税額）

### 保険金シミュレーション（`/insurance`）

- 死亡保険金の非課税枠（500万円 × 法定相続人数）を活用した節税効果検証
- 既存保険契約と新規検討契約の2カテゴリで個別入力
- 現状（既存のみ）vs 提案（既存＋新規）の2シナリオ税額比較
- 財産フロー表示（元の遺産→保険料→保険金→非課税→課税遺産→税額→納税後）
- 相続人別の保険内訳テーブル＋手取り比較
- ハイライトカード4種（保険料→保険金倍率・税金の増減・納税後財産額の増減・納税充当率）

### 現金贈与シミュレーション（`/cash-gift`）

- 受取人ごとに年間贈与額・贈与年数を個別設定（受贈者の重複不可）
- 特例贈与税率（直系尊属→18歳以上の子・孫）で贈与税を自動計算
- 贈与前（現状）vs 贈与後（提案）の相続税・納税後比較
- 財産フロー表示（元の遺産→贈与→贈与税→相続税→納税後）
- 年数別最適贈与比較テーブル（1〜10年の最適年間贈与額と財産額の増減）

### 分割シミュレーション（`/split`）

- 各相続人の取得額を手入力し、取得額変動時の税額変化を一覧表で確認
- 「法定相続分で入力」ボタンで取得額を法定割合で自動セット
- 相続人ごとに独立した増減額/行を設定（例: 配偶者+1,000万、子1 +500万）
- 1人を「自動調整」に指定 → 他の増減分を吸収して合計=遺産総額を維持
- 結果テーブル: 取得額ブロック + 個別税額ブロック + 税額合計 + 基準との差 + 法定との差
- 法定相続分行（青系ハイライト）をテーブル最上部に常時表示
- 取得額がマイナスになるシナリオは自動除外

### 早見表（`/table`）

- 相続人構成の設定（配偶者、子、直系尊属、兄弟姉妹）
- 代襲相続（孫、甥姪）のサポート
- 1次相続（配偶者あり）・2次相続（配偶者なし）の税額一覧
- 加重平均適用税率テーブル
- 速算表（税率テーブル）の参照表示

## 技術スタック

- **フレームワーク**: React 19 + TypeScript 5.9
- **ビルドツール**: Vite 7.2
- **ルーティング**: React Router DOM 7.6
- **スタイリング**: Tailwind CSS v3.4 + PostCSS + Autoprefixer
- **アイコン**: Lucide React（直接 icon import）
- **Lint**: ESLint 9 + typescript-eslint

## プロジェクト構成

```
src/
├── App.tsx                           # ルーティング定義（6ルート）
├── main.tsx                          # エントリポイント
├── index.css                         # Tailwind + アニメーション + 印刷スタイル
│
├── pages/
│   ├── CalculatorPage.tsx            # 相続税計算ページ
│   ├── ComparisonPage.tsx            # 1次2次相続比較ページ
│   ├── InsurancePage.tsx             # 保険金シミュレーションページ
│   ├── CashGiftPage.tsx              # 現金贈与シミュレーションページ
│   ├── SplitPage.tsx                 # 分割シミュレーションページ
│   └── TablePage.tsx                 # 早見表ページ
│
├── components/
│   ├── calculator/
│   │   ├── CalculationResult.tsx     # 計算結果サマリー（3ページ構成）
│   │   ├── CalculationSteps.tsx      # 計算過程ステップ表示
│   │   ├── HeirBreakdownTable.tsx    # 相続人別内訳テーブル
│   │   ├── ProgressiveTaxBreakdown.tsx # 超過累進税率の内訳表示
│   │   └── SpouseAcquisitionSettings.tsx # 配偶者取得割合設定
│   ├── comparison/
│   │   ├── ComparisonTable.tsx       # 1次2次比較テーブル
│   │   └── ComparisonDetailPanel.tsx # 相続人別内訳パネル
│   ├── insurance/
│   │   ├── InsuranceContractList.tsx  # 保険契約入力リスト
│   │   ├── InsuranceSummaryCard.tsx   # シミュレーション結果サマリー
│   │   ├── InsuranceFlowSteps.tsx    # 財産フロー（ステップ表示）
│   │   └── InsuranceHeirTable.tsx    # 相続人別保険内訳・手取り比較
│   ├── gift/
│   │   ├── CashGiftRecipientList.tsx  # 贈与受取人入力リスト
│   │   ├── CashGiftSummaryCard.tsx   # 贈与シミュレーション結果サマリー
│   │   ├── CashGiftFlowSteps.tsx     # 財産フロー（ステップ表示）
│   │   ├── CashGiftHeirTable.tsx     # 相続人別贈与内訳
│   │   └── CashGiftYearComparison.tsx # 年数別最適贈与比較テーブル
│   ├── split/
│   │   ├── AcquisitionInputs.tsx     # 各相続人の取得額入力 + 法定相続分ボタン
│   │   ├── SimulationSettings.tsx    # 増減額/行・自動調整先・行数の設定
│   │   └── SplitResultTable.tsx      # シミュレーション結果テーブル
│   ├── heirs/
│   │   ├── SpouseSettings.tsx        # 配偶者設定
│   │   ├── RankHeirSettings.tsx      # 第1/3順位共通（子・兄弟姉妹）
│   │   └── Rank2Settings.tsx         # 第2順位：直系尊属
│   ├── BracketRateTable.tsx          # 加重平均適用税率テーブル
│   ├── CalculateButton.tsx           # 計算ボタン共通
│   ├── CautionBox.tsx                # 注意書きボックス
│   ├── CurrencyInput.tsx             # 金額入力（万円 + フォーマット表示）
│   ├── EstateInput.tsx               # 遺産総額入力（共通）
│   ├── FlowSteps.tsx                 # 財産フロー共通コンポーネント
│   ├── Header.tsx                    # ヘッダー（ITCMスタイル: pill型ナビ＋担当者入力）
│   ├── HeirNetComparisonTable.tsx    # 相続人別手取り比較テーブル共通
│   ├── HeirScenarioTable.tsx         # 相続人シナリオテーブル共通
│   ├── HeirSettings.tsx              # 相続人設定メイン
│   ├── PrintHeader.tsx               # 印刷専用ヘッダー
│   ├── RadioGroup.tsx                # ラジオボタングループ共通
│   ├── RangeSettings.tsx             # シミュレーション範囲設定
│   ├── ScenarioComparisonCard.tsx    # シナリオ比較サマリーカード共通
│   ├── SectionHeader.tsx             # セクション見出し共通
│   ├── StatusCard.tsx                # ステータスカード共通（success/warning/error）
│   ├── TaxBracketTable.tsx           # 速算表テーブル
│   ├── TaxTable.tsx                  # 税額一覧テーブル
│   ├── ValidationErrorPanel.tsx      # バリデーションエラーパネル
│   └── tableStyles.ts               # テーブル・カードスタイル定数
│
├── contexts/
│   └── StaffContext.tsx              # 担当者情報（localStorage連携）
│
├── hooks/
│   ├── useCashGiftSimulation.ts      # 贈与シミュレーション状態管理
│   ├── useInsuranceSimulation.ts     # 保険シミュレーション状態管理
│   ├── useScrollToResult.ts          # 結果表示時の自動スクロール
│   ├── useCleanOptions.ts            # 選択肢変更時の無効値クリーンアップ
│   ├── useColumnHover.ts             # テーブル列ホバーハイライト
│   └── useUniqueOptions.ts           # 選択肢の重複防止
│
├── constants/
│   ├── index.ts                      # 定数（税率テーブル、基礎控除、会社情報等）
│   └── cautionMessages.ts            # 各ページの注意事項メッセージ
│
├── types/
│   └── index.ts                      # 型定義
│
└── utils/
    ├── taxCore.ts                    # 共通税額計算関数（税率適用・基礎控除・法定相続分）
    ├── taxCalculator.ts              # 税額計算ロジック
    ├── comparisonCalculator.ts       # 1次2次比較計算ロジック
    ├── insuranceCalculator.ts        # 保険金シミュレーション計算ロジック
    ├── giftCalculator.ts             # 贈与シミュレーション計算ロジック
    ├── splitCalculator.ts            # 分割シミュレーション計算ロジック
    ├── reapportionTax.ts             # 税額按分ロジック
    ├── heirUtils.ts                  # 相続人ユーティリティ
    ├── formatters.ts                 # フォーマット関数
    ├── idGenerator.ts                # ID生成
    └── index.ts                      # barrel export
```

## UI/UX デザイン

### テーマ

- **テーマカラー**: 緑（emerald）— ヘッダーはフラットデザイン（border-b + backdrop-blur、ITCM準拠）
- **背景**: Gray-50
- **カード**: 白背景 + `rounded-xl` + `shadow-md` + `border border-gray-100`

### コンポーネントデザイン

| コンポーネント | デザイン |
|--------------|---------|
| 計算ボタン | グラデーション背景 + shadow + hover浮き上がり + active沈み込み |
| セクション見出し | 左ボーダーアクセント（`border-l-4 border-green-500`）+ アイコン |
| 金額入力 | hover時ボーダー変化 + focus時shadow + number spinner非表示 |
| ナビゲーション | pill型（ITCMスタイル）+ アクティブ: bg-emerald-50 text-emerald-700 |
| ステータスカード | バリアントアイコン（CheckCircle/AlertTriangle/XCircle）付き |
| 注意ボックス | 左ボーダーアクセント（黄）+ AlertTriangleアイコン |
| エラーパネル | 左ボーダーアクセント（赤）+ shadow-sm |
| 結果サマリー | グラデーション背景カード（`from-green-50 to-emerald-50`） |

### アニメーション

- **結果表示**: `fadeSlideIn`（opacity: 0→1 + translateY: 16px→0, 0.5s ease-out）
- **スクロール**: 結果初回表示時に自動スムーズスクロール（`useScrollToResult` フック）
- **印刷時**: アニメーション無効化

## 開発環境

### Docker（推奨）

#### 単体起動

```bash
docker compose up -d
```

アクセス: http://localhost:3004/inheritance-tax-app/

> 事前に `docker network create tax-apps-network` が必要です。

#### manage.bat 経由（全アプリ統合管理）

```bash
manage.bat start                          # 全アプリ起動
manage.bat restart inheritance-tax-app    # このアプリのみ再起動
manage.bat build inheritance-tax-app      # 再ビルドして起動
manage.bat logs inheritance-tax-app       # ログ確認
manage.bat stop                           # 全アプリ停止
```

Gateway 経由: http://localhost/inheritance-tax-app/

#### コード変更後の反映

| 変更内容 | 開発モード | 本番モード |
|:---------|:----------|:----------|
| `src/` 内のコード | 自動反映（Vite HMR） | 再ビルド必要 |
| `index.html` | 自動反映 | 再ビルド必要 |
| `public/` 内のファイル | 再ビルド必要 | 再ビルド必要 |
| `package.json` | 再ビルド必要 | 再ビルド必要 |
| `Dockerfile`, nginx設定 | 再ビルド必要 | 再ビルド必要 |

本番モード:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## ライセンス

(C) 2026 税理士法人マスエージェント
