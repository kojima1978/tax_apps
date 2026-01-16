# 通帳OCR Pro v3.1

完全ローカル処理・通帳OCR専用アプリケーション

## 🎯 主な特徴

- **完全ローカル処理**: 顧客データを外部（クラウドAPI）に一切送信しません
- **最先端エンジン**: PaddleOCR 3.3.x / PP-OCRv5 を採用
- **高精度・高速**: NVIDIA RTX 3060のGPUで5秒以内に通帳1ページを解析
- **プロフェッショナルUI**: AIの誤認識を高速に修正できる専用インターフェース
- **業務特化型機能**: 残高バリデーション、会計ソフト連携、学習型補正エンジン

## 📋 技術スタック

### Backend
- **FastAPI** (Python 3.11+)
- **PaddleOCR 3.3.x** (PP-OCRv5) - GPU加速対応
- **OpenCV** - 高度な画像前処理
- **SQLite** - 読み取り履歴・学習データ保存

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS** - モダンなUI
- **Zustand** - 状態管理

### Infrastructure
- **Docker Compose** - NVIDIA GPU対応
- **CUDA 12.x** - GPUアクセラレーション

## 🖥️ 推奨ハードウェア

- **GPU**: NVIDIA GeForce RTX 3060 (VRAM 12GB)
- **CUDA**: 12.x以上推奨
- **メモリ**: 16GB以上推奨
- **OS**: Windows 10/11 (WSL2) または Ubuntu 22.04

## 🚀 セットアップ

### 1. 必要なソフトウェア

- Docker Desktop（Windows）または Docker + NVIDIA Container Toolkit（Linux）
- NVIDIA GPUドライバー（最新版推奨）
- CUDA Toolkit 12.x

### 2. リポジトリのクローン

```bash
git clone <repository-url>
cd passbook-ocr
```

### 3. 環境設定

```bash
# バックエンドの環境変数設定
cd backend
cp .env.example .env
# .envファイルを必要に応じて編集

cd ..
```

### 4. Dockerでの起動

```bash
# コンテナをビルド・起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 5. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **APIドキュメント**: http://localhost:8000/docs

## 📖 使い方

### 基本的なワークフロー

1. **アップロード**: 通帳画像をドラッグ&ドロップ
2. **自動処理**:
   - 印影除去
   - ノイズ低減
   - 傾き補正
   - PP-OCRv5による文字認識
   - 表構造解析
   - 残高バリデーション
3. **編集・確認**:
   - エラー箇所を直感的に修正
   - リアルタイムバリデーション
   - スマートサジェスト機能
4. **出力**:
   - CSV、Excel形式でエクスポート
   - 会計ソフト連携（弥生、freee、MF）

### 高度な機能

#### 残高バリデーション
- 前日残高 + 入金 - 出金 = 本日残高を自動チェック
- エラー箇所をハイライト表示
- 差額を自動計算・表示

#### 学習型補正エンジン
- ユーザーの修正内容を学習
- 銀行別にレイアウトパターンを記憶
- 次回以降の処理精度が向上

#### 会計ソフト連携
- 弥生会計: 仕訳日記帳インポート形式
- freee: 自動仕訳CSV形式
- マネーフォワード: 明細データCSV形式

## 🔧 開発

### ローカル開発（Docker なし）

#### バックエンド

```bash
cd backend

# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# 開発サーバー起動
python main.py
```

#### フロントエンド

```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

## 📊 パフォーマンス

### RTX 3060での処理速度

- **1ページあたり**: 平均1.5〜3秒
- **画像前処理**: 0.3〜0.5秒
- **OCR推論**: 1.0〜2.0秒
- **バリデーション**: 0.1〜0.3秒

### 精度指標

- **PP-OCRv5**: PP-OCRv4比で精度約13%向上
- **日本語認識率**: 95%以上（印刷品質による）
- **残高一致率**: 手動修正後ほぼ100%

## 🗂️ プロジェクト構造

```
passbook-ocr/
├── backend/                 # FastAPI バックエンド
│   ├── main.py             # メインアプリケーション
│   ├── config.py           # 設定管理
│   ├── database.py         # データベースモデル
│   ├── ocr_engine.py       # PaddleOCR統合
│   ├── preprocessing.py    # 画像前処理
│   ├── validators.py       # バリデーション・学習
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # Next.js フロントエンド
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # UIコンポーネント
│   │   └── store/         # Zustand状態管理
│   ├── package.json
│   └── Dockerfile
├── data/                   # SQLiteデータベース・アップロード
├── docker-compose.yml
└── README.md
```

## 🔐 セキュリティ

- すべての処理はローカルで完結
- クラウドAPIへのデータ送信なし
- 画像データは処理後、自動削除可能（設定による）
- SQLiteによるローカルストレージ

## 🛣️ ロードマップ

### Phase 1 (MVP) ✅
- 印影除去
- PP-OCRv5統合
- 基本エディタ
- 残高バリデーション

### Phase 2 (Pro) 🚧
- 学習型補正エンジン（実装中）
- 会計ソフト連携（実装中）
- 勘定科目自動推論

### Phase 3 (Enterprise) 📅
- PaddleOCR-VL統合（難読通帳対応）
- バッチ処理（複数ページ一括）
- REST API拡張
- 監査ログ詳細化

## 📝 ライセンス

[Your License Here]

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。

---

**Made with ❤️ for local-first OCR processing**
