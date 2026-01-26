# Nginx Gateway Configuration

このディレクトリには、Tax Apps プロジェクトのゲートウェイ（リバースプロキシ）として機能する Nginx の設定ファイルが含まれています。

## 概要

この Nginx サービスは、外部からの HTTP リクエスト (`port 80`) を受け取り、URL パスに基づいて適切なバックエンドサービス（コンテナ）にリクエストを振り分けます。

## ファイル構成

- `nginx.conf`: Nginx のグローバル設定（ワーカープロセス、ログ設定など）。
- `default.conf`: サーバーブロック設定（ルーティングルール、プロキシ設定）。

## ルーティング一覧

`default.conf` に定義されているルーティングルールは以下の通りです。

| URL Path | 宛先サービス (Container:Port) | 説明 |
| :--- | :--- | :--- |
| `/` | `portal-app:3000` | ポータルサイト (Next.js) |
| `/medical/` | `medical-stock-valuation:3010` | 医療法人株式評価システム |
| `/shares/` | `shares-valuation:3012` | 非上場株式評価システム |
| `/inheritance-tax-app/` | `inheritance-tax-app:5173` | 相続税計算アプリ (Vite/React) |
| `/itcm/` | `itcm-frontend:3020` | 相続税案件管理システム (Front) |
| `/itcm-api/` | `itcm-backend:3021` | 相続税案件管理システム (API) |
| `/bank-analyzer/` | `bank-analyzer:8000` | 相続銀行分析システム (Django) |
| `/gift-tax-simulator/` | `gift-tax-simulator:3001` | 贈与税計算シミュレーター |
| `/gift-tax-docs/` | `gift-tax-docs:3002` | 贈与税申告 必要書類案内 |
| `/inheritance-tax-docs/` | `inheritance-tax-docs:3003` | 相続税申告 資料準備ガイド |
| `/real-estate-tax/` | `real-estate-tax:3004` | 不動産取得税計算システム |
| `/tax-docs/` | `tax-docs-frontend:3000` | 確定申告 必要書類 (Front) |
| `/tax-docs-api/` | `tax-docs-backend:3001` | 確定申告 必要書類 (API) |

## Docker Compose 設定

この設定は `docker-compose.yml` 内で以下のようにマウントされています。

```yaml
services:
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ../nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
```
