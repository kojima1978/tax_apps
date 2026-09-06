# 取引相場のない株式の評価明細書

国税庁の「取引相場のない株式（出資）の評価明細書」（第１表の１〜第７表の３）をブラウザ上で入力・自動計算・印刷するWebフォームアプリケーションです。
類似業種比準価額に使う業種目マスタ・業種目別株価等は、同梱の API（Hono + Prisma + PostgreSQL）から配信します。

## 機能

### 様式（サイドバーの11タブ）

| タブ | 様式 | 内容 |
|---|---|---|
| 第１表の１ | 評価上の株主の判定及び会社規模の判定の明細書 | 株主判定・議決権割合・業種目番号 |
| 第１表の２ | 同（続） | 会社規模（従業員数・総資産・取引金額）の判定 |
| 第２表 | 特定の評価会社の判定の明細書 | 比準要素数・株式等/土地等保有割合による判定 |
| 第３表 | 一般の評価会社の株式及び株式に関する権利の価額の計算明細書 | 原則的評価方式・配当還元方式 |
| 第４表の１ | 類似業種比準価額等の計算明細書 | 1株当たりの配当金額・利益金額・純資産価額 |
| 第４表の２ | 同（続） | 類似業種比準価額の計算 |
| 第５表 | 1株当たりの純資産価額（相続税評価額）の計算明細書 | 資産・負債明細（続紙対応）|
| 第６表 | 特定の評価会社の株式及び株式に関する権利の価額の計算明細書 | 比準要素数1／株式等・土地等保有／開業後3年未満等 |
| 第７表の１ | 株式等保有特定会社の株式の価額の計算明細書 | 受取配当金収受割合・S1の比準要素 |
| 第７表の２ | 同（続） | S1の類似業種比準価額 |
| 第７表の３ | 同（続） | S1の純資産価額・S2・株式の価額 |

第４表の１／第４表の２は同じデータバケット（`table4`）、第７表の１／第７表の２も同じバケット（`table7`）を共有します。表示だけを様式単位に分けています。

### 共通機能

- サイドバーによる様式の切り替え（第２表の判定で「記載が必要な表」にバッジ表示）
- A4実寸（210mm × 297mm）で様式原本の罫線位置に合わせたグリッドレイアウト
- **localStorage による入力データの自動保存**（キー `stock-valuation-form-data`）
- JSON での保存・読込（`Ctrl+S` で保存）
- 翌年度更新（直前期の数値を直前々期へ順送り。実行前に自動バックアップ）
- 印刷（`Ctrl+P` で現在の表／「全表印刷」で様式を選んでまとめて印刷。`.no-print` で操作UIを除外）
- お客様サマリー（入力内容から顧客説明用のA4レポートを生成）
- 業種目データ管理画面（`#industry-data`。年分の追加・月別株価の登録／訂正・JSON入出力）
- 入力前提のチェック、必須項目ナビ、整合性チェック、キーボードショートカット一覧（`?`）
- 行のドラッグ＆ドロップ並び替え（HTML5 ネイティブ D&D）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Vite 7 + React 19 |
| バックエンド | Hono 4 + Prisma 6 |
| データベース | PostgreSQL 16（業種目マスタ・業種目別株価等のみ） |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 + カスタムCSS |
| フォント | Noto Sans JP（Google Fonts） |
| ドラッグ＆ドロップ | HTML5 ネイティブ（draggable 属性） |
| テスト | Vitest |
| 本番サーバー | Node（dist と API を 3014 で同時配信） |
| コンテナ | Docker (multi-stage build) |

## プロジェクト構成

