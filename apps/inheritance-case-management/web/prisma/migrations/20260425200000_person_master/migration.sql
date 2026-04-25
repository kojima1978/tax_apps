-- CreateTable: Person master
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "memo" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Person_name_idx" ON "Person"("name");
CREATE INDEX "Person_active_idx" ON "Person"("active");

-- Migrate existing CaseContact data → Person
-- Create one Person per unique (name, phone, postalCode, address) combination
INSERT INTO "Person" ("name", "phone", "postalCode", "address", "memo", "updatedAt")
SELECT DISTINCT ON ("name", "phone", "postalCode", "address")
    "name", "phone", "postalCode", "address", "memo", CURRENT_TIMESTAMP
FROM "CaseContact"
ORDER BY "name", "phone", "postalCode", "address", "id";

-- Add personId column to CaseContact
ALTER TABLE "CaseContact" ADD COLUMN "personId" INTEGER;

-- Populate personId from matching Person records
UPDATE "CaseContact" cc
SET "personId" = p."id"
FROM "Person" p
WHERE cc."name" = p."name"
  AND cc."phone" = p."phone"
  AND cc."postalCode" = p."postalCode"
  AND cc."address" = p."address";

-- Make personId NOT NULL now that all rows are populated
ALTER TABLE "CaseContact" ALTER COLUMN "personId" SET NOT NULL;

-- Drop old columns from CaseContact (data now lives in Person)
ALTER TABLE "CaseContact" DROP COLUMN "name";
ALTER TABLE "CaseContact" DROP COLUMN "phone";
ALTER TABLE "CaseContact" DROP COLUMN "postalCode";
ALTER TABLE "CaseContact" DROP COLUMN "address";

-- Add constraints
ALTER TABLE "CaseContact" ADD CONSTRAINT "CaseContact_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CaseContact_caseId_personId_key" ON "CaseContact"("caseId", "personId");
CREATE INDEX "CaseContact_personId_idx" ON "CaseContact"("personId");

-- Reset Person sequence
SELECT setval(pg_get_serial_sequence('"Person"', 'id'), COALESCE((SELECT MAX("id") FROM "Person"), 0) + 1, false);
