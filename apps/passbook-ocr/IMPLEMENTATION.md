# 実装詳細ドキュメント

## プロジェクト概要

通帳OCR Pro v3.1は、完全ローカル処理による日本の銀行通帳専用のOCRアプリケーションです。PaddleOCR 3.3.x (PP-OCRv5)を使用し、NVIDIA RTX 3060でGPU高速化を実現しています。

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────┐
│                   ユーザー                           │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js 16 Frontend                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  - ImageUploader (画像アップロード)          │  │
│  │  - TransactionEditor (取引データ編集)        │  │
│  │  - ValidationPanel (検証結果表示)            │  │
│  │  - ExportPanel (データ出力)                  │  │
│  └──────────────────────────────────────────────┘  │
│              Zustand State Management               │
└─────────────────────┬───────────────────────────────┘
                      │ REST API
                      ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  API Routes:                                  │  │
│  │  - POST /api/sessions (セッション作成)       │  │
│  │  - POST /api/sessions/{id}/upload (画像処理) │  │
│  │  - GET /api/pages/{id} (ページ詳細取得)      │  │
│  │  - POST /api/pages/{id}/correct (修正保存)   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Core Modules:                                │  │
│  │  1. preprocessing.py (画像前処理)            │  │
│  │     - 印影除去 (HSV色空間フィルタリング)     │  │
│  │     - ノイズ除去 (medianBlur)                │  │
│  │     - ドット印字強化 (モルフォロジー演算)    │  │
│  │     - 傾き補正 (Hough変換)                   │  │
│  │     - 適応的二値化                            │  │
│  │                                               │  │
│  │  2. ocr_engine.py (OCR実行)                  │  │
│  │     - PP-OCRv5統合                            │  │
│  │     - GPU最適化 (RTX 3060向け)               │  │
│  │     - 表構造解析                              │  │
│  │     - 取引データ抽出                          │  │
│  │                                               │  │
│  │  3. validators.py (検証・学習)               │  │
│  │     - 残高バリデーション                      │  │
│  │     - スマートサジェスト                      │  │
│  │     - 学習型補正エンジン                      │  │
│  │                                               │  │
│  │  4. database.py (データ永続化)               │  │
│  │     - SQLite (非同期)                         │  │
│  │     - セッション管理                          │  │
│  │     - 監査ログ                                │  │
│  │     - 学習パターン保存                        │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  PaddleOCR 3.3.x (PP-OCRv5)                   │  │
│  │  - 検出モデル (Text Detection)                │  │
│  │  - 認識モデル (Text Recognition)              │  │
│  │  - 方向分類器 (Angle Classifier)              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              NVIDIA RTX 3060 GPU                     │
│  - CUDA 12.x                                         │
│  - 12GB VRAM (8GB allocated to PaddleOCR)           │
│  - Mixed Precision (FP16)                            │
└─────────────────────────────────────────────────────┘
```

## 主要コンポーネント詳細

### 1. 画像前処理パイプライン ([preprocessing.py](backend/preprocessing.py))

#### 処理フロー
```python
入力画像
  ↓
赤色印影除去 (HSV色空間フィルタリング)
  ↓
グレースケール変換
  ↓
ノイズ除去 (メディアンブラー)
  ↓
ドット印字強化 (モルフォロジークロージング)
  ↓
傾き補正 (Hough直線検出)
  ↓
適応的二値化
  ↓
リサイズ最適化 (長辺2000px)
  ↓
出力画像 → OCRエンジンへ
```

#### 印影除去アルゴリズム
```python
# HSV色空間での赤色範囲定義
lower_red1 = [0, 70, 50]    # 赤色範囲1
upper_red1 = [10, 255, 255]
lower_red2 = [170, 70, 50]  # 赤色範囲2（色相の折り返し）
upper_red2 = [180, 255, 255]

