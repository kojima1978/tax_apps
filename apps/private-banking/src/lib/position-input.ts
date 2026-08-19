import { z } from "zod";

const positionCategorySchema = z.enum(["DEPOSIT", "SECURITIES", "HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE", "PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE", "INSURANCE", "RETIREMENT_ALLOWANCE", "COLLECTIBLES", "LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER", "LOAN", "GUARANTEE"]);
const valuationFormulaSchema = z.enum(["MANUAL", "STOCK", "UNIT_RATE", "LAND_ROADSIDE", "LAND_MULTIPLIER", "BUILDING"]);
const optionalNonnegativeNumber = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().nonnegative().nullable(),
);
const optionalPositiveInteger = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().int().positive().nullable(),
);
const optionalDetailText = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  z.string().trim().max(100).optional(),
);
const optionalDetailDate = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);
const optionalDetailNumber = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  z.coerce.number().nonnegative().optional(),
);
/** 死亡保険金・死亡退職金を複数の受取人へ分数で割り振る1行。受取人名が空の行は入力途中とみなして捨てる。 */
const benefitAllocationSchema = z.object({
  recipient: z.string().trim().min(1).max(100),
  numerator: z.coerce.number().int().positive(),
  denominator: z.coerce.number().int().positive(),
});
const optionalBenefitAllocations = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) return undefined;
    const rows = value.filter((row) => typeof row === "object" && row !== null && String((row as { recipient?: unknown }).recipient ?? "").trim() !== "");
    return rows.length > 0 ? rows : undefined;
  },
  z.array(benefitAllocationSchema).max(10).optional(),
);
const assetDetailsSchema = z.object({
  accountType: optionalDetailText,
  branchName: optionalDetailText,
  accountSuffix: optionalDetailText,
  maturityDate: optionalDetailDate,
  securityType: optionalDetailText,
  securityCode: optionalDetailText,
  insuranceType: optionalDetailText,
  policyNumber: optionalDetailText,
  insuredPerson: optionalDetailText,
  beneficiary: optionalDetailText,
  deathBenefit: optionalDetailNumber,
  propertyType: optionalDetailText,
  propertyAddress: optionalDetailText,
  landCategory: optionalDetailText,
  smallLotType: optionalDetailText,
  buildingType: optionalDetailText,
  buildingStructure: optionalDetailText,
  floorArea: optionalDetailNumber,
  shareClass: optionalDetailText,
  totalIssuedShares: optionalDetailNumber,
  valuationApproach: optionalDetailText,
  businessAssetType: optionalDetailText,
  businessName: optionalDetailText,
  storageLocation: optionalDetailText,
  retirementType: optionalDetailText,
  retirementRecipient: optionalDetailText,
  retirementAllowance: optionalDetailNumber,
  benefitAllocations: optionalBenefitAllocations,
  otherAssetType: optionalDetailText,
}).default({});
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const stockCategories = new Set(["SECURITIES", "PRIVATE_SHARES"]);
/** 単価×調整率で評価する科目。今のところその他資産だけ。 */
const unitRateCategories = new Set(["COLLECTIBLES"]);
const realEstateCategories = new Set(["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"]);

