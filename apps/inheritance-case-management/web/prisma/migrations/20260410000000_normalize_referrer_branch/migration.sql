-- 1. Create CompanyBranch table
CREATE TABLE "CompanyBranch" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBranch_pkey" PRIMARY KEY ("id")
);

-- 2. Extract unique (companyId, department) from Referrer into CompanyBranch
INSERT INTO "CompanyBranch" ("companyId", "name", "updatedAt")
SELECT DISTINCT "companyId", department, CURRENT_TIMESTAMP
FROM "Referrer"
WHERE department IS NOT NULL AND department <> '';

-- 3. Add branchId column to Referrer
ALTER TABLE "Referrer" ADD COLUMN "branchId" INTEGER;

-- 4. Populate branchId from existing department values
UPDATE "Referrer" r
SET "branchId" = cb.id
FROM "CompanyBranch" cb
WHERE r."companyId" = cb."companyId"
  AND r.department = cb."name";

-- 5. Drop old department column
ALTER TABLE "Referrer" DROP COLUMN "department";

-- 6. Drop old unique index if it still exists
DROP INDEX IF EXISTS "Referrer_company_name_dept_key";

-- 7. Add indexes and constraints
CREATE UNIQUE INDEX "CompanyBranch_companyId_name_key" ON "CompanyBranch"("companyId", "name");
CREATE INDEX "CompanyBranch_active_idx" ON "CompanyBranch"("active");
CREATE INDEX "CompanyBranch_companyId_idx" ON "CompanyBranch"("companyId");
CREATE INDEX "Referrer_branchId_idx" ON "Referrer"("branchId");

-- 8. Add foreign keys
ALTER TABLE "CompanyBranch" ADD CONSTRAINT "CompanyBranch_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "CompanyBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. New unique constraint: (companyId, branchId) with COALESCE for NULLs
CREATE UNIQUE INDEX "Referrer_company_branch_key" ON "Referrer"("companyId", COALESCE("branchId", 0));
