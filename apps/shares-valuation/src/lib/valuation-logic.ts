import { BasicInfo, Financials } from "@/types/valuation";

/**
 * 会社規模に応じた斟酌率を取得する。
 * basicInfo.sizeMultiplier があればそれを使用し、なければ size から判定。
 */
export function getMultiplier(basicInfo: {
  sizeMultiplier?: number;
  size?: string;
}): number {
  if (basicInfo.sizeMultiplier) return basicInfo.sizeMultiplier;
  if (basicInfo.size === "Medium") return 0.6;
  if (basicInfo.size === "Small") return 0.5;
  return 0.7;
}

/**
 * 配当金額を円と銭に分割する。
 * 例: 3.5 → { yen: 3, sen: 5 }
 */
export function splitDividend(value: number): { yen: number; sen: number } {
  const yen = Math.floor(value);
  const sen = Math.round((value - yen) * 10);
  return { yen, sen };
}

/**
 * 円と銭を配当金額に合算する。
 * 例: (3, 5) → 3.5
 */
export function combineDividend(yen: number, sen: number): number {
  return yen + sen * 0.1;
}

interface ProfitValuesInput {
  p1: number; // 直前期 所得金額
  l1: number; // 直前期 繰越欠損金
  p2: number; // 直前々期 所得金額
  l2: number; // 直前々期 繰越欠損金
  p3: number; // 直前々々期 所得金額
  l3: number; // 直前々々期 繰越欠損金
  shareCount50: number;
  profitMethodC: "auto" | "c1" | "c2";
  profitMethodC1: "auto" | "c1" | "c2";
  profitMethodC2: "auto" | "c1" | "c2";
}

interface ProfitValuesResult {
  ownProfit: number;    // c: 比準用利益
  ownProfitC1: number;  // c1: 判定用
  ownProfitC2: number;  // c2: 判定用
  profitC1Val: number;  // 直前期 per share (floor)
  profitC2Val: number;  // 2年平均 per share (floor)
  p1Val: number;        // 直前期利益 (円)
  p2Val: number;        // 直前々期利益 (円)
  p3Val: number;        // 直前々々期利益 (円)
}

/**
 * 利益(c/c1/c2)を計算する共通ユーティリティ。
 * OwnDataForm と ValuationBulkInput で共通使用。
 */
export function calculateProfitValues(input: ProfitValuesInput): ProfitValuesResult {
  const { p1, l1, p2, l2, p3, l3, shareCount50, profitMethodC, profitMethodC1, profitMethodC2 } = input;

  const profitPrevAmount = (p1 + l1) * 1000;
  const profit2PrevAmount = (p2 + l2) * 1000;
  const profit3PrevAmount = (p3 + l3) * 1000;

  const profitPerSharePrev = profitPrevAmount / shareCount50;
  const profitPerShareAvg = (profitPrevAmount + profit2PrevAmount) / 2 / shareCount50;

  // c2用: 2期前 と (2期前+3期前)/2
  const profitPerShare2Prev = profit2PrevAmount / shareCount50;
  const profitPerShareAvg2And3 = (profit2PrevAmount + profit3PrevAmount) / 2 / shareCount50;

  const profitC1Val = Math.floor(Math.max(0, profitPerSharePrev));
  const profitC2Val = Math.floor(Math.max(0, profitPerShareAvg));
  const profitC2_2PrevVal = Math.floor(Math.max(0, profitPerShare2Prev));
  const profitC2_AvgVal = Math.floor(Math.max(0, profitPerShareAvg2And3));

  // c: 比準用利益
  let ownProfit: number;
  if (profitMethodC === "c1") {
    ownProfit = profitC1Val;
  } else if (profitMethodC === "c2") {
    ownProfit = profitC2Val;
  } else {
    ownProfit = Math.floor(Math.max(0, Math.min(profitPerSharePrev, profitPerShareAvg)));
  }

  // c1: 自動は直前期と2年平均の高いほう
  let ownProfitC1: number;
  if (profitMethodC1 === "c1") {
    ownProfitC1 = profitC1Val;
  } else if (profitMethodC1 === "c2") {
    ownProfitC1 = profitC2Val;
  } else {
    ownProfitC1 = Math.max(profitC1Val, profitC2Val);
  }

  // c2: 自動は2期前と(2期前+3期前)/2の高いほう
  let ownProfitC2: number;
  if (profitMethodC2 === "c1") {
    ownProfitC2 = profitC2_2PrevVal;
  } else if (profitMethodC2 === "c2") {
    ownProfitC2 = profitC2_AvgVal;
  } else {
    ownProfitC2 = Math.max(profitC2_2PrevVal, profitC2_AvgVal);
  }

  return {
    ownProfit,
    ownProfitC1,
    ownProfitC2,
    profitC1Val,
    profitC2Val,
    p1Val: profitPrevAmount,
    p2Val: profit2PrevAmount,
    p3Val: profit3PrevAmount,
  };
}

