-- 部署・担当者を社員台帳（staff-directory）の写しにする。台帳IDを持たせ、同期はこの列で突き合わせる
ALTER TABLE "Department" ADD COLUMN "staffDirectoryId" INTEGER;
ALTER TABLE "Assignee" ADD COLUMN "staffDirectoryId" INTEGER;

CREATE UNIQUE INDEX "Department_staffDirectoryId_key" ON "Department"("staffDirectoryId");
CREATE UNIQUE INDEX "Assignee_staffDirectoryId_key" ON "Assignee"("staffDirectoryId");
