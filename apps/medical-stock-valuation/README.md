# 出資持分の評価額試算ツール

医療法人の出資持分の評価額の概算を知りたい方向けのツールです。

## 主な機能

### 評価額計算（4ステップ入力）

| STEP | 内容 |
|:-----|:-----|
| STEP0 | 基本情報（会社名・担当者・事業年度の選択） |
| STEP1 | 会社規模の判定（正職員数・総資産・売上高） |
| STEP2 | 財務データ入力（決算書より純資産・利益を入力） |
| STEP3 | 出資者情報（出資者名簿より出資者・出資金額を入力） |

### 計算結果

- **出資持分評価額**: 当初出資額 → 現在評価額 → みなし贈与税額の3段階表示
- **各出資者の内訳**: 出資者別の評価額・贈与税額テーブル
- **参考要素一覧**: 会社規模・類似業種比準価額・純資産価額・L値・評価方式
- **計算過程モーダル**: 類似業種比準方式・純資産価額方式・1口あたり評価額の詳細計算過程

### 出力機能

| 機能 | 説明 |
|:-----|:-----|
| Excel出力 | 基本情報・評価額・出資者内訳・参考要素をExcelファイルとしてダウンロード |
| JSON出力 | 評価データをJSON形式でエクスポート（バックアップ・移行用） |
| JSONインポート | エクスポートしたJSONを読み込んで入力画面に復元 |
| 印刷 | A4縦3ページ（計算結果・詳細情報・計算過程）の印刷レイアウト |
| DB保存 | SQLiteデータベースへの保存・上書き |

### マスタデータ管理

- **会社マスタ**: 会社情報の登録・編集・無効化・削除
- **担当者マスタ**: 担当者情報の登録・編集・無効化・削除
- **類似業種データ**: 年度別の類似業種比準方式の基準値管理
  - データ未登録年度は令和6年度のデフォルト値を自動使用

### 保存データ管理

- 過去の評価計算の一覧表示・検索・読込・削除
- 個別レコードのJSONエクスポート
- JSONインポートによるデータ復元
- DBバックアップ・リストア（全データJSON一括）

## セットアップ

### Docker（推奨）

```bash
cd tax_apps/docker/scripts
manage.bat start
```

http://localhost/medical/ でアクセスできます（Nginx Gateway 経由）。

個別起動も可能です:

```bash
cd tax_apps/apps/medical-stock-valuation

# 開発環境（ホットリロード付き）
docker compose up -d

# 再ビルド
docker compose up -d --build
```

http://localhost:3010 でアクセスできます。

### ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセスできます。

## データベース

### スキーマ

| テーブル | 説明 |
|:--------|:-----|
| companies | 会社マスタ（論理削除対応） |
| users | 担当者マスタ（論理削除対応） |
| valuations | 評価レコード |
| financial_data | 財務データ |
| investors | 出資者情報 |
| similar_industry_data | 類似業種データマスタ（論理削除対応） |

詳細は [ER_DIAGRAM.md](ER_DIAGRAM.md) を参照してください。

### データベースファイル

- **パス**: `data/doctor.db`（アプリ起動時に自動作成）
- **Docker**: `docker/data/medical-stock/` にバインドマウント

## 技術スタック

| カテゴリ | 技術 |
|:--------|:-----|
| フレームワーク | Next.js 16.1 (App Router) |
| UI | React 19, Tailwind CSS 3.4 |
| 言語 | TypeScript 5 |
| データベース | SQLite (better-sqlite3 12.5) |
| Excel出力 | ExcelJS 4.4 + file-saver 2.0 |
| 数値入力 | react-number-format 5.4 |
| アイコン | Lucide React |
| 画像最適化 | sharp 0.33 |
| Docker | Port 3010, basePath: /medical |

## プロジェクト構造

