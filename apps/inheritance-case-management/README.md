# 相続税申告案件管理

[データベースER図](ER_DIAGRAM.md)

相続税申告案件の一覧、詳細、進捗、売上、紹介者、相続人/関係者、帳票、経営分析を管理する Next.js アプリです。

Docker 開発環境では `http://localhost:3020/itcm/` で起動します。

## 主な画面

| 画面 | パス | 概要 |
| --- | --- | --- |
| 案件一覧 | `/itcm/` | 案件検索、フィルター、KPI、売上合計、案件詳細への編集導線、CSV取込/出力 |
| 新規案件 | `/itcm/new` | 相続税申告案件の新規登録 |
| 案件詳細 | `/itcm/[id]` | 基本情報、進捗、報酬/見積、立替金、相続人/関係者、帳票出力、監査ログ |
| 経営分析 | `/itcm/analytics` | 売上、入金日基準の年計表、部門・担当者、紹介者分析 |
| 設定 | `/itcm/settings` | マスタ管理、バックアップ/リストア |
| 担当者設定 | `/itcm/settings/staff` | 部署、担当者、社内紹介者に使う担当者マスタ |
| 紹介者設定 | `/itcm/settings/referral-sources` | 会社、支店、社外紹介者マスタ |
| 相続人マスタ | `/itcm/settings/heir-persons` | 案件に紐づく相続人の人物マスタ |
| 関係者マスタ | `/itcm/settings/related-party-persons` | 税理士、司法書士、不動産業者など外部関係者の人物マスタ |
| バックアップ | `/itcm/settings/backup` | JSONバックアップ、リストア |

## 主な機能

### 案件一覧

- 年度、案件ステータス、部門、担当者、社内紹介者、紹介会社、キーワードで絞り込み
- フィルター状態を URL クエリへ同期し、ブラウザバックや URL 共有に対応
- KPI カード表示
  - 案件総数
  - 進行中
  - 期限間近
  - 完了
  - 当月追加
  - 当月完了
- `期限間近`、`当月追加`、`当月完了` の KPI クリックによるクイック絞り込み
- 売上合計バー
  - 報酬額がある案件は報酬額
  - 報酬額がない案件は見積額
  - 一覧上は紹介料控除前の金額を表示
- 画面幅に収まるコンパクトなレスポンシブ表、ページネーション、ソート、行番号表示
- 申告期限・残り日数・相続開始日、案件ステータス進捗、担当、売上、特記事項（最大10文字）を一覧表示
- 案件詳細へは各行の左端にある編集アイコンから遷移
- 一覧上の数値、進捗、特記事項は参照専用
- 条件に一致する案件の一括削除

### 案件詳細

- 基本情報、進捗、報酬/見積、立替金、相続人/関係者、メモをセクションごとに編集
- 未保存変更の検知と離脱確認
- 統合案件ステータス（見積前、見積中、見送り、受託、手続中、最終確認、申告済、請求済、入金済）を管理
- 受託日に基づく当月追加集計
- 申告完了日に基づく当月完了集計
- 申告完了日が入力され、確定ベースの報酬額が未入力の場合は財務セクションを開いて入力を促す
- ステータスに応じて受託日、申告完了日、請求日、入金日の未入力値を自動設定
- マイルストン日付を手動修正した場合は、その入力値を保存時にも保持
- 申告期限を相続開始日から 10 か月で自動計算
- 日付表示は和暦併記に対応
- 楽観ロックにより同時編集の競合を検知
- 監査ログで案件の作成、更新、削除履歴を確認

### 進捗管理

- 標準工程をタイムライン UI で管理
  - 遺産分割協議完了
  - 税務申告完了
  - 請求書発送完了
  - 入金確認完了
- 工程ごとに完了日とメモを入力
- 訪問日などの動的工程を追加、削除、並べ替え
- 複数工程に今日の日付を一括設定
- 進捗日付とステータスの整合性を保存時にチェック
- 進捗に応じたステータス変更を提案

