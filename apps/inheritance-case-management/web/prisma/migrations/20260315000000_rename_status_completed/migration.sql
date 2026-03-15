-- Rename status "完了" to "申告（済）"
UPDATE "InheritanceCase" SET "status" = '申告（済）' WHERE "status" = '完了';

-- Rename status "完了（税務申告済）" to "申告（済）"
UPDATE "InheritanceCase" SET "status" = '申告（済）' WHERE "status" = '完了（税務申告済）';

-- Rename status "請求済" to "入金済"
UPDATE "InheritanceCase" SET "status" = '入金済' WHERE "status" = '請求済';

-- 受託不可の案件: "申告（済）" → "対応終了"
UPDATE "InheritanceCase" SET "status" = '対応終了' WHERE "acceptanceStatus" = '受託不可' AND "status" = '申告（済）';
