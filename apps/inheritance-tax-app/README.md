# 相続税シミュレーター

相続財産額と相続人の構成をもとに、相続税額・一次二次相続・生命保険・生前贈与・賃貸不動産・分割案・二次相続までの年数を検証するアプリです。

画面は React + Vite、それを配信する Express 5 のサーバーがあり、外部アプリ向けの相続税計算 API（[下記](#相続税計算api)）も同じサーバーが受け持ちます。画面の計算はすべてブラウザの中で行い、API は呼びません。

アクセスはゲートウェイ経由で `http://localhost/inheritance-tax-app/` です。

## 機能一覧

サイドバーの3グループに8ページあります。

| グループ | 機能 | パス | 概要 |
| --- | --- | --- | --- |
| 税額計算 | 相続税計算 | `/` | 遺産総額、相続人、配偶者取得割合などから相続税を計算 |
| 税額計算 | 一次・二次相続比較 | `/comparison` | 配偶者取得割合ごとに一次相続と二次相続の合計税額を比較 |
| 相続対策 | 生命保険 | `/insurance` | 死亡保険金の非課税枠を使った節税効果を検証 |
| 相続対策 | 現金贈与 | `/cash-gift` | 生前贈与による相続税、贈与税、納税後財産を比較 |
| 相続対策 | 賃貸不動産 | `/real-estate` | 現金を賃貸不動産へ組み替えたときの評価額の圧縮と相続税を比較 |
| 相続対策 | 遺産分割 | `/split` | 相続人ごとの取得額を変動させ、税額変化を比較 |
| 資料 | 税務タイムライン | `/timeline` | 二次相続までの年数（5〜30年）ごとに、配偶者取得割合別の合計税額を比較 |
| 資料 | 税率早見表 | `/table` | 相続人構成別の税額早見表、加重平均税率を表示 |

## 主な共通機能

- 左のサイドバーでページを切り替え（折りたたみ可、モバイルはメニューボタンで開く）
- 担当者名・電話番号を上部バーで入力し、印刷用ヘッダーへ反映（localStorage に保存）
- 入力エラー時のエラーパネル表示と該当箇所へのスクロール
- 結果表示時の自動スクロールとフェードイン表示
- 印刷は A4 横（相続税計算・比較・保険・贈与・賃貸不動産）と A3 横（遺産分割・タイムライン・早見表）
- 税額計算ロジックを `src/utils/` に集約し、各画面と API で再利用

## 技術スタック

| 分類 | 内容 |
| --- | --- |
| フレームワーク | React 19 |
| 言語 | TypeScript 5.9 |
| ビルド | Vite 7（画面）+ `vite.server.config.ts`（サーバー） |
| ルーティング | React Router DOM 7 |
| サーバー | Express 5、入力検証は Zod 3 |
| スタイル | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| アイコン | Lucide React |
| テスト | Vitest 3 |
| Lint | ESLint 9, typescript-eslint |
| 実行環境 | Docker Compose |

## ディレクトリ構成

```text
server/
├── index.ts                        # Express。dev は Vite をミドルウェアで組み込み、本番は dist を配信
├── inheritance-tax-api.ts          # 相続税計算 API（入力検証と計算）
└── inheritance-tax-api.test.ts
src/
├── App.tsx                         # ルーティング定義
├── main.tsx                        # エントリーポイント
├── index.css                       # Tailwind、共通UI、印刷スタイル
├── pages/                          # 各画面（8ページ）
│   ├── CalculatorPage.tsx
│   ├── ComparisonPage.tsx
│   ├── InsurancePage.tsx
│   ├── CashGiftPage.tsx
│   ├── RealEstatePage.tsx
│   ├── SplitPage.tsx
│   ├── TimelinePage.tsx
│   └── TablePage.tsx
├── components/                     # 共通UI（Header・PrintHeader 等）と機能別コンポーネント
│   ├── calculator/
│   ├── comparison/
│   ├── gift/
│   ├── heirs/
│   ├── insurance/
│   ├── realEstate/
│   ├── split/
│   └── timeline/
├── constants/                      # 税率、基礎控除、注意文言など
├── contexts/                       # 担当者情報コンテキスト
├── hooks/                          # 各シミュレーションの状態、入力検証、スクロールなど
├── types/                          # 型定義
└── utils/                          # 税額計算、贈与、保険、不動産、分割、タイムライン計算
```

## Docker 開発

このアプリは共有の `Dockerfile.vite-static` ではなく、**自前の `Dockerfile`** を持ちます（Express のサーバーがあるため）。dev・本番とも非 root（`node`）で動きます。

| | 開発 | 本番 |
| --- | --- | --- |
| ステージ | `dev`（`npm run dev` = `tsx watch server/index.ts`） | `runner`（`node dist-server/index.js`） |
| ソース | `./src` `./server` `./index.html` `./vite.config.ts` を読み取り専用で bind mount | イメージ同梱（`volumes: !reset []`） |
| メモリ | 512M（予約 128M）、`--max-old-space-size=384` | 128M（予約 32M）、`--max-old-space-size=96` |

起動・切り替え・再ビルドは統合管理スクリプトから行います（素の `docker compose up` は本番を dev に作り替えるので使わない）。

```bash
# 起動（dev）/ 本番モードで起動
docker/scripts/manage.sh start inheritance-tax-app
docker/scripts/manage.sh start --prod inheritance-tax-app

# 再ビルド（稼働中のモードを踏襲）
docker/scripts/manage.sh build inheritance-tax-app

# ログ
docker/scripts/manage.sh logs inheritance-tax-app
```

## 変更反映の目安

bind mount にポーリングが無いため、開発モードでも保存しただけでは反映されません。

| 変更内容 | 開発モード |
| --- | --- |
| `src/` `server/` `index.html` `vite.config.ts` | `docker restart inheritance-tax-app` |
| `public/` 配下 | `manage.sh build inheritance-tax-app` |
| `package.json`, `package-lock.json` | `manage.sh build inheritance-tax-app` |
| `Dockerfile` | `manage.sh build inheritance-tax-app` |
| `docker-compose*.yml` | `manage.sh apply inheritance-tax-app` |

本番モードは何を変えても `manage.sh build inheritance-tax-app` が要ります。

## ローカルでは動かさない

このリポジトリは**ローカル環境を汚さない**方針です（ルート `README.md` 参照）。
`npm ci` / `npm run dev` / `npm run build` をホストで実行しないでください。

## テスト・ビルドと検証

テストは型検査（`tsc -b`）＋ Vitest です（`npm test` = `npm run typecheck && vitest run`）。稼働中のコンテナの中で走り、CI でも同じものが回ります。

```bash
docker/scripts/manage.sh test inheritance-tax-app
```

| テスト | 対象 |
| --- | --- |
| `server/inheritance-tax-api.test.ts` | 相続税計算 API |
| `src/utils/giftCalculator.test.ts` | 贈与の計算 |
| `src/utils/realEstateCalculator.test.ts` | 賃貸不動産の計算 |
| `src/components/gift/cashGiftReportUtils.test.ts` | 現金贈与の帳票 |

ビルド（`tsc -b && vite build && vite build --config vite.server.config.ts`）と Lint もコンテナの中で実行します。

```bash
docker compose exec inheritance-tax-app npm run build
docker compose exec inheritance-tax-app npm run lint
```

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `Dockerfile` | dev / builder / runner の各ステージ |
| `docker-compose.yml` | 開発用 Docker Compose 設定 |
| `docker-compose.prod.yml` | 本番用 override |
| `vite.config.ts` | Vite 設定、base path、chunk 設定 |
| `vite.server.config.ts` | サーバー（`server/index.ts`）のビルド設定 |
| `vercel.json` | Vercel に静的配信するときの SPA フォールバック（API は含まない） |
| `tailwind.config.cjs` | Tailwind CSS 設定 |
| `postcss.config.cjs` | PostCSS 設定 |
| `src/utils/taxCore.ts` | 相続税計算の共通コア |
| `src/constants/index.ts` | 税率、基礎控除などの定数 |

## 相続税計算API

外部アプリから相続財産額と家族構成を受け取り、画面と同じ計算ロジックで相続税額を返します。金額の入出力単位はすべて円です。計算ロジックは万円単位のため、入力金額は1万円単位で指定してください。private-banking はコンテナ間で `http://inheritance-tax-app:3004/inheritance-tax-app/api/calculate` を呼んでいます。

| メソッド | パス | 内容 |
| --- | --- | --- |
| `GET` | `/inheritance-tax-app/api/health` | ヘルスチェック（healthcheck が使う） |
| `POST` | `/inheritance-tax-app/api/calculate` | 相続税の計算 |

```http
POST /inheritance-tax-app/api/calculate
Content-Type: application/json
```

```json
{
  "estateValueJpy": 200000000,
  "familyComposition": {
    "hasSpouse": true,
    "selectedRank": "rank1",
    "heirCount": 2
  },
  "spouseAcquisition": {
    "mode": "legal"
  },
  "lifeInsurance": {
    "surrenderValueJpy": 10000000,
    "contracts": [
      {
        "deathBenefitJpy": 30000000,
        "recipient": { "kind": "spouse" }
      }
    ]
  },
  "retirementAllowance": {
    "surrenderValueJpy": 5000000,
    "contracts": [
      {
        "deathBenefitJpy": 20000000,
        "recipient": { "kind": "heir", "index": 0 }
      }
    ]
  }
}
```

`selectedRank` は `none`、`rank1`（子）、`rank2`（直系尊属）、`rank3`（兄弟姉妹）のいずれかです。`none` のときは `heirCount` を0に、それ以外は1以上にしてください。

`spouseAcquisition` を省略した場合は法定相続分で計算します。指定できるのは次の4種類です。

- `{ "mode": "legal" }`: 法定相続分
- `{ "mode": "limit160m" }`: 1億6千万円まで
- `{ "mode": "custom", "value": 50000000, "unit": "jpy" }`: 金額（円、1万円単位）
- `{ "mode": "custom", "value": 50, "unit": "percent" }`: 割合（0〜100%）

`lifeInsurance` と `retirementAllowance` はどちらも省略できます。指定した場合、`estateValueJpy` に含まれる解約返戻金（解約手当金）を `surrenderValueJpy` で差し引き、死亡保険金・死亡退職金へ置き換えます。非課税枠「500万円 × 法定相続人数」は生命保険金と死亡退職金でそれぞれ別枠に適用し、法定相続人が受け取る契約だけを対象として受取額に比例配分します。

`recipient` は契約ごとに必須で、次の3種類です。

- `{ "kind": "spouse" }`: 配偶者（`familyComposition.hasSpouse` が `true` のときだけ指定できます）
- `{ "kind": "heir", "index": 0 }`: 配偶者を除く法定相続人。`index` は0始まりで、`familyComposition.heirCount` 未満である必要があります
- `{ "kind": "other" }`: 法定相続人以外（孫・甥姪・第三者など）

死亡保険金・死亡退職金は遺産分割の対象ではなく受取人固有の権利なので、非課税枠を控除した課税対象額を受取人の取得額へ直接加算し、残りの財産（`divisibleEstateJpy`）だけを法定相続分で按分します。相続税の総額は課税価格の合計額から決まるため受取人の指定では変わりませんが、各人の取得額が変わることで按分税額・2割加算・配偶者の税額軽減が変わり、納付税額は変動します。`{ "kind": "other" }` の分は課税価格には加算しますが受取人へは帰属させず、法定相続人だけで按分します（相続人以外の取得者としての税額計算は行いません）。

実際の分け方で按分したい場合は、次の2つも指定できます（どちらも省略可）。

- `actualAcquisitionShares`: `divisibleEstateJpy` を分ける割合。`spouse`（配偶者）・`heirs`（`heirCount` と同じ人数の配列）・`others`（相続人以外の取得者。`id` / `label` / `share` / `specialTaxAddition`）で、合計を1にします。指定すると応答の `acquisitionAllocationMode` が `ACTUAL` になります（省略時は `LEGAL`）
- `specialTaxAdditionTargets`: 2割加算の対象者。`spouse` と `heirs`（`heirCount` と同じ人数の配列）を真偽値で指定します

主なレスポンス項目:

- `schemaVersion` / `calculationVersion` / `taxRuleAsOf`: 応答の形と計算ロジックの版、準拠している税制の基準日
- `totalInheritanceTaxJpy`: 配偶者控除などを反映した相続税額
- `totalTaxBeforeDeductionsJpy`: 控除前の相続税総額
- `basicDeductionJpy`: 基礎控除額
- `taxableEstateJpy`: 課税遺産総額
- `effectiveTaxRate`: 控除後の実効税率（`effectiveTaxRateBeforeDeductions` は控除前）
- `insuranceNonTaxableAmountJpy`: 実際に適用した死亡保険金の非課税額
- `insuranceTaxableDeathBenefitJpy`: 非課税枠適用後の課税対象死亡保険金
- `retirementNonTaxableAmountJpy` / `retirementTaxableDeathBenefitJpy`: 死亡退職金の同項目
- `divisibleEstateJpy`: 課税価格の合計額のうち、按分する部分（受取人へ帰属させた分を除いた額）
- `heirs`: 相続人ごとの取得額、控除額、最終税額（`deemedBenefitJpy` / `deemedNonTaxableJpy` / `deemedTaxableJpy` に、その人へ帰属させた死亡保険金・死亡退職金の内訳が入ります）

エラーは `{ "error": "..." }` の形で返します。

| ステータス | 場合 |
| --- | --- |
| 400 | 入力値が不正（`details` に Zod の検証結果）、または JSON の形式が不正 |
| 401 | APIキーが一致しない |
| 404 | 存在しない API パス |
| 500 | 計算できなかった |

リクエスト本文は 64KB まで、応答は `Cache-Control: no-store` です。

環境変数 `INHERITANCE_TAX_API_KEY` を設定すると、`Authorization: Bearer <APIキー>` が必須になります。未設定のローカル開発環境では認証なしで利用できます。

## ライセンス

(C) 2026 税理士法人マスエージェント
