-- 案件関係者の role 列を削除（業種は RelatedPartyPerson.profession に一本化）
DROP INDEX IF EXISTS "CaseRelatedParty_caseId_personId_role_key";
ALTER TABLE "CaseRelatedParty" DROP COLUMN "role";
CREATE UNIQUE INDEX "CaseRelatedParty_caseId_personId_key" ON "CaseRelatedParty"("caseId", "personId");
