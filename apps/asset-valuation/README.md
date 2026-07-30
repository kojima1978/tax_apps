# Asset Valuation（相続税 減価償却資産評価）

相続税申告における減価償却資産の評価額を算出するWebアプリケーション。
会計ソフトから出力されたCSVを取り込み、評価通達に基づいて自動計算し、Excel出力を行う。

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
Step 1: CSVインポート + 案件名・課税時期入力（案件JSON復元も可）
    ↓
Step 2: カラムマッピング（プリセット保存・JSON入出力対応）
    ↓
Step 3: データ確認・編集
    ↓
Step 4: 計算結果 → Excel出力 / 案件JSON保存 / マッピングJSON出力
```

## 対応する評価通達

| 通達 | 対象 | 評価方法 | ×0.7 |
|------|------|---------|------|
| 89-2(2) | 建物（固定資産税評価額なし） | 定額法×0.9 | あり |
| 92 | 建物附属設備 | 定率法残価率 | あり |
| 97 | 構築物 | 定率法残価率 | あり |
| 129 | 一般動産（機械及び装置・車両運搬具・工具器具備品・生物・ソフトウェア） | 定率法残価率 | なし |
| — | 特許権・商標権・意匠権・実用新案権・のれん・一括償却資産・少額減価償却資産 | 簿価 | なし |
| — | 繰延資産（創立費・開業費等） | 財産性なし（評価額0） | — |

財産評価では、課税時期に効力を有する「耐用年数省令 別表第十」の最新の定率法（＝200%定率法）を
**一律で適用**して控除額を計算する。カテゴリ名の `250%定率法` / `旧定率法` / `旧定額法` は
帳簿上の分類を表すラベルであり、控除額計算には影響しない（小計を帳簿と突合するためのもの）。

## 主要機能

- **CSVインポート**: UTF-8 / CP932 自動検出、和暦・Excelシリアル値対応、読込中スピナー表示
- **カラムマッピング**: CSVヘッダーと必須フィールドの対応付け（NO→資産名称→カテゴリ→取得年月→耐用年数→取得価額→期末簿価）。
  `管理番号` / `勘定科目` / `期末帳簿価額` などのヘッダー名から**7項目を自動割り当て**（「自動」バッジ付き。違っていればプルダウンで修正）
- **マッピングプリセット**: 会計ソフト別のマッピング設定をlocalStorage + JSON入出力で管理（削除はダブルクリック確認）
- **カテゴリ自動判定**: CSV内の勘定科目名を40カテゴリ（16資産区分 × 償却方法）に自動マッピング。
  `建物付属設備` / `機械装置` / `器具備品` などの別名、`構築物（250%定率法）` のような償却方法つきの名称、
  全角の `２５０％定率法` も解決する。判定できない名称には近い資産区分を候補提示（例: `工具備品` → `工具器具備品`）
- **2段プルダウン**: カテゴリ選択は「資産区分 → 償却方法」の2段構成。区分を変えても同名の償却方法があれば維持する
- **行単位のカテゴリ変更**: Step 3 の行から別カテゴリへ移動できる（勘定科目が同じでも1件だけ償却方法が違う資産に対応）
- **カテゴリナビゲーション**: Step 3 上部のチップ、Step 4 のカテゴリ別内訳をクリックで該当カテゴリへジャンプ
- **詳細列トグル**: 経過年数 / 償却額（残価率） / 評価根拠 は既定で非表示にして横スクロールを抑える
- **固定資産税評価明細**: 建物・建物附属設備で一括ON/OFF可能
- **3年以内自動判定**: 課税時期から3年以内の取得は自動ハイライト（行内バッジ + カテゴリ見出しの件数表示）、評価額＝簿価
- **賃貸控除**: 建物・建物附属設備の行ごとに×0.7（借家権割合30%控除）
- **未償却残高表内蔵**: H24.4.1以後取得分（耐用年数3〜50、経過年数1〜50）
- **並べ替え**: NO順 / 取得年月日順（昇順⇄降順トグル）に加え、行頭ハンドルのドラッグ&ドロップ、
  または ↑↓ キーでカテゴリ内の手動並べ替え
- **カテゴリの並べ替え**: カテゴリ見出しの ↑↓ ボタンでカテゴリ（小計グループ）自体を入れ替え。
  順序は計算結果画面・Excel出力（本表／計算根拠）・案件JSONにも反映され、「標準の順序に戻す」で既定順へ戻せる
- **Excel出力**: 3シート（減価償却資産 + 計算根拠 + 残価率表）。横線のみ罫線・評価通達条文付き。
  本表のH列（残価率）は残価率表シートを INDEX/MATCH で参照するので、年数を書き換えるとExcel側で再計算される。
  B3（3年以内）は和暦表記（例: `令和5年7月2日`）で出力する（B2の課税時期は日付値のまま）
- **案件JSON保存・復元**: 案件データ全体（カテゴリの並び順を含む）をJSONでエクスポート/インポート
- **アクセシビリティ**: 統一フォーカスリング、全入力にaria-label、コントラスト4.5:1以上、prefers-reduced-motion対応

> **Excel出力の既知の制限**: xlsx-js-style 1.2.0 は `<pageSetup>` / `<headerFooter>` を書き出さないため、
> 「A4横・全列1ページ幅」の印刷設定とフッターのページ番号は出力ファイルに含まれない。Excel側で設定が必要。
> Step 4 の出力ボタン下にその手順を案内する注記を出している。

## ディレクトリ構成

```
src/
├── types/index.ts          # 型定義・カテゴリ生成・別名解決・旧カテゴリ移行・groupByLabel
│                           #   + autoMapColumns（列の自動割り当て）/ suggestAssetClasses（区分の候補提示）
├── data/rateTable.ts       # 未償却残高表（Excel抽出）
├── utils/
│   ├── calculation.ts      # 評価額計算ロジック（getDepRate, CalcResult型）
│   ├── csvParser.ts        # CSV解析
│   ├── excelExport.ts      # Excel出力（3シート・残価率表とINDEX/MATCH数式）
│   ├── fileDownload.ts     # JSONダウンロード + exportCaseJson
│   ├── formatters.ts       # formatYen, formatDate, formatWareki, formatDepreciation, calcGroupTotals
│   └── validators.ts       # バリデーション
├── hooks/
│   ├── useAssetData.ts     # 資産データ管理（sortAssets / moveAsset / moveCategory / migrateCategory）
│   └── usePresets.ts       # マッピングプリセット管理
└── components/
    ├── StepIndicator.tsx    # ステップインジケーター
    ├── StepNavigation.tsx   # 共通ナビゲーション（戻る/次へ/Step1に戻る）
    ├── CategorySelect.tsx   # 2段プルダウン（Step 2・3共用）
    ├── CategoryNav.tsx      # カテゴリチップ一覧 + セクションへのスクロール
    ├── step1/CsvImportStep.tsx
    ├── step2/ColumnMappingStep.tsx, PresetManager.tsx
    ├── step3/DataEditStep.tsx, AssetTable.tsx, ExcelPreview.tsx
    └── step4/ResultStep.tsx
```
