-- 全体の設定（多額取引の閾値・資金移動の判定条件・分類パターンなど）を置く表。
--
-- Django 版はこれを data/user_settings.json に持っていた。キーはそのファイルの
-- 最上位のキーそのまま（LARGE_AMOUNT_THRESHOLD / CLASSIFICATION_PATTERNS など）。
-- 本番にはファイルが無く既定値で動いていたので、移す値は無い（行が無ければ既定値）。
--
-- 値を jsonb ではなく json にしているのは、分類パターンのカテゴリーの順番が
-- 分類の結果に効くため（jsonb はオブジェクトのキーを並べ替える）。
CREATE TABLE "analyzer_appsetting" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSON NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyzer_appsetting_pkey" PRIMARY KEY ("key")
);
