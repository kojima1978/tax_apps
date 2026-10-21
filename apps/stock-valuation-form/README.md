# 取引相場のない株式の評価明細書

国税庁の「取引相場のない株式（出資）の評価明細書」（第１表の１〜第７表の３）をブラウザ上で入力・自動計算・印刷するWebフォームアプリケーションです。
同梱の API（Hono + Prisma + PostgreSQL）が、類似業種比準価額に使う業種目マスタ・業種目別株価等の配信と、評価案件（会社1社・課税時期1つぶんの入力）の保存を受け持ちます。

## 機能

### 画面の流れ

会社一覧（`#cases`）→ その会社の年度一覧（`#cases/<会社>`）→ 帳票（`#form`）。どの画面を出すかは
`src/features/cases/screen.ts` の `resolveRoute` だけが決めます。帳票の「← 一覧」はその会社の年度一覧へ戻ります。

- **案件は DB に保存**（`ValuationCase`）。帳票への入力は自動で保存され、案件に紐づいていない入力も
  3秒後に自動で案件になります（ゴミ箱へ移した直後の入力は作り直しません）
- **楽観ロック**: 画面は読んだときの `updatedAt` を `expectedUpdatedAt` で送り、別の端末（や MCP サーバー）が
  先に更新していれば 409。自動保存を止めてヘッダに「読み直す」を出します
- 同じ会社の年分は `companyKey` でまとめます（会社マスタは作らない。キーは翌年度更新・複製のときに初めて振る。
  振られていない案件は会社名で名寄せ）
- 新しい案件を作る口は1つ（既存の会社は選ばせて前年分を写す）。複製・ゴミ箱（`archivedAt`。実体は残る）・復元あり
- localStorage（キー `stock-valuation-form-data`）は帳票の作業中の写しで、保存先の本体は DB です

### 様式（サイドバーの11タブ ＋ サマリー）

| タブ | 様式 | 内容 |
|---|---|---|
| 第１表の１ | 評価上の株主の判定及び会社規模の判定の明細書 | 株主判定・議決権割合・業種目番号 |
| 第１表の２ | 同（続） | 会社規模（従業員数・総資産・取引金額）の判定 |
| 第２表 | 特定の評価会社の判定の明細書 | 比準要素数・株式等/土地等保有割合による判定 |
| 第３表 | 一般の評価会社の株式及び株式に関する権利の価額の計算明細書 | 原則的評価方式・配当還元方式 |
| 第４表の１ | 類似業種比準価額等の計算明細書 | 1株当たりの配当金額・利益金額・純資産価額 |
| 第４表の２ | 同（続） | 類似業種比準価額の計算 |
| 第５表 | 1株当たりの純資産価額（相続税評価額）の計算明細書 | 資産・負債明細（続紙対応・決算書の表の貼り付け取込） |
| 第６表 | 特定の評価会社の株式及び株式に関する権利の価額の計算明細書 | 比準要素数1／株式等・土地等保有／開業後3年未満等 |
| 第７表の１ | 株式等保有特定会社の株式の価額の計算明細書 | 受取配当金収受割合・S1の比準要素 |
| 第７表の２ | 同（続） | S1の類似業種比準価額 |
| 第７表の３ | 同（続） | S1の純資産価額・S2・株式の価額 |

タブ列の先頭は様式ではない「サマリー」（入力内容から顧客説明用のA4レポートを作る）。
第４表の１／第４表の２は同じデータバケット（`table4`）、第７表の１／第７表の２も同じバケット（`table7`）を共有します。表示だけを様式単位に分けています。

### 共通機能

- サイドバーによる様式の切り替え（第２表の判定で「記載が必要な表」にバッジ表示）
- A4実寸（210mm × 297mm）で様式原本の罫線位置に合わせたグリッドレイアウト
- JSON での保存・読込（`Ctrl+S` で保存）。他の PC への持ち出しはこちら
- 翌年度更新（直前期の数値を直前々期へ順送りした**翌事業年度の案件を新しく作って移る**。前年分は案件として残る）
- 印刷（`Ctrl+P` で現在の表／「全表印刷」で様式を選んでまとめて印刷。`.no-print` で操作UIを除外）
- 業種目データ管理画面（`#industry-data`。年分の追加・月別株価の登録／訂正・貼り付け取込・JSON入出力）
- 入力前提のチェック、必須項目ナビ、整合性チェック、キーボードショートカット一覧（`?`。`Ctrl+←/→` で表の移動）
- 行のドラッグ＆ドロップ並び替え（HTML5 ネイティブ D&D）
- 欄の辞書（`GET /stock-valuation-form/api/field-catalog`）。外部の AI ツールから数字を入れる
  `apps/mcp-server` は、どの欄が何かをこれだけから知る（様式を直したら辞書も一緒に直る形）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Vite 7 + React 19 |
