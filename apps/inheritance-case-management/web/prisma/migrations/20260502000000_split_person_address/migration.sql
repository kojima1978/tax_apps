ALTER TABLE "Person" ADD COLUMN "addressFromPostalCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Person" ADD COLUMN "addressManual" TEXT NOT NULL DEFAULT '';

UPDATE "Person"
SET "addressManual" = COALESCE(NULLIF("address", ''), '')
WHERE "addressManual" = '';
