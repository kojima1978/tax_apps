-- CreateTable
CREATE TABLE "CaseSpecialAddition" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(100) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseSpecialAddition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseSpecialAddition_caseId_idx" ON "CaseSpecialAddition"("caseId");

-- CreateIndex
CREATE INDEX "CaseSpecialAddition_caseId_sortOrder_idx" ON "CaseSpecialAddition"("caseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CaseSpecialAddition" ADD CONSTRAINT "CaseSpecialAddition_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InheritanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
