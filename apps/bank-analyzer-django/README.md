# Bank Analyzer (Django Version)

相続税申告における通帳分析を支援するWebアプリケーションです。

## 特徴

- **案件管理**: 複数の相続案件を個別に管理
- **CSVインポート**: 銀行のCSV/Excelデータを自動エンコーディング検出で取り込み
  - UTF-8, CP932, Shift_JIS 対応
  - 和暦日付（H28.6.3など）の自動変換
  - 残高整合性チェック機能
  - 複数ファイル一括インポートウィザード
- **自動分析**:
  - 資金移動の自動検出（出金元・移動先をペアで表示）
  - 多額取引のハイライト（閾値設定可能）
  - ルールベースの自動分類（生活費、贈与、証券会社等）
  - ファジーマッチング分類（RapidFuzzによる表記揺れ吸収）
  - AI分類タブ（未分類取引への自動提案、信頼度スコア表示）
  - カスタム分類ルール（グローバル・案件固有のキーワード管理）
- **分類機能**:
  - 取引一覧での直接分類編集
  - 複数選択での一括分類変更
  - 同じ摘要の取引への一括適用
  - 分類フィルターによる絞り込み（含む/以外モード切替）
  - 資金移動の出金元・移動先で別々の分類を設定可能
- **データクレンジング**:
  - 重複データ検出・削除
  - ID範囲指定削除
  - フィールド値の一括置換（銀行名・支店名・口座番号の誤字修正）
- **エクスポート**:
  - CSVエクスポート（全データ / 絞り込み結果 / Excel対応BOM付きUTF-8）
  - 分類別Excelエクスポート（分類ごとにシート分け、和暦変換済み）
  - JSONバックアップ（案件データの完全バックアップ・リストア）
- **付箋機能**: 確認が必要な取引にマークを付けて管理

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Django 5.x〜6.0 |
| データベース | PostgreSQL 16 + pgvector（SQLiteもレガシー対応） |
| フロントエンド | Bootstrap 5, Bootstrap Icons |
| フォーム | django-crispy-forms + crispy-bootstrap5 |
| データ処理 | pandas |
| ファジーマッチング | RapidFuzz |
| 可視化 | Plotly |
| Excel処理 | openpyxl |
| 静的ファイル | WhiteNoise |
| WSGIサーバー | Gunicorn |
| Python | 3.12+ |

## ディレクトリ構成

