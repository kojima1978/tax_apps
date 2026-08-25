# 相続税シミュレーター

相続財産額や相続人構成をもとに、相続税額、二次相続、保険金、生前贈与、分割案、年次推移を検証するためのフロントエンドアプリです。

React + Vite で構成され、Docker 開発環境では `http://localhost:3004/inheritance-tax-app/` で起動します。

## 機能一覧

| 機能 | パス | 概要 |
| --- | --- | --- |
| 相続税計算 | `/` | 遺産総額、相続人、配偶者取得割合などから相続税を計算 |
| 1次2次比較 | `/comparison` | 配偶者取得割合ごとに一次相続と二次相続の合計税額を比較 |
| 保険金シミュレーション | `/insurance` | 死亡保険金の非課税枠を使った節税効果を検証 |
| 現金贈与シミュレーション | `/cash-gift` | 生前贈与による相続税、贈与税、納税後財産を比較 |
| 分割シミュレーション | `/split` | 相続人ごとの取得額を変動させ、税額変化を比較 |
| 年次推移 | `/timeline` | 年ごとの財産・税額推移を確認 |
| 早見表 | `/table` | 相続人構成別の税額早見表、加重平均税率を表示 |

## 主な共通機能

- 担当者名、電話番号をヘッダーから入力し、印刷用ヘッダーへ反映
- localStorage による担当者情報の保存
- 入力エラー時のエラーパネル表示と該当箇所へのスクロール
- 結果表示時の自動スクロールとフェードイン表示
- A4/A3 横向き印刷を想定した印刷スタイル
- 税額計算ロジックを `utils/` に集約し、各画面で再利用

## 技術スタック

| 分類 | 内容 |
| --- | --- |
| フレームワーク | React 19 |
| 言語 | TypeScript 5.9 |
| ビルド | Vite 7 |
| ルーティング | React Router DOM 7 |
| スタイル | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| アイコン | Lucide React |
| Lint | ESLint 9, typescript-eslint |
| 実行環境 | Docker Compose |

## ディレクトリ構成

```text
src/
├── App.tsx                         # ルーティング定義
├── main.tsx                        # エントリーポイント
├── index.css                       # Tailwind、共通UI、印刷スタイル
├── pages/                          # 各画面
│   ├── CalculatorPage.tsx
│   ├── ComparisonPage.tsx
│   ├── InsurancePage.tsx
│   ├── CashGiftPage.tsx
│   ├── SplitPage.tsx
│   ├── TimelinePage.tsx
│   └── TablePage.tsx
├── components/                     # 共通UIと機能別コンポーネント
│   ├── calculator/
│   ├── comparison/
│   ├── gift/
│   ├── heirs/
│   ├── insurance/
│   ├── split/
│   └── timeline/
├── constants/                      # 税率、基礎控除、注意文言など
├── contexts/                       # 担当者情報コンテキスト
├── hooks/                          # 入力、検証、スクロールなどの共通フック
├── types/                          # 型定義
└── utils/                          # 税額計算、贈与、保険、分割、年次推移計算
```

## Docker 開発

### 単体起動

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-tax-app
docker compose up -d
```

アクセス:

```text
http://localhost:3004/inheritance-tax-app/
```

事前に共有ネットワークが必要です。

```bash
docker network create tax-apps-network
```

すでに存在する場合、このコマンドは不要です。

### 再ビルド

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-tax-app
docker compose up -d --build
```

統合管理スクリプトを使う場合:

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps
docker\scripts\manage.bat build inheritance-tax-app
```

または Git Bash 経由:

```bash
"C:\Program Files\Git\bin\bash.exe" "C:\Users\sashi\Desktop\dev\tax_apps\docker\scripts\manage.sh" build inheritance-tax-app
```

### ログ確認

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-tax-app
docker compose logs -f
```

