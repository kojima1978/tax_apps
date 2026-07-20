import { z } from "zod";

const positionCategorySchema = z.enum(["DEPOSIT", "SECURITIES", "HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE", "PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE", "INSURANCE", "COLLECTIBLES", "LOAN_HOME", "LOAN_INVESTMENT_PROPERTY", "LOAN_SECURITIES", "LOAN_BUSINESS", "LOAN_OTHER", "LOAN", "GUARANTEE"]);
const valuationFormulaSchema = z.enum(["MANUAL", "STOCK", "LAND_ROADSIDE", "LAND_MULTIPLIER", "BUILDING"]);
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
const assetDetailsSchema = z.object({
  accountType: optionalDetailText,
  branchName: optionalDetailText,
  accountSuffix: optionalDetailText,
  maturityDate: optionalDetailDate,
  securityType: optionalDetailText,
  securityCode: optionalDetailText,
  valuationDate: optionalDetailDate,
  insuranceType: optionalDetailText,
  insuredPerson: optionalDetailText,
  beneficiary: optionalDetailText,
  deathBenefit: optionalDetailNumber,
  propertyType: optionalDetailText,
  propertyAddress: optionalDetailText,
  landCategory: optionalDetailText,
  buildingType: optionalDetailText,
  buildingStructure: optionalDetailText,
  floorArea: optionalDetailNumber,
  shareClass: optionalDetailText,
  totalIssuedShares: optionalDetailNumber,
  valuationApproach: optionalDetailText,
  businessAssetType: optionalDetailText,
  businessName: optionalDetailText,
  storageLocation: optionalDetailText,
  borrower: optionalDetailText,
  loanDate: optionalDetailDate,
  dueDate: optionalDetailDate,
  interestRate: optionalDetailNumber,
  collectibility: optionalDetailText,
  otherAssetType: optionalDetailText,
}).default({});
const stockCategories = new Set(["SECURITIES", "PRIVATE_SHARES"]);
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
  if (data.category === "LOAN_RECEIVABLE" && !data.assetDetails.borrower) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "borrower"], message: "借主を入力してください。" });
  }
  if (data.category === "PRIVATE_SHARES" && data.assetDetails.totalIssuedShares && data.valuationQuantity && data.valuationQuantity > data.assetDetails.totalIssuedShares) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetDetails", "totalIssuedShares"], message: "発行済株式総数は保有株数以上で入力してください。" });
  }
});

export type PositionInput = z.infer<typeof positionInputSchema>;

export function calculatedOriginalAmount(data: PositionInput) {
  let value = data.originalAmount;
  const ownershipRatio = data.ownershipNumerator !== null && data.ownershipDenominator !== null
    ? data.ownershipNumerator / data.ownershipDenominator
    : 0;
  if (data.valuationFormula === "STOCK") value = data.valuationQuantity! * data.valuationUnitPrice! * data.adjustmentRate!;
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
  if (data.valuationFormula === "LAND_ROADSIDE") return "路線価方式";
  if (data.valuationFormula === "LAND_MULTIPLIER") return "倍率方式";
  if (data.valuationFormula === "BUILDING") return "建物・固定資産税評価額方式";
  return data.valuationMethod;
}

export function liquidityForCategory(category: z.infer<typeof positionCategorySchema>) {
  if (["DEPOSIT", "SECURITIES", "INSURANCE"].includes(category)) return "HIGH" as const;
  if (category === "LOAN_RECEIVABLE" || category === "LOAN" || category.startsWith("LOAN_")) return "MEDIUM" as const;
  return "LOW" as const;
}
