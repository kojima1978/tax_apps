# Portal Launcher Gateway

税理士業務支援アプリケーション統合プラットフォーム

## 概要

複数の税理士業務支援アプリケーションを統合管理するポータルシステムです。
Docker Composeを使用して、すべてのアプリケーションを一元的に起動・管理し、Nginx Gatewayを通じてアクセスします。

## アーキテクチャ

```
                    ┌─────────────────┐
                    │   Nginx Gateway │
                    │    (Port 80)    │
                    └───┬────┬────┬───┘
                        │    │    │
      ┌─────────────────┘    │    └─────────────────┐
      │                      │                      │
      ▼                      ▼                      ▼
┌───────────────┐  ┌──────────────────┐   ┌───────────────┐
│  Portal Site  │  │   Applications   │   │   Backends    │
│  (Port 3000)  │  │ (Medical/Shares) │   │   (API/DB)    │
└───────────────┘  └──────────────────┘   └───────────────┘
```

## クイックスタート

### 1. 起動

```bash
# gatewayディレクトリに移動
cd gateway

# Windowsの場合
start.bat

# または直接実行
docker compose up -d --build
```

### 2. アクセス

ブラウザで以下のURLにアクセスしてください。

**メインポータル:** [http://localhost](http://localhost)

### 3. 停止

```bash
# Windowsの場合
stop.bat

# または直接実行
docker compose down
```

## サービス・アクセス一覧

Nginx Gateway (Port 80) を経由して各アプリケーションにアクセスします。

| アプリケーション | ゲートウェイURL | 直接ポート(Debug用) | 説明 |
|------------------|----------------|-------------------|------|
| **Portal Site** | [`http://localhost/`](http://localhost/) | 3000 | メインポータル・ダッシュボード |
| **Medical Stock** | [`http://localhost/medical/`](http://localhost/medical/) | 3010 | 医療法人株式評価システム |
| **Shares Valuation** | [`http://localhost/shares/`](http://localhost/shares/) | 3012 | 非上場株式評価システム |
| **Inheritance Calc** | [`http://localhost/inheritance-calc/`](http://localhost/inheritance-calc/) | 3013 | 相続税計算アプリ |
| **ITCM** | [`http://localhost/itcm/`](http://localhost/itcm/) | 3020 | 相続税案件管理システム |
| **Passbook OCR** | [`http://localhost/ocr/`](http://localhost/ocr/) | 3002 | 通帳OCRシステム |
| **Bank Analyzer** | [`http://localhost/bank-analyzer/`](http://localhost/bank-analyzer/) | 8501 | 相続銀行分析システム |

## ディレクトリ構造

```
dev/
├── gateway/                    # 統合管理・Nginx設定
│   ├── docker-compose.yml
│   └── nginx/
├── portal-project/             # ポータルサイト (Next.js)
├── Valuation_of_medical_corporation_stock/ # 医療法人評価 (Next.js)
├── Valuation_of_shares_without_a_market_price/ # 非上場株式評価 (Next.js)
├── inheritance-tax-app/        # 相続税計算
├── Inheritance-Tax-Case-Management-System/ # ITCM (案件管理)
└── passbook-ocr/               # 通帳OCR
```

## 開発・トラブルシューティング

### コンテナの状態確認
```bash
docker ps
```

### 全サービスの再構築
コードの変更を反映させる場合などに実施します。
```bash
docker compose up -d --build --force-recreate
```

### ログ確認
```bash
# Gateway (Nginx) のログ
docker logs gateway_nginx

# 特定のアプリのログ
docker logs portal_app
docker logs medical-stock-valuation
```

## 技術スタック
- **Frontend**: Next.js 16, React 19, Vite
- **Backend**: FastAPI, Express, Node.js
- **Database**: PostgreSQL, SQLite
- **Infrastructure**: Docker, Docker Compose, Nginx
