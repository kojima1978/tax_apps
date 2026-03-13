-- Migration: UUID → Integer autoincrement IDs
-- This is a destructive migration that drops and recreates all tables.
-- Existing data will be lost and must be re-seeded.

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS "CaseProgress";
DROP TABLE IF EXISTS "CaseContact";
DROP TABLE IF EXISTS "InheritanceCase";
DROP TABLE IF EXISTS "Assignee";
DROP TABLE IF EXISTS "Referrer";

-- Recreate tables with integer IDs

CREATE TABLE "Assignee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referrer" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InheritanceCase" (
    "id" SERIAL NOT NULL,
    "deceasedName" TEXT NOT NULL,
    "dateOfDeath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '未着手',
    "acceptanceStatus" TEXT DEFAULT '未判定',
    "taxAmount" INTEGER DEFAULT 0,
    "feeAmount" INTEGER DEFAULT 0,
    "fiscalYear" INTEGER NOT NULL,
    "estimateAmount" INTEGER DEFAULT 0,
    "propertyValue" INTEGER DEFAULT 0,
    "referralFeeRate" DOUBLE PRECISION,
    "referralFeeAmount" INTEGER,
    "assigneeId" INTEGER,
    "referrerId" INTEGER,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InheritanceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseContact" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CaseContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseProgress" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT,
    "memo" TEXT,
    "isDynamic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CaseProgress_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Assignee_active_idx" ON "Assignee"("active");
CREATE INDEX "Assignee_name_idx" ON "Assignee"("name");

CREATE INDEX "Referrer_active_idx" ON "Referrer"("active");
CREATE INDEX "Referrer_company_idx" ON "Referrer"("company");

CREATE INDEX "InheritanceCase_status_idx" ON "InheritanceCase"("status");
CREATE INDEX "InheritanceCase_fiscalYear_idx" ON "InheritanceCase"("fiscalYear");
CREATE INDEX "InheritanceCase_acceptanceStatus_idx" ON "InheritanceCase"("acceptanceStatus");
CREATE INDEX "InheritanceCase_createdAt_idx" ON "InheritanceCase"("createdAt");
CREATE INDEX "InheritanceCase_assigneeId_idx" ON "InheritanceCase"("assigneeId");
CREATE INDEX "InheritanceCase_referrerId_idx" ON "InheritanceCase"("referrerId");

CREATE INDEX "CaseContact_caseId_idx" ON "CaseContact"("caseId");

CREATE INDEX "CaseProgress_caseId_idx" ON "CaseProgress"("caseId");
CREATE INDEX "CaseProgress_caseId_sortOrder_idx" ON "CaseProgress"("caseId", "sortOrder");

-- Foreign keys
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Assignee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InheritanceCase" ADD CONSTRAINT "InheritanceCase_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseContact" ADD CONSTRAINT "CaseContact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseProgress" ADD CONSTRAINT "CaseProgress_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
