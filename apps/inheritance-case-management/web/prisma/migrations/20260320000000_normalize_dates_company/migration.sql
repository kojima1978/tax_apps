-- =============================================================================
-- Migration: normalize_dates_company
-- 1. CHECK制約: status / acceptanceStatus の有効値を強制
-- 2. Date型変換: dateOfDeath / CaseProgress.date を text → date に変更
-- 3. Company正規化: Referrer.company (text) → Company テーブル + FK
-- =============================================================================

-- ── 1. CHECK 制約 ──────────────────────────────────────────

ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_status_check"
  CHECK ("status" IN ('未着手', '手続中', '申告済', '請求済', '入金済', '対応終了'));

ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_acceptanceStatus_check"
  CHECK ("acceptanceStatus" IN ('受託可', '受託不可', '未判定', '保留'));

-- ── 2. Date 型変換 ──────────────────────────────────────────

ALTER TABLE "InheritanceCase"
  ALTER COLUMN "dateOfDeath" TYPE date USING "dateOfDeath"::date;

ALTER TABLE "CaseProgress"
  ALTER COLUMN "date" TYPE date USING "date"::date;

-- ── 3. Company テーブル ──────────────────────────────────────

-- 3a. Company テーブル作成
CREATE TABLE "Company" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- 3b. 既存 Referrer.company から Company レコードを生成
INSERT INTO "Company" ("name", "updatedAt")
SELECT DISTINCT "company", CURRENT_TIMESTAMP
FROM "Referrer"
WHERE "company" IS NOT NULL AND "company" != '';

-- 3c. Referrer に companyId カラムを追加し、既存データを紐付け
ALTER TABLE "Referrer" ADD COLUMN "companyId" INTEGER;

UPDATE "Referrer" r
SET "companyId" = c."id"
FROM "Company" c
WHERE c."name" = r."company";

ALTER TABLE "Referrer" ALTER COLUMN "companyId" SET NOT NULL;

-- 3d. FK 制約・インデックス作成
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Referrer_companyId_idx" ON "Referrer"("companyId");

-- 3e. 旧 company カラムとインデックスを削除
DROP INDEX IF EXISTS "Referrer_company_idx";
ALTER TABLE "Referrer" DROP COLUMN "company";
