ALTER TABLE "Person" ADD COLUMN "nameKana" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Person" ADD COLUMN "nameKanaNormalized" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Person_nameKana_idx" ON "Person"("nameKana");
CREATE INDEX "Person_nameKanaNormalized_idx" ON "Person"("nameKanaNormalized");