interface OwnDataCompleteInput {
  divPrev: number;
  div2Prev: number;
  div3Prev: number;
  p1: number;
  l1: number;
  p2: number;
  l2: number;
  p3: number;
  l3: number;
  cap1: number;
  re1: number;
  cap2: number;
  re2: number;
  shareCount50: number;
  profitMethodC: "auto" | "c1" | "c2";
  profitMethodC1: "auto" | "c1" | "c2";
  profitMethodC2: "auto" | "c1" | "c2";
}

interface OwnDataCompleteResult {
  ownDividends: number;
  ownProfit: number;
  ownBookValue: number;
  ownDividendsB1: number;
  ownDividendsB2: number;
  ownProfitC1: number;
  ownProfitC2: number;
  ownBookValueD1: number;
  ownBookValueD2: number;
  isZeroElementCompany: boolean;
  isOneElementCompany: boolean;
  profitC1Val: number;
  profitC2Val: number;
  p1Val: number;
  p2Val: number;
  p3Val: number;
}

/**
 * 自社データの完全な計算を行う共通ユーティリティ。
 * OwnDataForm と ValuationBulkInput で共通使用。
 * b/b1/b2, c/c1/c2, d/d1/d2 + 比準要素数判定を一括計算。
 */
export function calculateOwnDataComplete(input: OwnDataCompleteInput): OwnDataCompleteResult {
  const { divPrev, div2Prev, div3Prev, cap1, re1, cap2, re2, shareCount50, profitMethodC, profitMethodC1, profitMethodC2 } = input;

  // 配当計算
  const avgDivTotal = ((divPrev + div2Prev) * 1000) / 2;
  const ownDividends = Math.floor((avgDivTotal / shareCount50) * 10) / 10;
  const ownDividendsB1 = ownDividends;
  const avgDivTotalB2 = ((div2Prev + div3Prev) * 1000) / 2;
  const ownDividendsB2 = Math.floor((avgDivTotalB2 / shareCount50) * 10) / 10;

  // 利益計算
  const profitResult = calculateProfitValues({
    p1: input.p1, l1: input.l1, p2: input.p2, l2: input.l2, p3: input.p3, l3: input.l3,
    shareCount50, profitMethodC, profitMethodC1, profitMethodC2,
  });
  const { ownProfit, ownProfitC1, ownProfitC2, profitC1Val, profitC2Val, p1Val, p2Val, p3Val } = profitResult;

  // 純資産計算
  const netAssetPrev = (cap1 + re1) * 1000;
  const ownBookValue = Math.floor(netAssetPrev / shareCount50);
  const ownBookValueD1 = ownBookValue;
  const netAsset2Prev = (cap2 + re2) * 1000;
  const ownBookValueD2 = Math.floor(netAsset2Prev / shareCount50);

  // 比準要素数判定
  const isZeroElementCompany =
    ownDividendsB1 === 0 && ownProfitC1 === 0 && ownBookValueD1 === 0;
  const countZeroInB1C1D1 = [ownDividendsB1, ownProfitC1, ownBookValueD1].filter((v) => v === 0).length;
  const countZeroInB2C2D2 = [ownDividendsB2, ownProfitC2, ownBookValueD2].filter((v) => v === 0).length;
  const isOneElementCompany =
    !isZeroElementCompany && countZeroInB1C1D1 >= 2 && countZeroInB2C2D2 >= 2;

  return {
    ownDividends,
    ownProfit,
    ownBookValue,
    ownDividendsB1,
    ownDividendsB2,
    ownProfitC1,
    ownProfitC2,
    ownBookValueD1,
    ownBookValueD2,
    isZeroElementCompany,
    isOneElementCompany,
    profitC1Val,
    profitC2Val,
    p1Val,
    p2Val,
    p3Val,
  };
}

