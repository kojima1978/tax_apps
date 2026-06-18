-- 工程マイルストンをステータス連動の日付列に統合
-- 請求日(billedDate)・入金日(paidDate)を追加し、重複していた進捗ステップを廃止
-- 申告日は既存 caseCompletedDate を継続使用

ALTER TABLE "InheritanceCase" ADD COLUMN "billedDate" DATE;
ALTER TABLE "InheritanceCase" ADD COLUMN "paidDate" DATE;

-- 進捗ステップの日付を列へ移行（STEP_NAMES準拠の名称）
UPDATE "InheritanceCase" c SET "caseCompletedDate" = p."date"
  FROM "CaseProgress" p
  WHERE p."caseId" = c."id" AND p."name" = '税務申告完了' AND p."date" IS NOT NULL AND c."caseCompletedDate" IS NULL;

UPDATE "InheritanceCase" c SET "billedDate" = p."date"
  FROM "CaseProgress" p
  WHERE p."caseId" = c."id" AND p."name" = '請求書発送完了' AND p."date" IS NOT NULL;

UPDATE "InheritanceCase" c SET "paidDate" = p."date"
  FROM "CaseProgress" p
  WHERE p."caseId" = c."id" AND p."name" = '入金確認完了' AND p."date" IS NOT NULL;

-- 重複していた3ステップ（申告・請求・入金）を削除
DELETE FROM "CaseProgress" WHERE "name" IN ('税務申告完了', '請求書発送完了', '入金確認完了');

-- インデックス
CREATE INDEX "InheritanceCase_billedDate_idx" ON "InheritanceCase"("billedDate");
CREATE INDEX "InheritanceCase_paidDate_idx" ON "InheritanceCase"("paidDate");
