# 取引相場のない株式の評価明細書

国税庁の「取引相場のない株式（出資）の評価明細書」（第１表〜第８表）をブラウザ上で入力できるWebフォームアプリケーションです。

## 機能

- **第１表の１** — 株主判定・会社規模
- **第１表の２** — 会社規模（続）
- **第２表** — 特定の評価会社
- **第３表** — 一般の評価会社
- **第４表** — 類似業種比準
- **第５表** — 純資産価額
- **第６表** — 特定の評価会社
- **第７表** — 株式保有特定会社
- **第８表** — 株式保有特定会社（続）

### 共通機能

- サイドバーナビゲーションによる表の切り替え
- A4サイズの政府書式レイアウト（210mm × 297mm）
- セッションストレージによる入力データの一時保存
- 数値フィールドの自動カンマ区切り表示
- 印刷対応（`Ctrl+P`でA4印刷可能）
- 行のドラッグ＆ドロップ並び替え（@dnd-kit）

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Vite 7 + React 19 |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 + カスタムCSS（政府書式） |
| フォント | Noto Sans JP（Google Fonts） |
| ドラッグ＆ドロップ | @dnd-kit |
| 本番サーバー | nginx 1.27 (Alpine) |
| コンテナ | Docker (multi-stage build) |

## プロジェクト構成

```
src/
├── App.tsx                  # メインアプリ（タブ切り替え + サイドバー）
├── main.tsx                 # エントリーポイント
├── main.css                 # Tailwind + 政府書式カスタムCSS
├── components/
│   ├── Navigation.tsx       # サイドバーナビゲーション
│   ├── tables/
│   │   ├── shared.ts        # テーブル共通ユーティリティ
│   │   ├── TableTitleBar.tsx # テーブルタイトルバー
│   │   ├── Table1_1.tsx     # 第１表の１
│   │   ├── Table1_2.tsx     # 第１表の２
│   │   ├── Table2.tsx       # 第２表
│   │   ├── Table3.tsx       # 第３表
│   │   ├── Table4.tsx       # 第４表（メイン）
│   │   ├── Table4Section1.tsx # 第４表 セクション１
│   │   ├── Table4Section2.tsx # 第４表 セクション２
│   │   ├── Table4Section3.tsx # 第４表 セクション３
│   │   ├── Table5.tsx       # 第５表（メイン）
│   │   ├── Table5CalcProcess.tsx # 第５表 計算過程
│   │   ├── Table5Section1.tsx # 第５表 セクション１
│   │   ├── Table5Section2.tsx # 第５表 セクション２
│   │   ├── Table6.tsx       # 第６表
│   │   ├── Table7.tsx       # 第７表
│   │   └── Table8.tsx       # 第８表
│   └── ui/
│       ├── CircledNumber.tsx # 丸付き数字コンポーネント
│       ├── Computed.tsx      # 自動計算表示フィールド
│       ├── EditableTable.tsx # 編集可能テーブル（D&D対応）
│       ├── FormField.tsx     # テキスト入力フィールド
│       └── NumberField.tsx   # 数値入力（カンマ区切り）
├── data/
│   └── constants.ts         # タブ定義（TABS）
├── hooks/
│   └── useFormData.ts       # フォーム状態管理 + sessionStorage永続化
└── types/
    └── form.ts              # TableId / FormData 型定義
```

## Docker

### 開発

```bash
docker compose up -d
# → http://localhost:3014/stock-valuation-form/
```

### 再ビルド

```bash
docker compose up -d --build
```

### ログ確認

```bash
docker compose logs -f
```

### 停止

```bash
docker compose down
```

### ポート・パス

| 項目 | 値 |
|---|---|
| 開発ポート | 3014 |
| basePath | `/stock-valuation-form` |
| ネットワーク | `tax-apps-network`（external） |

### docker-compose.yml

```yaml
# 共通設定
x-common-env: &common-env
  TZ: Asia/Tokyo

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 120s

services:
  stock-valuation-form:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev
    container_name: stock-valuation-form
    networks:
      - tax-apps-network
    ports:
      - "3014:3014"
    volumes:
      - ./src:/app/src:ro
      - ./index.html:/app/index.html:ro
    environment:
      <<: *common-env
      NODE_ENV: development
    command: npm run dev -- --host --port 3014
    init: true
    restart: unless-stopped
    logging: *default-logging
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3014/stock-valuation-form/ || exit 1"]
      <<: *healthcheck-defaults
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

networks:
  tax-apps-network:
    external: true
```

| 設定 | 説明 |
|---|---|
| `target: dev` | Dockerfile の開発ステージを使用 |
| `volumes` | `src/` と `index.html` を読み取り専用マウント（HMR対応） |
| `init: true` | PID 1 問題を回避（tini） |
| `restart: unless-stopped` | 手動停止以外は自動再起動 |
| `healthcheck` | wget で `/stock-valuation-form/` にアクセスして死活監視 |
| `memory: 512M` | コンテナのメモリ上限 |
| `logging` | JSON ファイルドライバ（最大10MB × 3ファイル） |

## CSSクラス規約（政府書式）

| クラス | 用途 |
|---|---|
| `.gov-page` | A4ページコンテナ |
| `.gov-form` | フォーム外枠（太線） |
| `.gov-section` | セクション枠 |
| `.gov-cell` | セル枠 |
| `.gov-header` | ヘッダーセル（背景色付き） |
| `.gov-input` | フォームに溶け込む入力フィールド |
| `.gov-table` | テーブル共通スタイル |
| `.gov-vertical` / `.gov-side-header` | 縦書き |
| `.gov-circle` | 判定の丸（○） |
| `.gov-choice` | 判定選択肢（クリック選択） |
| `.no-print` | 印刷時に非表示 |
| `.print-only` | 印刷時のみ表示 |
