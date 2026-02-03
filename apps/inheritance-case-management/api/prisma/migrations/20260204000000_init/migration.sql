-- CreateTable
CREATE TABLE "InheritanceCase" (
    "id" TEXT NOT NULL,
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
    "contacts" JSONB,
    "progress" JSONB,
    "assignee" TEXT,
    "referrer" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InheritanceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referrer" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InheritanceCase_status_idx" ON "InheritanceCase"("status");

-- CreateIndex
CREATE INDEX "InheritanceCase_fiscalYear_idx" ON "InheritanceCase"("fiscalYear");

-- CreateIndex
CREATE INDEX "InheritanceCase_acceptanceStatus_idx" ON "InheritanceCase"("acceptanceStatus");

-- CreateIndex
CREATE INDEX "InheritanceCase_createdAt_idx" ON "InheritanceCase"("createdAt");

-- CreateIndex
CREATE INDEX "Assignee_active_idx" ON "Assignee"("active");

-- CreateIndex
CREATE INDEX "Assignee_name_idx" ON "Assignee"("name");

-- CreateIndex
CREATE INDEX "Referrer_active_idx" ON "Referrer"("active");

-- CreateIndex
CREATE INDEX "Referrer_company_idx" ON "Referrer"("company");
