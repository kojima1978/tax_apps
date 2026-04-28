# 相続税申告案件管理

相続税申告案件の一覧、詳細、進捗、売上、紹介者、連絡先、帳票、経営分析を管理する Next.js アプリです。

Docker 開発環境では `http://localhost:3020/itcm/` で起動します。

## 主な画面

| 画面 | パス | 概要 |
| --- | --- | --- |
| 案件一覧 | `/itcm/` | 案件検索、フィルター、KPI、売上合計、一括削除、CSV取込/出力 |
| 新規案件 | `/itcm/new` | 相続税申告案件の新規登録 |
| 案件詳細 | `/itcm/[id]` | 基本情報、進捗、報酬/見積、立替金、連絡先、帳票出力、監査ログ |
| 経営分析 | `/itcm/analytics` | 売上、年計表、部門・担当者、紹介者分析 |
| 設定 | `/itcm/settings` | マスタ管理、バックアップ/リストア |
| 担当者設定 | `/itcm/settings/staff` | 部署、担当者、社内紹介者に使う担当者マスタ |
| 紹介者設定 | `/itcm/settings/referral-sources` | 会社、部門、社外紹介者マスタ |
| 人物設定 | `/itcm/settings/persons` | 連絡先として使う人物マスタ |
| バックアップ | `/itcm/settings/backup` | JSONバックアップ、リストア |

## 主な機能

### 案件一覧

- 年度、進み具合、対応状況、受託状況、部門、担当者、社内紹介者、紹介会社、キーワードで絞り込み
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
- ページネーション、ソート、行番号表示
- 特記事項のインライン編集
- 進捗モーダルによる日付の簡易編集
- 条件に一致する案件の一括削除

### 案件詳細

- 基本情報、進捗、報酬/見積、立替金、連絡先、メモをセクションごとに編集
- 未保存変更の検知と離脱確認
- 受託日に基づく当月追加集計
- 申告完了日に基づく当月完了集計
- 申告完了日が入力され、確定ベースの報酬額が未入力の場合は財務セクションを開いて入力を促す
- 進み具合や対応状況の完了系ステータスに応じて申告完了日を自動設定
- 申告期限を相続開始日から 10 か月で自動計算
- 日付表示は和暦併記に対応
- 楽観ロックにより同時編集の競合を検知
- 監査ログで案件の作成、更新、削除履歴を確認

### 進捗管理

- 標準工程をタイムライン UI で管理
- 工程ごとに完了日とメモを入力
- 訪問日などの動的工程を追加、削除、並べ替え
- 複数工程に今日の日付を一括設定
- 進捗日付とステータスの整合性を保存時にチェック
- 進捗に応じたステータス変更を提案

### 報酬・見積・売上

- 見積額、報酬額、相続税額、遺産総額、紹介料率、紹介料額を管理
- 見積ベースと確定ベースの紹介料、手取りを別々に表示
- 報酬計算パラメータ
  - 土地数（路線価）
  - 土地数（倍率）
  - 非上場株式数
  - 相続人数
  - 特別業務報酬額（内容・金額を案件ごとに最大 2 行）
  - 値引額
- 概算報酬を `小計 + 特別業務報酬額合計 - 値引額` で計算し、見積額または報酬額へ明示的に反映
- 特別業務報酬額は `CaseSpecialAddition` として正規化して保存
- 経営分析では完了案件で報酬額が未入力の場合、見積額を見込売上として扱う
- 社外紹介料は会社売上から控除し、社内紹介料は会社売上から控除しない
- 担当者別の個人集計では紹介料を控除した担当分と、社内紹介分を分けて表示

### 経営分析

- 売上（確定＋見積）、確定売上、見込売上、件数、紹介料内訳を表示
- 年度別業績とステータス内訳を表示
- 年計表で直近 12 か月累計の売上、件数を可視化
- 部門・担当者タブ
  - 部門ごとの小計
  - 担当者ごとの担当分、社内紹介分
  - 見出しに売上合計を表示
  - 担当者クリックで案件一覧へ遷移
