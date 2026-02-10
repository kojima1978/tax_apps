# ポータルランチャー 開発ガイド

## 概要
各種業務アプリケーションへのゲートウェイとなるポータルサイトです。
アプリケーション一覧はTypeScript静的定数で管理（DB不要）。

## 技術スタック
- **Next.js 16** (App Router, Static Export)
- **TypeScript**
- **Tailwind CSS 4**
- **lucide-react**（アイコン）
- **nginx:alpine**（本番配信）

## ディレクトリ構成
```
portal/
├── app/                        # Next.js アプリケーション
│   ├── app/
│   │   ├── globals.css         # グローバルスタイル
│   │   ├── layout.tsx          # ルートレイアウト
│   │   └── page.tsx            # ホームページ（ヘッダー+グリッド）
│   ├── components/
│   │   ├── AppCard.tsx         # アプリカード（Link/a 自動切替）
│   │   └── PageContainer.tsx   # 最大幅コンテナ
│   ├── lib/
│   │   └── applications.ts    # アプリ定義（Application型+静的データ）
│   ├── Dockerfile              # node→nginx マルチステージ（nginx設定inline）
│   ├── next.config.ts          # output: "export", images: unoptimized
│   └── package.json
└── design_spec.md              # 設計仕様書
```

## 機能

### メイン画面 (/)
- アプリケーション一覧をカードグリッドで表示（1〜4列レスポンシブ）
- LucideIcon直接参照によるアイコン表示
- 内部リンク（next/link）・外部リンク（a target=_blank）自動切替

## アプリ追加・変更方法
`lib/applications.ts` の `applications` 配列を編集してリビルド。
```typescript
{ title: 'アプリ名', description: '説明', url: '/path/', icon: IconName }
```

## Docker設定
- `docker/docker-compose.yml` → `portal-app` サービス
- ポート: 3000
- nginx gateway 経由で `/` にルーティング
- イメージ: nginx:alpine（静的HTML配信、Node.js不要、~45MB）
- リソース: small-deploy（128M/32M）

## ローカル開発
```bash
cd apps/portal/app
npm install
npm run dev
```

http://localhost:3000 でアクセス
