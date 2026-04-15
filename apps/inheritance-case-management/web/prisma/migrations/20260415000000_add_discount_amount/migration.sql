-- AlterTable: 値引額フィールド追加
-- IF NOT EXISTS: db push で先に適用済みの環境でもエラーにならない
ALTER TABLE "InheritanceCase" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER DEFAULT 0;
