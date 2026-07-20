ALTER TABLE "Position"
ADD COLUMN "valuationFormula" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "valuationQuantity" DECIMAL(24, 6),
ADD COLUMN "valuationUnitPrice" DECIMAL(24, 2),
ADD COLUMN "adjustmentRate" DECIMAL(12, 6),
ADD COLUMN "landArea" DECIMAL(18, 4),
ADD COLUMN "roadsideValue" DECIMAL(24, 2),
ADD COLUMN "fixedAssetTaxValue" DECIMAL(24, 2),
ADD COLUMN "valuationMultiplier" DECIMAL(12, 6),
ADD COLUMN "ownershipShare" DECIMAL(12, 6);
