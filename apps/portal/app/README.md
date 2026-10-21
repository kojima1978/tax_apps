# Tax Apps Portal

税理士業務支援アプリケーションのポータルサイト

## 概要

複数の税務関連アプリケーションへのゲートウェイとして機能するダッシュボードです。
アプリケーション一覧は静的データ（TypeScript定数）で管理しています。

## 技術スタック

- **Framework**: Next.js 16 (App Router, Static Export)
- **Styling**: Tailwind CSS 4
- **UI**: lucide-react (アイコン)
- **本番配信**: nginx:alpine（静的HTML配信、Node.js不要）

## Docker

ポータルは `docker/gateway/docker-compose.yml` の `portal-app` サービスで、個別の `docker-compose.yml` は持ちません。
dev モードは無く、base の時点で本番構成（`target: runner` の nginx、`read_only` + `cap_drop: ALL`）です。

```bash
# gateway ごと起動・再ビルド
docker/scripts/manage.sh start gateway
docker/scripts/manage.sh build gateway

# または全アプリ一括起動
docker/scripts/manage.sh start
```

http://localhost/ でアクセス（直接は http://localhost:3000/ 、`/health` が healthcheck）。
アプリ一覧を変えたら再ビルドが要ります（静的エクスポートなので画面に反映されるのはビルド時）。

## ディレクトリ構成

```
app/
├── app/
│   ├── layout.tsx          # ルートレイアウト（Geist + Noto Sans JP）
│   ├── page.tsx            # ホームページ（ヘッダー + AppGrid）
│   ├── globals.css         # グローバルスタイル
│   └── fee-table/
│       └── page.tsx        # 料金表ページ
├── components/
│   ├── AppCard.tsx         # アプリカード
│   ├── AppGrid.tsx         # 検索・カテゴリ絞り込み・カテゴリ別グリッド
│   ├── PageContainer.tsx   # ページコンテナ
│   └── PrintButton.tsx     # 印刷ボタン
├── lib/
│   ├── applications.ts     # アプリ定義（型+データ）
│   └── fee-data.ts         # 料金表データ
├── next.config.ts          # Next.js設定
├── package.json
├── tsconfig.json
└── Dockerfile              # マルチステージビルド（node→nginx, nginx設定もinline）
```

## 登録アプリケーション

`lib/applications.ts` の `applications` 配列（並び順もここで決まる）。

| アプリ | URL | 説明 |
|:-------|:----|:-----|
| 必要書類管理 | /inheritance-tax-docs/ | 所得税・贈与税・相続税などの必要書類を一元管理 |
| 相続税計算 | /inheritance-tax-app/ | 相続税の概算計算 |
| 贈与税計算 | /gift-tax-simulator/ | 贈与税計算・早見表・不動産取得税 |
| 退職金税額計算 | /retirement-tax-calc/ | 退職金の所得税・住民税を計算 |
| 譲渡所得税計算 | /capital-gains-calc/ | 不動産・株式等の譲渡にかかる税額を試算 |
| 減価償却ツール | /depreciation-calc/ | 耐用年数・簿価・期間償却を計算 |
| 減価償却資産評価 | /asset-valuation/ | 相続税の減価償却資産を一括評価 |
| 株式評価明細書 | /stock-valuation-form/ | 取引相場のない株式の評価明細書 |
| 相続税の申告書 | /inheritance-tax-form/ | 第1表〜第15表・付表など全24様式の作成・印刷 |
| 資産・負債管理（PB） | /private-banking/ | 個人・ファミリーのB/Sを時価・流動性別に管理 |
| 保険管理 | /insurance/ | 保険証券の管理・分析 |
| 預貯金分析 | /bank-analyzer/ | 預金移動の分析ツール |
| 案件管理 | /itcm/ | 相続税案件の進捗管理 |
| 料金表 | /fee-table/ | 報酬についてのご案内（ポータル内のページ） |
| 社用車管理（FleetFlow） | /fleet-board/ | tax_apps 外の別プロジェクトへの一時リンク |
