-- Add active column to Company
ALTER TABLE "Company" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Company_active_idx" ON "Company"("active");