| バックエンド | Hono 4 + Prisma 6 |
| データベース | PostgreSQL 16（業種目マスタ・業種目別株価等と、評価案件） |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 + カスタムCSS |
| フォント | Noto Sans JP（Google Fonts） |
| ドラッグ＆ドロップ | HTML5 ネイティブ（draggable 属性） |
| テスト | Vitest（＋ `tsc` の型検査） |
| 本番サーバー | Node（dist と API を 3014 で同時配信） |
| コンテナ | Docker (multi-stage build) |

## プロジェクト構成

```
src/
├── App.tsx                      # 画面の振り分け・タブ切替・印刷・ツールバー
├── main.tsx / main.css          # エントリ / Tailwind + 様式CSS
├── components/
│   ├── Navigation.tsx           # サイドバー
│   ├── ClientSummaryPage.tsx    # サマリー（A4）
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
│   ├── constants.ts             # タブ定義（TABS / NAV_TABS）
│   ├── industryDataset.ts       # 業種目データのビュー・検索
│   ├── IndustryDataProvider.tsx # API からの取得と供給
│   └── formQr.ts                # 印刷用QRコード
├── features/
│   ├── cases/                   # 会社一覧・年度一覧・新規案件・自動保存（useCases）
│   ├── industryAdmin/           # 業種目データ管理画面
│   ├── table5Paste/             # 第５表への決算書の貼り付け取込
│   └── pastedTable/             # 貼り付けた表の共通部品
├── hooks/
│   ├── useFormData.ts           # フォーム状態管理 + localStorage の作業中の写し
│   └── rollover.ts              # 翌年度更新
├── lib/                         # 計算・判定・整合性チェック・和暦など
└── types/form.ts                # TableId / FormData 型定義

server/                          # API（Hono + Prisma）
├── index.ts                     # エントリ（API + health + 本番の静的配信）
├── db.ts / seed.ts / wareki.ts / validation.ts
├── cases.ts                     # 案件の入力検証・楽観ロックの前提
├── fieldCatalog.ts              # 欄の辞書（MCP サーバー向け）
└── routes/
    ├── cases.ts                 # 案件の一覧・取得・作成・上書き・複製・ゴミ箱・復元
    ├── fieldCatalog.ts          # GET /field-catalog
    ├── industry.ts              # 業種目データの読み取りAPI
    └── industryAdmin.ts         # 業種目データの登録・訂正API
prisma/
├── schema.prisma / migrations/
└── industry-data/               # 業種目データの原本（Git 管理。年分ごとの JSON）
scripts/                         # 業種目データの CLI（pdf / save / export / import / reseed）
```

## Docker

**起動・切替・再ビルドは `manage.sh` から行う**（この PC では本番モードで稼働中）。素の
`docker compose up` は base の compose しか読まないので、本番で動いているアプリを dev サーバに作り替えます。
また本番の DB パスワードの生成と `ALTER ROLE` は `manage.sh start --prod` の中でしか走りません。

```bash
docker/scripts/manage.sh start stock-valuation-form          # dev
docker/scripts/manage.sh start --prod stock-valuation-form   # 本番
docker/scripts/manage.sh build stock-valuation-form          # 再ビルド（いま動いているモードを踏襲）
docker/scripts/manage.sh logs stock-valuation-form
# → http://localhost/stock-valuation-form/（ゲートウェイ経由。直接なら http://localhost:3014/stock-valuation-form/）
```

- **dev** は Vite が 3014、API が同一コンテナの 3114 で動き、`/stock-valuation-form/api/*` を Vite がプロキシします
  （`npm run dev:all`）。`src/` などは bind mount なので保存すれば反映されます
- **本番** は Node（`dist-server/index.js`）が 3014 でビルド済みの `dist` と API の両方を配信します。
  ソースはイメージに同梱されるので、**どの変更も `build` しないと入りません**。
  `POSTGRES_PASSWORD` が未設定だと起動に失敗するようにしてあります（`.env.example` 参照）
- どちらのモードでも `package.json` と `vite.config.ts` はイメージ同梱なので、変えたら `build` が要ります

### ポート・パス

| 項目 | 値 |
|---|---|
| アプリ | 3014（dev は Vite、本番は Node。`127.0.0.1` のみ公開） |
| API（dev のみ別ポート） | 3114 |
| PostgreSQL | 3016 → 5432（`127.0.0.1` のみ公開） |
| basePath | `/stock-valuation-form` |
| ネットワーク | `tax-apps-network`（external） |
| DB のボリューム | `stock-valuation-form-postgres` |
| Gateway | 登録済み（nginx から `/stock-valuation-form/` を転送） |

### docker-compose.yml のポイント