```
medical-stock-valuation/
├── app/                                    # Next.js App Router
│   ├── page.tsx                            # ホーム画面（評価データ入力）
│   ├── results/page.tsx                    # 計算結果（Excel/JSON/印刷）
│   ├── saved-data/page.tsx                 # 保存データ一覧
│   ├── gift-tax-table/page.tsx             # 贈与税速算表
│   ├── company-settings/page.tsx           # 会社マスタ設定
│   ├── user-settings/page.tsx              # 担当者マスタ設定
│   ├── similar-industry-settings/page.tsx  # 類似業種データ設定
│   ├── not-found.tsx                       # 404ページ
│   ├── layout.tsx                          # ルートレイアウト
│   ├── globals.css                         # グローバルスタイル（印刷CSS含む）
│   └── api/                                # APIルート
│       ├── companies/route.ts              # 会社CRUD API
│       ├── users/route.ts                  # 担当者CRUD API
│       ├── valuations/route.ts             # 評価レコードAPI
│       ├── similar-industry/route.ts       # 類似業種データAPI
│       └── backup/route.ts                 # DBバックアップ/リストアAPI
├── components/
│   ├── Header.tsx                          # ヘッダー（ナビゲーション）
│   ├── Modal.tsx                           # モーダルダイアログ
│   ├── Button.tsx                          # ボタンコンポーネント
│   ├── Toast.tsx                           # トースト通知
│   ├── ConfirmDialog.tsx                   # 確認ダイアログ
│   ├── PrintHeader.tsx                     # 印刷用ヘッダー
│   ├── ResultsExcelExport.tsx              # Excel出力コンポーネント
│   ├── SimpleMasterSettingsPage.tsx         # マスタ設定共通ページ
│   ├── CalculationDetailsModal.tsx         # 計算過程モーダル（dispatcher）
│   ├── calculation-details/               # 計算過程詳細
│   │   ├── SimilarIndustryDetails.tsx      # 類似業種比準方式
│   │   ├── NetAssetDetails.tsx             # 純資産価額方式
│   │   ├── PerShareDetails.tsx             # 1口あたり評価額
│   │   └── helpers.tsx                     # DetailRow/DetailTable/ResultBox
│   └── valuation/                          # 評価入力ステップ
│       ├── Step0BasicInfo.tsx              # 基本情報入力
│       ├── Step1CompanySize.tsx            # 会社規模判定
│       ├── Step2FinancialData.tsx          # 財務データ入力
│       └── Step3Investors.tsx              # 出資者情報入力
├── hooks/
│   ├── useFormData.ts                      # フォームデータ管理（14 state + handlers）
│   ├── useSavedData.ts                     # 保存データ管理（CRUD + JSON export/import）
│   ├── useMasterSettings.ts               # マスタ設定共通hook（3設定ページ共通）
│   ├── useSaveValuation.ts                 # DB保存機能
│   └── useExcelExport.ts                   # Excel出力hook（isExporting + handleExport）
├── lib/
│   ├── calculations.ts                     # 評価額計算ロジック
│   ├── types.ts                            # アプリケーション型定義
│   ├── db.ts                               # データベース初期化・テーブル定義
│   ├── db-types.ts                         # データベース型定義
│   ├── excel-styles.ts                     # Excelスタイル定数・setupExcelWorkbook
│   ├── json-export-import.ts               # JSON出力/読込ユーティリティ
│   ├── button-styles.ts                    # ボタンスタイル定数（BTN/INLINE_BTN）
│   ├── constants.ts                        # 定数定義
│   ├── utils.ts                            # 汎用ユーティリティ（formatSen等）
│   ├── date-utils.ts                       # 日付変換（toWareki/generateYearRange）
│   ├── form-utils.ts                       # フォームユーティリティ
│   ├── record-actions.ts                   # レコード操作共通処理
│   ├── api-utils.ts                        # API共通処理（createMasterRouteHandlers）
│   └── company.ts                          # 会社情報定数
├── data/
│   └── doctor.db                           # SQLiteデータベース
├── scripts/
│   └── add-is-active-to-similar-industry.ts # マイグレーション
├── Dockerfile                              # マルチステージビルド（dev/runner）
├── .dockerignore                           # ビルド除外
├── ER_DIAGRAM.md                           # データベースER図
├── next.config.ts                          # Next.js設定（standalone出力）
└── package.json
```

## 注意事項

※ 正確な評価額を算出するには、税理士等の専門家へご相談ください。
