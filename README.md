# 税務業務アプリケーション統合環境

税務関連の各種業務アプリケーションを統合管理する開発環境です。

## システム構成

### インフラストラクチャ
- **Docker Compose**: 全サービスのコンテナ管理
- **Nginx**: リバースプロキシによるルーティング
- **ポート80**: 統一されたエントリーポイント

### アプリケーション一覧

| アプリ名 | パス | ゲートウェイURL (推奨) | コンテナポート | 技術スタック | 説明 |
|---------|------|----------------------|----------------|-------------|------|
| ポータル | `/` | http://localhost/ | 3000 | Next.js (Static) | ランチャーダッシュボード |
| 相続税計算 | `/inheritance-tax-app/` | http://localhost/inheritance-tax-app/ | 5173 | Vite/React | 相続税シミュレーション |
| 贈与税計算 | `/gift-tax-simulator/` | http://localhost/gift-tax-simulator/ | 3001 | Next.js | 贈与税シミュレーション |
| 贈与税申告書類案内 | `/gift-tax-docs/` | http://localhost/gift-tax-docs/ | 3002 | Next.js | 必要書類ガイド |
| 相続税申告書類案内 | `/inheritance-tax-docs/` | http://localhost/inheritance-tax-docs/ | 3003 | Next.js | 必要書類ガイド |
| 不動産取得税 | `/real-estate-tax/` | http://localhost/real-estate-tax/ | 3004 | Next.js | 不動産取得税計算 |
| 確定申告必要書類 | `/tax-docs/` | http://localhost/tax-docs/ | 3000/3001 | Next.js + Express | 確定申告書類管理 |
| 医療法人株式評価 | `/medical/` | http://localhost/medical/ | 3010 | Next.js | 医療法人の株式評価 |
| 非上場株式評価 | `/shares/` | http://localhost/shares/ | 3012 | Next.js | 非上場株式の評価 |
| 案件管理 | `/itcm/` | http://localhost/itcm/ | 3020/3021 | Next.js + Express | 相続税案件管理 |
| 銀行分析 | `/bank-analyzer/` | http://localhost/bank-analyzer/ | 8000 | Django | 預金移動分析 |

## ディレクトリ構造

```
tax_apps/
├── apps/                          # アプリケーション群
│   ├── portal/                    # ポータルランチャー
│   ├── inheritance-tax-app/       # 相続税計算
│   ├── gift-tax-simulator/        # 贈与税計算
│   ├── inheritance-tax-docs/      # 相続税申告書類案内
│   ├── gift-tax-docs/             # 贈与税申告書類案内
│   ├── Required-documents-for-tax-return/ # 確定申告必要書類
│   ├── medical-stock-valuation/   # 医療法人株式評価
│   ├── shares-valuation/          # 非上場株式評価
│   ├── inheritance-case-management/ # 案件管理
│   ├── bank-analyzer-django/      # 銀行分析 (Django)
│   └── real-estate-tax/           # 不動産取得税
├── docker/                        # Docker設定
│   ├── docker-compose.yml
│   └── .env.example               # 環境変数テンプレート
├── nginx/                         # Nginx設定
│   ├── nginx.conf
│   └── default.conf
├── .gitignore
└── README.md
```

## セットアップ

### 前提条件
- Docker / Docker Compose
- Node.js 22+（ローカル開発時）
  - ⚠️ Node.js 24はNext.js Turbopackと一部互換性問題が報告されていますが、バックエンド（Express/Prisma）では積極的に利用可能です。


### Docker起動

```bash
# 1. リポジトリをクローン
git clone https://github.com/kojima1978/tax_apps.git
cd tax_apps

# 2. 環境変数を設定
cd docker
cp .env.example .env
# .envファイルを編集してパスワードを設定

# 3. コンテナ起動
docker-compose up -d
```

