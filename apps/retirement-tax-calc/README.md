# 退職金 税額計算シミュレーター

退職金にかかる所得税・復興特別所得税・住民税を計算するシミュレーターです。

## 機能

- **3パターン比較**: 退職金額を最大3パターン入力し、税額を横並びで比較
- **退職区分**: 一般退職手当等 / 特定役員退職手当等 / 短期退職手当等
- **勤続年数**: 直接入力 または 勤続開始日・退職日から自動計算（1年未満切上げ）
- **障害者退職加算**: 退職所得控除額に100万円を加算
- **役員退職金限度額**: 最終月額報酬 × 功績倍率 × 勤続年数（役職プリセット付き）
- **限度額超過警告**: 支給額が限度額を超えた場合に警告表示
- **税率年度選択**: 令和6年〜令和9年の税率テーブルに対応（令和9年は復興特別所得税 1.1% + 防衛特別所得税 1%）（既定は今年。今年の表が未登録なら登録済みの最新年で計算し、その旨を画面に出す）
- **参照表**: 退職所得控除額表・速算表（該当行ハイライト、国税庁出典リンク）
- **印刷対応**: A4印刷レイアウト（1P: 入力フォーム、2P: 計算結果。会社情報・担当者・作成日フッター付き）
- **PDFダウンロード**: ワンクリックでPDFファイルを生成・保存
- **フォームクリア**: 全入力と結果を一括リセット
- **キーボードショートカット**: Ctrl+Enter で計算実行
- **入力補助**: フォーカス時の全選択、自動カンマ挿入、全角数字対応
- **自動スクロール**: 計算後に結果セクションへスムーズスクロール

## 税額計算ロジック

| 項目 | 計算方法 |
|:-----|:---------|
| 退職所得控除額（20年以下） | 40万円 × 勤続年数（最低80万円） |
| 退職所得控除額（20年超） | 800万円 + 70万円 ×（勤続年数 − 20年） |
| 課税退職所得金額（一般） | （支給額 − 控除額）× 1/2（1,000円未満切捨て） |
| 課税退職所得金額（特定役員） | 支給額 − 控除額（1/2なし） |
| 所得税 | 速算表により算出（100円未満切捨て） |
| 復興特別所得税 | 所得税 × 2.1%（令和9年から 1.1%） |
| 防衛特別所得税 | 所得税 × 1%（令和9年から。令和8年以前は無し） |
| 住民税 | 課税退職所得金額 × 10%（市民税6% + 県民税4%） |

## 技術スタック

- **ビルドツール**: Vite 6
- **ランタイム**: React 19 + TypeScript 5
- **スタイリング**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **PDF生成**: html2pdf.js（html2canvas + jsPDF）
- **Docker**: 共通 `docker/Dockerfile.vite-static`（Vite系アプリで共有）

## ディレクトリ構成

```
src/
├── main.tsx                   # エントリポイント
├── App.tsx                    # メインコンポーネント（1画面完結）
├── html2pdf.d.ts              # html2pdf.js 型定義
├── app/
│   └── globals.css            # グローバルスタイル + 印刷 + PDF生成スタイル
├── components/
│   ├── CheckboxField.tsx      # チェックボックス共通コンポーネント
│   ├── ComparisonTable.tsx    # 比較テーブル（TABLE_ROW_DEFSデータ駆動）
│   ├── FormField.tsx          # フォームフィールド共通
│   ├── Header.tsx             # アプリヘッダー + 印刷/PDFボタン
│   ├── Icons.tsx              # インラインSVGアイコン（ホーム・ダウンロード等）
│   ├── InputWithUnit.tsx      # 入力欄+単位ラベル（フォーカス時全選択）
│   ├── LimitResultDisplay.tsx # 役員限度額結果表示（超過警告含む）
│   ├── OfficerLimitSection.tsx # 役員退職金限度額
│   ├── PrintFooter.tsx        # 印刷用フッター
│   ├── ReferenceTables.tsx    # 参照表（控除額・速算表）
│   ├── ResultSection.tsx      # 計算結果セクション（TAG_DEFSデータ駆動）
│   ├── RetirementForm.tsx     # 入力フォーム + 計算/クリアボタン
│   ├── ServiceYearsInput.tsx  # 勤続年数（直接入力/日付計算切替）
│   ├── SummaryPatterns.tsx    # サマリーカード（SUMMARY_ITEMSデータ駆動）
│   └── ToggleButtonGroup.tsx  # 汎用トグルボタングループ（モード切替/プリセット選択）
├── hooks/
│   ├── usePdfExport.ts        # PDF生成フック（html2pdf.js）
│   └── useRetirementTaxForm.ts # フォーム状態管理フック
├── vite-env.d.ts
└── lib/
    ├── retirement-tax.ts      # 退職所得・税額計算ロジック
    ├── tax-rates.ts           # 年度別税率テーブル
    ├── exportFileName.ts      # PDF のファイル名（R081005_退職金税額計算.pdf）
    ├── company.ts             # 会社情報
    └── utils.ts               # フォーマットユーティリティ
```

## Docker

共通の `docker/Dockerfile.vite-static` を使う（dev は Vite、本番は nginx で静的配信）。

```bash
docker/scripts/manage.sh start retirement-tax-calc          # 開発モード
docker/scripts/manage.sh start --prod retirement-tax-calc   # 本番モード
docker/scripts/manage.sh build retirement-tax-calc          # 再ビルド（稼働中のモードを踏襲。名前は部分一致可）
docker/scripts/manage.sh logs retirement-tax-calc
```

アクセス: http://localhost/retirement-tax-calc/ （直接は http://localhost:3013/retirement-tax-calc/ ）

- 素の `docker compose up` は本番で動いているアプリを dev に作り替えるので使わない（この PC では本番モードで稼働）
- 本番はイメージ同梱なので、ソースを直したら `build` が要る
- dev は `./src` と `./index.html` を読み取り専用で bind mount するが、Vite にポーリングの設定が無いので
  変更を拾わない。ソースを直したら `docker restart retirement-tax-calc`
- メモリ上限は dev 512M（`NODE_OPTIONS=--max-old-space-size=384`）、本番 64M
- テストは無い（`package.json` に `test` も `typecheck` も無いので `manage.sh test` の対象外）
- `vercel.json` は Vercel 用（`VERCEL` 環境変数があるときだけ `base` を `/` にする）
