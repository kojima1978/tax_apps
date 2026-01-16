import { CompanySize, IndustryType } from "@/lib/valuation-logic";

export interface BasicInfo {
  companyName: string;
  taxationPeriod: string; // e.g. "令和5年10月"
  previousPeriod: string; // e.g. "令和4年10月"
  industryType?: IndustryType;
  employees: number;
  capital: number; // 資本金等 (千円)
  issuedShares: number;
  totalAssets: number;
  sales: number;
  // Calculated results
  size: CompanySize;
  lRatio: number;
  sizeMultiplier?: number;
}

export interface Financials {
  // Net Asset Data
  assetsBookValue: number;
  assetsInheritanceValue?: number; // 相続税評価額
  landFairValueAddition?: number; // 土地の時価を加算（相続税評価額*0.25）
  liabilitiesBookValue: number;
  liabilitiesInheritanceValue?: number; // 相続税評価額

  // Comparable Company Inputs
  // A: Stock Price (4 indicators)
  industryStockPriceCurrent: number; // 課税時期
  industryStockPrice1MonthBefore: number; // 前月
  industryStockPrice2MonthsBefore: number; // 前々月
  industryStockPricePrevYearAverage: number; // 前年平均

  // Comparable Industry Data (B, C, D)
  industryDividends: number; // B
  industryProfit: number; // C
  industryBookValue: number; // D

  // Own Company Data (b, c, d)
  ownDividends: number; // b
  ownProfit: number; // c
  ownBookValue: number; // d

  // Additional Own Company Data (b1, b2, c1, c2, d1, d2)
  ownDividendsB1?: number; // b1: (直前期 + 2期前) ÷ 2
  ownDividendsB2?: number; // b2: (2期前 + 3期前) ÷ 2
  ownProfitC1?: number; // c1: 直前期の差引利益金額
  ownProfitC2?: number; // c2: (直前期 + 2期前) ÷ 2
  ownBookValueD1?: number; // d1: 直前期の純資産価額
  ownBookValueD2?: number; // d2: 2期前の純資産価額

  // Special company classification
  isZeroElementCompany?: boolean; // 比準要素数0の会社 (b1=0, c1=0, c2=0)
  isOneElementCompany?: boolean; // 比準要素数1の会社 (b1,c1,d1のいずれか2つが0 かつ b2,c2,d2の2以上が0)

  // Profit calculation method selections
  profitMethodC?: "auto" | "c1" | "c2"; // c の選択
  profitMethodC1?: "auto" | "c1" | "c2"; // c1 の選択
  profitMethodC2?: "auto" | "c1" | "c2"; // c2 の選択

  // Step 3 Raw Inputs (for persistence)
  ownDividendPrev?: number;
  ownDividend2Prev?: number;
  ownDividend3Prev?: number;
  ownTaxableIncomePrev?: number;
  ownCarryForwardLossPrev?: number;
  ownTaxableIncome2Prev?: number;
  ownCarryForwardLoss2Prev?: number;
  ownTaxableIncome3Prev?: number;
  ownCarryForwardLoss3Prev?: number;
  ownCapitalPrev?: number;
  ownRetainedEarningsPrev?: number;
  ownCapital2Prev?: number;
  ownRetainedEarnings2Prev?: number;
}
