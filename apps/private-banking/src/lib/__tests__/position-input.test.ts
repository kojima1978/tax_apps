import { describe, expect, it } from "vitest";
import {
  calculatedOriginalAmount,
  calculatedOwnershipShare,
  liquidityForCategory,
  normalizedValuationMethod,
  positionInputSchema,
} from "@/lib/position-input";

/** 画面から送られてくる素の入力（未指定は schema の既定値に任せる）を通す。 */
const parse = (input: Record<string, unknown>) => positionInputSchema.parse(input);

const stockInput = {
  side: "ASSET",
  category: "SECURITIES",
  name: "上場株式",
  originalAmount: 0,
  valuationFormula: "STOCK",
  valuationQuantity: 1000,
  valuationUnitPrice: 2500,
  adjustmentRate: 0.98,
};

const landRoadsideInput = {
  side: "ASSET",
  category: "REAL_ESTATE",
  name: "賃貸土地",
  originalAmount: 0,
  valuationFormula: "LAND_ROADSIDE",
  landArea: 200,
  roadsideValue: 300000,
  adjustmentRate: 0.9,
  ownershipNumerator: 1,
  ownershipDenominator: 2,
  assetDetails: { propertyType: "LAND", propertyAddress: "東京都千代田区1-1" },
};

const landMultiplierInput = {
  side: "ASSET",
  category: "IDLE_REAL_ESTATE",
  name: "遊休地",
  originalAmount: 0,
  valuationFormula: "LAND_MULTIPLIER",
  fixedAssetTaxValue: 12000000,
  valuationMultiplier: 1.1,
  adjustmentRate: 1,
  ownershipNumerator: 1,
  ownershipDenominator: 2,
  assetDetails: { propertyType: "LAND", propertyAddress: "千葉県柏市2-2" },
};

const buildingInput = {
  side: "ASSET",
  category: "HOME_REAL_ESTATE",
  name: "自宅建物",
  originalAmount: 0,
  valuationFormula: "BUILDING",
  fixedAssetTaxValue: 8000000,
  valuationMultiplier: 1,
  adjustmentRate: 0.7,
  ownershipNumerator: 1,
  ownershipDenominator: 1,
  assetDetails: { propertyType: "BUILDING", propertyAddress: "東京都世田谷区3-3" },
};

describe("calculatedOriginalAmount", () => {
  it("株式は 株数×単価×調整率（持分は掛けない）", () => {
    expect(calculatedOriginalAmount(parse(stockInput))).toBe(2450000);
  });

  it("路線価方式は 面積×路線価×調整率×持分", () => {
    expect(calculatedOriginalAmount(parse(landRoadsideInput))).toBe(27000000);
  });

  it("倍率方式は 固定資産税評価額×倍率×調整率×持分", () => {
    expect(calculatedOriginalAmount(parse(landMultiplierInput))).toBe(6600000);
  });

  it("建物も倍率方式と同じ算式で計算する", () => {
    expect(calculatedOriginalAmount(parse(buildingInput))).toBe(5600000);
  });

  it("手動入力は入力額をそのまま（小数2桁に丸めて）返す", () => {
    const data = parse({ side: "ASSET", category: "DEPOSIT", name: "普通預金", originalAmount: 1234.567 });
    expect(calculatedOriginalAmount(data)).toBe(1234.57);
  });

  it("持分が未入力の科目でも路線価方式なら0になる（誤って全部評価しない）", () => {
    // 不動産以外の科目に路線価方式を指定する経路は schema 側で弾くため、
    // ここでは持分だけ欠けたデータを直接組み立てて算式の挙動を確認する。
    const data = { ...parse(landRoadsideInput), ownershipNumerator: null, ownershipDenominator: null };
    expect(calculatedOriginalAmount(data)).toBe(0);
  });
});