### 停止

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-tax-app
docker compose down
```

## 変更反映の目安

| 変更内容 | 開発モード |
| --- | --- |
| `src/` 配下のコード | Vite HMR で自動反映 |
| `index.html` | コンテナ再起動または再ビルド |
| `public/` 配下 | 再ビルド |
| `package.json`, `package-lock.json` | 再ビルド |
| `Dockerfile`, `docker-compose.yml` | 再ビルド |

## ローカル実行

Docker を使わずに確認する場合:

```bash
npm ci
npm run dev
```

ただし、このリポジトリでは Docker 開発を推奨します。

## ビルドと検証

```bash
npm run build
npm run lint
```

Docker 環境で検証する場合は、既存イメージまたは管理スクリプトを利用してください。

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `docker-compose.yml` | 開発用 Docker Compose 設定 |
| `docker-compose.prod.yml` | 本番用 override |
| `vite.config.ts` | Vite 設定、base path、chunk 設定 |
| `tailwind.config.cjs` | Tailwind CSS 設定 |
| `postcss.config.cjs` | PostCSS 設定 |
| `src/utils/taxCore.ts` | 相続税計算の共通コア |
| `src/constants/index.ts` | 税率、基礎控除などの定数 |

## 相続税計算API

外部アプリから相続財産額と家族構成を受け取り、画面と同じ計算ロジックで相続税額を返します。金額の入出力単位はすべて円です。計算ロジックは万円単位のため、入力金額は1万円単位で指定してください。

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

`selectedRank` は `none`、`rank1`（子）、`rank2`（直系尊属）、`rank3`（兄弟姉妹）のいずれかです。`spouseAcquisition` を省略した場合は法定相続分で計算します。配偶者取得割合を指定する場合は0〜100%にしてください。

`lifeInsurance` と `retirementAllowance` はどちらも省略できます。指定した場合、`estateValueJpy` に含まれる解約返戻金（解約手当金）を `surrenderValueJpy` で差し引き、死亡保険金・死亡退職金へ置き換えます。非課税枠「500万円 × 法定相続人数」は生命保険金と死亡退職金でそれぞれ別枠に適用し、法定相続人が受け取る契約だけを対象として受取額に比例配分します。

`recipient` は契約ごとに必須で、次の3種類です。

- `{ "kind": "spouse" }`: 配偶者（`familyComposition.hasSpouse` が `true` のときだけ指定できます）
- `{ "kind": "heir", "index": 0 }`: 配偶者を除く法定相続人。`index` は0始まりで、`familyComposition.heirCount` 未満である必要があります
- `{ "kind": "other" }`: 法定相続人以外（孫・甥姪・第三者など）

死亡保険金・死亡退職金は遺産分割の対象ではなく受取人固有の権利なので、非課税枠を控除した課税対象額を受取人の取得額へ直接加算し、残りの財産（`divisibleEstateJpy`）だけを法定相続分で按分します。相続税の総額は課税価格の合計額から決まるため受取人の指定では変わりませんが、各人の取得額が変わることで按分税額・2割加算・配偶者の税額軽減が変わり、納付税額は変動します。`{ "kind": "other" }` の分は課税価格には加算しますが受取人へは帰属させず、法定相続人だけで按分します（相続人以外の取得者としての税額計算は行いません）。

主なレスポンス項目:

- `totalInheritanceTaxJpy`: 配偶者控除などを反映した相続税額
- `totalTaxBeforeDeductionsJpy`: 控除前の相続税総額
- `basicDeductionJpy`: 基礎控除額
- `taxableEstateJpy`: 課税遺産総額
- `effectiveTaxRate`: 控除後の実効税率
- `insuranceNonTaxableAmountJpy`: 実際に適用した死亡保険金の非課税額
- `insuranceTaxableDeathBenefitJpy`: 非課税枠適用後の課税対象死亡保険金
- `retirementNonTaxableAmountJpy` / `retirementTaxableDeathBenefitJpy`: 死亡退職金の同項目
- `divisibleEstateJpy`: 課税価格の合計額のうち、法定相続分で按分する部分（受取人へ帰属させた分を除いた額）
- `heirs`: 相続人ごとの取得額、控除額、最終税額（`deemedBenefitJpy` / `deemedNonTaxableJpy` / `deemedTaxableJpy` に、その人へ帰属させた死亡保険金・死亡退職金の内訳が入ります）

環境変数 `INHERITANCE_TAX_API_KEY` を設定すると、`Authorization: Bearer <APIキー>` が必須になります。未設定のローカル開発環境では認証なしで利用できます。

## ライセンス

(C) 2026 税理士法人マスエージェント
