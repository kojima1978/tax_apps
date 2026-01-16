# ポータルランチャー 設計仕様書

## 1. プロジェクト概要
各種業務アプリケーションへのゲートウェイとなる**ポータルランチャー**サイト。

- **設計思想**: シンプル、高速、拡張性
- **アクセス**: 認証なし（内部ネットワーク想定）

## 2. システム構成

### インフラストラクチャ
- **Docker Compose**: `dev/docker/docker-compose.yml`
- **Nginx**: リバースプロキシ（`dev/nginx/`）
- **ポータルアプリ**: Next.js（ポート3000）

### 連携アプリケーション一覧
| アプリ名 | パス | ポート | 説明 |
|---------|------|--------|------|
| ポータル | / | 3000 | ランチャー（本アプリ） |
| 医療法人株式評価 | /medical/ | 3010 | 医療法人の株式評価 |
| 非上場株式評価 | /shares/ | 3012 | 非上場株式の評価 |
| 相続税計算 | /inheritance-tax-app/ | 5173 | 相続税シミュレーション |
| 案件管理 | /itcm/ | 3020 | 相続税案件管理 |
| 通帳OCR | /ocr/ | 3000 | 通帳画像のOCR処理 |
| 銀行分析 | /bank-analyzer/ | 8501 | 預金移動分析 |
| 贈与税計算 | /gift-tax/ | 3001 | 贈与税シミュレーション |
| 贈与税必要書類 | /gift-tax-docs/ | 3002 | 贈与税申告の書類案内 |
| 相続税必要書類 | /inheritance-tax-docs/ | 3003 | 相続税申告の書類案内 |
| 不動産取得税 | /real-estate-tax/ | 3004 | 不動産取得税計算 |

## 3. アプリケーション仕様

### 実装済み機能
1. **ダッシュボードグリッド**
   - カード形式でアプリケーション表示（アイコン、タイトル、説明、リンク）
   - レスポンシブグリッド（モバイル: 1列、デスクトップ: 3-4列）
   - リアルタイム検索フィルター
   - 内部リンク・外部リンク対応

2. **管理機能**
   - アプリケーションのCRUD操作
   - Prisma + SQLiteによるデータ永続化
   - lucide-reactアイコン選択

3. **グローバルヘッダー**
   - プロジェクトタイトル
   - 管理画面へのリンク

### 技術スタック
- **Next.js 16+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** (SQLite)
- **lucide-react** (アイコン)

### UI/UXテーマ
- **スタイル**: モダン、クリーン、グラスモーフィズム/ベントグリッド
- **インタラクション**: ホバーエフェクト（スケールアップ、シャドウ増加）
- **カラー**: グリーン/エメラルドのグラデーション

## 4. ディレクトリ構造
```
apps/portal/
├── app/                      # Next.jsアプリケーション
│   ├── app/
│   │   ├── admin/           # 管理画面
│   │   │   └── page.tsx
│   │   ├── api/             # APIルート
│   │   │   └── applications/
│   │   ├── generated/       # Prisma生成ファイル
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AdminPanel.tsx   # 管理パネル
│   │   ├── AppCard.tsx      # アプリカード
│   │   ├── ApplicationForm.tsx
│   │   ├── ApplicationList.tsx
│   │   ├── Header.tsx
│   │   ├── LauncherGrid.tsx # ランチャーグリッド
│   │   └── ThemeProvider.tsx
│   ├── data/
│   │   └── links.ts         # 型定義
│   ├── lib/
│   │   └── prisma.ts        # Prismaクライアント
│   ├── prisma/
│   │   └── schema.prisma    # データベーススキーマ
│   ├── public/
│   ├── dev.db               # SQLiteデータベース
│   ├── Dockerfile
│   └── package.json
├── design_spec.md           # 本ファイル
└── instructions_for_claude.md
```

## 5. データモデル

### Application
```prisma
model Application {
  id          String   @id @default(cuid())
  title       String
  description String
  url         String
  icon        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 6. API仕様

### GET /api/applications
全アプリケーション取得

### POST /api/applications
新規アプリケーション作成
```json
{
  "title": "アプリ名",
  "description": "説明",
  "url": "/path または https://...",
  "icon": "PieChart"
}
```

### PUT /api/applications/[id]
アプリケーション更新

### DELETE /api/applications/[id]
アプリケーション削除
