# ポータルランチャー 開発ガイド

## 概要
各種業務アプリケーションへのゲートウェイとなるポータルサイトです。

## 技術スタック
- **Next.js 16+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** (SQLite)
- **lucide-react** (アイコン)

## ディレクトリ構成
```
portal/
├── app/                    # Next.jsアプリケーション
│   ├── app/
│   │   ├── admin/         # 管理画面
│   │   ├── api/           # APIルート
│   │   ├── generated/     # Prisma生成ファイル
│   │   ├── layout.tsx
│   │   └── page.tsx       # メインページ
│   ├── components/
│   │   ├── AdminPanel.tsx
│   │   ├── AppCard.tsx
│   │   ├── ApplicationForm.tsx
│   │   ├── ApplicationList.tsx
│   │   ├── Header.tsx
│   │   ├── LauncherGrid.tsx
│   │   └── ThemeProvider.tsx
│   ├── data/
│   │   └── links.ts       # 型定義
│   ├── lib/
│   │   └── prisma.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── dev.db             # SQLiteデータベース
└── design_spec.md
```

## 機能

### メイン画面 (/)
- アプリケーション一覧をカードグリッドで表示
- リアルタイム検索フィルター
- 内部リンク・外部リンク対応

### 管理画面 (/admin)
- アプリケーションの追加・編集・削除
- アイコン選択（lucide-react）
- URL設定（内部パス or 外部URL）

## Docker設定
- メインの `docker/docker-compose.yml` から起動
- ポート: 3000
- nginx経由で `/` にルーティング

## ローカル開発
```bash
cd apps/portal/app
npm install
npm run dev
```

http://localhost:3000 でアクセス
