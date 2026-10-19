-- 同姓同名を許し、担当者コードを業務上の一意な識別子にする。
ALTER TABLE "Staff" ADD COLUMN "staffCode" TEXT;
ALTER TABLE "Staff" ADD COLUMN "department" TEXT NOT NULL DEFAULT '';

-- 既存データには安定した初期コードを割り当てる。画面から後で実際の社員番号へ変更できる。
UPDATE "Staff"
SET "staffCode" = 'STF-' || LPAD("id"::TEXT, 4, '0');

ALTER TABLE "Staff" ALTER COLUMN "staffCode" SET NOT NULL;
DROP INDEX "Staff_name_key";
CREATE UNIQUE INDEX "Staff_staffCode_key" ON "Staff"("staffCode");
CREATE INDEX "Staff_nameKana_name_idx" ON "Staff"("nameKana", "name");

-- 現在担当者とは別に、いつ誰が担当していたかを保存する。
CREATE TABLE "StaffAssignment" (
  "id" SERIAL NOT NULL,
  "householdId" INTEGER NOT NULL,
  "staffId" INTEGER,
  "staffCode" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "StaffAssignment_householdId_startedAt_idx" ON "StaffAssignment"("householdId", "startedAt");
CREATE INDEX "StaffAssignment_staffId_endedAt_idx" ON "StaffAssignment"("staffId", "endedAt");
CREATE UNIQUE INDEX "StaffAssignment_one_active_per_household"
  ON "StaffAssignment"("householdId") WHERE "endedAt" IS NULL;

-- 既存の現在担当者を履歴の起点として登録する。
INSERT INTO "StaffAssignment" ("householdId", "staffId", "staffCode", "staffName", "startedAt", "createdAt")
SELECT h."id", s."id", s."staffCode", s."name", h."createdAt", CURRENT_TIMESTAMP
FROM "Household" h
JOIN "Staff" s ON s."id" = h."staffId";
