-- ============================================
-- PostgreSQL + pgvector 初期化スクリプト
-- Bank Analyzer (銀行分析システム)
-- ============================================
--
-- pgvector: ベクトル類似度検索拡張
-- Phase 2 で意味検索（Semantic Search）に使用予定
--
-- ============================================

-- pgvector 拡張の有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- バージョン確認用（ログ出力）
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL version: %', version();
    RAISE NOTICE 'pgvector extension enabled successfully';
END $$;

-- 拡張確認クエリ（デバッグ用）
-- SELECT * FROM pg_extension WHERE extname = 'vector';

COMMENT ON EXTENSION vector IS 'Phase 2 で取引摘要のベクトル類似度検索に使用';