- 紹介者タブ
  - 紹介会社ごとの紹介料合計
  - 会社内の部門小計
  - 見出しに紹介料合計を表示
  - 会社クリックで案件一覧へ遷移
- 年度ピルで単年度、複数年度、全期間を切り替え

### マスタ管理

- 部署
- 担当者
- 会社
- 会社部門
- 社外紹介者
- 人物
- 会社マージ
- 有効/無効によるソフト削除

### 連絡先管理

- 案件ごとに人物マスタから連絡先を紐付け
- 既存人物の検索、選択
- 新規人物のインライン作成
- 郵便番号から住所を自動補完
- 案件固有メモを `CaseContact` に保持

### CSV・Excel

- 案件 CSV エクスポート
- 案件 CSV インポート
- 未登録マスタの自動作成
- 同一 CSV 内の重複チェック
- 既存案件の自動更新判定
- Shift-JIS / CP932 フォールバック
- 見積書、請求書、請求書発行依頼票の Excel 出力
- テンプレートは `templates/` から読み込み、Docker では `/app/templates` に読み取り専用マウント
- `estimate_template.xlsx` への主な転記セル:
  - 土地数（路線価）: `K27`
  - 土地数（倍率）: `K28`
  - 非上場株式数: `K30`
  - 相続人数: `J32`
  - 特別業務報酬額の内容: `B35`, `B36`（半角スペース 4 つで字下げ、MS 明朝 9pt 太字）
  - 特別業務報酬額の金額: `M35`, `M36`
  - 値引額: `M37`（マイナス値で転記）
  - 立替金合計: `M42`

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
| ORM | Prisma 6.2 |
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
docker compose logs -f web

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

## 型チェック

ローカルを汚さず Docker イメージ内で確認する例:

```bash
docker run --rm --entrypoint sh ^
  -v C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-case-management\web\src:/app/src:ro ^
  -v C:\Users\sashi\Desktop\dev\tax_apps\apps\inheritance-case-management\web\prisma:/app/prisma:ro ^
  -w /app inheritance-case-management-web ^
  -c "npx tsc --noEmit --incremental false"
```

PowerShell では行継続をバッククォートに置き換えてください。

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
| `/itcm/api/company-branches` | 会社部門 |
| `/itcm/api/referrers` | 社外紹介者 |
| `/itcm/api/persons` | 人物 |
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
| `CaseContact` | 案件と人物の紐付け |
| `Person` | 連絡先人物マスタ |
| `Assignee` | 担当者、社内紹介者 |
| `Department` | 担当者の部署 |
| `Company` | 紹介会社 |
| `CompanyBranch` | 紹介会社の部門 |
| `Referrer` | 社外紹介者 |
| `AuditLog` | 監査ログ |

主な関連:

- `InheritanceCase.assigneeId` -> `Assignee`
- `InheritanceCase.internalReferrerId` -> `Assignee`
- `InheritanceCase.referrerId` -> `Referrer`
- `Assignee.departmentId` -> `Department`
- `Referrer.companyId` -> `Company`
- `Referrer.branchId` -> `CompanyBranch`
- `CaseContact.personId` -> `Person`
- `CaseExpense.caseId` -> `InheritanceCase`
- `CaseSpecialAddition.caseId` -> `InheritanceCase`

## 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `web/src/lib/services/case-service.ts` | 案件取得、更新、検索条件構築 |
| `web/src/lib/analytics/` | 経営分析の計算、集計 |
| `web/src/lib/import/` | CSV取込、検証、マスタ解決 |
| `web/src/lib/export-csv.ts` | CSV出力 |
| `web/src/lib/services/template-service.ts` | Excel帳票生成 |
| `web/src/lib/services/backup-service.ts` | バックアップ、リストア |
| `web/src/types/constants.ts` | ステータス、フィルター、選択肢定義 |
| `web/src/types/validation.ts` | Zodスキーマ |
| `web/prisma/schema.prisma` | DBスキーマ |

## ライセンス

(C) 2026 税理士法人マスエージェント
