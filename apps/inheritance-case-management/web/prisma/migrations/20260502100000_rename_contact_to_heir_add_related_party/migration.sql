-- Rename CaseContact to CaseHeir (preserve data)
ALTER TABLE "CaseContact" RENAME TO "CaseHeir";
ALTER INDEX "CaseContact_pkey" RENAME TO "CaseHeir_pkey";
ALTER INDEX "CaseContact_caseId_personId_key" RENAME TO "CaseHeir_caseId_personId_key";
ALTER INDEX "CaseContact_caseId_idx" RENAME TO "CaseHeir_caseId_idx";
ALTER INDEX "CaseContact_personId_idx" RENAME TO "CaseHeir_personId_idx";
ALTER SEQUENCE "CaseContact_id_seq" RENAME TO "CaseHeir_id_seq";

-- Rename FK constraints
ALTER TABLE "CaseHeir" RENAME CONSTRAINT "CaseContact_caseId_fkey" TO "CaseHeir_caseId_fkey";
ALTER TABLE "CaseHeir" RENAME CONSTRAINT "CaseContact_personId_fkey" TO "CaseHeir_personId_fkey";

-- Add relationship columns to CaseHeir
ALTER TABLE "CaseHeir" ADD COLUMN "relationship" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CaseHeir" ADD COLUMN "relationshipSortOrder" INTEGER NOT NULL DEFAULT 999;

-- Create CaseRelatedParty
CREATE TABLE "CaseRelatedParty" (
  "id" SERIAL PRIMARY KEY,
  "caseId" INTEGER NOT NULL,
  "personId" INTEGER NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "memo" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "CaseRelatedParty_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE,
  CONSTRAINT "CaseRelatedParty_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "CaseRelatedParty_caseId_personId_role_key" ON "CaseRelatedParty"("caseId","personId","role");
CREATE INDEX "CaseRelatedParty_caseId_idx" ON "CaseRelatedParty"("caseId");
CREATE INDEX "CaseRelatedParty_personId_idx" ON "CaseRelatedParty"("personId");
