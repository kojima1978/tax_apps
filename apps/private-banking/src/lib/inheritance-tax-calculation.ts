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
  // 受取人へ帰属させた死亡保険金・死亡退職金。後から追加した項目なので、
  // これ以前に保存した計算結果でも読めるよう既定値0にする。
  deemedBenefitJpy: nonNegativeJpy.default(0),
  deemedNonTaxableJpy: nonNegativeJpy.default(0),
  deemedTaxableJpy: nonNegativeJpy.default(0),
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
  // 課税価格の合計額のうち、法定相続分で按分する部分（みなし相続財産を除いた額）。
  // 受取人帰属より前に保存した計算結果でも読めるよう既定値0にする。
  divisibleEstateJpy: nonNegativeJpy.default(0),
  insuranceSurrenderValueJpy: nonNegativeJpy,
  insuranceDeathBenefitJpy: nonNegativeJpy,
  insuranceNonTaxableLimitJpy: nonNegativeJpy,
  insuranceNonTaxableAmountJpy: nonNegativeJpy,
  insuranceTaxableDeathBenefitJpy: nonNegativeJpy,
  // 死亡退職金は後から追加した項目なので、これ以前に保存した計算結果でも読めるよう既定値0にする。
  retirementSurrenderValueJpy: nonNegativeJpy.default(0),
  retirementDeathBenefitJpy: nonNegativeJpy.default(0),
  retirementNonTaxableLimitJpy: nonNegativeJpy.default(0),
  retirementNonTaxableAmountJpy: nonNegativeJpy.default(0),
  retirementTaxableDeathBenefitJpy: nonNegativeJpy.default(0),
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

/** 相続税を計算するボタンの状態。success は押した直後の短い表示。 */
export type TaxCalcStatus = "idle" | "loading" | "success";

/**
 * 相続税を計算するボタンの文言。同じ操作のボタンが3箇所（B/Sパネル・税金タブ・
 * 再計算を促す警告）にあるので、文言はここだけで決める。「API」「連携」のような
 * 内部の作りの言葉は出さない ── 使う人に見えているのは計算そのものだけ。
 */
export function taxCalcLabel(status: TaxCalcStatus, calculated: boolean) {
  if (status === "loading") return "計算中";
  if (status === "success") return "計算しました";
  return calculated ? "再計算" : "相続税を計算";
}