/**
 * 会社規模の日本語ラベルを取得する。
 */
export function getCompanySizeLabel(size?: string): string {
  if (size === "Big") return "大会社";
  if (size === "Medium") return "中会社";
  return "小会社";
}

/**
 * 業種区分の日本語ラベルを取得する。
 */
export function getIndustryTypeLabel(type?: string): string {
  switch (type) {
    case "Wholesale": return "卸売業";
    case "RetailService": return "小売・サービス業";
    case "MedicalCorporation": return "医療法人";
    default: return "その他";
  }
}

export type IndustryType =
  | "Wholesale"
  | "RetailService"
  | "MedicalCorporation"
  | "Other";

export type CompanySize = "Big" | "Medium" | "Small";

interface CompanySizeResult {
  size: CompanySize;
  sizeMultiplier: 0.7 | 0.6 | 0.5; // coefficient for Similar Industry Value (A)
  lRatio: 1.0 | 0.9 | 0.75 | 0.6 | 0.5 | 0.0; // L for blending
}

/**
 * Calculates Company Size, Size Multiplier, and L Ratio.
 * Based on National Tax Agency Notice 179.
 */
export function calculateCompanySizeAndL(data: {
  employees: number;
  sales: number; // Yen
  totalAssets: number; // Yen
  industryType: IndustryType;
}): CompanySizeResult {
  const { employees, sales, totalAssets, industryType } = data;
  const salesMillion = sales / 1_000_000;
  const assetsMillion = totalAssets / 1_000_000;

  // 1. Big Company Check
  // Criteria: Employees >= 70 OR Sales >= Threshold
  let isBig = false;
  if (employees >= 70) isBig = true;

  // Sales Major Thresholds for Big
  if (industryType === "Wholesale" && salesMillion >= 3000) isBig = true;
  else if (industryType === "RetailService" && salesMillion >= 2000)
    isBig = true; // Corrected from 1000 to 2000 based on L-ratio table upper bounds
  else if (industryType === "MedicalCorporation" && salesMillion >= 2000)
    isBig = true; // Same as RetailService
  else if (industryType === "Other" && salesMillion >= 1500) isBig = true;

  if (isBig) {
    return {
      size: "Big",
      sizeMultiplier: 0.7,
      lRatio: 1.0, // Big companies use Similar Industry Method (effectively L=1.0) or Net Asset (Choice)
    };
  }

  // 2. Small Company Check
  // Criteria: Sales < Small Threshold (and usually Emp is small, but Sales is primary driver in flow)
  // Small Thresholds (Bottom of Medium Table)
  let isSmall = false;
  if (industryType === "Wholesale" && salesMillion < 200) isSmall = true;
  else if (industryType === "RetailService" && salesMillion < 60)
    isSmall = true;
  else if (industryType === "MedicalCorporation" && salesMillion < 60)
    isSmall = true; // Same as RetailService
  else if (industryType === "Other" && salesMillion < 100) isSmall = true;

  // Additionally, Employee count restriction often applies for Medium L tables (e.g. >5).
  // If employees <= 5, it typically falls to Small (Net Asset) unless Sales are huge?
  // The text says "excluding companies with <= 5 employees" from the 0.60 tier of Medium.
  // If a company has high sales but <=5 employees, it might technically be Small or specific rule applies.
  // For simplicity here: If Sales match Medium range, we allow Medium logic but L might be affected.
  // However, usually < 5 employees -> Small.
  if (employees <= 5) isSmall = true;

  if (isSmall) {
    return {
      size: "Small",
      sizeMultiplier: 0.5,
      lRatio: 0.5, // Small companies use Net Asset, optional L=0.50 blending
    };
  }

  // 3. Medium Company - Calculate L
  // Medium Size Multiplier is always 0.6
  const sizeMultiplier = 0.6;

  // Calculate L based on Assets & Employees (Table 1)
  let l_assets = 0.0;

  // Helper to check Asset/Emp criteria
  // Wholesale
  if (industryType === "Wholesale") {
    if (assetsMillion >= 400 && employees > 35) l_assets = 0.9;
    else if (assetsMillion >= 200 && employees > 20)
      l_assets = Math.max(l_assets, 0.75);
    else if (assetsMillion >= 70 && employees > 5)
      l_assets = Math.max(l_assets, 0.6);
  }
  // Retail/Service & Medical Corporation (same criteria)
  else if (
    industryType === "RetailService" ||
    industryType === "MedicalCorporation"
  ) {
    if (assetsMillion >= 500 && employees > 35) l_assets = 0.9;
    else if (assetsMillion >= 250 && employees > 20)
      l_assets = Math.max(l_assets, 0.75);
    else if (assetsMillion >= 40 && employees > 5)
      l_assets = Math.max(l_assets, 0.6);
  }
  // Other
  else {
    if (assetsMillion >= 500 && employees > 35) l_assets = 0.9;
    else if (assetsMillion >= 250 && employees > 20)
      l_assets = Math.max(l_assets, 0.75);
    else if (assetsMillion >= 50 && employees > 5)
      l_assets = Math.max(l_assets, 0.6);
  }

  // Calculate L based on Sales (Table 2)
  let l_sales = 0.0;

  // Wholesale
  if (industryType === "Wholesale") {
    if (salesMillion >= 700)
      l_sales = 0.9; // Top is < 3000 (Big)
    else if (salesMillion >= 350) l_sales = Math.max(l_sales, 0.75);
    else if (salesMillion >= 200) l_sales = Math.max(l_sales, 0.6);
  }
  // Retail/Service & Medical Corporation (same criteria)
  else if (
    industryType === "RetailService" ||
    industryType === "MedicalCorporation"
  ) {
    if (salesMillion >= 500)
      l_sales = 0.9; // Top is < 2000 (Big)
    else if (salesMillion >= 250) l_sales = Math.max(l_sales, 0.75);
    else if (salesMillion >= 60) l_sales = Math.max(l_sales, 0.6);
  }
  // Other
  else {
    if (salesMillion >= 400)
      l_sales = 0.9; // Top is < 1500
    else if (salesMillion >= 200) l_sales = Math.max(l_sales, 0.75);
    else if (salesMillion >= 80) l_sales = Math.max(l_sales, 0.6);
  }

  // "Use the larger of the two percentages"
  let lRatio = Math.max(l_assets, l_sales) as 0.9 | 0.75 | 0.6;

  // Fallback? If it fell through cracks (e.g. Sales in Medium range but Assets very low?),
  // usually Sales determines 'Medium' status. If Sales is Medium, we usually get at least 0.60 from Sales table.
  if ((lRatio as number) === 0) lRatio = 0.6;

  return {
    size: "Medium",
    sizeMultiplier,
    lRatio,
  };
}

