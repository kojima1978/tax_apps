# inheritance-case-management/web

相続税案件管理システムの Next.js アプリケーション（フロントエンド + API Routes）。

## 技術スタック

- Next.js 16.1.1 (App Router, basePath: `/itcm`)
- React 19.2.3, TypeScript 5.9.3
- Tailwind CSS v4 (@tailwindcss/postcss)
- TanStack Query 5.64 / TanStack Table 8.21
- Prisma 6.2 (PostgreSQL)
- Zod 3.24
- ExcelJS, @dnd-kit, recharts, @react-pdf/renderer, lucide-react, react-currency-input-field

## アーキテクチャ

```
src/
├── app/                    # ページコンポーネント + API Routes
│   ├── page.tsx            # 案件一覧
│   ├── new/                # 新規案件登録
│   ├── [id]/               # 案件詳細編集
│   ├── settings/           # マスタ管理（部署/会社/担当者/部門/紹介者/バックアップ）
│   ├── analytics/          # 経営分析ダッシュボード
│   └── api/                # API Routes（薄いラッパー、ロジックはlib/services/に委譲）
├── components/
│   ├── cases/              # 案件一覧ページ用（FilterBar, DataTable, KPICards等）
│   ├── import-csv/         # CSV取込ステップ別コンポーネント
│   └── ui/                 # 汎用UIコンポーネント
├── hooks/                  # カスタムフック
├── lib/
│   ├── services/           # ビジネスロジック層
│   │   ├── case-service.ts     # 案件CRUD・where句構築・楽観ロック
│   │   ├── backup-service.ts   # 全テーブルエクスポート・リストア
│   │   └── template-service.ts # Excelテンプレート生成
│   ├── api/                # クライアントサイドAPIクライアント
│   ├── analytics/          # 集計・分析ロジック
│   ├── import/             # CSVインポートロジック
│   └── ...                 # Prisma, ユーティリティ等
└── types/                  # 型定義・バリデーション・定数
```

## 開発

```bash
# Docker経由（推奨）
cd .. && docker compose up --build

# ブラウザ: http://localhost:3020
```

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（port 3020） |
| `npm run build` | プロダクションビルド |
| `npm run lint` | ESLint 実行 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run db:generate` | Prisma Client 生成 |
| `npm run db:migrate` | マイグレーション適用 |
| `npm run db:seed` | シードデータ投入 |

> **Note**: スクリプトはDocker コンテナ内で実行してください。
