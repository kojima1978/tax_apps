"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { useMemo } from "react";
import { calculateCorporateTaxFairValue } from "@/lib/valuation-logic";
import { ValuationResultCards, getResultCardsProps } from "./ValuationResultCards";
import { CalculationProcessDisplay } from "./CalculationProcessDisplay";

interface CorporateTaxFairValueProps {
  basicInfo: BasicInfo;
  financials: Financials;
  onBack: () => void;
  onNext: () => void;
  onHome?: () => void;
}

export function CorporateTaxFairValue({
  basicInfo,
  financials,
  onBack,
  onNext,
  onHome,
}: CorporateTaxFairValueProps) {
  const results = useMemo(() => {
    return calculateCorporateTaxFairValue(basicInfo, financials);
  }, [basicInfo, financials]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-primary">
          法人税法上の時価 (Step 7/8)
        </h2>
        <p className="text-muted-foreground">法人税法上の時価を算定します。</p>
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
          netAssetSuffix="（土地は時価＋法人税控除しない）"
          variant="corporate"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-center gap-4 pt-8">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          戻る
        </Button>
        {onHome && (
          <Button type="button" variant="outline" onClick={onHome} size="lg">
            トップに戻る
          </Button>
        )}
        <Button
          type="button"
          onClick={onNext}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-colors hover:-translate-y-1"
        >
          次へ進む
        </Button>
      </div>
    </div>
  );
}
