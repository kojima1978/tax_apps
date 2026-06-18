ALTER TABLE "InheritanceCase"
DROP CONSTRAINT IF EXISTS "InheritanceCase_status_check";

ALTER TABLE "InheritanceCase"
DROP COLUMN IF EXISTS "isFinalCheckComplete";

ALTER TABLE "InheritanceCase"
ADD CONSTRAINT "InheritanceCase_status_check"
CHECK ("status" IN ('見積前', '見積中', '見送り', '受託', '手続中', '最終確認', '申告済', '請求済', '入金済'));
