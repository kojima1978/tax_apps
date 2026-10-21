# 贈与税 比較Webアプリ

贈与税の税額シミュレーション、不動産取得税・登録免許税の計算を行うWebアプリケーションです。

## 機能

### 贈与税シミュレーター（メインページ）
- 贈与金額に対する税額計算
- 一般贈与・特例贈与の切り替え
- 一括贈与 / 2年分割 / 4年分割の比較
- 実効税率の表示
- 棒グラフによる視覚的な比較（Chart.js）
- 計算過程のステップ表示（贈与金額→基礎控除→課税価格→速算表適用→税額）
- 速算表の表示（該当税率ブラケットをハイライト）
- 未入力時のガイド表示（空状態UI）
- A4 1枚印刷対応（テーブル→チャート→計算過程→速算表→フッター）

### 早見表ページ
- 100万円単位の税額早見表
- 特例贈与・一般贈与を縦並びで表示
- 表示上限の切り替え（1,000万円 / 2,000万円）
- A4横1枚印刷対応（2表を横並び）

### 分割年数別 税額比較
- 1〜10年分割した場合の合計税額を一覧・グラフで比較
- 最適な分割年数をハイライト表示（「最安」バッジ）
- 非課税となる年数に「非課税」バッジ表示
- 一般贈与・特例贈与の切り替え対応
- 未入力時のガイド表示（空状態UI）

### 不動産取得税シミュレーター
- 取引種別（売買・新築・相続・贈与。既定は贈与）に対応
- 土地を「宅地（特例あり）」と「その他（宅地以外）」に分離入力
- 宅地特例（1/2）・住宅用地の税額軽減に対応（Q14軽減計算式に準拠）
- 建築年月日から控除額を自動判定（1954年〜現在の完全な閾値テーブル）
- 認定長期優良住宅対応（新築居住用で1,300万円控除）
- 土地・建物の持ち分入力（分数形式 例: 1/2）→ 課税標準（評価額×持ち分）に反映
- 面積フィールドで小数点2位まで入力可能
- 面積要件バリデーション（40〜240㎡外で警告表示）
- 結果を土地/建物の2カラムグループで表示
- 計算過程の詳細表示（トグル）、印刷時は常に展開
- 相続の場合は非課税メッセージ表示
- Q14（住宅用土地の税額軽減）・Q13（建物控除テーブル）の参照資料（画面のみ）

### 登録免許税シミュレーター
- 取引種別ごとの税率を自動適用（売買2%、相続0.4%、贈与2%等）
- 土地・建物の登録免許税を個別計算
- 住宅用家屋証明書による軽減税率に対応
- 居住用チェックで条件分岐
- 土地・建物の持ち分入力（分数形式 例: 1/2）→ 課税標準（評価額×持ち分）に反映
- 計算過程の詳細表示（トグル）、印刷時は常に展開
- No.7191 税額表（土地・建物・住宅用家屋軽減税率・端数処理）の参照資料（画面のみ）

### 不動産関連税 2税まとめて計算（`/real-estate-summary`）
- 1回の入力で不動産取得税と登録免許税を同時に計算し、両方を計算過程つきで A4横1枚に印刷（タイトル「不動産関連税シミュレーション」）
- 取引種別を土地・建物で別々に選べる（土地には「新築」が無い）
- 建物の取引種別が「新築」のときだけ「新築建物の評価額を概算」（`TokushimaNewBuildingEstimator`）を出す
  - 徳島地方法務局・令和6年度基準の単価表。用途（居宅 / 共同住宅 / 店舗・事務所等 / 工場・倉庫等 / 附属家）× 構造（木造 / 軽量鉄骨造 / 鉄骨造 / 鉄筋コンクリート造）
  - 概算額 = 床面積 × 単価（円未満切捨）を建物の評価額へ入れる
- 住宅用家屋証明書のチェックは既定でオン

