# 相続税早見表アプリケーション

相続財産額に応じた相続税額を一覧表示するシミュレーションツールです。

## 機能

- 相続人構成の設定（配偶者、子、直系尊属、兄弟姉妹）
- 代襲相続（孫、甥姪）のサポート
- 1次相続（配偶者あり）・2次相続（配偶者なし）の税額比較
- 配偶者控除の自動計算
- 第3順位（兄弟姉妹）の2割加算
- Excel出力機能
- 印刷機能

## 技術スタック

- **フレームワーク**: React 19 + TypeScript
- **ビルドツール**: Vite 7
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **Excel出力**: ExcelJS + FileSaver

## プロジェクト構成

```
src/
├── components/
│   ├── heirs/
│   │   ├── Rank1Settings.tsx    # 第1順位：子供
│   │   ├── Rank2Settings.tsx    # 第2順位：直系尊属
│   │   ├── Rank3Settings.tsx    # 第3順位：兄弟姉妹
│   │   └── SpouseSettings.tsx   # 配偶者設定
│   ├── ExcelExport.tsx          # Excel出力
│   ├── Header.tsx               # ヘッダー
│   ├── HeirSettings.tsx         # 相続人設定メイン
│   ├── PrintButton.tsx          # 印刷ボタン
│   ├── RangeSettings.tsx        # シミュレーション範囲設定
│   └── TaxTable.tsx             # 税額一覧テーブル
├── constants/
│   └── index.ts                 # 定数（税率テーブル等）
├── hooks/
│   └── useTaxCalculator.ts      # 税額計算ロジック
├── types/
│   └── index.ts                 # 型定義
├── utils/
│   ├── formatters.ts            # フォーマット関数
│   ├── idGenerator.ts           # ID生成
│   └── index.ts
├── App.tsx
└── main.tsx
```

## 開発環境

### Docker（推奨）

```bash
# tax_apps/docker ディレクトリで実行
docker compose up -d inheritance-tax-app

# アクセス
http://localhost:5173/inheritance-tax-app/
```

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

© 2026 税理士法人マスエージェント
