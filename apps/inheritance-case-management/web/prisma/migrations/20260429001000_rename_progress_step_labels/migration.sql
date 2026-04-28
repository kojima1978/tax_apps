UPDATE "CaseProgress"
SET "name" = '遺産分割協議完了'
WHERE "name" = '遺産分割（済）';

UPDATE "CaseProgress"
SET "name" = '税務申告完了'
WHERE "name" = '申告済';

UPDATE "CaseProgress"
SET "name" = '請求書発送完了'
WHERE "name" = '請求済';

UPDATE "CaseProgress"
SET "name" = '入金確認完了'
WHERE "name" = '入金済';