# マスク生成 → 膨張 → 白塗り
```

### 2. OCRエンジン ([ocr_engine.py](backend/ocr_engine.py))

#### PP-OCRv5の特徴
- **統合モデル**: 中国語・日本語・英語を1モデルで処理
- **高精度**: PP-OCRv4比で約13%精度向上
- **GPU最適化**: RTX 3060向けバッチサイズ調整

#### 最適化パラメータ
```python
OCR_REC_BATCH_NUM = 6        # RTX 3060最適バッチサイズ
OCR_GPU_MEM = 8000           # 8GB VRAM割り当て
OCR_PRECISION = "fp16"       # 混合精度演算
OCR_USE_ANGLE_CLS = True     # 方向補正有効
```

#### 表構造解析
```python
1. Y座標でボックスを行にグループ化
2. X座標で列を推定
3. 取引データ構造に変換:
   - 日付 (Date)
   - 摘要 (Description)
   - 出金 (Withdrawal)
   - 入金 (Deposit)
   - 残高 (Balance)
```

### 3. バリデーションシステム ([validators.py](backend/validators.py))

#### 残高チェックアルゴリズム
```python
for each transaction:
    calculated_balance = previous_balance + deposit - withdrawal
    stated_balance = transaction.balance

    if abs(calculated_balance - stated_balance) > tolerance:
        → ERROR: Balance mismatch
        → Suggest fixes
```

#### スマートサジェスト機能
```python
# 事前定義パターン
common_fixes = {
    "キユウヨ": "給与",
    "フリコミ": "振込",
    # ...
}

# 学習パターン (銀行別・フィールド別)
learned_corrections[bank][field][ocr_text] = correction_text
```

### 4. データベース設計 ([database.py](backend/database.py))

#### スキーマ

**passbook_sessions**
```sql
id              INTEGER PRIMARY KEY
session_id      TEXT UNIQUE
bank_name       TEXT
account_number  TEXT
created_at      DATETIME
status          TEXT
total_pages     INTEGER
```

**passbook_pages**
```sql
id                  INTEGER PRIMARY KEY
session_id          TEXT FOREIGN KEY
page_number         INTEGER
image_path          TEXT
raw_ocr_result      JSON
processed_data      JSON
corrected_data      JSON
processing_time     FLOAT
confidence_score    FLOAT
validation_status   TEXT
validation_errors   JSON
```

**correction_patterns** (学習システム)
```sql
id                  INTEGER PRIMARY KEY
bank_name           TEXT
resolution_range    TEXT
column_boundaries   JSON
row_height_avg      FLOAT
date_format         TEXT
usage_count         INTEGER
success_rate        FLOAT
```

**audit_logs** (監査ログ)
```sql
id              INTEGER PRIMARY KEY
page_id         INTEGER FOREIGN KEY
row_index       INTEGER
column_name     TEXT
old_value       TEXT
new_value       TEXT
correction_type TEXT
timestamp       DATETIME
```

## フロントエンド設計

### 状態管理 (Zustand)

```typescript
interface PassbookState {
  // セッション
  sessionId: string | null
  bankName: string

  // ページデータ
  pages: PageData[]
  currentPage: PageData | null

  // UI状態
  isProcessing: boolean
  error: string | null

  // アクション
  createSession()
  uploadImage(file: File)
  updateTransaction(row, field, value)
  setCurrentPage(pageId)
}
```

### コンポーネント構成

```
App
├── Header
├── Tabs (Upload | Edit | Export)
└── Main Content
    ├── ImageUploader
    │   ├── Dropzone
    │   ├── SessionInfo
    │   └── ProcessingInfo
    │
    ├── TransactionEditor
    │   ├── DataTable
    │   │   ├── EditableCell
    │   │   └── ValidationIcon
    │   └── ConfidenceDisplay
    │
    ├── ValidationPanel
    │   ├── StatusSummary
    │   ├── ErrorList
    │   ├── WarningList
    │   └── ProcessingStats
    │
    └── ExportPanel
        ├── FormatSelector
        ├── OptionsConfig
        └── ExportButton
```

### インタラクティブ編集機能

```typescript
// セル編集フロー
1. セルクリック
   ↓
2. 編集モードに切り替え (input表示)
   ↓
3. ユーザー入力
   ↓
4. Enter/Blur → 保存
   ↓
5. バックエンドにPOST /api/pages/{id}/correct
   ↓
6. 再バリデーション
   ↓
7. UI更新 (楽観的更新)
```

## API仕様

### セッション作成
```http
POST /api/sessions
Content-Type: application/json

{
  "bank_name": "みずほ銀行",
  "account_number": "1234567"
}

