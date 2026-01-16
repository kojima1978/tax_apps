# プロジェクト構造

```
passbook-ocr/
│
├── README.md                     # プロジェクト概要・使用方法
├── IMPLEMENTATION.md             # 実装詳細・技術仕様
├── PROJECT_STRUCTURE.md          # このファイル
├── .gitignore                    # Git除外設定
│
├── docker-compose.yml            # Docker Compose設定
├── setup.sh                      # Linuxセットアップスクリプト
├── setup.bat                     # Windowsセットアップスクリプト
│
├── backend/                      # FastAPI バックエンド
│   ├── Dockerfile               # Dockerイメージ定義
│   ├── requirements.txt         # Python依存関係
│   ├── .env.example             # 環境変数テンプレート
│   │
│   ├── main.py                  # FastAPIメインアプリケーション
│   │   └── API Routes:
│   │       ├── POST /api/sessions
│   │       ├── POST /api/sessions/{id}/upload
│   │       ├── GET /api/sessions/{id}/pages
│   │       ├── GET /api/pages/{id}
│   │       ├── POST /api/pages/{id}/correct
│   │       ├── GET /api/pages/{id}/image
│   │       └── GET /api/pages/{id}/suggestions
│   │
│   ├── config.py                # 設定管理（Pydantic Settings）
│   │   └── 主要設定:
│   │       ├── OCR_USE_GPU=True
│   │       ├── OCR_GPU_MEM=8000 (RTX 3060)
│   │       ├── OCR_REC_BATCH_NUM=6
│   │       ├── OCR_PRECISION=fp16
│   │       └── MAX_IMAGE_DIMENSION=2000
│   │
│   ├── database.py              # SQLAlchemy非同期データベース
│   │   └── Models:
│   │       ├── PassbookSession (セッション管理)
│   │       ├── PassbookPage (OCR結果・修正データ)
│   │       ├── CorrectionPattern (学習パターン)
│   │       └── AuditLog (修正履歴)
│   │
│   ├── preprocessing.py         # 画像前処理パイプライン
│   │   └── ImagePreprocessor:
│   │       ├── _remove_red_seal() - 印影除去
│   │       ├── _reduce_noise() - ノイズ低減
│   │       ├── _enhance_dot_matrix() - ドット印字強化
│   │       ├── _deskew() - 傾き補正
│   │       ├── _adaptive_threshold() - 適応的二値化
│   │       └── _resize_optimal() - リサイズ最適化
│   │
│   ├── ocr_engine.py            # PaddleOCR統合
│   │   └── PassbookOCREngine:
│   │       ├── __init__() - PP-OCRv5初期化
│   │       ├── process_image() - 画像処理
│   │       ├── _structure_passbook_data() - 表構造解析
│   │       ├── _group_into_rows() - 行グループ化
│   │       └── _parse_row_to_transaction() - 取引データ抽出
│   │   └── LayoutAnalyzer (Phase 2):
│   │       └── analyze_structure() - 高度なレイアウト解析
│   │
│   └── validators.py            # バリデーション・学習システム
│       ├── TransactionValidator:
│       │   ├── validate_transactions() - 残高チェック
│       │   ├── _validate_single_transaction()
│       │   ├── _is_valid_date()
│       │   └── _is_valid_amount()
│       │
│       ├── SmartSuggester:
│       │   ├── get_suggestion() - 修正提案
│       │   └── learn_correction() - 学習機能
│       │
│       └── BalanceReconciler:
│           └── suggest_fixes() - 残高不一致の修正提案
│
├── frontend/                    # Next.js フロントエンド
│   ├── Dockerfile
│   ├── package.json             # Node.js依存関係
│   ├── tsconfig.json            # TypeScript設定
│   ├── tailwind.config.ts       # Tailwind CSS設定
│   ├── postcss.config.mjs       # PostCSS設定
│   ├── next.config.mjs          # Next.js設定
│   ├── .eslintrc.json           # ESLint設定
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # ルートレイアウト
│       │   ├── page.tsx         # メインページ
│       │   │   └── Tabs:
│       │   │       ├── Upload - 画像アップロード
│       │   │       ├── Edit - 編集・確認
│       │   │       └── Export - データ出力
│       │   │
│       │   └── globals.css      # グローバルスタイル
│       │
│       ├── components/
│       │   ├── ImageUploader.tsx
│       │   │   └── 機能:
│       │   │       ├── ドラッグ&ドロップ
│       │   │       ├── ファイル検証
│       │   │       ├── アップロード進捗表示
│       │   │       └── 処理フロー説明
│       │   │
│       │   ├── TransactionEditor.tsx
│       │   │   └── 機能:
│       │   │       ├── インライン編集
│       │   │       ├── リアルタイムバリデーション
│       │   │       ├── 信頼度表示
│       │   │       ├── エラーハイライト
│       │   │       └── キーボードショートカット
│       │   │
│       │   ├── ValidationPanel.tsx
│       │   │   └── 表示項目:
│       │   │       ├── バリデーション状態
│       │   │       ├── エラー詳細リスト
│       │   │       ├── 警告リスト
│       │   │       ├── 処理統計
│       │   │       └── ヒント・Tips
│       │   │
│       │   └── ExportPanel.tsx
│       │       └── 機能:
│       │           ├── 形式選択 (CSV/Excel/会計ソフト)
│       │           ├── オプション設定
│       │           ├── エクスポートプレビュー
│       │           └── ダウンロード実行
│       │
│       └── store/
│           └── passbookStore.ts # Zustand状態管理
│               └── State:
│                   ├── sessionId
│                   ├── pages[]
│                   ├── currentPage
│                   ├── isProcessing
│                   └── Actions:
│                       ├── createSession()
│                       ├── uploadImage()
│                       ├── setCurrentPage()
│                       ├── updateTransaction()
│                       └── refreshCurrentPage()
│
└── data/                        # データディレクトリ
    ├── uploads/                 # アップロード画像（一時）
    │   └── .gitkeep
    └── passbook.db              # SQLiteデータベース（実行時生成）
```

