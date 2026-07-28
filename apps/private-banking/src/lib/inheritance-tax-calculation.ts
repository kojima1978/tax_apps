import { z } from "zod";

const nonNegativeJpy = z.number().finite().int().min(0);

const familyCompositionSchema = z.object({
  hasSpouse: z.boolean(),
  selectedRank: z.enum(["none", "rank1", "rank2", "rank3"]),
  heirCount: z.number().int().min(0).max(20),
});

const heirCalculationSchema = z.object({
  id: z.string().nullable(),
  label: z.string(),
  type: z.string(),
  legalShareRatio: z.number().finite().min(0).max(1),
  legalShareAmountJpy: nonNegativeJpy,
  taxOnLegalShareJpy: nonNegativeJpy,
  acquisitionAmountJpy: nonNegativeJpy,
  proportionalTaxJpy: nonNegativeJpy,
  surchargeAmountJpy: nonNegativeJpy,
  taxBeforeDeductionsJpy: nonNegativeJpy,
  spouseDeductionJpy: nonNegativeJpy,
  finalTaxJpy: nonNegativeJpy,
});

export const inheritanceTaxApiCalculationSchema = z.object({
  schemaVersion: z.string(),
  calculationVersion: z.string(),
  taxRuleAsOf: z.string(),
  calculatedAt: z.string().datetime(),
  unit: z.literal("JPY"),
  familyComposition: familyCompositionSchema,
  legalHeirCount: z.number().int().min(0).max(21),
  inputEstateValueJpy: nonNegativeJpy,
  estateValueJpy: nonNegativeJpy,
  insuranceSurrenderValueJpy: nonNegativeJpy,
  insuranceDeathBenefitJpy: nonNegativeJpy,
  insuranceNonTaxableLimitJpy: nonNegativeJpy,
  insuranceNonTaxableAmountJpy: nonNegativeJpy,
  insuranceTaxableDeathBenefitJpy: nonNegativeJpy,
  basicDeductionJpy: nonNegativeJpy,
  taxableEstateJpy: nonNegativeJpy,
  totalTaxBeforeDeductionsJpy: nonNegativeJpy,
  totalInheritanceTaxJpy: nonNegativeJpy,
  effectiveTaxRateBeforeDeductions: z.number().finite().min(0),
  effectiveTaxRate: z.number().finite().min(0),
  heirs: z.array(heirCalculationSchema),
});

const sourceSchema = z.object({
  snapshotId: z.number().int().positive(),
  fiscalYear: z.number().int().min(1900).max(2200),
  asOfDate: z.string(),
  financialAssetsJpy: nonNegativeJpy,
  realEstateJpy: nonNegativeJpy,
  businessAssetsJpy: nonNegativeJpy,
  otherAssetsJpy: nonNegativeJpy,
  totalAssetsJpy: nonNegativeJpy,
  deductibleLiabilitiesJpy: nonNegativeJpy,
  estimatedNetEstateJpy: nonNegativeJpy,
  smallLotReductionJpy: nonNegativeJpy.optional(),
});

export const inheritanceTaxCalculationSchema = inheritanceTaxApiCalculationSchema.extend({
  source: sourceSchema,
  warnings: z.array(z.string()),
});

export type InheritanceTaxApiCalculation = z.infer<typeof inheritanceTaxApiCalculationSchema>;
export type InheritanceTaxCalculation = z.infer<typeof inheritanceTaxCalculationSchema>;

export function parseInheritanceTaxCalculation(value: unknown): InheritanceTaxCalculation | null {
  const parsed = inheritanceTaxCalculationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
