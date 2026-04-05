-- AlterTable
ALTER TABLE "Company" ADD COLUMN "internal" BOOLEAN NOT NULL DEFAULT false;

-- Set マスエージェント as internal
UPDATE "Company" SET "internal" = true WHERE "name" = 'マスエージェント';
