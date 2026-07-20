ALTER TABLE "Household" ADD COLUMN "clientCode" TEXT;
ALTER TABLE "Household" ADD COLUMN "assignedStaff" TEXT NOT NULL DEFAULT '';

UPDATE "Household"
SET "clientCode" = 'PB-' || LPAD("id"::TEXT, 6, '0')
WHERE "clientCode" IS NULL;

ALTER TABLE "Household" ALTER COLUMN "clientCode" SET NOT NULL;
CREATE UNIQUE INDEX "Household_clientCode_key" ON "Household"("clientCode");
