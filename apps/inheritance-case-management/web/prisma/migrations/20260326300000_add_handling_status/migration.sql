-- Add handlingStatus column with default '対応中'
ALTER TABLE "InheritanceCase" ADD COLUMN "handlingStatus" TEXT NOT NULL DEFAULT '対応中';

-- Migrate existing 対応終了 cases
UPDATE "InheritanceCase"
  SET "handlingStatus" = '対応終了', "status" = '入金済'
  WHERE "status" = '対応終了';

-- Update CHECK constraint: remove 対応終了 from status
ALTER TABLE "InheritanceCase" DROP CONSTRAINT IF EXISTS "InheritanceCase_status_check";
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_status_check"
  CHECK ("status" IN ('未着手', '手続中', '申告済', '請求済', '入金済'));

-- Add CHECK constraint for handlingStatus
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_handlingStatus_check"
  CHECK ("handlingStatus" IN ('対応中', '対応終了', '未分割'));

-- CreateIndex
CREATE INDEX "InheritanceCase_handlingStatus_idx" ON "InheritanceCase"("handlingStatus");
