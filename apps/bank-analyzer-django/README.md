# Bank Analyzer (Django Version)

相続税申告における通帳分析を支援するWebアプリケーションです。
Streamlit版からDjango版へ移行し、UI/UXおよびデータ管理機能を強化しました。

## 特徴

- **モダンで直感的なUI**: Bootstrap 5を採用した、視認性の高いインターフェース
- **案件管理**: 複数の相続案件を個別に管理
- **CSVインポート**: 銀行のCSV/Excelデータを自動エンコーディング検出で取り込み
  - UTF-8, CP932, Shift_JIS 対応
  - 和暦日付（H28.6.3など）の自動変換
  - 残高整合性チェック機能
- **自動分析**:
  - 資金移動の自動検出（口座間の移動を推定）
  - 多額取引のハイライト（閾値設定可能）
  - ルールベースの自動分類（生活費、贈与、証券会社等）
- **CSVエクスポート**: 分析結果をCSVで出力（Excel対応BOM付きUTF-8）
- **重複データ検出**: 誤って二重取り込みしたデータを検出・削除

## 画面構成

| 画面 | 説明 |
|------|------|
| 案件一覧 | 案件の作成・編集・削除 |
| 案件詳細 | 取引履歴の一覧表示 |
| CSVインポート | ファイルアップロード、プレビュー、残高チェック |
| 分析ダッシュボード | 資金移動、多額取引、取引検索、重複チェック |
| 設定 | 閾値、分類キーワードの設定 |

## 実行方法

### Dockerを使用する場合 (推奨)

プロジェクトルート (`tax_apps/docker`) から:

```bash
docker-compose up -d bank-analyzer
```

ブラウザで http://localhost:8000 にアクセスします。

### ローカル開発

```bash
# 依存ライブラリのインストール
pip install -r requirements.txt

# データベースのセットアップ
python manage.py migrate

# サーバーの起動
python manage.py runserver
```

### Docker単体での実行

```bash
# ビルド
docker build -t bank-analyzer .

# 実行
docker run -p 8000:8000 -v $(pwd)/data:/app/data bank-analyzer
```

## ディレクトリ構造

```
bank-analyzer-django/
├── bank_project/          # Djangoプロジェクト設定
│   ├── settings.py        # 設定ファイル（環境変数対応）
│   ├── urls.py            # ルートURLルーティング
│   └── wsgi.py            # WSGI設定
├── analyzer/              # アプリケーション本体
│   ├── models.py          # データベース定義 (Case, Transaction)
│   ├── views.py           # 画面ロジック
│   ├── forms.py           # フォーム定義
│   ├── urls.py            # URLルーティング
│   ├── lib/               # 分析・インポート用ライブラリ
│   │   ├── importer.py    # CSV/Excel読み込み
│   │   ├── analyzer.py    # 多額取引・資金移動分析
│   │   ├── llm_classifier.py  # ルールベース分類
│   │   └── config.py      # 設定管理
│   └── templates/         # HTMLテンプレート
├── data/                  # ユーザー設定保存先
├── Dockerfile             # Docker設定
├── docker-compose.yml     # Docker Compose設定
└── requirements.txt       # Python依存ライブラリ
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `DJANGO_DEBUG` | デバッグモード | `True` |
| `DJANGO_SECRET_KEY` | シークレットキー | 開発用キー |
| `DJANGO_ALLOWED_HOSTS` | 許可ホスト（カンマ区切り） | `*` |

## 技術スタック

- **フレームワーク**: Django 5.x / 6.x
- **データベース**: SQLite
- **フロントエンド**: Bootstrap 5, Plotly.js
- **データ処理**: pandas

## CSVフォーマット

以下のカラムを含むCSVに対応:

```
銀行名,支店名,口座番号,年月日,摘要,払戻,お預り,差引残高
```

または最小限:

```
年月日,摘要,払戻,お預り,差引残高
```

## ライセンス

Private