### 共通機能
- 不動産3ページ（取得税・登録免許税・2税まとめ）の入力はページごとに localStorage に保存し、ほかのページの入力を一括引用できる（`lib/real-estate-input-storage.ts`）
- 贈与税・年数比較の金額と贈与区分はページ間で共有（`GiftInputContext`。メモリのみでリロードすると消える）。計算済みならページを移っても結果が出たまま
- 全ページに「サンプルで試す」ボタン（`useSampleFill` / `lib/real-estate-sample.ts`）
- 税額の根拠（`TaxBasisNotice`）と参照資料（`TaxReferenceSection`。既定で閉じていて印刷しない）
- 計算後は結果までスクロール。入力を変えても結果は消さず、薄くして「再計算が必要」バッジを出す
- 印刷: 会社情報をページ先頭に常時表示（結果入力前でも表示）
- 印刷: 入力欄は載せず「入力条件」サマリに置き換え（未選択の対象・未入力欄・持ち分1/1は省略）
- 印刷: 再計算前の古い税額は紙に出さず、注記だけ残す
- 印刷: 結果ボックスを白黒対応（白背景＋緑ボーダー＋黒文字）
- 印刷: A4横1枚。はみ出す場合のみ `beforeprint` で実測して `zoom` を自動縮小
- 印刷: ヘッダーに税目名・会社情報・担当者・作成日（`PrintHeader`）。備考欄（`PrintRemarks`）は印刷のたびに書く前提で保存しない
- サイドバーのナビゲーション（贈与税関連: 贈与税 / 年数比較 / 贈与税 早見表、不動産関連税: 不動産取得税 / 登録免許税 / 2税まとめて計算）。折りたたみ状態は localStorage（`gift-tax-sidebar-collapsed`）、モバイルではメニューで開く
- サイドバー上端にポータルへ戻るリンク、上部バーに印刷ボタン
- 担当者名・電話番号はサイドバーで入力（localStorage `gift-tax-staff-info`、印刷に反映）
- 全角数字→半角自動変換、カンマ区切り自動フォーマット
- レスポンシブデザイン（モバイル対応）

## バックアップと復元

