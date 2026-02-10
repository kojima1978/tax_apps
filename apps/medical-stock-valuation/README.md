# 出資持分の評価額試算ツール (Next.js版)

医療法人の出資持分の評価額の概算を知りたい方向けのツールです。

## 主な機能

### 評価額計算
- **STEP0**: 会社名・担当者・事業年度の選択
- **STEP1**: 医療法人の規模を判定するためのデータを選択
- **STEP2**: 決算書より医療法人の財務データを入力
- **STEP3**: 出資者名簿より出資者情報を入力
- **計算結果**: 出資持分評価額・みなし贈与税額の表示

### マスタデータ管理
- **会社マスタ設定**: 会社情報の登録・編集・論理削除
- **担当者マスタ設定**: 担当者情報の登録・編集・論理削除
- **類似業種データ設定**: 類似業種比準方式の基準値管理
  - 年度別のデータ登録・編集・無効化・削除
  - データ未登録年度は令和6年度（2024）のデータを自動使用
  - データ登録状況の表示（基本情報入力画面で確認可能）

### データ管理機能
- **保存データ一覧**: 過去の評価計算の閲覧・読込・削除
- **新規保存/上書保存**: データの保存方法を選択可能
- **論理削除**: マスタデータの無効化機能（データの整合性維持）
- **検索・絞り込み**: 各種データの検索とフィルタリング
- **データクリア**: 入力中のデータをクリア

## セットアップ

### 依存パッケージのインストール

```bash
npm install
```

### データベースの初期化

アプリケーション起動時に自動的に `data/doctor.db` が作成され、テーブルが初期化されます。

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。（Docker使用時は後述のポートになります）

## ビルド

### 本番ビルド

```bash
npm run build
npm start
```

### Dockerでの実行（スタンドアロン）

