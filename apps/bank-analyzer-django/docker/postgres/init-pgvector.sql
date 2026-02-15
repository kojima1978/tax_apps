-- ============================================
-- Bank Analyzer PostgreSQL Initialization
-- ============================================

-- pgvector拡張の有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- バージョン確認（ログ出力用）
SELECT version();
SELECT * FROM pg_extension WHERE extname = 'vector';

-- インデックス用設定（Phase 2で使用）
-- IVFFlat インデックスのリスト数設定
-- データ量に応じて調整: lists = sqrt(row_count)
-- 1万件想定: sqrt(10000) ≈ 100
COMMENT ON EXTENSION vector IS 'Phase 2でベクトル類似度検索に使用';

-- 接続確認
\echo 'PostgreSQL with pgvector initialized successfully'
