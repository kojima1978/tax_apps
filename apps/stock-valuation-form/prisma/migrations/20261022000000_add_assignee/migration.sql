-- 案件の担当者。社員台帳の ID と、設定した時点の氏名の写しを持つ。
--
-- 画面は台帳の今の氏名を優先して出し、写しは台帳に居なくなった人（退職・台帳の復元）でも
-- 「誰の担当だったか」が読めるようにするためだけに使う。既存の案件は担当者なし。

-- AlterTable
ALTER TABLE "ValuationCase" ADD COLUMN "assigneeStaffId" INTEGER,
ADD COLUMN "assigneeName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "ValuationCase_assigneeStaffId_idx" ON "ValuationCase"("assigneeStaffId");
