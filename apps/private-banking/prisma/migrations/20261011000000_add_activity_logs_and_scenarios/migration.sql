CREATE TABLE "ActivityLog" (
  "id" SERIAL NOT NULL,
  "householdId" INTEGER,
  "householdName" TEXT NOT NULL,
  "clientCode" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'ローカル利用者',
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanningScenario" (
  "id" SERIAL NOT NULL,
  "householdId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "assetChangePercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "liabilityChangePercent" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "inheritanceTaxJpy" DECIMAL(24,0) NOT NULL DEFAULT 0,
  "successionCostsJpy" DECIMAL(24,0) NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanningScenario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityLog_householdId_createdAt_idx" ON "ActivityLog"("householdId", "createdAt");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "PlanningScenario_householdId_updatedAt_idx" ON "PlanningScenario"("householdId", "updatedAt");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanningScenario" ADD CONSTRAINT "PlanningScenario_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
