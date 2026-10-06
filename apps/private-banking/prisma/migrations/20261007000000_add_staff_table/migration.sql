-- 担当者を自由入力から台帳へ移す。名前の一意制約が登録揺れを止める。
CREATE TABLE "Staff" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "nameKana" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Staff_name_key" ON "Staff"("name");

ALTER TABLE "Household" ADD COLUMN "staffId" INTEGER;

-- 既に入っている担当者名を台帳へ移す（空白だけの値は未設定として捨てる）。
INSERT INTO "Staff" ("name", "updatedAt")
SELECT DISTINCT BTRIM("assignedStaff"), CURRENT_TIMESTAMP
FROM "Household"
WHERE BTRIM("assignedStaff") <> '';

UPDATE "Household" h
SET "staffId" = s."id"
FROM "Staff" s
WHERE s."name" = BTRIM(h."assignedStaff");

ALTER TABLE "Household" DROP COLUMN "assignedStaff";

-- 担当者を消しても顧客は消さない。使用中の担当者は API 側で削除を拒む。
ALTER TABLE "Household" ADD CONSTRAINT "Household_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Household_staffId_idx" ON "Household"("staffId");
