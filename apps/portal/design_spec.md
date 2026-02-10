# ポータルランチャー 設計仕様書

## 1. プロジェクト概要
各種業務アプリケーションへのゲートウェイとなる**ポータルランチャー**サイト。

- **設計思想**: シンプル、高速、静的
- **アクセス**: 認証なし（内部ネットワーク想定）
- **データ管理**: TypeScript 静的定数（DB不要）

## 2. システム構成

### インフラストラクチャ
- **Docker Compose**: `docker/docker-compose.yml`
- **Nginx Gateway**: リバースプロキシ（`nginx/`）
- **ポータルアプリ**: Next.js 静的エクスポート → nginx:alpine で配信（ポート3000）

### 連携アプリケーション一覧
| アプリ名 | パス | ポート | 説明 |
|---------|------|--------|------|
| ポータル | / | 3000 | ランチャー（本アプリ） |
| 相続税 必要書類 | /inheritance-tax-docs/ | 3003 | 相続税申告の書類案内 |
| 贈与税 必要書類 | /gift-tax-docs/ | 3002 | 贈与税申告の書類案内 |
| 確定申告 必要書類 | /tax-docs/ | 3005 | 確定申告の書類案内 |
| 相続税計算 | /inheritance-tax-app/ | 5173 | 相続税シミュレーション |
| 贈与税計算 | /gift-tax-simulator/ | 3001 | 贈与税計算・早見表・不動産取得税 |
| 医療法人株式評価 | /medical/ | 3010 | 医療法人の株式評価 |
| 非上場株式評価 | /shares/ | 3012 | 非上場株式の評価 |
| 退職金税額計算 | /retirement-tax-calc/ | 3013 | 退職金の所得税・住民税計算 |
| 預貯金分析 | /bank-analyzer/ | 8000 | 預金移動分析 |
| 案件管理 | /itcm/ | 3020 | 相続税案件管理 |

## 3. アプリケーション仕様

### 機能
1. **ダッシュボードグリッド**
   - カード形式でアプリケーション表示（LucideIconアイコン、タイトル、説明、リンク）
   - レスポンシブグリッド（1列 → 2列 → 3列 → 4列）
   - 内部リンク・外部リンク対応（外部はExternalLinkアイコン表示）

2. **グローバルヘッダー**
   - プロジェクトタイトル（グラデーション）
   - サブタイトル

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
│   │   └── page.tsx            # ホームページ（ヘッダー+グリッド）
│   ├── components/
│   │   ├── AppCard.tsx         # アプリカード
│   │   └── PageContainer.tsx   # 最大幅コンテナ
│   ├── lib/
│   │   └── applications.ts    # アプリ定義（型+静的データ）
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
interface Application {
  title: string;        // アプリ名
  description: string;  // 説明文
  url: string;          // パス or 外部URL
  icon: LucideIcon;     // lucide-react アイコンコンポーネント
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