## ファイル数統計

### Backend (Python)
- コアモジュール: 6ファイル
- 設定ファイル: 3ファイル
- 総行数: 約2,500行

### Frontend (TypeScript/React)
- ページ: 2ファイル
- コンポーネント: 4ファイル
- 状態管理: 1ファイル
- 設定ファイル: 5ファイル
- 総行数: 約2,000行

### Infrastructure
- Docker: 3ファイル (docker-compose.yml, 2 Dockerfiles)
- セットアップスクリプト: 2ファイル

### Documentation
- README.md
- IMPLEMENTATION.md
- PROJECT_STRUCTURE.md

## 主要な依存関係

### Backend
```
fastapi==0.109.0
paddlepaddle-gpu==3.0.0
paddleocr==2.8.1
opencv-python==4.9.0.80
sqlalchemy==2.0.25
aiosqlite==0.19.0
```

### Frontend
```
next==15.1.4
react==19.0.0
zustand==4.5.0
tailwindcss==3.4.1
axios==1.6.5
```

## データフロー

```
1. ユーザーが画像をアップロード
   ↓
2. Frontend: ImageUploader → uploadImage()
   ↓
3. Backend: POST /api/sessions/{id}/upload
   ↓
4. preprocessing.py: 画像前処理
   ↓
5. ocr_engine.py: PP-OCRv5で文字認識
   ↓
6. validators.py: 残高バリデーション
   ↓
7. database.py: 結果をSQLiteに保存
   ↓
8. Frontend: TransactionEditor で表示
   ↓
9. ユーザーが修正 → updateTransaction()
   ↓
10. Backend: POST /api/pages/{id}/correct
    ↓
11. validators.py: 再バリデーション + 学習
    ↓
12. database.py: 修正を保存 + AuditLog
    ↓
13. Frontend: ValidationPanel で結果表示
    ↓
14. Frontend: ExportPanel でエクスポート
```

## 環境変数

### Backend (.env)
```bash
# 必須
OCR_USE_GPU=True
OCR_GPU_MEM=8000
OCR_LANG=ch

# オプション
DEBUG=False
DATABASE_URL=sqlite+aiosqlite:///./data/passbook.db
MAX_IMAGE_DIMENSION=2000
ENABLE_BALANCE_VALIDATION=True
```

### Frontend
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

## ビルド・実行コマンド

### Docker経由（推奨）
```bash
# セットアップ
./setup.sh  # または setup.bat (Windows)

# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

### ローカル開発
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

## ポート

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

最終更新: 2025年1月11日
