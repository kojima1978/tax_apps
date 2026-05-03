-- 被相続人氏名フリガナ列の追加（検索用）
ALTER TABLE "InheritanceCase" ADD COLUMN "deceasedNameKana" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InheritanceCase" ADD COLUMN "deceasedNameKanaNormalized" TEXT NOT NULL DEFAULT '';

CREATE INDEX "InheritanceCase_deceasedNameKana_idx" ON "InheritanceCase"("deceasedNameKana");
CREATE INDEX "InheritanceCase_deceasedNameKanaNormalized_idx" ON "InheritanceCase"("deceasedNameKanaNormalized");