実体は [docker-compose.yml](docker-compose.yml) と [docker-compose.prod.yml](docker-compose.prod.yml) を参照してください。押さえておくところだけ:

| 設定 | 説明 |
|---|---|
| `svf-postgres` | `postgres:16-alpine`。アプリは `service_healthy` を待って起動。空のボリュームは `POSTGRES_INITDB_ARGS` で照合順序 `C` に初期化（既存のボリュームの移行は `manage.sh collation`） |
| `volumes`（dev） | `src/` `server/` `prisma/` `index.html` `scripts/` を読み取り専用マウント。書き込み可は `prisma/industry-data/`（`industry:save` の書き戻し先）と `output/`（JSON書き出し・PDFの受け取り口）だけ |
| `volumes`（本番） | `!override` で `prisma/industry-data/` と `output/` だけに絞る |
| `CHOKIDAR_USEPOLLING` | Windows の bind mount では inotify が届かないため（API の `tsx watch` 用）。Vite 側は `vite.config.ts` の `server.watch` に別途指定が要る |
| `allowedHosts` | `vite.config.ts` に `stock-valuation-form`。MCP サーバーがサービス名で dev へ繋ぐため（Vite 7 は localhost 以外の `Host` を 403 で弾く） |
| `healthcheck` | dev は API の `/api/health` と Vite の両方、本番は `/api/health` だけ。`/api/health` は業種目マスタの取込の失敗と DB への接続（`SELECT 1`）を見て、どちらかが駄目なら 503（マスタが空のまま・DB が落ちたまま静かに動くのを防ぐ） |
| `stock-valuation-form-test` | `profiles: ["test"]` の使い捨てサービス（dev ステージ・別タグの `image:`）。本番モードでもテストを回すため |
| `labels` | `tax-apps.autoheal: "true"`（ウォッチドッグの対象） |
| `init: true` | PID 1 問題を回避（本番は `init: false`） |

## バックアップと復元

全アプリ共通の仕組み（取るのは全体で1つ、戻すのはアプリごと）は [docker/RESTORE.md](../../docker/RESTORE.md)。

- **全体バックアップに入るもの**: DB の `pg_dump`（`svf-postgres`。評価案件と業種目データ）と `.env`
  （`backup.sh` の `PG_TARGETS` / `SETTINGS_TARGETS`）
- **取る**: `docker/scripts/manage.sh backup`（全体。ふだんはウォッチドッグが自動で回すので叩かなくてよい）
- **戻す**: `docker/scripts/manage.sh restore stock-valuation-form <バックアップ>`。`--yes` が無ければ一覧だけ出して
  何も変えない。実行は `--yes` を付けて、人の確認の後。`.env` は無いときだけ置く
- **評価案件は DB にしか無い**。業種目データは下のとおり Git にも原本があるので、DB を失っても起動時のシードで戻る

## 業種目データ

原本は `prisma/industry-data/*.json`（Git 管理）。起動時のシードが**未登録の年分だけ**取り込むので、
`git pull` した環境は起動するだけで復元されます。個々の会社の情報（評価案件）は DB にしか無く、ここには入りません（リポジトリは公開）。

```bash
cd apps/stock-valuation-form
docker compose exec stock-valuation-form npm run industry:save                        # DB → prisma/industry-data/（画面で足した・直したらこれをコミット）
docker compose exec stock-valuation-form npm run industry:reseed                      # 登録済みの年分をアーカイブで入れ直す（引数なしは一覧だけ。実行は -- --yes）
docker compose exec stock-valuation-form npm run industry:pdf -- output/<file>.pdf    # 国税庁の別紙PDFを JSON へ（アーカイブとの差分も出す。dev イメージ専用）
docker compose exec stock-valuation-form npm run industry:export                      # 全年分を output/industry-export/ へ（手元の控え）
docker compose exec stock-valuation-form npm run industry:import -- <file>            # 読み込み
```

- 毎月の別紙は増えるのが月の列だけなので、通常は `industry:pdf -- <pdf> --only-new-months` →
  `industry:import -- <file> --months-only` → `industry:save` の順
- 管理画面（`#industry-data`）の「JSONで入出力」と同じ経路です。年分の削除APIは無いので、登録済みの年分へは
  `--months-only` で月別株価だけ上書きします（まるごと入れ直すなら `industry:reseed`）
- `industry:pdf` は `pdfjs-dist`（devDependencies）を使うので、本番モードのコンテナでは動きません

## テスト

```bash
docker/scripts/manage.sh test stock-valuation-form
```

中身は `npm test`（`npm run typecheck && vitest run`。vitest は型を見ないので型検査も一緒に回す）。
dev なら稼働中のコンテナの中で、本番モードなら `stock-valuation-form-test` の使い捨てコンテナで走ります。
同じ対象が `.github/workflows/ci.yml` の matrix にもあります。

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