export interface SimilarIndustryResult {
  value: number; // Final floored value (S)
  S_50_Raw: number; // Precision value per 50 yen
  ratios: {
    b: number;
    c: number;
    d: number;
    B: number;
    C: number;
    D: number;
    ratioB: number;
    ratioC: number;
    ratioD: number;
    avgRatio: number;
  };
  conversion: {
    ratio: number;
    shareCount50: number;
  };
  multiplier: number;
  A: number;
}

export function calculateDetailedSimilarIndustryMethod(
  A: number,
  B: number,
  C: number,
  D: number,
  b: number,
  c: number,
  d: number,
  multiplier: number,
  basicInfo: {
    issuedShares: number;
    capital: number;
    industryType?: IndustryType;
  },
): SimilarIndustryResult {
  let S_50_Raw = 0;
  let ratioB = 0,
    ratioC = 0,
    ratioD = 0,
    avgRatio = 0;

  // 医療法人の場合は配当比準を除外して計算
  const isMedicalCorporation = basicInfo.industryType === "MedicalCorporation";

  // Check if denominators are valid (not zero)
  if (C !== 0 && D !== 0) {
    // 小数点以下2位未満を切り捨て
    if (!isMedicalCorporation && B !== 0) {
      ratioB = Math.floor((b / B) * 100) / 100;
    } else {
      // 医療法人またはB=0の場合は配当比準を0にする
      ratioB = 0;
    }
    ratioC = Math.floor((c / C) * 100) / 100;
    ratioD = Math.floor((d / D) * 100) / 100;

    // 比準割合の計算
    if (isMedicalCorporation || B === 0) {
      // 医療法人の場合は（利益比準 + 純資産比準）÷ 2
      avgRatio = Math.floor(((ratioC + ratioD) / 2) * 100) / 100;
    } else {
      // 通常の場合は（配当比準 + 利益比準 + 純資産比準）÷ 3
      avgRatio = Math.floor(((ratioB + ratioC + ratioD) / 3) * 100) / 100;
    }

    // Raw S_50 (Not floored yet)
    S_50_Raw = A * avgRatio * multiplier;
  }

  // Convert to Actual Share Value
  // Use basicInfo.capital (資本金等の額) for conversion calculation
  const capitalYen = (basicInfo.capital || 0) * 1000;
  const issuedShares = basicInfo.issuedShares || 1;
  const shareCount50 =
    capitalYen > 0 ? Math.floor(capitalYen / 50) : issuedShares;

  const conversionRatio = issuedShares > 0 ? shareCount50 / issuedShares : 1;

  // Final Comparable Value
  // 円未満を切り捨ててから原株換算を掛ける
  const S_50_Floored = Math.floor(S_50_Raw);
  const value = S_50_Floored * conversionRatio;

  return {
    value,
    S_50_Raw,
    ratios: {
      b,
      c,
      d,
      B,
      C,
      D,
      ratioB,
      ratioC,
      ratioD,
      avgRatio,
    },
    conversion: {
      ratio: conversionRatio,
      shareCount50,
    },
    multiplier,
    A,
  };
}

