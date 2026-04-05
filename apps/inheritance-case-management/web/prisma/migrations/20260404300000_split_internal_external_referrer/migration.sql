-- 1. Add internalReferrerId to InheritanceCase
ALTER TABLE "InheritanceCase" ADD COLUMN "internalReferrerId" INTEGER;
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_internalReferrerId_fkey"
    FOREIGN KEY ("internalReferrerId") REFERENCES "Assignee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "InheritanceCase_internalReferrerId_idx" ON "InheritanceCase"("internalReferrerId");

-- 2. Migrate: for cases with internal referrers, set internalReferrerId = referrer.assigneeId, then clear referrerId
UPDATE "InheritanceCase" ic
SET "internalReferrerId" = r."assigneeId",
    "referrerId" = NULL
FROM "Referrer" r
JOIN "Company" c ON r."companyId" = c.id
WHERE ic."referrerId" = r.id
  AND c.internal = true
  AND r."assigneeId" IS NOT NULL;

-- 3. Delete internal referrer records (no longer referenced by any case)
DELETE FROM "Referrer" r
USING "Company" c
WHERE r."companyId" = c.id AND c.internal = true;

-- 4. Delete internal company records
DELETE FROM "Company" WHERE internal = true;

-- 5. Drop internal column from Company (no longer needed)
ALTER TABLE "Company" DROP COLUMN "internal";

-- 6. Drop assigneeId and name from Referrer
ALTER TABLE "Referrer" DROP CONSTRAINT IF EXISTS "Referrer_assigneeId_fkey";
DROP INDEX IF EXISTS "Referrer_assigneeId_idx";
ALTER TABLE "Referrer" DROP COLUMN IF EXISTS "assigneeId";
ALTER TABLE "Referrer" DROP COLUMN IF EXISTS "name";

-- 7. Drop unique index on referrer (company, name, department) - no longer valid
DROP INDEX IF EXISTS "referrer_company_name_dept_unique";
