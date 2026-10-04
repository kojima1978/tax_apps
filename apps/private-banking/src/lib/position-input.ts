import { z } from "zod";
import { fractionTotal, manualValuationLabel, realEstateCategories, unitRateBaseLabel, unitRateCategories, valuationFromFormula } from "@/lib/portfolio-view";

const positionCategorySchema = z.enum(["DEPOSIT", "SECURITIES", "HOME_REAL_ESTATE", "REAL_ESTATE", "BUSINESS_REAL_ESTATE", "IDLE_REAL_ESTATE", "OTHER_REAL_ESTATE", "PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE", "INSURANCE", "INSURANCE_RIGHTS", "RETIREMENT_ALLOWANCE", "COLLECTIBLES", "LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER", "LOAN", "LEASE_OBLIGATION", "ACCOUNTS_PAYABLE", "DEPOSITS_RECEIVED", "GUARANTEE"]);
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
  (value) => value === "" || value === undefined || value === null ? undefined : value,
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
const stockCategories = new Set(["SECURITIES", "PRIVATE_SHARES"]);
const unitRateCategorySet = new Set(unitRateCategories);
const realEstateCategorySet = new Set(realEstateCategories);

export const positionInputSchema = z.object({
  side: z.enum(["ASSET", "LIABILITY"]),
  category: positionCategorySchema,
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(100).default(""),
  currency: z.string().trim().length(3).default("JPY"),
  originalAmount: z.coerce.number().nonnegative(),
  fxRate: z.coerce.number().positive().default(1),
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
    // 自社株は債務超過などで株価が0円になることがあるので、単価だけ0円を認める（マイナスは不可）。
    if (data.category === "PRIVATE_SHARES") {
      if (data.valuationUnitPrice === null || data.valuationUnitPrice < 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationUnitPrice"], message: "単価は0以上の数値を入力してください。" });
    } else {
      requirePositive(data.valuationUnitPrice, "valuationUnitPrice", "単価");
    }
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "UNIT_RATE") {
    if (!unitRateCategorySet.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "単価×調整率を利用できない科目です。" });
    requirePositive(data.valuationUnitPrice, "valuationUnitPrice", unitRateBaseLabel(data.category));
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "LAND_ROADSIDE") {
    if (!realEstateCategorySet.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "路線価方式を利用できない科目です。" });
    requirePositive(data.landArea, "landArea", "面積");
    requirePositive(data.roadsideValue, "roadsideValue", "路線価");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  if (data.valuationFormula === "LAND_MULTIPLIER" || data.valuationFormula === "BUILDING") {
    if (!realEstateCategorySet.has(data.category)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["valuationFormula"], message: "倍率方式を利用できない科目です。" });
    requirePositive(data.fixedAssetTaxValue, "fixedAssetTaxValue", "固定資産税評価額");
    requirePositive(data.valuationMultiplier, "valuationMultiplier", "倍率");
    requirePositive(data.adjustmentRate, "adjustmentRate", "調整率");
  }
  // 受取人ごとの分数は、合計が1でないと給付金の一部が誰にも割り当たらない（または二重に割り当たる）。
  // 浮動小数だと 1/3 × 3 が 1 にならないので、通分した整数で判定する。
  const allocations = data.assetDetails.benefitAllocations ?? [];
  if (allocations.length > 0) {
    const total = fractionTotal(allocations);
    if (total === null || total.numerator !== total.denominator) {
      const current = total === null ? "" : `（現在 ${total.numerator}/${total.denominator}）`;
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "benefitAllocations"], message: `受取人ごとの分数の合計を1にしてください${current}。` });
    }
  }
  if (realEstateCategorySet.has(data.category)) {
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
  // 算式は画面のプレビューと共有する（portfolio-view）。直接入力は入力された金額をそのまま使う。
  return valuationFromFormula(data.valuationFormula, data) ?? Math.round(data.originalAmount * 100) / 100;
}

export function calculatedOwnershipShare(data: PositionInput) {
  if (data.ownershipNumerator === null || data.ownershipDenominator === null) return null;
  return Math.round(data.ownershipNumerator / data.ownershipDenominator * 1_000_000) / 1_000_000;
}

// 引数を PositionInput そのままにせず2項目に絞ってあるのは、バックアップの復元
// （lib/backup.ts）が JSON から読んだ行でもこの1本を呼べるようにするため。
// 評価方法の文字列を組み立てる場所を増やすと、また経路によって割れる。
export function normalizedValuationMethod(data: { category: string; valuationFormula: string }) {
  if (data.valuationFormula === "STOCK") return "単価×株数・口数×調整率";
  if (data.valuationFormula === "UNIT_RATE") return `${unitRateBaseLabel(data.category)}×調整率`;
  if (data.valuationFormula === "LAND_ROADSIDE") return "路線価方式";
  if (data.valuationFormula === "LAND_MULTIPLIER") return "倍率方式";
  if (data.valuationFormula === "BUILDING") return "建物・固定資産税評価額方式";
  return manualValuationLabel(data.category);
}

export function liquidityForCategory(category: z.infer<typeof positionCategorySchema>) {
  // 生命保険契約に関する権利は解約すればそのまま現金になるので、生命保険と同じ換金性に置く。
  if (["DEPOSIT", "SECURITIES", "INSURANCE", "INSURANCE_RIGHTS"].includes(category)) return "HIGH" as const;
  // 退職金（小規模企業共済など）は解約手当金として換金できるが、請求手続きを要するので中位に置く。
  if (category === "RETIREMENT_ALLOWANCE") return "MEDIUM" as const;
  if (category === "LOAN_RECEIVABLE" || category === "LOAN" || category.startsWith("LOAN_")) return "MEDIUM" as const;
  return "LOW" as const;
}