/**
 * Helper function to calculate comparable value (S) from industry data
 */
function calculateComparableValue(
  financials: Financials,
  basicInfo: BasicInfo,
) {
  const {
    industryStockPriceCurrent,
    industryStockPrice1MonthBefore,
    industryStockPrice2MonthsBefore,
    industryStockPricePrevYearAverage,
    industryDividends: B,
    industryProfit: C,
    industryBookValue: D,
    ownDividends: b,
    ownProfit: c,
    ownBookValue: d,
  } = financials;

  const possibleAs = [
    industryStockPriceCurrent,
    industryStockPrice1MonthBefore,
    industryStockPrice2MonthsBefore,
    industryStockPricePrevYearAverage,
  ].filter((n) => n > 0);
  const A = possibleAs.length > 0 ? Math.min(...possibleAs) : 0;

  const multiplier = getMultiplier(basicInfo);

  const simResult = calculateDetailedSimilarIndustryMethod(
    A,
    B,
    C,
    D,
    b,
    c,
    d,
    multiplier,
    basicInfo,
  );

  return simResult.value;
}

/**
 * Calculates Final Valuation Result based on Size and Methods.
 * Used in Step 6 and Step 7.
 */
export function calculateFinalValuation(
  basicInfo: BasicInfo,
  financials: Financials,
) {
  const { assetsBookValue, liabilitiesBookValue } = financials;
  // Check for Inheritance Values (default to Book Value if not valid/present)
  const assetsInheritanceValue =
    financials.assetsInheritanceValue ?? assetsBookValue;
  const liabilitiesInheritanceValue =
    financials.liabilitiesInheritanceValue ?? liabilitiesBookValue;

  const { issuedShares, size } = basicInfo;
  let lRatio = basicInfo.lRatio;

  // 比準要素数0の会社の場合、L=0として扱う（純資産価額のみで評価）
  if (financials.isZeroElementCompany) {
    lRatio = 0.0;
  }
  // 小会社の場合、L=0.5として扱う
  else if (size === "Small") {
    lRatio = 0.5;
  }

  // 1. Net Asset Value per Share (N)
  const netInh = Math.max(
    0,
    assetsInheritanceValue - liabilitiesInheritanceValue,
  );
  const netBook = Math.max(0, assetsBookValue - liabilitiesBookValue);

  const evalDiff = netInh - netBook;
  const tax = evalDiff > 0 ? evalDiff * 0.37 : 0;

  const netAssetTotalAdjusted = netInh - tax;
  const netAssetPerShare = Math.max(0, netAssetTotalAdjusted / issuedShares);

  // 2. Comparable Company Value (S)
  const comparableValue = calculateComparableValue(financials, basicInfo);

  // 3. Selection
  let finalValue = 0;
  let methodDescription = "";

  const S = comparableValue;
  const N = netAssetPerShare;
  const L = lRatio;

  // Additional info for comparison
  let comparisonDetails: { name: string; value: number }[] = [];

  // 比準要素数0の会社の場合（優先順位1）
  if (financials.isZeroElementCompany) {
    finalValue = N;
    methodDescription = "比準要素数0の会社 (純資産価額)";
    lRatio = 0.0;
    comparisonDetails = [{ name: "比準要素数0", value: Math.floor(N) }];
  }
  // 比準要素数1の会社の場合（優先順位2）
  else if (financials.isOneElementCompany) {
    const blended = S * 0.25 + N * 0.75;
    finalValue = Math.min(blended, N);
    methodDescription =
      "比準要素数1の会社 ((S×0.25 + N×0.75)とNのいずれか低い方)";
    lRatio = 0.25;
    comparisonDetails = [
      { name: "比準要素数1", value: Math.floor(finalValue) },
    ];
  }
  // 一般の評価会社（優先順位3）
  else if (size === "Big") {
    if (S < N) {
      finalValue = S;
      methodDescription = "類似業種比準価額 (原則)";
    } else {
      finalValue = N;
      methodDescription = "純資産価額 (選択)";
    }
    lRatio = 1.0;
    comparisonDetails = [{ name: "大会社", value: Math.floor(S) }];
  } else if (size === "Medium") {
    // 中会社: (min(S, N) × L) + (N × (1 - L))
    const minValue = Math.min(S, N);
    const blended = minValue * L + N * (1 - L);
    finalValue = blended;
    methodDescription = `併用方式 ((min(S,N)×${L.toFixed(2)})+(N×${(1 - L).toFixed(2)}))`;

    // L値に応じた表示名を決定
    let mediumLabel = "中会社";
    if (L === 0.9) mediumLabel = "中会社 (L=0.9)";
    else if (L === 0.75) mediumLabel = "中会社 (L=0.75)";
    else if (L === 0.6) mediumLabel = "中会社 (L=0.6)";

    comparisonDetails = [{ name: mediumLabel, value: Math.floor(blended) }];
  } else {
    // Small
    const blended = S * 0.5 + N * 0.5;
    if (N < blended) {
      finalValue = N;
      methodDescription = "純資産価額 (原則)";
    } else {
      finalValue = blended;
      methodDescription = "併用方式 (L=0.50選択)";
    }
    comparisonDetails = [{ name: "小会社", value: Math.floor(blended) }];
  }

  return {
    finalValue: Math.floor(finalValue),
    netAssetPerShare: Math.floor(N),
    comparableValue: Math.floor(S),
    methodDescription,
    size,
    lRatio,
    comparisonDetails,
    netAssetDetail: {
      netInh,
      netBook,
      tax,
    },
    // 計算過程の詳細
    calculationMethod: financials.isZeroElementCompany
      ? "比準要素数0"
      : financials.isOneElementCompany
        ? "比準要素数1"
        : size === "Big"
          ? "大会社"
          : size === "Medium"
            ? "中会社"
            : "小会社",
  };
}