### 報酬・見積・売上

- 見積額、報酬額、相続税額、遺産総額、紹介料率、紹介料額をコンパクトな入力欄で管理
- 立替金を日付、内容、金額、メモのコンパクトな行形式で管理
- 見積ベースと確定ベースの紹介料、手取りを別々に表示
- 紹介料額は率から自動計算し、必要な場合は手動上書き可能。自動・手動の状態をDBに保持
- 報酬計算パラメータ
  - 土地数（路線価）
  - 土地数（倍率）
  - 非上場株式数
  - 報酬計算上の相続人数（案件に紐付けた相続人数とは独立）
  - 特別業務報酬額（内容・金額を案件ごとに最大 2 行）
  - 値引額
- 概算報酬を `小計 + 特別業務報酬額合計 - 値引額` で計算し、見積額または報酬額へ明示的に反映
- 特別業務報酬額は `CaseSpecialAddition` として正規化して保存
- 経営分析の見込売上は `受託`、`手続中`、`最終確認`、`申告済` の見積額を集計
- 経営分析の確定売上は `請求済`、`入金済` の確定報酬額を集計
- 社外紹介料は会社売上から控除し、社内紹介料は会社売上から控除しない
- 担当者別の個人集計では紹介料を控除した担当分と、社内紹介分を分けて表示

### 経営分析

- 売上（確定＋見積）、確定売上、見込売上、件数、紹介料内訳を表示
- 年度別業績とステータス内訳を表示
- 年計表の基準月をユーザーが選択可能（前月、翌月、当月への移動に対応）
- 基準月を含む過去24か月の月間売上・件数と、各月時点の直近12か月累計を表示
- 年計表は `入金済` かつ入金日入力済みの案件を、`paidDate`（入金日）の月で集計
- データがない月も0円・0件で表示
- 年計表の月をクリックすると、入金日と入金済ステータスで案件一覧を絞り込み
- 部門・担当者タブ
  - 部門ごとの小計
  - 担当者ごとの担当分、社内紹介分
  - 見出しに売上合計を表示
  - 担当者クリックで案件一覧へ遷移
- 紹介者タブ
  - 紹介会社ごとの紹介料合計
  - 会社内の支店小計
  - 見出しに紹介料合計を表示
  - 会社クリックで案件一覧へ遷移
- 年度ピルで単年度、複数年度、全期間を切り替え

### マスタ管理

- 部署
- 担当者
- 会社
- 会社支店
- 社外紹介者
- 相続人マスタ
- 関係者マスタ
- 会社マージ
- 有効/無効によるソフト削除

### 相続人・関係者管理

- 案件ごとに相続人マスタ、関係者マスタから人物を紐付け
- 既存人物の検索、選択
- 新規人物のインライン作成
- 郵便番号から住所を自動補完
- 相続人は続柄、案件固有メモを `CaseHeir` に保持
- 関係者は案件固有メモを `CaseRelatedParty` に保持
- 相続人と関係者の人物入力フォームは共通部品を使い、氏名、電話番号、住所、メモの入力挙動を揃える
- 相続人と関係者は役割固有項目と管理画面が異なるため別マスタを維持し、同一マスタ内の案件紐付けは中間テーブルで管理

### CSV・Excel

- 案件 CSV エクスポート
- 案件 CSV インポート
- 未登録マスタの自動作成
- 同一 CSV 内の重複チェック
- 既存案件の自動更新判定
- Shift-JIS / CP932 フォールバック
- 見積書、請求書、請求書発行依頼票の Excel 出力
- 案件詳細の立替金を Excel 出力
  - A-C 列は 100px 相当、D 列は 200px 相当
  - 1 行目と 2 行目の間、合計行の上に A-D 列まで横罫線を出力