```
bank-analyzer-django/
├── bank_project/              # Djangoプロジェクト設定
│   ├── settings.py            # 設定ファイル（環境変数対応）
│   ├── urls.py                # ルートURLルーティング
│   ├── wsgi.py                # WSGI設定
│   └── asgi.py                # ASGI設定
├── analyzer/                  # アプリケーション本体
│   ├── models.py              # データベース定義（Case, Transaction）
│   ├── views.py               # 画面ロジック（CBV/FBV）
│   ├── forms.py               # フォーム定義
│   ├── urls.py                # URLルーティング
│   ├── admin.py               # Django Admin設定
│   ├── handlers/              # POSTリクエストハンドラー
│   │   ├── base.py            # 共通ユーティリティ（handle_ajax_error等）
│   │   ├── api.py             # AJAX APIエンドポイント
│   │   ├── ai.py              # AI分類ハンドラー
│   │   ├── pattern.py         # パターン管理ハンドラー
│   │   ├── transaction.py     # 取引操作ハンドラー
│   │   └── wizard.py          # インポートウィザード
│   ├── services/              # ビジネスロジック層
│   │   ├── transaction.py     # TransactionService（分類・CRUD・インポート）
│   │   ├── analysis.py        # AnalysisService（分析データ生成）
│   │   ├── classification.py  # 分類共通ロジック
│   │   └── utils.py           # 共通ユーティリティ
│   ├── lib/                   # 分析・インポート用ライブラリ
│   │   ├── importer.py        # CSV/Excel読み込み
│   │   ├── analyzer.py        # 多額取引・資金移動分析
│   │   ├── llm_classifier.py  # ルールベース分類・ファジーマッチング
│   │   ├── text_utils.py      # テキスト処理（NFKC正規化・キーワード検索）
│   │   ├── constants.py       # 定数定義（和暦・カテゴリ・ソート順）
│   │   ├── exceptions.py      # カスタム例外
│   │   └── config/            # 設定管理パッケージ
│   │       ├── defaults.py    # デフォルト設定値
│   │       ├── settings.py    # 設定読み込み・保存
│   │       └── patterns.py    # パターン操作（_modify_patterns共通ヘルパー）
│   ├── templates/analyzer/    # HTMLテンプレート
│   │   ├── base.html          # ベーステンプレート
│   │   ├── case_list.html     # 案件一覧
│   │   ├── case_form.html     # 案件作成・編集
│   │   ├── case_confirm_delete.html  # 案件削除確認
│   │   ├── case_detail.html   # 案件詳細
│   │   ├── analysis.html      # 分析ダッシュボード
│   │   ├── classify_preview.html  # 分類プレビュー
│   │   ├── settings.html      # 設定画面
│   │   ├── import_form.html   # CSVインポート
│   │   ├── import_confirm.html # インポートプレビュー
│   │   ├── import_wizard.html # 複数ファイルインポートウィザード
│   │   ├── json_import.html   # JSONインポート
│   │   └── partials/          # 再利用可能テンプレート部品
│   │       ├── _tab_all.html          # 取引一覧タブ
│   │       ├── _tab_large.html        # 多額取引タブ
│   │       ├── _tab_transfers.html    # 資金移動タブ
│   │       ├── _tab_unclassified.html # 未分類取引タブ
│   │       ├── _tab_ai.html           # AI分類タブ
│   │       ├── _tab_cleanup.html      # データクレンジングタブ
│   │       ├── _tab_flagged.html      # 付箋タブ
│   │       ├── _pattern_manager.html  # パターン管理UI
│   │       ├── _tx_form_fields.html   # 取引フォームフィールド共通
│   │       ├── _category_filter.html  # 分類フィルター
│   │       ├── _category_select.html  # 分類セレクト
│   │       ├── _edit_button.html      # 編集ボタン
│   │       └── _flag_button.html      # 付箋ボタン
│   ├── templatetags/          # カスタムテンプレートタグ
│   │   ├── japanese_date.py   # 和暦変換フィルター
│   │   └── pagination_tags.py # ページネーションURL生成
│   ├── static/analyzer/       # 静的ファイル
│   │   ├── css/style.css      # カスタムCSS（グラスモーフィズム）
│   │   └── js/
│   │       ├── utils.js               # 共通ユーティリティ（postJson, disableButton等）
│   │       ├── analysis_dashboard.js  # ダッシュボード操作
│   │       ├── pattern_manager.js     # パターン管理操作
│   │       ├── classify_preview.js    # 分類プレビュー操作
│   │       └── import_preview.js      # インポートプレビュー操作
│   └── migrations/            # データベースマイグレーション
├── docker/                    # Docker関連設定
│   └── postgres/
│       └── init-pgvector.sql  # pgvector拡張初期化SQL
├── scripts/                   # 運用スクリプト
│   └── migrate_sqlite_to_postgres.py  # SQLite→PostgreSQL移行
├── data/                      # ユーザー設定保存先
├── staticfiles/               # 収集済み静的ファイル
├── Dockerfile                 # マルチステージDockerビルド設定
├── docker-compose.yml         # Docker Compose設定
├── docker-entrypoint.sh       # コンテナ起動スクリプト
├── .dockerignore              # Dockerビルド除外設定
├── .env.example               # 環境変数テンプレート
├── requirements.txt           # Python依存ライブラリ
├── ER_DIAGRAM.md              # ER図・データモデル仕様書
└── manage.py                  # Django CLI
```

## アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────────────────────┐
│                      Views (views.py)                    │
│         画面レンダリング、フォーム処理、ルーティング         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                   Handlers (handlers/)                   │
│    POSTリクエスト処理、APIエンドポイント、バリデーション     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                   Services (services/)                   │
│      ビジネスロジック、データ変換、複雑な処理の集約        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                      Lib (lib/)                          │
│    分析エンジン、分類器、設定管理、ファイルインポート       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                   Models (models.py)                     │
│              Case, Transaction データモデル              │
└─────────────────────────────────────────────────────────┘
```

### 主要コンポーネント

| パッケージ | 役割 |
|-----------|------|
| `handlers/` | ビューからPOST処理を分離。機能別に分割されたハンドラー群 |
| `services/` | ビジネスロジック層。TransactionService（取引操作）、AnalysisService（分析） |
| `lib/config/` | 設定管理。パターン（`_modify_patterns`共通ヘルパー）、閾値、ファジーマッチング設定 |
| `lib/llm_classifier.py` | RapidFuzzによるファジーマッチング分類 |
| `lib/text_utils.py` | NFKC正規化、キーワード検索フィルタリング |

## Docker での起動

### 前提条件
- Docker / Docker Compose

### 開発環境（スタンドアロン）

```bash
# 環境変数ファイルを作成（初回のみ）
cp .env.example .env
# 必要に応じて .env を編集

# 起動（PostgreSQL + Django dev server）
docker compose up -d

# 再ビルド
docker compose up -d --build

# テスト実行
docker compose run --rm test

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

ブラウザで http://localhost:3007/ にアクセスします。
ソースコードがマウントされ、変更時にホットリロードされます。

> **Note**: 中央統合環境（docker/docker-compose.yml）で起動する場合は、Nginx Gateway 経由で http://localhost/bank-analyzer/ からアクセスできます。

### 本番環境

```bash
docker compose --profile production up -d bank-analyzer-prod
```

## 画面構成

### 案件一覧（/）
- 案件の作成・編集・削除
- JSONインポート

### 案件詳細（/case/\<id\>/）
- 取引履歴の一覧表示（ページネーション付き）
- CSVインポート
- 分析ダッシュボードへの遷移

### 分析ダッシュボード（/case/\<id\>/analysis/）

| タブ | 機能 |
|------|------|
| 資金移動フロー | 口座間の資金移動をペア（出金元・移動先）で表示、分類編集、フィルター |
| 多額出金・入金 | 閾値以上の取引一覧、分類編集、フィルター |
| 取引一覧・検索 | 全取引の検索・絞り込み、分類編集、複数選択での一括変更、CSVエクスポート、分類別Excelエクスポート |
| 未分類取引 | 未分類取引の一覧、一括分類変更、パターン追加 |
| AI分類 | ファジーマッチングによる分類提案、信頼度スコア表示、個別/一括適用 |
| データクレンジング | 重複データの検出・削除、ID範囲指定削除、フィールド値の一括置換 |
| 付箋 | 確認が必要な取引の管理、メモ編集 |
| パターン管理 | 分類キーワードの追加・編集・削除・移動（グローバル/案件固有） |

### 設定（/settings/）
- 分析閾値設定（多額取引、資金移動検出）
- グローバル分類キーワードの編集

## 分類カテゴリー

| カテゴリー | 説明 |
|-----------|------|
| 生活費 | 日常の生活費（スーパー、光熱費、通信費等） |
| 給与 | 給与・賞与・報酬 |
| 贈与 | 100万円以上の振込等 |
| 事業・不動産 | 事業関連・不動産収入 |
| 関連会社 | 関連会社との取引 |
| 銀行 | 定期預金・積立等 |
| 証券・株式 | 証券会社、配当等 |
| 保険会社 | 生命保険・損保等 |
| 通帳間移動 | 口座間の資金移動 |
| その他 | 手数料、利息、ATM等 |
| 未分類 | 未分類の取引 |

## API エンドポイント