/**
 * 直前期利益=0のシミュレーション用Financialsを構築する。
 * ValuationSimulation, ValuationSummary, PrintAllSteps で共通使用。
 */
export function buildSimulationFinancials(
  financials: Financials,
  issuedShares: number,
): Financials {
  const cap1 = financials.ownCapitalPrev || 0;
  const capitalPrevYen = cap1 * 1000;
  const shareCount50 =
    capitalPrevYen > 0 ? Math.floor(capitalPrevYen / 50) : issuedShares;

  const simResult = calculateOwnDataComplete({
    divPrev: financials.ownDividendPrev || 0,
    div2Prev: financials.ownDividend2Prev || 0,
    div3Prev: financials.ownDividend3Prev || 0,
    p1: 0,
    l1: financials.ownCarryForwardLossPrev || 0,
    p2: financials.ownTaxableIncome2Prev || 0,
    l2: financials.ownCarryForwardLoss2Prev || 0,
    p3: financials.ownTaxableIncome3Prev || 0,
    l3: financials.ownCarryForwardLoss3Prev || 0,
    cap1,
    re1: financials.ownRetainedEarningsPrev || 0,
    cap2: financials.ownCapital2Prev || 0,
    re2: financials.ownRetainedEarnings2Prev || 0,
    shareCount50,
    profitMethodC: "auto",
    profitMethodC1: "auto",
    profitMethodC2: "auto",
  });

  return {
    ...financials,
    ownProfit: simResult.ownProfit,
  };
}