```
src/
├── App.tsx                      # タブ切替・印刷・ツールバー
├── main.tsx / main.css          # エントリ / Tailwind + 様式CSS
├── components/
│   ├── Navigation.tsx           # サイドバー
│   ├── ClientSummaryPage.tsx    # お客様サマリー（A4）
│   ├── ConsistencyChecker.tsx   # 表をまたぐ整合性チェック
│   ├── IndustryYearNotice.tsx   # 業種目データの年分ずれの警告
│   ├── PrerequisitesDialog.tsx  # 入力前提の確認
│   ├── RequiredFieldNavigator.tsx / ShortcutHelp.tsx
│   ├── tables/                  # 様式ごとのグリッド定義
│   │   ├── Table1_1Grid.tsx     # 第１表の１（続紙対応）
│   │   ├── shared.ts            # 第３表・第６表 共通の適用方式セル
│   │   ├── companyFloatHeader.tsx
│   │   ├── table1-2/ table2/ table3/ table4/ table5/
│   │   ├── table6/ table7/ table8/   # table8 は第７表の３の実体
│   │   └── __tests__/           # 計算ロジックのテスト
│   └── ui/
│       ├── GridForm.tsx         # 様式グリッドの描画エンジン
│       ├── SheetOps.tsx         # 用紙間の操作帯（続紙の追加・削除）
│       └── formGeometry.ts      # 様式原本の実測mm座標
├── data/
│   ├── constants.ts             # タブ定義（TABS）
│   ├── industryDataset.ts       # 業種目データのビュー・検索
│   ├── IndustryDataProvider.tsx # API からの取得と供給
│   └── formQr.ts                # 印刷用QRコード
├── features/industryAdmin/      # 業種目データ管理画面
├── hooks/
│   ├── useFormData.ts           # フォーム状態管理 + localStorage 永続化
│   └── rollover.ts              # 翌年度更新
├── lib/                         # 計算・判定・整合性チェック・和暦など
└── types/form.ts                # TableId / FormData 型定義

server/                          # API（Hono + Prisma）
├── index.ts                     # エントリ（API + 本番の静的配信）
├── db.ts / seed.ts / wareki.ts
└── routes/industry.ts           # 読み取りAPI
    routes/industryAdmin.ts      # 登録・訂正API
prisma/                          # スキーマ・マイグレーション
scripts/                         # 業種目データの export / import CLI
```

## Docker

### 開発

```bash
docker compose up -d
# → http://localhost:3014/stock-valuation-form/
```

dev は Vite が 3014、API が同一コンテナの 3114 で動き、`/stock-valuation-form/api/*` を Vite がプロキシします（`npm run dev:all`）。

### 本番

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

本番は Node（`dist-server/index.js`）が 3014 でビルド済みの `dist` と API の両方を配信します。
`POSTGRES_PASSWORD` が未設定だと起動に失敗するようにしてあります（`.env.example` 参照）。

### その他

```bash
docker compose up -d --build   # 再ビルド
docker compose logs -f         # ログ確認
docker compose down            # 停止
```

### ポート・パス

| 項目 | 値 |
|---|---|
| アプリ | 3014（dev は Vite、本番は Node） |
| API（dev のみ別ポート） | 3114 |
| PostgreSQL | 3016 → 5432（`127.0.0.1` のみ公開） |
| basePath | `/stock-valuation-form` |
| ネットワーク | `tax-apps-network`（external） |
| Gateway | 登録済み（nginx から `/stock-valuation-form/` を転送） |

### docker-compose.yml のポイント

実体は [docker-compose.yml](docker-compose.yml) を参照してください。押さえておくところだけ:

| 設定 | 説明 |
|---|---|
| `svf-postgres` | 業種目マスタ用の PostgreSQL。アプリは `service_healthy` を待って起動 |
| `volumes` | `src/` `server/` `prisma/` `index.html` `scripts/` を読み取り専用マウント。`output/` だけ書き込み可（JSON書き出しの受け取り口） |
| `CHOKIDAR_USEPOLLING` | Windows の bind mount では inotify が届かないため。Vite 側は `vite.config.ts` の `server.watch` に別途指定が要る |
| `healthcheck` | API の `/api/health` と Vite の両方を見る（業種目マスタが空のまま静かに動くのを防ぐ） |
| `labels` | `tax-apps.autoheal: "true"`（ウォッチドッグの対象） |
| `init: true` | PID 1 問題を回避（本番は `init: false`） |

## 業種目データの持ち運び

```bash
docker exec stock-valuation-form npm run industry:export           # 全年分を output/industry-export/ へ
docker exec stock-valuation-form npm run industry:import -- <file> # 読み込み
```

管理画面（`#industry-data`）の「JSONで入出力」と同じ経路です。年分の削除APIは無いので、登録済みの年分へは `--months-only` で月別株価だけ上書きします。

## テスト

```bash
docker exec stock-valuation-form npx vitest run
```

## CSSクラス規約

様式の罫線・セルは `GridForm` がインラインの CSS Grid で描くため、様式そのものに専用クラスはほとんど使いません。

| クラス | 用途 |
|---|---|
| `.gov-page` | A4ページコンテナ |
| `.gov-page--exact` | 様式原本と同じ実寸で描くページ（mm絶対配置・余白なし） |
| `.sheet-ops` | 用紙と用紙のあいだに置く操作帯（続紙の追加・削除） |
| `.app-tool-btn` | ヘッダー・ダイアログの操作ボタン |
| `.gf-alt-pick` | クリックで選べる分数（第４表の１ Ⓒ₁・Ⓒ₂） |
| `.no-print` | 印刷時に非表示 |
| `.print-only` | 印刷時のみ表示 |