**全体バックアップ（`manage.sh backup`）には入らず、書き出す機能も無い**。サーバーにデータは無い
（全アプリの一覧は [docker/RESTORE.md](../../docker/RESTORE.md#何が戻るか)）。

- 贈与税・年数比較の入力はメモリだけで、リロードすると消える
- 不動産3ページの入力（`gift-tax-sim:valuations`）と担当者情報はこのブラウザの localStorage にだけ残る。
  残したい結果は印刷（PDF）で控える

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

## 起動・再ビルド

起動は全体管理スクリプトから行う（リポジトリのルートで実行）。

```bash
# 起動（dev）
docker/scripts/manage.sh start gift-tax-simulator

# 本番モードへ切り替えて起動（dev へ戻すのは start gift-tax-simulator）
docker/scripts/manage.sh start --prod gift-tax-simulator

# 再ビルド（いま動いているモードを踏襲する）
docker/scripts/manage.sh build gift-tax-simulator

# ログ
docker/scripts/manage.sh logs gift-tax-simulator
```

- **素の `docker compose up` は使わない**。base の compose だけを読むので、本番で動いているアプリを dev サーバに作り替える
- dev は `./src` と `./index.html` を読み取り専用で bind mount している。**ポーリングが無いので変更を拾わない** ── ソースを直したら `docker restart gift-tax-simulator`
- `package.json` と `vite.config.ts` はイメージ同梱なので、変えたら `manage.sh build gift-tax-simulator`
- テストは無い。型検査は `npm run build` の `tsc -b` の中だけ（本番ビルドで初めて走る）
- **ローカルでは動かさない**（`npm install` / `npm run build` をホストで実行しない）

| | dev | 本番 |
|---|---|---|
| ステージ | `dev`（Vite dev server） | `runner`（nginx 1.27-alpine で `dist` を配信） |
| ボリューム | `./src` / `./index.html`（ro） | なし（`volumes: !reset []`） |
| メモリ | 512M（予約 128M）・`NODE_OPTIONS=--max-old-space-size=384` | 64M（予約 16M） |

## アクセス

ゲートウェイ（nginx）経由で `http://localhost/gift-tax-simulator/` に入る（コンテナのポートは 3001）。

| ページ | パス |
|--------|-----|
| 贈与税シミュレーター | `/gift-tax-simulator/` |
| 分割年数比較 | `/gift-tax-simulator/year-comparison` |
| 早見表 | `/gift-tax-simulator/table` |
| 不動産取得税 | `/gift-tax-simulator/acquisition-tax` |
| 登録免許税 | `/gift-tax-simulator/registration-tax` |
| 2税まとめて計算 | `/gift-tax-simulator/real-estate-summary` |

## プロジェクト構成

```
├── src/
│   ├── main.tsx                  # エントリーポイント
│   ├── App.tsx                   # ルーティング（6ルート）+ StaffProvider / GiftInputProvider
│   ├── contexts/
│   │   ├── StaffContext.tsx      # 担当者情報（localStorage `gift-tax-staff-info`）
│   │   └── GiftInputContext.tsx  # 贈与金額・区分・計算済みかのページ間共有（メモリのみ）
│   ├── app/
│   │   └── globals.css           # グローバルスタイル（CSS変数・印刷用・レスポンシブ）
│   ├── pages/
│   │   ├── GiftTaxPage.tsx       # 贈与税シミュレーター
│   │   ├── YearComparisonPage.tsx # 分割年数別 税額比較
│   │   ├── TablePage.tsx         # 早見表
│   │   ├── AcquisitionTaxPage.tsx # 不動産取得税
│   │   ├── RegistrationTaxPage.tsx # 登録免許税
│   │   └── RealEstateSummaryPage.tsx # 2税まとめて計算
│   ├── components/
│   │   ├── Navigation.tsx        # サイドバー（折りたたみ・担当者入力）+ 上部バー（印刷）
│   │   ├── PageLayout.tsx        # ページ枠（印刷タイトルの決定・印刷ヘッダー）
│   │   ├── PrintHeader.tsx       # 印刷用ヘッダー（税目名・会社情報・担当者・作成日）
│   │   ├── PrintRemarks.tsx      # 印刷用の備考欄（保存しない）
│   │   ├── TaxBasisNotice.tsx    # 税額の根拠の表示
│   │   ├── ResultSummaryCard.tsx # 結果のサマリーカード
│   │   ├── InputSection.tsx      # 贈与税入力フォーム（金額・区分・計算ボタン）
│   │   ├── ResultSection.tsx     # 贈与税結果表示（空状態UI付き）
│   │   ├── TaxTable.tsx          # シミュレーター用テーブル（3パターン比較）
│   │   ├── TaxChart.tsx          # 棒グラフ（lazy load）
│   │   ├── CalculationProcess.tsx # 計算過程ステップ表示（3パターン並列カード）
│   │   ├── RateTable.tsx         # 速算表（該当ブラケットハイライト）
│   │   ├── QuickRefTable.tsx     # 早見表用テーブル
│   │   ├── YearComparisonTable.tsx # 年数比較テーブル（最安/非課税バッジ）
│   │   ├── YearComparisonChart.tsx # 年数比較棒グラフ（lazy load）
│   │   ├── acquisition-tax/
│   │   │   ├── LandInput.tsx     # 土地入力（宅地・その他 分離入力）
│   │   │   ├── BuildingInput.tsx # 建物入力（評価額・床面積・建築年月日・控除額）
│   │   │   └── TaxReference.tsx  # Q13・Q14 の参照資料
│   │   ├── registration-tax/
│   │   │   └── TaxReference.tsx  # No.7191 の参照資料
│   │   └── shared/
│   │       ├── RealEstatePageLayout.tsx # 不動産ページ共通の枠（入力条件｜税額の2カラム印刷）
│   │       ├── CommonInputSection.tsx  # 取引種別（土地・建物別にも対応）・計算対象トグル
│   │       ├── TaxResultBox.tsx        # 結果表示ボックス（フラット/グループ2カラム対応・持ち分注記）
│   │       ├── CalculationDetails.tsx  # 計算過程の詳細（DOM常時レンダリング・印刷時強制表示）
│   │       ├── TaxReferenceSection.tsx # 折りたたみの参照資料（既定で閉じる・印刷しない）
│   │       ├── PrintConditionList.tsx  # 印刷用の「入力条件」サマリ
│   │       ├── TokushimaNewBuildingEstimator.tsx # 新築建物の評価額の概算
│   │       ├── FormattedNumberInput.tsx # 数値入力コンポーネント（decimal prop対応）
│   │       ├── ShareInput.tsx          # 持ち分入力（分数）
│   │       ├── NumberUnit.tsx / ErrorMessage.tsx
│   │       └── ImportButton.tsx        # ほかのページからの引用ボタン
│   ├── hooks/
│   │   ├── useBaseGiftForm.ts         # 贈与税2ページ共通のフォーム状態
│   │   ├── useGiftTaxForm.ts / useYearComparisonForm.ts
│   │   ├── useRealEstateFormBase.ts   # 不動産3ページ共通（取引種別・計算対象）
│   │   ├── useRealEstateInputs.ts     # 不動産の入力値
│   │   ├── useAcquisitionTaxForm.ts / useRegistrationTaxForm.ts / useRealEstateSummaryForm.ts
│   │   ├── useRealEstateInputSync.ts  # 入力のページ別 localStorage 保存
│   │   ├── useRealEstateImport.ts     # ほかのページの入力の引用
│   │   ├── useBuildingDate.ts         # 建築年月日（和暦入力）と控除額
│   │   ├── useSampleFill.ts           # 「サンプルで試す」
│   │   └── useFormattedInput.ts       # 数値入力フォーマット（整数用・小数用）
│   └── lib/
│       ├── tax-calculation.ts         # 贈与税計算ロジック（速算表・年数比較・パターン比較）
│       ├── real-estate-tax.ts         # 不動産税計算ロジック（取得税・登録免許税・建物控除）
│       ├── acquisition-breakdown.ts / real-estate-result.ts # 結果の内訳の組み立て
│       ├── tokushima-new-building.ts  # 新築建物の単価表（徳島地方法務局・令和6年度基準）
│       ├── real-estate-input-storage.ts # 不動産入力の localStorage（ページ別）
│       ├── real-estate-sample.ts      # サンプル入力
│       ├── print-conditions.ts        # 印刷用「入力条件」の組み立て
│       ├── print-fit.ts               # A4横1枚へ zoom で縮める（拡大はしない）
│       ├── chart-config.ts            # Chart.js共通設定
│       ├── validate-gift-amount.ts    # 贈与金額バリデーション（10億円以下）
│       ├── validate-real-estate.ts    # 不動産バリデーション（評価額100億円以下・面積要件40〜240㎡）
│       ├── validation.ts / utils.ts
│       └── company.ts                 # 会社情報定数
├── index.html                    # HTMLエントリー（Google Fonts: Noto Sans JP, Roboto Mono）
├── vite.config.ts                # Vite設定（base, @alias, lucide-react alias, manualChunks）
├── vercel.json                   # Vercel 用の SPA リライト
├── docker-compose.yml            # 開発用（Vite dev server, port 3001）
├── docker-compose.prod.yml       # 本番オーバーライド（nginx, memory 64M）
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

開発時は `dev` ターゲット（`src/` と `index.html` をボリュームマウント）、本番は `runner` ターゲット（ビルド済みdistをnginxで配信。非 root）。
本番への切り替えは上の `manage.sh start --prod gift-tax-simulator` で行う。

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

#### 建物控除額テーブル（中古住宅）

| 建築年月日 | 控除額 |
|-----------|--------|
| 1997年4月1日〜 | 1,200万円 |
| 1989年4月1日〜 | 1,000万円 |
| 1985年7月1日〜 | 450万円 |
| 1981年7月1日〜 | 420万円 |
| 1976年1月1日〜 | 350万円 |
| 1973年1月1日〜 | 230万円 |
| 1964年1月1日〜 | 150万円 |
| 1954年7月1日〜 | 100万円 |

新築: 原則1,200万円 / 認定長期優良住宅: 1,300万円

### 登録免許税
- 取引種別に応じた税率（売買2%・相続0.4%・贈与2%等）
  - 土地の売買: R8.4.1以降 本則2%（軽減1.5%は期限切れ）
  - 建物の保存登記: 本則0.4%・住宅用家屋証明書あり0.15%
  - 建物の売買移転: 本則2%・住宅用家屋証明書あり0.3%
- 課税標準 = 固定資産税評価額 × 持ち分（持ち分がある場合）
- 住宅用家屋証明書ありの場合、軽減税率を適用
- 端数処理: 課税標準額は千円未満切捨、税額は百円未満切捨（最低1,000円）

## ライセンス

Private - 税理士法人マスエージェント
