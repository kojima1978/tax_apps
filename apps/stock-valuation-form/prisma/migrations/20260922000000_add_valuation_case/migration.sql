-- CreateTable
CREATE TABLE "ValuationCase" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "taxPeriod" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValuationCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValuationCase_archivedAt_updatedAt_idx" ON "ValuationCase"("archivedAt", "updatedAt");
