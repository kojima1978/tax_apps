-- AlterTable
ALTER TABLE "Referrer" ADD COLUMN "assigneeId" INTEGER;

-- AddForeignKey
ALTER TABLE "Referrer" ADD CONSTRAINT "Referrer_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Assignee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Referrer_assigneeId_idx" ON "Referrer"("assigneeId");

-- Link existing internal referrers to assignees by name match
UPDATE "Referrer" r
SET "assigneeId" = a.id
FROM "Assignee" a, "Company" c
WHERE r."companyId" = c.id
  AND c.internal = true
  AND r.name = a.name;
