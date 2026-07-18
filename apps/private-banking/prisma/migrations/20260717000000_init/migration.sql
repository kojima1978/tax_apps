CREATE TABLE "Household" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL DEFAULT '山田家（サンプル）',
  "currency" TEXT NOT NULL DEFAULT 'JPY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Snapshot" (
  "id" SERIAL NOT NULL,
  "householdId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "asOfDate" DATE NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Position" (
  "id" SERIAL NOT NULL,
  "snapshotId" INTEGER NOT NULL,
  "side" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institution" TEXT NOT NULL DEFAULT '',
  "currency" TEXT NOT NULL DEFAULT 'JPY',
  "originalAmount" DECIMAL(24,2) NOT NULL,
  "fxRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "valueJpy" DECIMAL(24,0) NOT NULL,
  "liquidity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "includedInNetWorth" BOOLEAN NOT NULL DEFAULT true,
  "valuationMethod" TEXT NOT NULL DEFAULT '手動入力',
  "note" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Snapshot_householdId_asOfDate_idx" ON "Snapshot"("householdId", "asOfDate");
CREATE INDEX "Snapshot_isCurrent_idx" ON "Snapshot"("isCurrent");
CREATE INDEX "Position_snapshotId_side_category_idx" ON "Position"("snapshotId", "side", "category");
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
