ALTER TABLE "Household"
ADD COLUMN "estimatedInheritanceTax" DECIMAL(24,0) NOT NULL DEFAULT 0,
ADD COLUMN "successionCosts" DECIMAL(24,0) NOT NULL DEFAULT 0,
ADD COLUMN "inheritanceTaxUpdatedAt" TIMESTAMP(3);
