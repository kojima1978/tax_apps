-- AlterTable: 受託日・申告完了日カラム追加
ALTER TABLE "InheritanceCase" ADD COLUMN "caseAddedDate" DATE;
ALTER TABLE "InheritanceCase" ADD COLUMN "caseCompletedDate" DATE;

-- 既存データ埋め込み: caseAddedDate ← createdAt の日付部分
UPDATE "InheritanceCase" SET "caseAddedDate" = DATE("createdAt");

-- 既存データ埋め込み: caseCompletedDate ← 完了ステータスの場合、進捗「申告済」日付 or updatedAt
UPDATE "InheritanceCase" AS ic
SET "caseCompletedDate" = COALESCE(
  (SELECT cp."date" FROM "CaseProgress" cp
   WHERE cp."caseId" = ic."id" AND cp."name" = '申告済' AND cp."date" IS NOT NULL
   LIMIT 1),
  DATE(ic."updatedAt")
)
WHERE ic."status" IN ('申告済', '請求済', '入金済');

-- CreateIndex
CREATE INDEX "InheritanceCase_caseAddedDate_idx" ON "InheritanceCase"("caseAddedDate");
CREATE INDEX "InheritanceCase_caseCompletedDate_idx" ON "InheritanceCase"("caseCompletedDate");