Response:
{
  "session_id": "uuid",
  "status": "created"
}
```

### 画像アップロード・処理
```http
POST /api/sessions/{session_id}/upload
Content-Type: multipart/form-data

file: <binary>

Response:
{
  "page_id": 123,
  "page_number": 1,
  "ocr_result": {
    "raw_ocr_result": [...],
    "structured_data": [...],
    "metadata": {
      "processing_time": 2.34,
      "confidence_avg": 0.89
    }
  },
  "validation": {
    "is_valid": false,
    "total_errors": 2,
    "errors": [...]
  }
}
```

### 修正保存
```http
POST /api/pages/{page_id}/correct
Content-Type: application/json

{
  "page_id": 123,
  "row_index": 5,
  "column_name": "balance",
  "old_value": "123,456",
  "new_value": "123,450"
}

Response:
{
  "success": true,
  "validation": {
    "is_valid": true,
    "errors": []
  }
}
```

## パフォーマンス最適化

### GPU最適化設定

```python
# RTX 3060向け最適パラメータ
rec_batch_num = 6              # 同時処理バッチサイズ
gpu_mem = 8000                 # 8GB VRAM割り当て
precision = "fp16"             # 混合精度演算で高速化
use_mp = True                  # マルチプロセス有効
total_process_num = 2          # プロセス数
```

### 処理時間内訳（目標値 - RTX 3060）

```
総処理時間: 1.5〜3.0秒/ページ

内訳:
- 画像読み込み: 0.1秒
- 前処理: 0.3〜0.5秒
  - 印影除去: 0.1秒
  - ノイズ除去: 0.05秒
  - 傾き補正: 0.1秒
  - 二値化・リサイズ: 0.05秒
- OCR推論: 1.0〜2.0秒
  - 検出: 0.5〜1.0秒
  - 認識: 0.5〜1.0秒
- 構造化・バリデーション: 0.1〜0.3秒
```

## デプロイメント

### Docker構成

```yaml
services:
  backend:
    - PaddleOCR初期化
    - モデルダウンロード
    - GPU有効化
    - ポート8000公開

  frontend:
    - Next.js開発サーバー
    - ポート3000公開
    - APIプロキシ設定
```

### GPU要件

```
- NVIDIA GPUドライバー: 最新推奨
- CUDA Toolkit: 12.x以上
- Docker: NVIDIA Container Toolkit
- WSL2 (Windows): GPU パススルー有効
```

## セキュリティ考慮事項

### データ保護
- すべての処理はローカル完結
- クラウドAPIへの送信なし
- SQLiteによるローカルストレージ
- 画像データの自動削除オプション

### 入力検証
- ファイルタイプ検証
- ファイルサイズ制限 (10MB)
- SQLインジェクション対策 (SQLAlchemy ORM)
- XSS対策 (React自動エスケープ)

## 今後の拡張

### Phase 2機能
- [x] 学習型補正エンジン (基本実装済み)
- [ ] 会計ソフト連携の完全実装
- [ ] 勘定科目自動推論
- [ ] Excelエクスポート (openpyxl統合)

### Phase 3機能
- [ ] PaddleOCR-VL統合 (複雑レイアウト対応)
- [ ] バッチ処理 (複数ページ一括)
- [ ] カスタムモデルトレーニング
- [ ] REST API拡張 (Webhook対応)

## トラブルシューティング

### GPU認識しない
```bash
# Docker GPU確認
docker run --rm --gpus all nvidia/cuda:12.2.0-base nvidia-smi

# NVIDIA Container Toolkit再インストール
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### OCR精度が低い
- 画像解像度を確認 (推奨: 300dpi以上)
- 前処理パラメータの調整
- 銀行別学習パターンの蓄積

### メモリ不足エラー
- `OCR_GPU_MEM`を削減 (例: 6000)
- `OCR_REC_BATCH_NUM`を削減 (例: 4)
- 画像サイズを削減 (`MAX_IMAGE_DIMENSION`)

## ライセンス・謝辞

### 使用ライブラリ
- **PaddleOCR**: Apache License 2.0
- **FastAPI**: MIT License
- **Next.js**: MIT License
- **React**: MIT License

---

最終更新: 2025年1月
バージョン: 3.1.0