### ページ

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/` | 案件一覧 |
| GET/POST | `/new/` | 案件作成 |
| GET/POST | `/case/<id>/edit/` | 案件編集 |
| POST | `/case/<id>/delete/` | 案件削除 |
| GET/POST | `/case/<id>/` | 案件詳細 |
| GET/POST | `/case/<id>/import/` | CSVインポート |
| GET/POST | `/case/<id>/import/preview/` | インポートプレビュー |
| GET/POST | `/case/<id>/import/wizard/` | 複数ファイルインポートウィザード |
| GET/POST | `/case/<id>/analysis/` | 分析ダッシュボード |
| GET/POST | `/case/<id>/analysis/classify-preview/` | 分類プレビュー |
| GET/POST | `/settings/` | 設定 |
| POST | `/import-json/` | JSONインポート |

### エクスポート

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/case/<id>/export/<type>/` | CSVエクスポート（all / large / transfers / flagged） |
| GET | `/case/<id>/export-filtered/` | フィルタ済みCSVエクスポート |
| GET | `/case/<id>/export-xlsx-by-category/` | 分類別Excelエクスポート（.xlsx） |
| GET | `/case/<id>/export-json/` | JSONバックアップエクスポート |

### 内部API（AJAX）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/case/<id>/api/toggle-flag/` | 付箋のON/OFF切替 |
| POST | `/case/<id>/api/create-transaction/` | 取引の追加 |
| POST | `/case/<id>/api/delete-transaction/` | 取引の削除 |
| GET | `/case/<id>/api/field-values/` | フィールドのユニーク値取得 |

## CSVフォーマット

以下のカラムを含むCSVに対応:

```
銀行名,支店名,口座番号,年月日,摘要,払戻,お預り,差引残高
```

または最小限:

```
年月日,摘要,払戻,お預り,差引残高
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `DJANGO_DEBUG` | デバッグモード | `True` |
| `DJANGO_SECRET_KEY` | シークレットキー | 開発用キー |
| `DJANGO_ALLOWED_HOSTS` | 許可ホスト（カンマ区切り） | `localhost,127.0.0.1` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | CSRF信頼オリジン（カンマ区切り） | `http://localhost,http://127.0.0.1` |
| `DJANGO_FORCE_SCRIPT_NAME` | サブパス配下用スクリプト名 | なし |
| `TZ` | タイムゾーン | `Asia/Tokyo` |
| **DB設定** | | |
| `DB_ENGINE` | データベースエンジン（`postgresql` / `sqlite`） | `postgresql` |
| `DB_NAME` | PostgreSQLデータベース名 | `bank_analyzer` |
| `DB_USER` | PostgreSQLユーザー名 | `bankuser` |
| `DB_PASSWORD` | PostgreSQLパスワード | — |
| `DB_HOST` | PostgreSQLホスト名 | `bank-analyzer-db` |
| `DB_PORT` | PostgreSQLポート | `5432` |
| `SQLITE_PATH` | SQLiteデータベースパス（レガシー） | `/app/db/db.sqlite3` |
| **AI分類設定** | | |
| `FUZZY_THRESHOLD` | ファジーマッチング閾値（0-100） | `90` |
| `FUZZY_ENABLED` | ファジーマッチング有効化 | `true` |
| **Gunicorn設定** | | |
| `GUNICORN_WORKERS` | ワーカー数 | `2` |
| `GUNICORN_TIMEOUT` | タイムアウト（秒） | `300` |

## Docker設定詳細

### サービス構成

| サービス | 説明 | ポート |
|---------|------|--------|
| `bank-analyzer-db` | PostgreSQL 16 + pgvector | 5432（内部） |
| `bank-analyzer-django` | Django runserver（開発モード） | 3007 |
| `test` | テストランナー（オンデマンド） | — |
| `bank-analyzer-prod` | Gunicorn（本番モード） | 3007 |

### 開発環境

- **サーバー**: Django runserver（ホットリロード対応）
- **ソースマウント**: `analyzer/` `bank_project/` を読み取り専用でマウント
- **データ永続化**: PostgreSQL を名前付きボリュームに保存
- **リソース制限**: メモリ 512MB
- **ヘルスチェック**: `/health/` エンドポイント
- **初期化**: tini（PID 1としてシグナル処理）
- **マイグレーション**: エントリポイントで自動実行

### 本番環境（`--profile production`）

- **WSGIサーバー**: Gunicorn（2ワーカー）
- **ビルドターゲット**: `production`（非rootユーザー実行）
- **リソース制限**: メモリ 1GB
- **ログローテーション**: 10MB × 3ファイル
- **セキュリティ**: `no-new-privileges`

## ライセンス

Private