describe("positionInputSchema", () => {
  it("科目に合わない算式は拒否する（預金に株式の算式）", () => {
    const result = positionInputSchema.safeParse({ ...stockInput, category: "DEPOSIT" });
    expect(result.success).toBe(false);
  });

  it("土地に建物の算式は拒否する", () => {
    const result = positionInputSchema.safeParse({
      ...landRoadsideInput,
      valuationFormula: "BUILDING",
      fixedAssetTaxValue: 100,
      valuationMultiplier: 1,
    });
    expect(result.success).toBe(false);
  });

  it("建物に路線価方式は拒否する", () => {
    const result = positionInputSchema.safeParse({
      ...buildingInput,
      valuationFormula: "LAND_ROADSIDE",
      landArea: 100,
      roadsideValue: 200000,
    });
    expect(result.success).toBe(false);
  });

  it("不動産は所在地と持分が必須", () => {
    const noAddress = positionInputSchema.safeParse({
      ...landRoadsideInput,
      assetDetails: { propertyType: "LAND" },
    });
    const noShare = positionInputSchema.safeParse({
      ...landRoadsideInput,
      ownershipNumerator: undefined,
      ownershipDenominator: undefined,
    });
    expect(noAddress.success).toBe(false);
    expect(noShare.success).toBe(false);
  });

  it("株式の算式は株数・単価・調整率が0より大きいこと", () => {
    expect(positionInputSchema.safeParse({ ...stockInput, valuationUnitPrice: 0 }).success).toBe(false);
  });

  it("自社株は保有株数が発行済株式総数を超えられない", () => {
    const base = { ...stockInput, category: "PRIVATE_SHARES", valuationQuantity: 200 };
    expect(positionInputSchema.safeParse({ ...base, assetDetails: { totalIssuedShares: 100 } }).success).toBe(false);
    expect(positionInputSchema.safeParse({ ...base, assetDetails: { totalIssuedShares: 200 } }).success).toBe(true);
  });

  it("貸付金は借主が必須", () => {
    const base = { side: "ASSET", category: "LOAN_RECEIVABLE", name: "役員貸付金", originalAmount: 5000000 };
    expect(positionInputSchema.safeParse(base).success).toBe(false);
    expect(positionInputSchema.safeParse({ ...base, assetDetails: { borrower: "株式会社サンプル" } }).success).toBe(true);
  });

  it("未入力の数値項目は null に正規化される", () => {
    const data = parse({ side: "ASSET", category: "DEPOSIT", name: "普通預金", originalAmount: 100, landArea: "" });
    expect(data.landArea).toBeNull();
    expect(data.ownershipNumerator).toBeNull();
    expect(data.fxRate).toBe(1);
  });
});

describe("calculatedOwnershipShare", () => {
  it("持分は小数6桁に丸める", () => {
    expect(calculatedOwnershipShare(parse({ ...landRoadsideInput, ownershipNumerator: 1, ownershipDenominator: 3 }))).toBe(0.333333);
  });

  it("持分の入力がなければ null", () => {
    expect(calculatedOwnershipShare(parse({ side: "ASSET", category: "DEPOSIT", name: "普通預金", originalAmount: 1 }))).toBeNull();
  });
});

describe("normalizedValuationMethod", () => {
  const methodCases: Array<{ input: Record<string, unknown>; expected: string }> = [
    { input: stockInput, expected: "株数・口数×単価×調整率" },
    { input: landRoadsideInput, expected: "路線価方式" },
    { input: landMultiplierInput, expected: "倍率方式" },
    { input: buildingInput, expected: "建物・固定資産税評価額方式" },
  ];

  it.each(methodCases)("算式に応じて $expected を返す", ({ input, expected }) => {
    expect(normalizedValuationMethod(parse(input))).toBe(expected);
  });

  it("手動入力は入力された評価方法名をそのまま使う", () => {
    const data = parse({ side: "ASSET", category: "DEPOSIT", name: "普通預金", originalAmount: 1, valuationMethod: "残高証明" });
    expect(normalizedValuationMethod(data)).toBe("残高証明");
  });
});

describe("liquidityForCategory", () => {
  it.each(["DEPOSIT", "SECURITIES", "INSURANCE"] as const)("%s は換金性が高い", (category) => {
    expect(liquidityForCategory(category)).toBe("HIGH");
  });

  it.each(["LOAN_RECEIVABLE", "LOAN", "LOAN_HOME", "LOAN_BUSINESS"] as const)("%s は中位", (category) => {
    expect(liquidityForCategory(category)).toBe("MEDIUM");
  });

  it.each(["HOME_REAL_ESTATE", "PRIVATE_SHARES", "COLLECTIBLES", "GUARANTEE"] as const)("%s は低い", (category) => {
    expect(liquidityForCategory(category)).toBe("LOW");
  });
});
