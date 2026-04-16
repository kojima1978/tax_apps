# ポータルランチャー 設計仕様書

## 1. プロジェクト概要
各種業務アプリケーションへのゲートウェイとなる**ポータルランチャー**サイト。

- **設計思想**: シンプル、高速、静的
- **アクセス**: 認証なし（内部ネットワーク想定）
- **データ管理**: TypeScript 静的定数（DB不要）

## 2. システム構成

### インフラストラクチャ
- **Docker Compose**: 各アプリ個別の `docker-compose.yml`（`manage.sh` / `manage.bat` で一括管理）
- **Nginx Gateway**: リバースプロキシ（`nginx/` + `docker/gateway/`）
- **ポータルアプリ**: Next.js 静的エクスポート → nginx:alpine で配信（ポート3000）

### 連携アプリケーション一覧
| アプリ名 | パス | ポート | 説明 |
|---------|------|--------|------|
| ポータル | / | 3000 | ランチャー（本アプリ） |
| 相続税 必要書類 | /inheritance-tax-docs/ | 3003 | 相続税申告の書類案内 |
| 所得税・贈与税 必要書類 | /tax-docs/ | 3005 | 所得税・贈与税申告の書類案内 |
| 相続税計算 | /inheritance-tax-app/ | 3004 | 相続税シミュレーション |
| 贈与税計算 | /gift-tax-simulator/ | 3001 | 贈与税計算・早見表・不動産取得税 |
| 医療法人株式評価 | /medical/ | 3010 | 医療法人の株式評価 |
| 非上場株式評価 | /shares/ | 3012 | 非上場株式の評価 |
| 所得税計算 | /income-tax-calc/ | 3018 | 確定申告書に沿って所得税・住民税を計算 |
| 退職金税額計算 | /retirement-tax-calc/ | 3013 | 退職金の所得税・住民税計算 |
| 減価償却ツール | /depreciation-calc/ | 3015 | 耐用年数・簿価・期間償却を計算 |
| 減価償却資産評価 | /asset-valuation/ | 3017 | 相続税の減価償却資産を一括評価 |
| 給与手取り計算 | /salary-calc/ | 3016 | 給与・賞与の手取り額を計算 |
| 株式評価明細書 | /stock-valuation-form/ | 3014 | 取引相場のない株式の評価明細書 |
| 預貯金分析 | /bank-analyzer/ | 3007 | 預金移動分析 |
| 案件管理 | /itcm/ | 3020 | 相続税案件管理 |
| 料金表 | /fee-table/ | — | 報酬についてのご案内 |

## 3. アプリケーション仕様

### 機能
1. **ダッシュボードグリッド**
   - カード形式でアプリケーション表示（LucideIconアイコン、タイトル、説明、リンク）
   - カテゴリ別グループ表示（必要書類・計算/評価・分析/管理・その他）
   - 検索フィルター（タイトル・説明で絞り込み）
   - レスポンシブグリッド（1列 → 2列 → 3列 → 4列）
   - 内部リンク・外部リンク対応（外部はExternalLinkアイコン表示）

2. **グローバルヘッダー**
   - プロジェクトタイトル（グラデーション）
   - サブタイトル

3. **料金表ページ** (`/fee-table/`)
   - セクション別の報酬一覧テーブル
   - 印刷対応（PrintButton）

### 技術スタック
- **Next.js 16** (App Router, Static Export)
- **TypeScript**
- **Tailwind CSS 4**
- **lucide-react**（アイコン）
- **nginx:alpine**（本番配信、Node.js不要）

### UI/UXテーマ
- **スタイル**: モダン、クリーン、グラスモーフィズム
- **インタラクション**: ホバーエフェクト（スケールアップ、シャドウ増加、グラデーションオーバーレイ）
- **カラー**: グリーン/エメラルドのグラデーション
- **フォント**: Geist Sans

## 4. ディレクトリ構造
```
apps/portal/
├── app/                        # Next.js アプリケーション
│   ├── app/
│   │   ├── globals.css         # グローバルスタイル
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ（ヘッダー+グリッド）
│   │   └── fee-table/
│   │       └── page.tsx        # 料金表ページ
│   ├── components/
│   │   ├── AppCard.tsx         # アプリカード
│   │   ├── AppGrid.tsx         # カテゴリ別グリッド（検索+グループ表示）
│   │   ├── PageContainer.tsx   # 最大幅コンテナ
│   │   └── PrintButton.tsx     # 印刷ボタン
│   ├── lib/
│   │   ├── applications.ts    # アプリ定義（型+静的データ）
│   │   └── fee-data.ts        # 料金表データ
│   ├── Dockerfile              # マルチステージビルド（node→nginx, nginx設定inline）
│   ├── .dockerignore
│   ├── next.config.ts          # output: "export"
│   ├── package.json
│   ├── postcss.config.mjs
│   └── tsconfig.json
└── design_spec.md              # 本ファイル
```

## 5. データモデル

### Application（TypeScript 型）
```typescript
type Category = '必要書類' | '計算・評価' | '分析・管理' | 'その他';

interface Application {
  title: string;        // アプリ名
  description: string;  // 説明文
  url: string;          // パス or 外部URL
  icon: LucideIcon;     // lucide-react アイコンコンポーネント
  category: Category;   // カテゴリ（グリッド内のグループ分け）
}
```

アプリケーション一覧は `lib/applications.ts` に静的定数として定義。
追加・変更はソースコードを編集しリビルド。

## 6. Docker構成

### Dockerfile（2ステージ）
1. **Builder**: `node:22-alpine` — npm ci + next build → `out/` 生成
2. **Runner**: `nginx:alpine` — 静的ファイル配信（非rootユーザー）

### 特徴
- `output: "export"` による静的HTMLエクスポート
- nginx設定はDockerfile内にheredocでインライン化
- npm + Next.js 両方のビルドキャッシュマウント
- セキュリティヘッダーはnginxゲートウェイで設定（ポータル側は不要）
- イメージサイズ: ~45MB
