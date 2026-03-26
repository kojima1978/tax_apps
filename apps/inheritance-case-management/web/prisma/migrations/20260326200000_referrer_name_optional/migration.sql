-- AlterTable: make Referrer.name optional
ALTER TABLE "Referrer" ALTER COLUMN "name" DROP NOT NULL;