- テンプレートは `templates/` から読み込み、Docker では `/app/templates` に読み取り専用マウント
- `estimate_template.xlsx` への主な転記セル:
  - 土地数（路線価）: `K27`
  - 土地数（倍率）: `K28`
  - 非上場株式数: `K30`
  - 報酬計算上の相続人数: `J32`
  - 特別業務報酬額の内容: `B35`, `B36`（半角スペース 4 つで字下げ、MS 明朝 9pt 太字）
  - 特別業務報酬額の金額: `M35`, `M36`
  - 値引額: `M38`（マイナス値で転記。`M37` はテンプレート側の関数を保持するため上書きしない）
  - 差引額（税抜）: `M39`（テンプレート側の数式を保持するため上書きしない）
  - 立替金合計: `M42`（請求書のみ。見積書では上書きしない）
- 請求書出力時は `B42` を ` ４．立替金費用（戸籍謄本・不動産登記事項閲覧・残高証明書発行手数料等）` に置き換え、MS 明朝 10pt 太字に設定
- 見積書は案件詳細の「見積書」欄の数字、請求書と請求書発行依頼票は「請求書」欄の数字を基準に出力
- 立替金は請求書と請求書発行依頼票にのみ転記

### バックアップ・リストア

- JSON 形式で全主要テーブルをバックアップ
- BOM 付き UTF-8 で出力
- リストア前プレビュー
- トランザクション内で全削除、再挿入、シーケンスリセット
- 古いバックアップ形式への互換対応

## 技術スタック

| 分類 | 内容 |
| --- | --- |
| フレームワーク | Next.js 16.1.1 |
| UI | React 19.2.3, Tailwind CSS v4 |
| 言語 | TypeScript 5.9.3 |
| API | Next.js API Routes |
| DB | PostgreSQL 16 |
| ORM | Prisma 6.19.2 |
| バリデーション | Zod 3.24 |
| データ取得 | TanStack Query 5 |
| テーブル | TanStack Table 8 |
| DnD | dnd-kit |
| グラフ | Recharts |
| Excel | exceljs, xlsx-js-style |
| PDF | @react-pdf/renderer |
| アイコン | lucide-react |
| 実行環境 | Docker, Docker Compose |

## ディレクトリ構成

```text
inheritance-case-management/
├── ER_DIAGRAM.md                    # Prismaスキーマに対応するER図
├── docker-compose.yml
├── docker-compose.prod.yml
├── templates/                       # 帳票テンプレート
└── web/
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── src/
        ├── app/                     # Next.js App Router
        │   ├── page.tsx             # 案件一覧
        │   ├── new/                 # 新規登録
        │   ├── [id]/                # 案件詳細
        │   ├── analytics/           # 経営分析
        │   ├── settings/            # 設定
        │   └── api/                 # API Routes
        ├── components/              # UI、一覧、CSV取込など
        ├── hooks/                   # React hooks
        ├── lib/                     # APIクライアント、サービス、集計、CSV/Excel
        └── types/                   # 型、定数、バリデーション
```

### 案件詳細画面の主な分割

`web/src/app/[id]/` は、案件編集フォーム本体を薄く保つため、入力領域ごとに責務を分けています。

| ファイル | 役割 |
| --- | --- |
| `edit-case-form.tsx` | 案件編集画面の組み立て、保存、未保存変更、帳票モーダル |
| `edit-case-form-utils.ts` | API payload 変換、派生値計算、保存前チェック補助 |
| `use-edit-case-masters.ts` | 担当者、紹介元、相続人、関係者マスタの取得 |
| `FinancialSection.tsx` | 金額情報セクションの枠 |
| `FinancialEstimatePanel.tsx` | 報酬計算、特別業務報酬額、見積額/報酬額への反映 |
| `FinancialRevenuePanel.tsx` | 紹介料率、見積書/請求書別の紹介料と手取り |
| `FeeSnapshotDisplay.tsx` | 前回計算根拠の表示 |
| `ProgressEditor.tsx` | 進捗管理の組み立て |
| `ProgressStatusSummary.tsx` | 進み具合、受託、対応状況、関連日付 |
| `SortableProgressStep.tsx` | 並べ替え可能な工程行 |
| `CasePersonForm.tsx` | 相続人/関係者で共通の人物入力フォーム |
| `HeirListEditor.tsx`, `RelatedPartyListEditor.tsx` | 案件内の相続人/関係者の紐付け編集 |