```bash
# 開発環境（ホットリロード付き）
docker compose up -d

# 再ビルド
docker compose up -d --build

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

ブラウザで http://localhost:3010 にアクセスします。

> **Note**: 中央統合環境（docker/docker-compose.yml）で起動する場合は、Nginx Gateway 経由で http://localhost/medical/ からアクセスできます。

## データベース

### スキーマ

- **companies**: 会社マスタ（論理削除対応）
- **users**: 担当者マスタ（論理削除対応）
- **valuations**: 評価レコード
- **financial_data**: 財務データ
- **investors**: 出資者情報
- **similar_industry_data**: 類似業種データマスタ（論理削除対応）

詳細は [ER_DIAGRAM.md](ER_DIAGRAM.md) を参照してください。

### マイグレーション

データベーススキーマの変更が必要な場合は、`scripts/` ディレクトリにマイグレーションスクリプトを作成します。

例:
```bash
npx tsx scripts/migration-script-name.ts
```

**注**: 論理削除機能のマイグレーション（is_active カラム追加）は既に完了しています。

#### 既存データベースへの is_active カラム追加

既存のデータベースを使用している場合は、以下のマイグレーションを実行してください:

```bash
npx tsx scripts/add-is-active-to-similar-industry.ts
```

このマイグレーションにより、`similar_industry_data` テーブルに `is_active` カラムが追加されます。

## 技術スタック

- **Next.js 16.1.1** - Reactフレームワーク (App Router, Turbopack)
- **React 19.0.0** - UIライブラリ
- **TypeScript 5** - 型安全性
- **Tailwind CSS 3.4** - スタイリング
- **SQLite** - データベース (better-sqlite3 12.5)
- **Lucide React** - アイコンライブラリ

## プロジェクト構造

```
doctor-nextjs/
├── app/                                    # Next.js App Router
│   ├── page.tsx                            # ホーム画面（評価データ入力）
│   ├── results/page.tsx                    # 計算結果表示
│   ├── saved-data/page.tsx                 # 保存データ一覧
│   ├── company-settings/page.tsx           # 会社マスタ設定
│   ├── user-settings/page.tsx              # 担当者マスタ設定
│   ├── similar-industry-settings/page.tsx  # 類似業種データ設定
│   ├── gift-tax-table/page.tsx             # 贈与税速算表
│   ├── api/                                # APIルート
│   │   ├── companies/route.ts              # 会社CRUD API
│   │   ├── users/route.ts                  # 担当者CRUD API
│   │   ├── valuations/route.ts             # 評価レコードAPI
│   │   └── similar-industry/route.ts       # 類似業種データAPI
│   ├── layout.tsx                          # ルートレイアウト
│   └── globals.css                         # グローバルスタイル
├── components/
│   ├── Header.tsx                          # ヘッダーコンポーネント
│   ├── Modal.tsx                           # モーダルダイアログ
│   └── valuation/                          # 評価入力コンポーネント
│       ├── Step0BasicInfo.tsx              # 基本情報入力
│       ├── Step1CompanySize.tsx            # 会社規模判定
│       ├── Step2FinancialData.tsx          # 財務データ入力
│       └── Step3Investors.tsx              # 出資者情報入力
├── hooks/
│   └── useSaveValuation.ts                 # 保存機能カスタムフック
├── lib/
│   ├── db.ts                               # データベース初期化
│   ├── db-types.ts                         # データベース型定義
│   ├── types.ts                            # アプリケーション型定義
│   ├── calculations.ts                     # 評価額計算ロジック
│   ├── button-styles.ts                    # ボタンスタイル定義
│   ├── form-utils.ts                       # フォームユーティリティ
│   ├── record-actions.ts                   # レコード操作共通処理
│   ├── api-utils.ts                        # API共通処理
│   ├── date-utils.ts                       # 日付変換ユーティリティ
│   └── utils.ts                            # 汎用ユーティリティ
├── data/
│   └── doctor.db                           # SQLiteデータベース
├── ER_DIAGRAM.md                           # データベースER図
├── Dockerfile                              # Docker設定
├── docker compose.yml                      # Docker Compose設定
└── package.json
```

## 主要な機能アップデート

### 類似業種データのフォールバック機能

年度別の類似業種データが未登録の場合、令和6年度（2024年度）のデータが自動的に使用されます。

- **メリット**: データ未登録の年度でも評価計算が可能
- **表示**: 基本情報入力画面で「⚠ データ未登録」と表示され、登録状況を確認可能
- **デフォルト値**:
  - 1株当たりの利益金額: 51
  - 1株当たりの純資産価額: 395
  - 課税時期の属する年の平均株価: 532

### 論理削除機能

マスタデータ（会社・担当者・類似業種データ）は論理削除に対応:

- **無効化**: データを非表示にするが、データベースには保持
- **削除**: 無効化されたデータのみ物理削除可能（データ整合性を保護）
- **有効化**: 無効化したデータを再度有効にすることが可能

## トラブルシューティング

### データベースエラー: no such column: is_active

既存のデータベースを使用している場合、以下のマイグレーションを実行してください:

```bash
npx tsx scripts/add-is-active-to-similar-industry.ts
```

### Dockerコンテナでアプリケーションが落ちた場合

#### 1. ログの確認
```bash
# コンテナのログを確認
docker compose logs

# リアルタイムでログを監視
docker compose logs -f
```

#### 2. アプリケーションへのアクセス
- **スタンドアロン**: [http://localhost:3010](http://localhost:3010)
- **Gateway経由**: [http://localhost/medical/](http://localhost/medical/)

#### 3. コンテナの再起動
```bash
# コンテナを停止して再起動
docker compose down
docker compose up -d

# または強制的に再ビルド
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 4. コンテナの状態確認
```bash
# 実行中のコンテナを確認
docker ps -a

# 特定のコンテナに入ってデバッグ
docker exec -it medical-stock-valuation-standalone sh

# コンテナ内でファイルを確認
docker exec -it medical-stock-valuation-standalone ls -la /app
```

#### 5. データベースの問題確認
```bash
# データベースファイルの存在確認
docker exec -it medical-stock-valuation-standalone ls -la /app/data

# データベースの権限確認
docker exec -it medical-stock-valuation-standalone ls -l /app/data/doctor.db
```

#### 6. ボリュームのクリーンアップ（注意：データが消えます）
```bash
# すべてのコンテナとボリュームを削除
docker compose down -v

# ボリュームを再作成して起動
docker compose up -d
```

#### 7. よくある問題

**ポートが既に使用されている**
```bash
# Windowsでポートを確認
netstat -ano | findstr :3010
```

**本番環境の自動再起動**
本番環境では `restart: unless-stopped` が設定されているため、コンテナが落ちても自動的に再起動されます。

## 注意事項

※ 正確な評価額を算出するには、税理士等の専門家へご相談ください。
