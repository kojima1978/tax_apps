-- Rename status "完了" to "完了（税務申告済）"
UPDATE "InheritanceCase" SET "status" = '完了（税務申告済）' WHERE "status" = '完了';

-- Rename status "請求済" to "入金済"
UPDATE "InheritanceCase" SET "status" = '入金済' WHERE "status" = '請求済';

-- 受託不可の案件: "完了（税務申告済）" → "対応終了"
UPDATE "InheritanceCase" SET "status" = '対応終了' WHERE "acceptanceStatus" = '受託不可' AND "status" = '完了（税務申告済）';
