# 減価償却計算 (depreciation-calc)

中古資産を取得した際の耐用年数計算、減価償却スケジュール、期間償却額を計算するWebツールです。
国税庁 No.5404「中古資産の耐用年数」および減価償却関連通達に基づいています。

## 機能

### タブ1: 期間償却（デフォルト）
- 任意の期間（3/5/10/20年等）の**償却スケジュールを表示**
- 開始年度・表示年数を指定可能
- サマリーカード（合計償却額・開始時簿価・期間後簿価）
- 簿価計算タブからの条件連携に対応

### タブ2: 耐用年数（中古資産）
- **簡便法による耐用年数計算**（経過年数が法定耐用年数以内 / 超過の2パターン）
- **50%ルール判定**（改修費が取得価額の50%超の場合、法定耐用年数を適用）
- **日付からの経過年数自動計算**（新築・製造日と取得日から自動算出）
- **計算過程の詳細表示**（算式 + ステップごとの計算 + 端数処理の注記）
- 計算結果を簿価計算タブへ連携可能

### タブ3: 簿価計算
- **減価償却スケジュール**を年次テーブルで表示
- **4種の償却方法**: 定額法, 定率法, 旧定額法, 旧定率法
- 取得日に基づく**推奨方法の自動判定**（H19.4 / H24.4 境界）
- **簿価算出基準日**指定で特定時点の残存簿価をハイライト表示
- 改定償却率・償却保証額の自動適用（定率法）
- 計算結果を期間償却タブへ連携可能

### 共通機能
- **ポータルに戻る**（ヘッダー左端にホームアイコン+リンク）
- **pill型タブナビ**（ヘッダーに統合、inheritance-tax-appと同パターン）
- **印刷対応**（印刷用ヘッダー・備考列の全表示・ページ分割最適化）
- **Ctrl+Enter ショートカット**
- **スマートフォン対応**（レスポンシブデザイン・横スクロールヒント）
- **スティッキーテーブルヘッダー**（スクロール時にヘッダー固定）
- **参照リンク集**（国税庁ページ・耐用年数表・減価償却関連）

## 技術スタック

| 項目 | バージョン |
|------|----------|
| Vite | 7.3.x |
| React | 19.2.x |
| TypeScript | 5.9.x |
| Tailwind CSS | v4 |

## ポート・パス

| 環境 | URL |
|------|-----|
| ゲートウェイ経由 | `http://localhost/depreciation-calc/` |
| 直接（dev / 本番とも） | `http://localhost:3015/depreciation-calc/` |
| Vercel | `/` |

## インフラ

| ファイル | 用途 |
|---------|------|
| `docker-compose.yml` | 開発用（`src` と `index.html` を読み取り専用でマウント） |
| `docker-compose.prod.yml` | 本番オーバーライド（nginx静的配信） |
| `../../docker/Dockerfile.vite-static` | 共有Dockerfile（dev / builder / runner ステージ） |

> ローカルの `Dockerfile` / `nginx.conf` は不要のため削除済み。
> ビルド設定（nginx設定含む）は共有Dockerfileで管理。

## 起動方法

リポジトリのルートから `manage.sh` で起動する（素の `docker compose up` は base だけを読むので、本番で動いているアプリを dev に作り替える）。

```bash
docker/scripts/manage.sh start depreciation-calc          # 開発
docker/scripts/manage.sh start --prod depreciation-calc   # 本番（nginx 静的配信）
docker/scripts/manage.sh build depreciation-calc          # 再ビルド（いま動いているモードを踏襲）
docker/scripts/manage.sh logs depreciation-calc           # ログ確認
```

- dev は `./src` と `./index.html` を読み取り専用で bind mount する（メモリ上限 512M・`NODE_OPTIONS=--max-old-space-size=384`）。
  Vite にポーリングが無いので、編集が届かないときは `docker restart depreciation-calc`
- 本番はソースをイメージに同梱する（`volumes: !reset []`・メモリ上限 64M）。**変更は `build` しないと入らない**
- `package.json` / `vite.config.ts` はマウントしていない（イメージ同梱）ので、変えたら `build` が要る
- テストは無い。型検査は `npm run build` の `tsc -b` だけで、dev モードでは走らない

### Vercel

```bash
vercel
```

