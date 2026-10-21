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
- **ポータルアプリ**: Next.js 静的エクスポート → nginx:1.27-alpine で配信（ポート3000）。`docker/gateway/docker-compose.yml` の `portal-app` サービスで、gateway と一緒に起動する（`manage.sh start gateway`）

### 連携アプリケーション一覧
| アプリ名 | パス | ポート | 説明 |
|---------|------|--------|------|
| ポータル | / | 3000 | ランチャー（本アプリ） |
| バックアップ設定 | /backup-settings/ | — | 全アプリの自動バックアップ設定・状態確認・手動実行 |
| 必要書類管理 | /inheritance-tax-docs/ | 3003 | 所得税・贈与税・相続税などの必要書類を一元管理 |
| 相続税計算 | /inheritance-tax-app/ | 3004 | 相続税の概算計算 |
| 贈与税計算 | /gift-tax-simulator/ | 3001 | 贈与税計算・早見表・不動産取得税 |
| 退職金税額計算 | /retirement-tax-calc/ | 3013 | 退職金の所得税・住民税を計算 |
| 譲渡所得税計算 | /capital-gains-calc/ | 3019 | 不動産・株式等の譲渡にかかる税額を試算 |
| 減価償却ツール | /depreciation-calc/ | 3015 | 耐用年数・簿価・期間償却を計算 |
| 減価償却資産評価 | /asset-valuation/ | 3017 | 相続税の減価償却資産を一括評価 |
| 株式評価明細書 | /stock-valuation-form/ | 3014 | 取引相場のない株式の評価明細書 |
| 相続税の申告書 | /inheritance-tax-form/ | 3021 | 第1表〜第15表・付表など全24様式の作成・印刷 |
| 資産・負債管理（PB） | /private-banking/ | 3025 | 個人・ファミリーのB/Sを時価・流動性別に管理 |
| 保険管理 | /insurance/ | 3030 | 保険証券の管理・分析 |
| 預貯金分析 | /bank-analyzer/ | 3007 | 預金移動の分析ツール |
| 案件管理 | /itcm/ | 3020 | 相続税案件の進捗管理 |
| 料金表 | /fee-table/ | — | 報酬についてのご案内（ポータル内のページ） |
| 社用車管理（FleetFlow） | /fleet-board/ | 3035 | tax_apps 外の別プロジェクトへの一時リンク |

## 3. アプリケーション仕様

### 機能
1. **ダッシュボードグリッド**
   - カード形式でアプリケーション表示（LucideIconアイコン、タイトル、説明、リンク）
   - カテゴリ別グループ表示（必要書類・計算/評価・分析/管理・その他）
   - 検索フィルター（タイトル・説明で絞り込み）。`/` で検索欄へ、Escape で消去
   - カテゴリの絞り込みボタン（件数つき・もう一度押すと解除）
   - レスポンシブグリッド（1列 → 2列 → 3列 → 4列）
   - 内部リンク・外部リンク対応（`http` で始まるものを外部とみなし ExternalLink アイコン表示）

2. **グローバルヘッダー**
   - 濃いエメラルドの固定ヘッダー（「業務支援ポータル」「税理士業務支援ツール」とアプリ数の表示）
   - 検索欄の上に見出しと説明

3. **料金表ページ** (`/fee-table/`)
   - セクション別の報酬一覧テーブル
   - 印刷対応（PrintButton）

4. **バックアップ設定ページ** (`/backup-settings/`)
   - 最終バックアップ、次回目安、暗号鍵、復元テストの状態表示
   - 自動実行の有効/無効、実行間隔、日次/週次/月次の保持数を設定
   - USB・外付けディスク・NASへの追加コピー先を設定
   - 既存の `manage.bat backup` を使った手動バックアップ
   - ローカル・最新分の控え・外部ドライブから復元対象を選択。整合性・件数の確認に成功し、
     上書きを了承してから復元。処理状態・詳細結果を表示（確認結果の有効期限は15分）
   - ブラウザからの操作は、Windows のループバックだけで待ち受けるローカル設定サービスへ接続

### 技術スタック
- **Next.js 16** (App Router, Static Export)
- **TypeScript**
- **Tailwind CSS 4**
- **lucide-react**（アイコン）
- **nginx:1.27-alpine**（本番配信、Node.js不要）

### UI/UXテーマ
- **スタイル**: 白いカードと細い罫線のクリーンな構成
- **インタラクション**: ホバーで見出しの色と矢印アイコンが動く
- **カラー**: エメラルド（ヘッダーは emerald-950、料金表の見出しはグラデーション）
- **フォント**: Geist + Noto Sans JP（`next/font/google`）

## 4. ディレクトリ構造
```
apps/portal/
├── app/                        # Next.js アプリケーション
│   ├── app/
│   │   ├── globals.css         # グローバルスタイル
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ（ヘッダー+グリッド）
│   │   ├── backup-settings/
│   │   │   └── page.tsx        # バックアップ設定ページ
│   │   └── fee-table/
│   │       └── page.tsx        # 料金表ページ
│   ├── components/
│   │   ├── AppCard.tsx         # アプリカード
│   │   ├── AppGrid.tsx         # カテゴリ別グリッド（検索+グループ表示）
│   │   ├── BackupSettingsPanel.tsx # バックアップ設定と状態表示
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
2. **Runner**: `nginx:1.27-alpine` — 静的ファイル配信（非rootユーザー、`/health` で healthcheck）

### 特徴
- `output: "export"` による静的HTMLエクスポート
- nginx設定はDockerfile内にheredocでインライン化
- npm + Next.js 両方のビルドキャッシュマウント
- `npm ci` と同じ RUN 層で glibc 用のネイティブバイナリを消す（Alpine では使われない）
- コンテナは `read_only` + `cap_drop: ALL`、書き込み先は tmpfs（`/run`・`/var/cache/nginx`）だけ
- dev モードは無い（base の compose が最初から本番構成。`docker-compose.prod.yml` は `--prod` の対象に含めるための空に近いファイル）
- テストは無い（`TEST_TARGETS` 対象外）
- セキュリティヘッダーはnginxゲートウェイで設定（ポータル側は不要）
- イメージサイズ: 約100MB（2026-10-19 実測 104MB。ほぼ nginx:1.27-alpine の分）
