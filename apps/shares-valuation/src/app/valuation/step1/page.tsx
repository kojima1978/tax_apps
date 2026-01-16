"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BasicInfoForm } from "@/components/valuation/BasicInfoForm";
import { BasicInfo, Financials } from "@/types/valuation";
import { DUMMY_DATA_PATTERNS, DummyDataPatternKey } from "@/lib/dummy-data";

export default function Step1Page() {
  const router = useRouter();
  const [defaultValues, setDefaultValues] = useState<Partial<BasicInfo> | null>(
    null,
  );

  useEffect(() => {
    // Load saved data from sessionStorage
    const saved = sessionStorage.getItem("valuationBasicInfo");
    if (saved) {
      try {
        setDefaultValues(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved data:", e);
      }
    }
  }, []);

  const handleNext = (
    data: Partial<BasicInfo>,
    dummyDataKey?: DummyDataPatternKey,
  ) => {
    // Load existing data from sessionStorage
    const existingData = sessionStorage.getItem("valuationBasicInfo");
    let existingBasicInfo: Partial<BasicInfo> = {};
    if (existingData) {
      try {
        existingBasicInfo = JSON.parse(existingData);
      } catch (e) {
        console.error("Failed to parse existing data:", e);
      }
    }

    // If dummy data was selected, merge all data
    let basicInfoToSave = { ...existingBasicInfo, ...data };

    if (dummyDataKey) {
      const pattern = DUMMY_DATA_PATTERNS[dummyDataKey];

      // Merge Step 2 data into basic info
      basicInfoToSave = {
        ...basicInfoToSave,
        employees: pattern.employees,
        totalAssets: pattern.totalAssets,
        sales: pattern.sales,
        industryType: pattern.industryType,
      };

      // Save all financial data (Step 3, 4, 5)
      const financials: Partial<Financials> = {
        // Step 3: 自社データ
        ownDividendPrev: pattern.ownDividendPrev,
        ownDividend2Prev: pattern.ownDividend2Prev,
        ownDividend3Prev: pattern.ownDividend3Prev,
        ownTaxableIncomePrev: pattern.ownTaxableIncomePrev,
        ownCarryForwardLossPrev: pattern.ownCarryForwardLossPrev,
        ownTaxableIncome2Prev: pattern.ownTaxableIncome2Prev,
        ownCarryForwardLoss2Prev: pattern.ownCarryForwardLoss2Prev,
        ownTaxableIncome3Prev: pattern.ownTaxableIncome3Prev,
        ownCarryForwardLoss3Prev: pattern.ownCarryForwardLoss3Prev,
        ownCapitalPrev: pattern.ownCapitalPrev,
        ownRetainedEarningsPrev: pattern.ownRetainedEarningsPrev,
        ownCapital2Prev: pattern.ownCapital2Prev,
        ownRetainedEarnings2Prev: pattern.ownRetainedEarnings2Prev,
        // Step 4: 類似業種データ
        industryStockPriceCurrent: pattern.industryStockPriceCurrent,
        industryStockPrice1MonthBefore: pattern.industryStockPrice1MonthBefore,
        industryStockPrice2MonthsBefore:
          pattern.industryStockPrice2MonthsBefore,
        industryStockPricePrevYearAverage:
          pattern.industryStockPricePrevYearAverage,
        industryDividends:
          pattern.industryDividendsYen + pattern.industryDividendsSen * 0.1,
        industryProfit: pattern.industryProfit,
        industryBookValue: pattern.industryBookValue,
        // Step 5: 純資産データ
        assetsBookValue: pattern.assetsBookValue,
        assetsInheritanceValue: pattern.assetsInheritanceValue,
        liabilitiesBookValue: pattern.liabilitiesBookValue,
        liabilitiesInheritanceValue: pattern.liabilitiesInheritanceValue,
      };
      sessionStorage.setItem("valuationFinancials", JSON.stringify(financials));
    }

    // Save basic info to sessionStorage
    sessionStorage.setItem(
      "valuationBasicInfo",
      JSON.stringify(basicInfoToSave),
    );

    // Navigate to step 2
    router.push("/valuation/step2");
  };

  const handleBack = () => {
    // Clear data and go back to top
    sessionStorage.removeItem("valuationBasicInfo");
    sessionStorage.removeItem("valuationFinancials");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BasicInfoForm
          onNext={handleNext}
          onBack={handleBack}
          defaultValues={defaultValues || undefined}
        />
      </div>
    </div>
  );
}
