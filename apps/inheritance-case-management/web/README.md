# inheritance-case-management/web

相続税案件管理システムの Next.js アプリケーション（フロントエンド + API Routes）。

## 技術スタック

- Next.js 16.1.1 (App Router, basePath: `/itcm`)
- React 19.2.3, TypeScript 5.9.3
- Tailwind CSS v4 (@tailwindcss/postcss)
- TanStack Query 5.64 / TanStack Table 8.21
- Prisma 6.2 (PostgreSQL)
- Zod 3.24
- @react-pdf/renderer, lucide-react, react-currency-input-field

## 開発

```bash
# Docker経由（推奨）
cd .. && docker compose -f docker-compose.dev.yml up --build

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
