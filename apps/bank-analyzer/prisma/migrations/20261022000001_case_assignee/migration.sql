-- 案件の担当者。社員台帳の ID（staffDirectoryId）で持ち、名前は選んだ時点の写し。
--
-- ID で持つのは「自分の担当」で絞り込むため（名前は改姓で変わる）。名前も残すのは、
-- 台帳が止まっている間や、退職して台帳の在籍一覧から外れた人でも一覧に誰か出せるようにするため。
-- 既存の案件は担当者なし（NULL）。
ALTER TABLE "analyzer_case"
    ADD COLUMN "assignee_staff_id" INTEGER,
    ADD COLUMN "assignee_name" VARCHAR(100) NOT NULL DEFAULT '';
