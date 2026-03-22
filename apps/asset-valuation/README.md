# Asset Valuation（相続税 減価償却資産評価）

相続税申告における減価償却資産の評価額を算出するWebアプリケーション。
会計ソフトから出力されたCSVを取り込み、評価通達に基づいて自動計算し、Excel出力・印刷を行う。

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Vite 7.x + React 19.x + TypeScript 5.x |
| スタイリング | Tailwind CSS v4 |
| アイコン | lucide-react |
| Excel出力 | xlsx-js-style |
| Docker | node:22-alpine (dev) / nginx:1.27-alpine (prod) |
| ポート | 3017 |
| basePath | `/asset-valuation` |

## 起動方法

```bash
# 開発
docker compose up -d --build

# 本番
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 停止
docker compose down
```

→ http://localhost:3017/asset-valuation/

## 画面フロー

```
Step 1: CSVインポート + 案件名・課税時期入力
    ↓
Step 2: カラムマッピング（プリセット保存・JSON入出力対応）
    ↓
Step 3: データ確認・編集（テーブルビュー / Excelプレビュー切替）
    ↓
Step 4: 計算結果 → Excel出力 / 印刷 / 案件JSON保存
```

## 対応する評価通達

| 通達 | 対象 | 償却方法 | ×0.7 |
|------|------|---------|------|
| 89-2(2) | 建物（固定資産税評価額なし） | 定額法 | あり |
| 92 | 建物付属設備 | 定率法 | あり |
| 97 | 構築物 | 定率法 | あり |
| 129 | 一般動産（機械装置・車両・器具備品） | 定率法 | なし |

## 主要機能

- **CSVインポート**: UTF-8 / CP932 自動検出、和暦・Excelシリアル値対応
- **カラムマッピング**: CSVヘッダーと必須フィールドの対応付け、プリセット保存
- **カテゴリ自動判定**: CSV内の勘定科目名を6カテゴリに自動マッピング
- **固定資産税評価明細**: 建物・建物付属設備で一括ON/OFF可能
- **3年以内自動判定**: 課税時期から3年以内の取得は自動ハイライト、評価額＝簿価
- **賃貸控除**: 建物・建物付属設備の行ごとに×0.7（借家権割合30%控除）
- **未償却残高表内蔵**: H24.4.1以後取得分（耐用年数2〜50、経過年数1〜50）
- **Excel出力**: sample.xlsm準拠レイアウト、評価通達条文付き
- **案件JSON保存・復元**: 案件データ全体をJSONでエクスポート/インポート
- **マッピングプリセットJSON**: 会計ソフト別のマッピング設定をJSON管理

## ディレクトリ構成

```
src/
├── types/index.ts          # 型定義・カテゴリ設定・定数
├── data/rateTable.ts       # 未償却残高表（Excel抽出）
├── utils/
│   ├── calculation.ts      # 評価額計算ロジック
│   ├── csvParser.ts        # CSV解析
│   ├── excelExport.ts      # Excel出力
│   ├── fileDownload.ts     # JSONファイルダウンロード
│   ├── formatters.ts       # 金額・日付フォーマット
│   └── validators.ts       # バリデーション
├── hooks/
│   ├── useAssetData.ts     # 資産データ管理
│   ├── usePresets.ts       # マッピングプリセット管理
│   └── useJsonExport.ts    # 案件JSON入出力
└── components/
    ├── StepIndicator.tsx
    ├── step1/CsvImportStep.tsx
    ├── step2/ColumnMappingStep.tsx, PresetManager.tsx
    ├── step3/DataEditStep.tsx, AssetTable.tsx, ExcelPreview.tsx
    └── step4/ResultStep.tsx
```
