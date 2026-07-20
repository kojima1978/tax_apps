ALTER TABLE "Snapshot" ADD COLUMN "fiscalYear" INTEGER;

UPDATE "Snapshot"
SET "fiscalYear" = EXTRACT(YEAR FROM "asOfDate")::INTEGER;

-- Keep one balance sheet per household and fiscal year. Prefer the current
-- record, then the most recently created record when legacy duplicates exist.
DELETE FROM "Snapshot" AS snapshot
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "householdId", "fiscalYear"
      ORDER BY "isCurrent" DESC, "createdAt" DESC, id DESC
    ) AS row_number
  FROM "Snapshot"
) AS ranked
WHERE snapshot.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE "Snapshot" ALTER COLUMN "fiscalYear" SET NOT NULL;

CREATE UNIQUE INDEX "Snapshot_householdId_fiscalYear_key"
ON "Snapshot"("householdId", "fiscalYear");
