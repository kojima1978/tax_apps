-- 分類の変更履歴に「誰が変えたか」を残す。
--
-- 名前は画面で選んだ操作者（社員台帳の氏名、x-operator-name）をそのまま写す。
-- 台帳ID で持たないのは、のちに台帳から消えても履歴の読み手には名前が要るため。
-- 以前の行と、操作者を選んでいない画面からの変更は空文字（＝不明）。
ALTER TABLE "analyzer_classificationchange"
    ADD COLUMN "operator_name" VARCHAR(100) NOT NULL DEFAULT '';
