# データベース ER図

## エンティティ関連図 (Entity-Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         passbook_sessions                                │
├─────────────────────────────────────────────────────────────────────────┤
│ PK  id              INTEGER                                              │
│ UK  session_id      TEXT (UUID)          ◄─────────┐                   │
│     bank_name       TEXT                           │                   │
│     account_number  TEXT                           │                   │
│     created_at      DATETIME                       │                   │
│     updated_at      DATETIME                       │                   │
│     status          TEXT                           │                   │
│     total_pages     INTEGER                        │                   │
└─────────────────────────────────────────────────────┘                   │
                                                      │                   │
                                                      │ 1:N               │
                                                      │                   │
┌─────────────────────────────────────────────────────▼───────────────────┤
│                         passbook_pages                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ PK  id                  INTEGER                                          │
│ FK  session_id          TEXT                                             │
│     page_number         INTEGER                                          │
│     image_path          TEXT                                             │
│                                                                          │
│     ┌─────────── OCR結果データ ────────────┐                            │
│     │ raw_ocr_result      JSON             │  原データ                  │
│     │ processed_data      JSON             │  構造化データ              │
│     │ corrected_data      JSON             │  修正済みデータ            │
│     └──────────────────────────────────────┘                            │
│                                                                          │
│     ┌─────────── メタデータ ──────────────┐                             │
│     │ processing_time     FLOAT            │  処理時間(秒)              │
│     │ confidence_score    FLOAT            │  平均信頼度                │
│     │ resolution          TEXT             │  解像度情報                │
│     └──────────────────────────────────────┘                            │
│                                                                          │
│     ┌─────────── バリデーション ───────────┐                            │
│     │ validation_status   TEXT             │  valid/invalid/pending     │
│     │ validation_errors   JSON             │  エラー詳細配列            │
│     └──────────────────────────────────────┘                            │
│                                                                          │
│     created_at          DATETIME                                         │
│     updated_at          DATETIME                                         │
└──────────────────────────────────────────────────────────────────────────┘
                                                      │
                                                      │ 1:N
                                                      │
┌─────────────────────────────────────────────────────▼───────────────────┐
│                         audit_logs                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ PK  id                  INTEGER                                          │
│ FK  page_id             INTEGER                                          │
│     row_index           INTEGER          修正した行番号                  │
│     column_name         TEXT             修正したカラム名                │
│     old_value           TEXT             修正前の値                      │
│     new_value           TEXT             修正後の値                      │
│     correction_type     TEXT             manual/suggestion_accepted/etc.│
│     timestamp           DATETIME         修正日時                        │
└──────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                    correction_patterns (独立テーブル)                     │
├──────────────────────────────────────────────────────────────────────────┤
│ PK  id                  INTEGER                                          │
│     bank_name           TEXT             銀行名（インデックス）          │
│     resolution_range    TEXT             解像度範囲 (例: "1000-1500")   │
│                                                                          │
│     ┌─────────── レイアウト設定 ──────────┐                             │
│     │ column_boundaries   JSON            │  列境界のX座標配列          │
│     │ row_height_avg      FLOAT           │  平均行高さ                 │
│     │ has_seal            BOOLEAN         │  印影の有無                 │
│     └─────────────────────────────────────┘                             │
│                                                                          │
│     ┌─────────── 認識パターン ───────────┐                              │
│     │ date_format         TEXT            │  日付フォーマット           │
│     │ amount_position     TEXT            │  金額位置(left/right/center)│
│     └─────────────────────────────────────┘                             │
│                                                                          │
│     ┌─────────── 統計情報 ──────────────┐                               │
│     │ usage_count         INTEGER         │  使用回数                   │
│     │ success_rate        FLOAT           │  成功率                     │
│     │ last_used           DATETIME        │  最終使用日時               │
│     └─────────────────────────────────────┘                             │
│                                                                          │
│     created_at          DATETIME                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## リレーションシップ詳細

### 1. passbook_sessions → passbook_pages (1:N)
```
種類: One-to-Many
外部キー: passbook_pages.session_id → passbook_sessions.session_id
制約: CASCADE DELETE (セッション削除時、関連ページも削除)

説明:
- 1つのセッションに複数のページが属する
- セッション削除時、すべてのページが自動削除される
```

### 2. passbook_pages → audit_logs (1:N)
```
種類: One-to-Many
外部キー: audit_logs.page_id → passbook_pages.id
制約: CASCADE DELETE (ページ削除時、関連ログも削除)

説明:
- 1つのページに複数の修正ログが記録される
- ページ削除時、すべての監査ログが自動削除される
```

### 3. correction_patterns (独立)
```
種類: 独立テーブル（リレーションシップなし）

説明:
- 銀行名でインデックス化された学習データ
- セッション/ページとは独立して管理
- OCR処理時に参照のみ
```

## データフロー

```
┌──────────────┐
│   ユーザー    │
└──────┬───────┘
       │ 1. セッション作成
       ▼
┌────────────────────────┐
│  passbook_sessions     │
│  session_id: uuid      │
│  bank_name: "みずほ"   │
│  status: "processing"  │
└────────┬───────────────┘
         │ 2. 画像アップロード
         ▼
┌────────────────────────────────┐
│  passbook_pages                │
│  session_id: uuid (FK)         │
│  page_number: 1                │
│  raw_ocr_result: [{...}]       │◄─── OCRエンジンから
│  processed_data: [{...}]       │
│  validation_status: "invalid"  │
└────────┬───────────────────────┘
         │ 3. ユーザーが修正
         ▼
┌────────────────────────────────┐
│  audit_logs                    │
│  page_id: 123 (FK)             │
│  row_index: 5                  │
│  column_name: "balance"        │
│  old_value: "123,456"          │
│  new_value: "123,450"          │
│  correction_type: "manual"     │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  passbook_pages (更新)         │
│  corrected_data: [{...}]       │ ◄─── 修正データ保存
│  validation_status: "valid"    │
└────────────────────────────────┘
         │ 4. 学習システム
         ▼
┌────────────────────────────────┐
│  correction_patterns           │
│  bank_name: "みずほ"           │
│  column_boundaries: [...]      │ ◄─── パターン学習
│  usage_count: 5                │
│  success_rate: 0.92            │
└────────────────────────────────┘
```

