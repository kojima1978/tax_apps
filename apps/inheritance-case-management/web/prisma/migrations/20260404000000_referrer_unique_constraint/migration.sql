-- Deduplicate referrers before adding unique constraint:
-- For rows with identical (companyId, name, department), keep the one with the lowest id,
-- and reassign any InheritanceCase references to the surviving row.
WITH duplicates AS (
  SELECT id, "companyId", name, department,
         ROW_NUMBER() OVER (PARTITION BY "companyId", COALESCE(name, ''), COALESCE(department, '') ORDER BY id) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY "companyId", COALESCE(name, ''), COALESCE(department, '') ORDER BY id) AS keep_id
  FROM "Referrer"
)
UPDATE "InheritanceCase" ic
  SET "referrerId" = d.keep_id
  FROM duplicates d
  WHERE ic."referrerId" = d.id AND d.rn > 1;

DELETE FROM "Referrer"
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY "companyId", COALESCE(name, ''), COALESCE(department, '') ORDER BY id) AS rn
      FROM "Referrer"
    ) sub WHERE rn > 1
  );

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_company_name_dept_key" ON "Referrer"("companyId", COALESCE(name, ''), COALESCE(department, ''));
