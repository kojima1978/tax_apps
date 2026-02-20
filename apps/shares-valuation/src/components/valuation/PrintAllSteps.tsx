import { BasicInfo, Financials } from "@/types/valuation";
import {
  calculateFinalValuation,
  calculateCorporateTaxFairValue,
  buildSimulationFinancials,
  calculateDetailedSimilarIndustryMethod,
  getMultiplier,
} from "@/lib/valuation-logic";
import {
  getTaxationMonth,
  getPreviousYear,
  getMonthOffset,
} from "@/lib/date-utils";
import { PrintValuationStep } from "./PrintValuationStep";
import { PrintStyles } from "./print/PrintStyles";
import { PrintStep1BasicInfo } from "./print/PrintStep1BasicInfo";
import { PrintStep2CompanySize } from "./print/PrintStep2CompanySize";
import { PrintStep3OwnData } from "./print/PrintStep3OwnData";
import { PrintStep4IndustryData } from "./print/PrintStep4IndustryData";
import { PrintStep5NetAsset } from "./print/PrintStep5NetAsset";
import { PrintComparisonTable } from "./print/PrintComparisonTable";

interface PrintAllStepsProps {
  basicInfo: BasicInfo;
  financials: Financials;
}

export function PrintAllSteps({ basicInfo, financials }: PrintAllStepsProps) {
  // Calculate all results
  const step6Result = calculateFinalValuation(basicInfo, financials);
  const step7Result = calculateCorporateTaxFairValue(basicInfo, financials);

  // Step 8 simulation
  const simFinancials = buildSimulationFinancials(financials, basicInfo.issuedShares);
  const step8Result = calculateFinalValuation(basicInfo, simFinancials);

  // Date helpers
  const taxationMonth = getTaxationMonth(basicInfo.taxationPeriod);
  const oneMonthBefore = getMonthOffset(basicInfo.taxationPeriod, 1);
  const twoMonthsBefore = getMonthOffset(basicInfo.taxationPeriod, 2);
  const prevYear = getPreviousYear(basicInfo.taxationPeriod);

  // Calculate industry comparison details
  const industryDetails = (() => {
    const A = Math.min(
      financials.industryStockPriceCurrent || Infinity,
      financials.industryStockPrice1MonthBefore || Infinity,
      financials.industryStockPrice2MonthsBefore || Infinity,
      financials.industryStockPricePrevYearAverage || Infinity,
    );

    if (A === Infinity || A === 0) return null;

    const B_ind = financials.industryDividends || 0;
    const C_ind = financials.industryProfit || 0;
    const D_ind = financials.industryBookValue || 0;

    if (C_ind === 0 || D_ind === 0) return null;

    const isMedicalCorporation = basicInfo.industryType === "MedicalCorporation";
    if (!isMedicalCorporation && B_ind === 0) return null;

    const b_own = financials.ownDividends || 0;
    const c_own = financials.ownProfit || 0;
    const d_own = financials.ownBookValue || 0;

    return calculateDetailedSimilarIndustryMethod(
      A, B_ind, C_ind, D_ind, b_own, c_own, d_own,
      getMultiplier(basicInfo), basicInfo,
    );
  })();

  const totalShares = basicInfo.issuedShares || 1;

  return (
    <div className="print-content space-y-4 p-4 text-xs">
      <PrintStyles />

      {/* Title */}
      <div className="text-center border-b border-gray-400 pb-2 mb-3">
        <h1 className="text-base font-bold text-black">非上場株式評価明細書</h1>
        <p className="text-base text-black">全ステップ詳細（Step 1-8）</p>
      </div>

      <PrintStep1BasicInfo basicInfo={basicInfo} />
      <PrintStep2CompanySize basicInfo={basicInfo} />
      <PrintStep3OwnData financials={financials} totalShares={totalShares} />
      <PrintStep4IndustryData
        basicInfo={basicInfo}
        financials={financials}
        industryDetails={industryDetails}
        taxationMonth={taxationMonth}
        oneMonthBefore={oneMonthBefore}
        twoMonthsBefore={twoMonthsBefore}
        prevYear={prevYear}
      />
      <PrintStep5NetAsset
        financials={financials}
        totalShares={totalShares}
        netAssetPerShare={step6Result.netAssetPerShare}
      />

      {/* Step 6: 相続税評価額 */}
      <PrintValuationStep title="Step 6: 相続税評価額" result={step6Result} />

      {/* Step 7: 法人税法上の時価 */}
      <PrintValuationStep title="Step 7: 法人税法上の時価" result={step7Result} />

      {/* Step 8: シミュレーション */}
      <PrintValuationStep
        title="Step 8: シミュレーション（直前期利益=0）"
        result={step8Result}
        extraHeader={
          <div className="border border-gray-300 p-2">
            <div className="mb-1">シミュレーション条件</div>
            <div className="font-bold">直前期の課税所得を「0」と仮定</div>
            <div className="mt-1">
              ※ 繰越欠損金がある場合、利益計算に影響します
            </div>
          </div>
        }
      />

      <PrintComparisonTable
        step6Result={step6Result}
        step7Result={step7Result}
        step8Result={step8Result}
        totalShares={totalShares}
      />
    </div>
  );
}
