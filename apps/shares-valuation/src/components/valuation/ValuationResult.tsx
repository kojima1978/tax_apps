import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { useMemo } from "react";

import { calculateFinalValuation } from "@/lib/valuation-logic";
import { ValuationResultCards, getResultCardsProps } from "./ValuationResultCards";
import { CalculationProcessDisplay } from "./CalculationProcessDisplay";

interface ValuationResultProps {
  basicInfo: BasicInfo;
  financials: Financials;
  onBack: () => void;
  onNext?: () => void;
}

export function ValuationResult({
  basicInfo,
  financials,
  onBack,
  onNext,
}: ValuationResultProps) {
  // Calculation Logic
  // Use calculateFinalValuation from logic.ts to ensure consistency including conversion ratio
  const results = useMemo(() => {
    const result = calculateFinalValuation(basicInfo, financials);
    return result;
  }, [basicInfo, financials]);

  const handleBulkEdit = () => {
    // データをsessionStorageに保存
    sessionStorage.setItem("valuationBasicInfo", JSON.stringify(basicInfo));
    sessionStorage.setItem("valuationFinancials", JSON.stringify(financials));

    // ページ遷移
    window.location.href = "/valuation/bulk";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-primary">
          相続税評価額 (Step 6/8)
        </h2>
        <p className="text-muted-foreground">
          最も有利（低価）となる評価方式を自動判定しました。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ValuationResultCards {...getResultCardsProps(results)} />

        {/* 計算過程 */}
        <CalculationProcessDisplay
          comparableValue={results.comparableValue}
          netAssetPerShare={results.netAssetPerShare}
          lRatio={results.lRatio}
          size={results.size}
          isZeroElementCompany={financials.isZeroElementCompany}
          isOneElementCompany={financials.isOneElementCompany}
          variant="inheritance"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-center gap-4 pt-8">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          個別で修正
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleBulkEdit}
          size="lg"
        >
          一覧で修正
        </Button>
        {onNext && (
          <Button
            type="button"
            onClick={onNext}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-colors hover:-translate-y-1"
          >
            次へ進む
          </Button>
        )}
      </div>
    </div>
  );
}