## Docker 開発

### 単体起動

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-case-management
docker compose up -d
```

アクセス:

```text
http://localhost:3020/itcm/
```

PostgreSQL:

```text
localhost:3022
```

事前に共有ネットワークが必要です。

```bash
docker network create tax-apps-network
```

すでに存在する場合、このコマンドは不要です。

### 統合管理スクリプト

`tax_apps/docker/scripts/manage.bat` または `manage.sh` から操作できます。

```bash
cd C:\Users\sashi\Desktop\dev\tax_apps
docker\scripts\manage.bat build inheritance-case-management
docker\scripts\manage.bat restart inheritance-case-management
docker\scripts\manage.bat logs inheritance-case-management
```

Git Bash 経由:

```bash
"C:\Program Files\Git\bin\bash.exe" "C:\Users\sashi\Desktop\dev\tax_apps\docker\scripts\manage.sh" build inheritance-case-management
```

Gateway 経由で起動している場合:

```text
http://localhost/itcm/
```

## よく使う Docker コマンド

```bash
# 起動
docker compose up -d

# 再ビルド
docker compose up -d --build

# ログ
docker compose logs -f itcm-web

# 停止
docker compose down

# DBボリュームも含めて削除
docker compose down -v

# Webコンテナに入る
docker exec -it itcm-frontend sh

# Prisma migrate deploy
docker exec -it itcm-frontend npx prisma migrate deploy

# Prisma Studio
docker exec -it itcm-frontend npx prisma studio
```

## 変更反映の目安

| 変更内容 | 開発モード |
| --- | --- |
| `web/src/` | コンテナ内 Next.js が反映 |
| `web/public/` | コンテナ内 Next.js が反映 |
| `web/prisma/` | マイグレーションまたは Prisma generate が必要 |
| `templates/` | コンテナへ読み取り専用マウント |
| `web/package.json` | 再ビルド |
| `Dockerfile`, `docker-compose.yml` | 再ビルド |

## 品質チェック

Dockerの一時コンテナで型チェックとlintを実行します。通常の開発コンテナはメモリ制限があるため、検査時だけNode.jsのヒープ上限を拡張します。

```bash
docker compose run --rm --no-deps -e NODE_OPTIONS=--max-old-space-size=2048 itcm-web npm run typecheck
docker compose run --rm --no-deps -e NODE_OPTIONS=--max-old-space-size=2048 itcm-web npm run lint
docker compose run --rm --no-deps itcm-web npx prisma validate
docker compose run --rm --no-deps itcm-web npm run db:verify-normalization
```

## Prisma 運用ルール

スキーマ変更は必ずマイグレーションファイル経由で行います。`prisma db push` は使いません。

```bash
# 1. web/prisma/schema.prisma を変更
# 2. コンテナ内でマイグレーション生成
docker exec -it itcm-frontend npx prisma migrate dev --name <change-name>