`vercel.json` が `vite build --base /` でルート配信にする。

## ディレクトリ構成

```
src/
├── main.tsx                # エントリーポイント
├── App.tsx                 # ルートコンポーネント（3タブ管理）
├── app/globals.css         # グローバルCSS（印刷・スティッキーヘッダー）
├── components/
│   ├── Header.tsx              # ヘッダー（ポータルリンク・pill型タブナビ・印刷ボタン）
│   ├── UsedAssetForm.tsx       # 耐用年数計算フォーム
│   ├── ResultSection.tsx       # 耐用年数計算結果
│   ├── BaseDepreciationForm.tsx    # 簿価・期間償却 共通フォームUI
│   ├── DepreciationForm.tsx        # 簿価計算フォーム
│   ├── DepreciationResult.tsx      # 償却スケジュール表示
│   ├── DepreciationScheduleTable.tsx # 償却スケジュールテーブル（ROW_HIGHLIGHTS定数+.map()）
│   ├── PeriodDepForm.tsx       # 期間償却フォーム
│   ├── PeriodDepResult.tsx     # 期間償却サマリー（SummaryCard使用）
│   ├── ReferenceLinks.tsx      # 参照リンク集（SECTIONS定数+LinkList/PillLinksサブコンポーネント）
│   ├── FormField.tsx           # ラベル+入力ラッパー
│   ├── InputWithUnit.tsx       # 単位付き入力
│   ├── PrintFooter.tsx         # 印刷フッター（担当者・作成日）
│   └── ui/
│       ├── ActionButtons.tsx   # 計算・クリアボタン（共通）
│       ├── CarryOverCta.tsx    # 次のタブへ引き継ぐボタン（共通）
│       ├── ConditionTags.tsx   # 条件タグバッジ（共通）
│       ├── DirtyWarning.tsx    # 入力変更警告バナー（共通）
│       ├── Disclaimer.tsx      # 免責注記フッター（共通）
│       ├── EmptyState.tsx      # 空状態プレースホルダー（共通）
│       ├── HighlightCard.tsx   # 結果ハイライトカード（共通）
│       ├── Icons.tsx           # インラインSVGアイコン
│       ├── PresetButtons.tsx   # プリセット選択ピル（共通）
│       ├── ResultLayout.tsx    # 結果欄の枠（警告・条件タグ・空状態・免責をまとめる）
│       └── SummaryCard.tsx     # サマリーカード（primary/secondary variant）
├── hooks/
│   ├── useBaseDepreciationState.ts # 簿価・期間償却で共通の入力状態
│   ├── useUsedAssetForm.ts     # 耐用年数フォーム状態管理
│   ├── useDepreciationForm.ts  # 簿価計算フォーム状態管理
│   ├── useMethodSuggestion.ts  # 償却方法の自動推奨ロジック
│   ├── usePeriodDepForm.ts     # 期間償却フォーム状態管理
│   ├── useCanCalculate.ts      # 計算可否判定（共通）
│   └── useDirtyFlag.ts        # 入力変更フラグ管理（共通）
└── lib/
    ├── used-asset-life.ts      # 耐用年数コア計算ロジック
    ├── depreciation.ts         # 減価償却計算エントリー（スケジュール組立）
    ├── depreciation-builders.ts # 4種の償却方法ビルダー関数
    ├── depreciation-rates.ts   # 償却率テーブル（法定耐用年数→各種率）
    ├── styles.ts               # 入力欄の共通クラス（INPUT_BASE）
    ├── utils.ts                # ユーティリティ関数（formatElapsed等）
    └── company.ts              # 会社情報
```

## タブ間の連携フロー

```
耐用年数計算 ──[この結果で簿価計算へ]──→ 簿価計算 ──[この条件で期間償却へ]──→ 期間償却
```

各タブの入力状態はタブ切替時も保持されます。

## 参照

- [国税庁 No.5404 中古資産の耐用年数](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5404.htm)
- [国税庁 No.5404 中古資産の耐用年数（Q&A）](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5404_qa.htm)
- [国税庁 No.2100 減価償却のあらまし](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2100.htm)
- [国税庁 No.2106 定額法と定率法](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2106.htm)

## ステータス

Gateway（nginx）登録済み。ポータルサイトからアクセス可能。