## JSONフィールド構造

### passbook_pages.raw_ocr_result
```json
[
  {
    "box": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
    "text": "2024/01/15",
    "confidence": 0.95
  },
  ...
]
```

### passbook_pages.processed_data
```json
[
  {
    "date": "2024/01/15",
    "description": "給与振込",
    "withdrawal": "",
    "deposit": "250,000",
    "balance": "1,234,567",
    "raw_texts": ["2024/01/15", "給与振込", "250,000", "1,234,567"],
    "confidence_scores": [0.95, 0.88, 0.92, 0.89],
    "confidence_avg": 0.91
  },
  ...
]
```

### passbook_pages.corrected_data
```json
[
  {
    "date": "2024/01/15",
    "description": "給与振込",  // ← 修正済み (元: "キユウヨフリコミ")
    "withdrawal": "",
    "deposit": "250,000",
    "balance": "1,234,567",
    "raw_texts": ["2024/01/15", "給与振込", "250,000", "1,234,567"],
    "confidence_scores": [0.95, 0.88, 0.92, 0.89],
    "confidence_avg": 0.91
  },
  ...
]
```

### passbook_pages.validation_errors
```json
[
  {
    "row": 5,
    "type": "balance_mismatch",
    "severity": "error",
    "message": "Balance mismatch: calculated 1,234,560, stated 1,234,567",
    "difference": 7,
    "field": "balance"
  },
  {
    "row": 3,
    "type": "low_confidence",
    "severity": "warning",
    "message": "Low OCR confidence: 65%",
    "confidence": 0.65
  }
]
```

### correction_patterns.column_boundaries
```json
[120, 280, 450, 580, 720]
// X座標: [日付の右端, 摘要の右端, 出金の右端, 入金の右端, 残高の右端]
```

## インデックス戦略

```sql
-- 高速検索のためのインデックス
CREATE INDEX idx_sessions_session_id ON passbook_sessions(session_id);
CREATE INDEX idx_pages_session_id ON passbook_pages(session_id);
CREATE INDEX idx_pages_validation_status ON passbook_pages(validation_status);
CREATE INDEX idx_audit_page_id ON audit_logs(page_id);
CREATE INDEX idx_patterns_bank_name ON correction_patterns(bank_name);
```

## データ容量見積もり

### 1セッション（10ページ）あたり

```
passbook_sessions:     ~200 bytes
passbook_pages:        ~50KB × 10 = 500KB
  - raw_ocr_result:    ~20KB/page
  - processed_data:    ~15KB/page
  - corrected_data:    ~15KB/page
audit_logs:            ~500 bytes × 平均20修正 = 10KB
correction_patterns:   ~2KB (学習データ)

合計: 約510KB/セッション
```

### 1000セッション処理時
```
データベースサイズ: 約500MB
+ 画像ファイル: 約5GB (500KB/画像 × 10,000枚)
```

## バックアップ戦略

```bash
# SQLiteデータベースのバックアップ
sqlite3 data/passbook.db ".backup data/passbook_backup_$(date +%Y%m%d).db"

# 画像ファイルのバックアップ
tar -czf data/uploads_backup_$(date +%Y%m%d).tar.gz data/uploads/
```

## クエリ例

### よく使うクエリ

```sql
-- 1. セッションの全ページを取得
SELECT * FROM passbook_pages
WHERE session_id = ?
ORDER BY page_number;

-- 2. エラーのあるページを検索
SELECT * FROM passbook_pages
WHERE validation_status = 'invalid'
  AND session_id = ?;

-- 3. 特定ページの修正履歴を取得
SELECT * FROM audit_logs
WHERE page_id = ?
ORDER BY timestamp DESC;

-- 4. 銀行別の学習パターンを取得
SELECT * FROM correction_patterns
WHERE bank_name = ?
ORDER BY success_rate DESC, usage_count DESC
LIMIT 1;

-- 5. セッションの統計情報
SELECT
    s.session_id,
    s.bank_name,
    COUNT(p.id) as total_pages,
    SUM(CASE WHEN p.validation_status = 'valid' THEN 1 ELSE 0 END) as valid_pages,
    AVG(p.confidence_score) as avg_confidence,
    AVG(p.processing_time) as avg_processing_time
FROM passbook_sessions s
LEFT JOIN passbook_pages p ON s.session_id = p.session_id
WHERE s.session_id = ?
GROUP BY s.session_id;
```

## マイグレーション戦略

### Phase 2: 新機能追加時

```python
# correction_patterns テーブルに新カラム追加
ALTER TABLE correction_patterns
ADD COLUMN ocr_model_version TEXT DEFAULT 'PP-OCRv5';

# passbook_pages テーブルに処理ステップ記録を追加
ALTER TABLE passbook_pages
ADD COLUMN preprocessing_metadata JSON;
```

---

最終更新: 2025年1月11日
バージョン: 3.1.0