/**
 * Calculates Corporate Tax Fair Value (法人税法上の時価)
 * Used in Step 7 only.
 *
 * 比準要素数0、1以外の場合は会社規模に関わらず小会社の株式の価額で評価
 */
export function calculateCorporateTaxFairValue(
  basicInfo: BasicInfo,
  financials: Financials,
) {
  const { assetsBookValue, liabilitiesBookValue } = financials;
  const assetsInheritanceValue =
    financials.assetsInheritanceValue ?? assetsBookValue;
  const liabilitiesInheritanceValue =
    financials.liabilitiesInheritanceValue ?? liabilitiesBookValue;
  const landFairValueAddition = financials.landFairValueAddition ?? 0;

  const { issuedShares } = basicInfo;

  // 1. Net Asset Value per Share (N) - 法人税法上の時価では税金調整なし
  // 土地の時価を加算（相続税評価額*0.25）を追加
  const netInh =
    assetsInheritanceValue +
    landFairValueAddition -
    liabilitiesInheritanceValue;
  const netAssetPerShare = Math.max(0, netInh / issuedShares);

  // 2. Comparable Company Value (S)
  const comparableValue = calculateComparableValue(financials, basicInfo);

  // 3. Selection based on Corporate Tax Law
  let finalValue = 0;
  let methodDescription = "";

  const S = comparableValue;
  const N = netAssetPerShare;

  let comparisonDetails: { name: string; value: number }[] = [];

  // 法人税法上の時価のLの割合とサイズを決定
  let lRatio: 0.0 | 0.25 | 0.5 = 0.5;
  const size: CompanySize = "Small";

  // 比準要素数0の会社の場合（純資産価額のみ）
  if (financials.isZeroElementCompany) {
    finalValue = N;
    methodDescription = "比準要素数0の会社 (純資産価額)";
    lRatio = 0.0;
    comparisonDetails = [{ name: "比準要素数0", value: Math.floor(N) }];
  }
  // 比準要素数1の会社の場合（S×0.25 + N×0.75とNのいずれか低い方）
  else if (financials.isOneElementCompany) {
    const blended = S * 0.25 + N * 0.75;
    finalValue = Math.min(blended, N);
    methodDescription =
      "比準要素数1の会社 ((S×0.25 + N×0.75)とNのいずれか低い方)";
    lRatio = 0.25;
    comparisonDetails = [
      { name: "比準要素数1", value: Math.floor(finalValue) },
    ];
  }
  // それ以外の場合は会社規模に関わらず小会社の株式の価額で評価
  else {
    const blended = S * 0.5 + N * 0.5;
    finalValue = Math.min(N, blended);
    methodDescription = "法人税法上の時価（小会社の株式の価額）";
    lRatio = 0.5;
    comparisonDetails = [
      { name: "小会社の株式の価額", value: Math.floor(finalValue) },
    ];
  }

  return {
    finalValue: Math.floor(finalValue),
    netAssetPerShare: Math.floor(N),
    comparableValue: Math.floor(S),
    methodDescription,
    size,
    lRatio,
    comparisonDetails,
    netAssetDetail: {
      netInh, // 相続税評価額ベースの純資産（税金調整なし）
      netBook: 0, // 法人税法上の時価では使用しない
      tax: 0, // 法人税法上の時価では税金調整なし
    },
    // 計算過程の詳細
    calculationMethod: financials.isZeroElementCompany
      ? "比準要素数0"
      : financials.isOneElementCompany
        ? "比準要素数1"
        : "小会社",
  };
}
