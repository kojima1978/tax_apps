ALTER TABLE "Household" ALTER COLUMN "name" SET DEFAULT '山田 太郎（サンプル）';

UPDATE "Household"
SET "name" = '山田 太郎（サンプル）'
WHERE "name" = '山田家（サンプル）';
