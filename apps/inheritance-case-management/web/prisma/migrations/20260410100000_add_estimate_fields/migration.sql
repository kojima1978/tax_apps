-- AlterTable: 見積計算用フィールド追加
ALTER TABLE "InheritanceCase" ADD COLUMN "landRosenkaCount" INTEGER DEFAULT 0;
ALTER TABLE "InheritanceCase" ADD COLUMN "landBairitsuCount" INTEGER DEFAULT 0;
ALTER TABLE "InheritanceCase" ADD COLUMN "unlistedStockCount" INTEGER DEFAULT 0;
ALTER TABLE "InheritanceCase" ADD COLUMN "heirCount" INTEGER DEFAULT 0;
