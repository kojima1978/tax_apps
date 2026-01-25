# Bank Analyzer (Django Version)

相続税申告における通帳分析を支援するWebアプリケーションです。
Streamlit版からDjango版へ移行し、UI/UXおよびデータ管理機能を強化しました。

## 特徴

- **モダンで直感的なUI**: Bootstrap 5とDark Modeを採用した、視認性の高いインターフェース。
- **データ管理**: SQLite + Django ORMによる堅牢なデータ管理。
- **CSVインポート**: 銀行のCSVデータ（IBダウンロード版、OCR変換版）をドラッグ＆ドロップで取り込み。
- **自動分析**:
    - 資金移動の自動検出（口座間の移動を推定）
    - 多額取引のハイライト
    - ルールベースの自動分類（生活費、贈与疑い等）

## 実行方法

### Dockerを使用する場合 (推奨)

プロジェクトルート (`tax_apps/docker`) から:

```bash
docker-compose up -d bank-analyzer
```
ブラウザで [http://localhost:8000](http://localhost:8000) にアクセスします。

### ローカル開発

1. 依存ライブラリのインストール:
```bash
pip install -r requirements.txt
```

2. データベースのセットアップ:
```bash
python manage.py migrate
```

3. サーバーの起動:
```bash
python manage.py runserver
```

## ディレクトリ構造

- `bank_project/`: Djangoプロジェクト設定
- `analyzer/`: アプリケーション本体
    - `models.py`: データベース定義 (Case, Transaction)
    - `views.py`: 画面ロジック
    - `lib/`: 分析・インポート用ライブラリ
    - `templates/`: HTMLテンプレート
