export interface Investor {
  name: string;
  amount: number;
}

export interface FormData {
  // STEP0: 基本情報
  id?: string;
  fiscalYear?: string;
  companyName?: string;
  personInCharge?: string;

  // STEP1: 会社規模判定
  employees: string;
  totalAssets: string;
  sales: string;

  // STEP2: 財務データ
  currentPeriodNetAsset: number;
  previousPeriodNetAsset: number;
  netAssetTaxValue: number;
  currentPeriodProfit: number;
  previousPeriodProfit: number;
  previousPreviousPeriodProfit: number;

  // STEP3: 出資者情報
  investors: Investor[];

  // 類似業種データ（計算時に動的に取得）
  similarIndustryData?: SimilarIndustryData;
}

export interface SimilarIndustryData {
  fiscal_year: string;
  profit_per_share: number;
  net_asset_per_share: number;
  average_stock_price: number;
}

export interface CalculationResult {
  // 会社規模
  companySize: string;

  // 特定の評価会社の該当判定
  specialCompanyType: string;

  // 出資金額総額（千円）
  totalCapital: number;

  // 総出資口数
  totalShares: number;

  // 出資持分の相続税評価額（千円）
  inheritanceTaxValue: number;

  // 1口あたりの純資産価額方式による評価額（円）
  perShareNetAssetValue: number;

  // 1口あたりの類似業種比準価額方式による評価額（円）
  perShareSimilarIndustryValue: number;

  // 1口あたりの評価額（円）
  perShareValue: number;

  // 評価方式
  evaluationMethod: string;

  // L値
  lRatio: number;

  // 出資持分評価額（千円）
  totalEvaluationValue: number;

  // 持分なし医療法人移行時のみなし贈与税額（千円）
  deemedGiftTax: number;

  // 各出資者の評価額
  investorResults: Array<{
    name: string;
    amount: number;
    evaluationValue: number;
    giftTax: number;
  }>;
}
