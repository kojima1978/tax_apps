-- 担当者は社員台帳（staff-directory）の写しにする。台帳ID で結び付ける
ALTER TABLE "Staff" ADD COLUMN "staffDirectoryId" INTEGER;

CREATE UNIQUE INDEX "Staff_staffDirectoryId_key" ON "Staff"("staffDirectoryId");
