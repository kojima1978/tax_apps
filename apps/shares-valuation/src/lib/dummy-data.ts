import { IndustryType } from "./valuation-logic";

export interface DummyDataPattern {
  // Step 1: 基礎情報
  companyName: string;
  taxationPeriod: string;
  previousPeriod: string;
  capital: number; // 千円
  issuedShares: number; // 株

  // Step 2: 会社規模
  employees: number; // 人
  totalAssets: number; // 千円
  sales: number; // 千円
  industryType: IndustryType;

  // Step 3: 自社データ（千円）
  ownDividendPrev: number;
  ownDividend2Prev: number;
  ownDividend3Prev: number;
  ownTaxableIncomePrev: number;
  ownCarryForwardLossPrev: number;
  ownTaxableIncome2Prev: number;
  ownCarryForwardLoss2Prev: number;
  ownTaxableIncome3Prev: number;
  ownCarryForwardLoss3Prev: number;
  ownCapitalPrev: number;
  ownRetainedEarningsPrev: number;
  ownCapital2Prev: number;
  ownRetainedEarnings2Prev: number;

  // Step 4: 類似業種データ
  industryStockPriceCurrent: number; // 円
  industryStockPrice1MonthBefore: number; // 円
  industryStockPrice2MonthsBefore: number; // 円
  industryStockPricePrevYearAverage: number; // 円
  industryDividendsYen: number; // 円
  industryDividendsSen: number; // 銭
  industryProfit: number; // 円
  industryBookValue: number; // 円

  // Step 5: 純資産データ（千円）
  assetsBookValue: number;
  assetsInheritanceValue: number;
  liabilitiesBookValue: number;
  liabilitiesInheritanceValue: number;
}

export const DUMMY_DATA_PATTERNS: Record<string, DummyDataPattern> = {
  // 小会社
  pattern1: {
    companyName: "株式会社小売商事",
    taxationPeriod: "2024-07-01",
    previousPeriod: "2024-06-30",
    capital: 20000, // 2億円
    issuedShares: 4000,
    employees: 15,
    totalAssets: 200000, // 2億円
    sales: 45000, // 0.45億円
    industryType: "RetailService",
    ownDividendPrev: 1200,
    ownDividend2Prev: 1000,
    ownDividend3Prev: 800,
    ownTaxableIncomePrev: 25000,
    ownCarryForwardLossPrev: 10000,
    ownTaxableIncome2Prev: 22000,
    ownCarryForwardLoss2Prev: 0,
    ownTaxableIncome3Prev: 20000,
    ownCarryForwardLoss3Prev: 0,
    ownCapitalPrev: 20000,
    ownRetainedEarningsPrev: 35000,
    ownCapital2Prev: 20000,
    ownRetainedEarnings2Prev: 30000,
    industryStockPriceCurrent: 128,
    industryStockPrice1MonthBefore: 125,
    industryStockPrice2MonthsBefore: 130,
    industryStockPricePrevYearAverage: 122,
    industryDividendsYen: 2,
    industryDividendsSen: 8,
    industryProfit: 15,
    industryBookValue: 82,
    assetsBookValue: 200000000,
    assetsInheritanceValue: 230000000,
    liabilitiesBookValue: 145000000,
    liabilitiesInheritanceValue: 145000000,
  },
  // 中会社
  pattern2: {
    companyName: "株式会社サンプル製造",
    taxationPeriod: "2025-02-21",
    previousPeriod: "2024-07-31",
    capital: 50000, // 5億円
    issuedShares: 1000,
    employees: 45,
    totalAssets: 800000000, // 8億円
    sales: 1200000000, // 12億円
    industryType: "Other",
    ownDividendPrev: 5000,
    ownDividend2Prev: 4800,
    ownDividend3Prev: 4500,
    ownTaxableIncomePrev: 80000,
    ownCarryForwardLossPrev: 0,
    ownTaxableIncome2Prev: 75000,
    ownCarryForwardLoss2Prev: 0,
    ownTaxableIncome3Prev: 70000,
    ownCarryForwardLoss3Prev: 0,
    ownCapitalPrev: 50000,
    ownRetainedEarningsPrev: 120000,
    ownCapital2Prev: 50000,
    ownRetainedEarnings2Prev: 100000,
    industryStockPriceCurrent: 150,
    industryStockPrice1MonthBefore: 148,
    industryStockPrice2MonthsBefore: 152,
    industryStockPricePrevYearAverage: 145,
    industryDividendsYen: 3,
    industryDividendsSen: 5,
    industryProfit: 18,
    industryBookValue: 95,
    assetsBookValue: 800000000,
    assetsInheritanceValue: 850000000,
    liabilitiesBookValue: 630000000,
    liabilitiesInheritanceValue: 630000000,
  },
  // 大会社
  pattern3: {
    companyName: "株式会社卸売トレーディング",
    taxationPeriod: "2024-09-30",
    previousPeriod: "2024-09-30",
    capital: 100000, // 10億円
    issuedShares: 10000,
    employees: 80,
    totalAssets: 2500000, // 25億円
    sales: 4000000, // 40億円
    industryType: "Wholesale",
    ownDividendPrev: 15000,
    ownDividend2Prev: 14000,
    ownDividend3Prev: 13000,
    ownTaxableIncomePrev: 200000,
    ownCarryForwardLossPrev: 0,
    ownTaxableIncome2Prev: 180000,
    ownCarryForwardLoss2Prev: 0,
    ownTaxableIncome3Prev: 170000,
    ownCarryForwardLoss3Prev: 0,
    ownCapitalPrev: 100000,
    ownRetainedEarningsPrev: 350000,
    ownCapital2Prev: 100000,
    ownRetainedEarnings2Prev: 300000,
    industryStockPriceCurrent: 165,
    industryStockPrice1MonthBefore: 162,
    industryStockPrice2MonthsBefore: 168,
    industryStockPricePrevYearAverage: 160,
    industryDividendsYen: 4,
    industryDividendsSen: 2,
    industryProfit: 22,
    industryBookValue: 110,
    assetsBookValue: 3000000000,
    assetsInheritanceValue: 2700000000,
    liabilitiesBookValue: 2050000000,
    liabilitiesInheritanceValue: 2050000000,
  },
};

export type DummyDataPatternKey = keyof typeof DUMMY_DATA_PATTERNS;
