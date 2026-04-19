-- CreateTable
CREATE TABLE "CaseExpense" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,

    CONSTRAINT "CaseExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseExpense_caseId_idx" ON "CaseExpense"("caseId");

-- CreateIndex
CREATE INDEX "CaseExpense_caseId_sortOrder_idx" ON "CaseExpense"("caseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CaseExpense" ADD CONSTRAINT "CaseExpense_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