export const positionInputSchema = z.object({
  side: z.enum(["ASSET", "LIABILITY"]),
  category: positionCategorySchema,
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(100).default(""),
  currency: z.string().trim().length(3).default("JPY"),
  originalAmount: z.coerce.number().nonnegative(),
  fxRate: z.coerce.number().positive().default(1),
  valuationMethod: z.string().trim().max(100).default("手動入力"),
  valuationFormula: valuationFormulaSchema.default("MANUAL"),
  valuationQuantity: optionalNonnegativeNumber,
  valuationUnitPrice: optionalNonnegativeNumber,
  adjustmentRate: optionalNonnegativeNumber,
  landArea: optionalNonnegativeNumber,
  roadsideValue: optionalNonnegativeNumber,
  fixedAssetTaxValue: optionalNonnegativeNumber,
  valuationMultiplier: optionalNonnegativeNumber,
  ownershipShare: optionalNonnegativeNumber,
  ownershipNumerator: optionalPositiveInteger,
  ownershipDenominator: optionalPositiveInteger,
  assetDetails: assetDetailsSchema,
  note: z.string().trim().max(500).default(""),
}).superRefine((data, context) => {
  const requirePositive = (value: number | null, path: string, label: string) => {
    if (value === null || value <= 0) context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: `${label}は0より大きい数値を入力してください。` });
  };
  if (data.valuationFormula === "STOCK") {
    if (!stockCategories.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "株式の算式を利用できない科目です。" });
    requirePositive(data.valuationQuantity, "valuationQuantity", "株数・口数");
    requirePositive(data.valuationUnitPrice, "valuationUnitPrice", "単価");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "UNIT_RATE") {
    if (!unitRateCategories.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "単価×調整率を利用できない科目です。" });
    requirePositive(data.valuationUnitPrice, "valuationUnitPrice", "単価");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "LAND_ROADSIDE") {
    if (!realEstateCategories.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "路線価方式を利用できない科目です。" });
    requirePositive(data.landArea, "landArea", "面積");
    requirePositive(data.roadsideValue, "roadsideValue", "路線価");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "LAND_MULTIPLIER" || data.valuationFormula === "BUILDING") {
    if (!realEstateCategories.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "倍率方式を利用できない科目です。" });
    requirePositive(data.fixedAssetTaxValue, "fixedAssetTaxValue", "固定資産税評価額");
    requirePositive(data.valuationMultiplier, "valuationMultiplier", "倍率");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  // 受取人ごとの分数は、合計が1でないと給付金の一部が誰にも割り当たらない（または二重に割り当たる）。
  // 浮動小数だと 1/3 × 3 が 1 にならないので、通分した整数で判定する。
  const allocations = data.assetDetails.benefitAllocations ?? [];
  if (allocations.length > 0) {
    const denominator = allocations.reduce((lcm, allocation) => lcm / gcd(lcm, allocation.denominator) * allocation.denominator, 1);
    const numerator = allocations.reduce((sum, allocation) => sum + allocation.numerator * (denominator / allocation.denominator), 0);
    if (numerator !== denominator) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "benefitAllocations"], message: `受取人ごとの分数の合計を1にしてください（現在 ${numerator}/${denominator}）。` });
    }
  }
  if (realEstateCategories.has(data.category)) {
    if (!["LAND", "BUILDING"].includes(data.assetDetails.propertyType ?? "")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "propertyType"], message: "土地または建物を選択してください。" });
    }
    if (!data.assetDetails.propertyAddress) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "propertyAddress"], message: "所在地を入力してください。" });
    }
    requirePositive(data.ownershipNumerator, "ownershipNumerator", "持分の分子");
    requirePositive(data.ownershipDenominator, "ownershipDenominator", "持分の分母");
    if (data.assetDetails.propertyType === "LAND" && data.valuationFormula === "BUILDING") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "土地の評価方法を選択してください。" });
    }
    if (data.assetDetails.propertyType === "BUILDING" && ["LAND_ROADSIDE", "LAND_MULTIPLIER"].includes(data.valuationFormula)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "建物の評価方法を選択してください。" });
    }
  }
});

export type PositionInput = z.infer<typeof positionInputSchema>;

/**
 * 画面に出す入力エラー文言。理由を説明できる検証（superRefine の custom）だけそのまま返す。
 * 型レベルのエラーは Zod の英語文言なので、総括の文言に寄せる。
 */
export function positionInputErrorMessage(error: z.ZodError) {
  return error.issues.find((issue) => issue.code === z.ZodIssueCode.custom)?.message ?? "入力内容を確認してください。";
}

export function calculatedOriginalAmount(data: PositionInput) {
  let value = data.originalAmount;
  const ownershipRatio = data.ownershipNumerator !== null && data.ownershipDenominator !== null
    ? data.ownershipNumerator / data.ownershipDenominator
    : 0;
  if (data.valuationFormula === "STOCK") value = data.valuationQuantity! * data.valuationUnitPrice! * data.adjustmentRate!;
  if (data.valuationFormula === "UNIT_RATE") value = data.valuationUnitPrice! * data.adjustmentRate!;
  if (data.valuationFormula === "LAND_ROADSIDE") value = data.landArea! * data.roadsideValue! * data.adjustmentRate! * ownershipRatio;
  if (data.valuationFormula === "LAND_MULTIPLIER" || data.valuationFormula === "BUILDING") value = data.fixedAssetTaxValue! * data.valuationMultiplier! * data.adjustmentRate! * ownershipRatio;
  return Math.round(value * 100) / 100;
}

export function calculatedOwnershipShare(data: PositionInput) {
  if (data.ownershipNumerator === null || data.ownershipDenominator === null) return null;
  return Math.round(data.ownershipNumerator / data.ownershipDenominator * 1_000_000) / 1_000_000;
}

export function normalizedValuationMethod(data: PositionInput) {
  if (data.valuationFormula === "STOCK") return "株数・口数×単価×調整率";
  if (data.valuationFormula === "UNIT_RATE") return "単価×調整率";
  if (data.valuationFormula === "LAND_ROADSIDE") return "路線価方式";
  if (data.valuationFormula === "LAND_MULTIPLIER") return "倍率方式";
  if (data.valuationFormula === "BUILDING") return "建物・固定資産税評価額方式";
  return data.valuationMethod;
}

export function liquidityForCategory(category: z.infer<typeof positionCategorySchema>) {
  if (["DEPOSIT", "SECURITIES", "INSURANCE"].includes(category)) return "HIGH" as const;
  // 退職金（小規模企業共済など）は解約手当金として換金できるが、請求手続きを要するので中位に置く。
  if (category === "RETIREMENT_ALLOWANCE") return "MEDIUM" as const;
  if (category === "LOAN_RECEIVABLE" || category === "LOAN" || category.startsWith("LOAN_")) return "MEDIUM" as const;
  return "LOW" as const;
}
