# 相続税シミュレーター

相続財産額に応じた相続税額をシミュレーションするツールです。早見表と詳細計算の2つのモードを提供します。

## 機能

### 早見表モード
- 相続人構成の設定（配偶者、子、直系尊属、兄弟姉妹）
- 代襲相続（孫、甥姪）のサポート
- 1次相続（配偶者あり）・2次相続（配偶者なし）の税額比較
- 配偶者控除の自動計算
- 第3順位（兄弟姉妹）の2割加算
- Excel出力・印刷対応（A3横向き）

### 計算モード
- 任意の遺産総額を入力して相続税を計算
- 配偶者の取得割合を選択（法定相続分 / 1億6千万円 / 任意額）
- 計算過程のステップ表示（基礎控除→法定相続分→速算表→按分→控除）
- 相続人別内訳テーブル（按分税額・2割加算・配偶者控除・納付税額）
- Excel出力・印刷対応（A4横向き、大きめフォント）

## 技術スタック

- **フレームワーク**: React 19 + TypeScript 5
- **ビルドツール**: Vite 7
- **ルーティング**: React Router DOM 7
- **スタイリング**: Tailwind CSS 3
- **アイコン**: Lucide React（直接 icon import）
- **Excel出力**: ExcelJS + FileSaver（lazy dynamic import）

## プロジェクト構成

```
src/
├── pages/
│   ├── TablePage.tsx               # 早見表ページ
│   └── CalculatorPage.tsx          # 相続税計算ページ
├── components/
│   ├── calculator/
│   │   ├── CalculationResult.tsx   # 計算結果サマリー
│   │   ├── CalculationSteps.tsx    # 計算過程ステップ表示
│   │   ├── CalculatorExcelExport.tsx # 計算結果Excel出力
│   │   ├── EstateInput.tsx         # 遺産総額入力
│   │   ├── HeirBreakdownTable.tsx  # 相続人別内訳テーブル
│   │   └── SpouseAcquisitionSettings.tsx # 配偶者取得割合設定
│   ├── heirs/
│   │   ├── Rank2Settings.tsx       # 第2順位：直系尊属
│   │   ├── RankHeirSettings.tsx    # 第1/3順位共通（子・兄弟姉妹）
│   │   └── SpouseSettings.tsx      # 配偶者設定
│   ├── CautionBox.tsx              # 注意書きボックス
│   ├── ExcelExport.tsx             # 早見表Excel出力
│   ├── ExcelExportButton.tsx       # Excel出力ボタン共通
│   ├── Header.tsx                  # ヘッダー（タブナビゲーション）
│   ├── HeirSettings.tsx            # 相続人設定メイン
│   ├── PrintButton.tsx             # 印刷ボタン
│   ├── PrintHeader.tsx             # 印刷専用ヘッダー
│   ├── RangeSettings.tsx           # シミュレーション範囲設定
│   ├── SectionHeader.tsx           # セクション見出し共通
│   └── TaxTable.tsx                # 税額一覧テーブル
├── hooks/
│   └── useExcelExport.ts           # Excel出力状態管理hook
├── constants/
│   └── index.ts                    # 定数（税率テーブル、基礎控除、会社情報等）
├── types/
│   └── index.ts                    # 型定義
├── utils/
│   ├── excelStyles.ts              # Excel共通スタイル・ワークブック生成
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

```bash
# スタンドアロン（アプリディレクトリで実行）
docker compose up -d

# または中央統合環境（docker/ ディレクトリで実行）
docker compose up -d inheritance-tax-app
```

アクセス: http://localhost:3004/inheritance-tax-app/

> **Note**: 中央統合環境で起動する場合は、Nginx Gateway 経由で http://localhost/inheritance-tax-app/ からアクセスできます。

### ローカル

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
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

## ライセンス

(C) 2026 税理士法人マスエージェント