ブラウザで http://localhost/ (ポート指定なし) にアクセスしてポータルを開きます。
> **注意**: 各アプリへはポータル経由またはゲートウェイURLでアクセスしてください。ポート番号(3000など)を指定して直接アクセスすると、アプリケーション間リンクや静的ファイルの読み込みが正常に動作しない場合があります。

### 個別アプリのローカル開発

```bash
cd apps/<アプリ名>
npm install
npm run dev
```

### アプリ個別のDocker起動

一部のアプリ（例: `inheritance-tax-docs`）は、独立した`docker-compose.yml`を持っています。全体を起動せず、単体でDocker環境にて動作確認したい場合に使用します。

```bash
cd apps/inheritance-tax-docs
docker-compose up -d
# http://localhost:3003/inheritance-tax-docs/ にアクセス
```

## 環境変数

### PostgreSQL（案件管理システム用）

`docker/.env`に以下を設定:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=inheritance_tax_db
```

### Bank Analyzer (Django)

`docker/.env` または `docker-compose.yml` で設定可能:

- `DJANGO_CSRF_TRUSTED_ORIGINS`: CSRF信頼オリジン (デフォルト: `http://localhost,http://127.0.0.1`)
- `DJANGO_SECRET_KEY`: 本番環境で必須（開発環境ではデフォルト値使用）

#### 主な機能

- **CSV/Excelインポート**: 銀行取引データの一括取り込み（文字コード自動判定）
- **取引分析**: 月別集計、カテゴリ別分析、グラフ表示
- **フィルター機能**: 日付範囲、銀行名、カテゴリ、キーワード、金額での絞り込み
- **取引追加/削除**: インポート後の手動編集（AJAX対応）
- **エクスポート**: CSV/JSON形式での出力（フィルター適用可）

## 技術スタック

- **フロントエンド**: Next.js 16+, React, Vite, Django Templates (Bootstrap 5)
- **バックエンド**: Express, FastAPI, Django
- **データベース**: SQLite (Prisma), PostgreSQL
- **スタイリング**: Tailwind CSS
- **アイコン**: lucide-react


## 開発ガイドライン

- 各アプリは独立して動作可能
- 共通のNginxゲートウェイ経由でアクセス
- 環境変数は各アプリの`.env`ファイルで管理
- データベースファイル（*.db）はgit管理外
- `.env`ファイルはgit管理外（`.env.example`を参照）

## トラブルシューティング

### 502 Bad Gateway エラー

Nginxが502エラーを返す場合、バックエンドアプリが起動していない可能性があります。

```bash
# コンテナの状態を確認
docker ps

# portal_appのログを確認
docker logs portal_app

# bank-analyzerのログを確認 (502エラー時)
docker logs bank-analyzer

# コンテナを再起動
docker-compose -f docker/docker-compose.yml restart portal-app bank-analyzer gateway
```

### Windows Docker でのファイル監視問題

Windowsでボリュームマウントを使用する場合、ファイル変更の検出に問題が発生することがあります。
現在は `docker-compose.yml` にて全てのNode.jsサービスに対し `WATCHPACK_POLLING=true` が設定されているため、追加の手順は不要です。

### CSSや画像が 404エラーになる場合 (スタイル崩れ)

特定のアプリ（`inheritance-tax-docs`など）でスタイルシートが読み込まれない場合、Nginxの静的ファイルキャッシュ設定が干渉している可能性があります。
`docker-compose.yml` でNginx設定ファイルが正しくボリュームマウントされているか確認してください。

```yaml
gateway:
  volumes:
    - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ../nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
```

### Next.js Turbopack のクラッシュ

Next.js 16のTurbopackがコンパイル時にクラッシュする場合:
1. Dockerfileで**Node.js 22**を使用していることを確認（Node.js 24は非推奨）
2. `.next`ディレクトリをボリュームとして分離:
   ```yaml
   volumes:
     - /app/.next
   ```

## ライセンス

Private