# 3. 生成されたSQLを確認
# 4. migration ファイルをコミット
```

禁止事項:

| 操作 | 理由 |
| --- | --- |
| `prisma db push` | マイグレーション履歴に残らず、他環境で不整合が起きる |
| 適用済み migration の削除 | 本番/共有環境の履歴と合わなくなる |
| 生成後 migration SQL の不用意な手編集 | checksum 不一致の原因になる |

## 主要 API

| API | 概要 |
| --- | --- |
| `GET /itcm/api/health` | ヘルスチェック |
| `/itcm/api/cases` | 案件一覧、作成 |
| `/itcm/api/cases/[id]` | 案件詳細、更新、削除 |
| `/itcm/api/cases/bulk-upsert` | CSV取込用の一括作成/更新 |
| `/itcm/api/cases/bulk-delete` | フィルター条件に一致する案件の一括削除 |
| `/itcm/api/assignees` | 担当者 |
| `/itcm/api/departments` | 部署 |
| `/itcm/api/companies` | 会社 |
| `/itcm/api/company-branches` | 会社支店 |
| `/itcm/api/referrers` | 社外紹介者 |
| `/itcm/api/heir-persons` | 相続人マスタ |
| `/itcm/api/related-party-persons` | 関係者マスタ |
| `/itcm/api/backup` | JSONバックアップ |
| `/itcm/api/backup/restore` | JSONリストア |
| `/itcm/api/templates/generate` | 帳票生成 |

## データモデル概要

| モデル | 役割 |
| --- | --- |
| `InheritanceCase` | 案件本体 |
| `CaseProgress` | 案件の進捗工程 |
| `CaseExpense` | 立替金 |
| `CaseSpecialAddition` | 特別業務報酬額 |
| `CaseHeir` | 案件と相続人マスタの紐付け |
| `CaseRelatedParty` | 案件と関係者マスタの紐付け |
| `HeirPerson` | 相続人マスタ |
| `RelatedPartyPerson` | 関係者マスタ |
| `Assignee` | 担当者、社内紹介者 |
| `Department` | 担当者の部署 |
| `Company` | 紹介会社 |
| `CompanyBranch` | 紹介会社の部門 |
| `Referrer` | 社外紹介者 |
| `AuditLog` | 監査ログ |

詳細な属性、カーディナリティ、削除ルールは [データベースER図](ER_DIAGRAM.md) を参照してください。

正規化上の方針:

- `feeCalculationHeirCount`は報酬計算用の業務値として、実際の`CaseHeir`件数と明確に分離
- 紹介料金額は非NULLとし、自動計算値と手動上書きをフラグで区別
- 案件ステータスと受託日・申告日・請求日・入金日の対応をDB制約とAPI保存処理の両方で保証
- `HeirPerson`と`RelatedPartyPerson`は役割固有項目を持つため、意図的に別マスタとして管理

主な関連:

- `InheritanceCase.assigneeId` -> `Assignee`
- `InheritanceCase.internalReferrerId` -> `Assignee`
- `InheritanceCase.referrerId` -> `Referrer`
- `Assignee.departmentId` -> `Department`
- `Referrer.companyId` -> `Company`
- `Referrer.branchId` -> `CompanyBranch`
- `CaseHeir.personId` -> `HeirPerson`
- `CaseRelatedParty.personId` -> `RelatedPartyPerson`
- `CaseExpense.caseId` -> `InheritanceCase`
- `CaseSpecialAddition.caseId` -> `InheritanceCase`

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `web/src/app/[id]/edit-case-form.tsx` | 案件編集画面の組み立て |
| `web/src/app/[id]/edit-case-form-utils.ts` | 案件編集の payload 変換、派生値、保存前チェック |
| `web/src/app/[id]/Financial*.tsx` | 金額情報、報酬計算、紹介料/売上表示 |
| `web/src/app/[id]/Progress*.tsx` | 進捗ステータス、工程タイムライン、並べ替え |
| `web/src/lib/services/case-service.ts` | 案件取得、更新、検索条件構築 |
| `web/src/lib/analytics/` | 経営分析の計算、集計 |
| `web/src/lib/import/` | CSV取込、検証、マスタ解決 |
| `web/src/lib/export-csv.ts` | CSV出力 |
| `web/src/lib/services/template-service.ts` | Excel帳票生成 |
| `web/src/lib/services/backup-service.ts` | バックアップ、リストア |
| `web/src/types/constants.ts` | ステータス、フィルター、選択肢定義 |
| `web/src/types/validation.ts` | Zodスキーマ |
| `web/prisma/schema.prisma` | DBスキーマ |
| `ER_DIAGRAM.md` | Prismaスキーマに対応するER図、関連、削除ルール |

## ライセンス

(C) 2026 税理士法人マスエージェント
