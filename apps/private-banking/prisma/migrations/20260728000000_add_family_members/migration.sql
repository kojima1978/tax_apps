CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL,
    "acquisitionReason" TEXT NOT NULL DEFAULT 'INHERITANCE',
    "civilShareNumerator" INTEGER,
    "civilShareDenominator" INTEGER,
    "taxShareNumerator" INTEGER,
    "taxShareDenominator" INTEGER,
    "specialTaxAddition" BOOLEAN NOT NULL DEFAULT false,
    "disabilityCategory" TEXT NOT NULL DEFAULT 'NONE',
    "birthDate" DATE,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyMember_householdId_sortOrder_idx" ON "FamilyMember"("householdId", "sortOrder");

ALTER TABLE "FamilyMember"
ADD CONSTRAINT "FamilyMember_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
