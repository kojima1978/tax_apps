-- 業種列を関係者マスタに追加
ALTER TABLE "RelatedPartyPerson" ADD COLUMN "profession" TEXT NOT NULL DEFAULT '';
CREATE INDEX "RelatedPartyPerson_profession_idx" ON "RelatedPartyPerson"("profession");
