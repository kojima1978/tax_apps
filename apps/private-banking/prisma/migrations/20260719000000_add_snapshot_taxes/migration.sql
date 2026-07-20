ALTER TABLE "Snapshot"
ADD COLUMN "estimatedInheritanceTax" DECIMAL(24,0) NOT NULL DEFAULT 0,
ADD COLUMN "otherTaxes" DECIMAL(24,0) NOT NULL DEFAULT 0;

UPDATE "Snapshot" AS snapshot
SET
  "estimatedInheritanceTax" = household."estimatedInheritanceTax",
  "otherTaxes" = household."otherTaxes"
FROM "Household" AS household
WHERE snapshot."householdId" = household."id";
