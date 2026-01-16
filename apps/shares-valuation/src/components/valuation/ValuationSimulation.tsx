"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMemo } from "react";
import {
  calculateFinalValuation,
  calculateOwnFinancials,
} from "@/lib/valuation-logic";
import { exportValuationData } from "@/lib/data-export-import";

interface ValuationSimulationProps {
  basicInfo: BasicInfo;
  financials: Financials;
  onBack: () => void;
  onHome?: () => void;
  onSummary?: () => void;
}

export function ValuationSimulation({
  basicInfo,
  financials,
  onBack,
  onHome,
  onSummary,
}: ValuationSimulationProps) {
  // Calculation Logic
  const simulationResults = useMemo(() => {
    // 1. Current Valuation
    const currentResult = calculateFinalValuation(basicInfo, financials);

    // 2. Simulated Valuation (ProfitPrev = 0)
    // We need to re-calculate 'ownProfit' (c) assuming last year's profit (p1) is 0.
    // We use the raw stored inputs.

    // Prepare Simulation Data inputs
    const simData = {
      divPrev: financials.ownDividendPrev || 0,
      div2Prev: financials.ownDividend2Prev || 0,
      div3Prev: financials.ownDividend3Prev || 0,

      // Force P1 to 0
      p1: 0,
      l1: financials.ownCarryForwardLossPrev || 0,

      p2: financials.ownTaxableIncome2Prev || 0,
      l2: financials.ownCarryForwardLoss2Prev || 0,
      p3: financials.ownTaxableIncome3Prev || 0,
      l3: financials.ownCarryForwardLoss3Prev || 0,

      cap1: financials.ownCapitalPrev || 0,
      re1: financials.ownRetainedEarningsPrev || 0,
      cap2: financials.ownCapital2Prev || 0,
      re2: financials.ownRetainedEarnings2Prev || 0,
    };

    const simOwnFinancials = calculateOwnFinancials(
      simData,
      basicInfo.issuedShares,
    );

    // Create simulated financials object
    const simFinancials: Financials = {
      ...financials,
      ownProfit: simOwnFinancials.ownProfit, // Update 'c'
      // We should theoretically update 'ownDividends' and 'ownBookValue' too if they depend on same inputs,
      // but here we only changed P1, so only Profit affects 'c'.
      // However, calculateOwnFinancials returns consistent set, so safe to use all?
      // Actually only profit (c) changes if p1 changes. Dividends and BookValue inputs are untouched.
    };

    const simResult = calculateFinalValuation(basicInfo, simFinancials);

    return {
      current: currentResult,
      simulated: simResult,
      diff: simResult.finalValue - currentResult.finalValue,
    };
  }, [basicInfo, financials]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-primary">
          シミュレーション (Step 8/8)
        </h2>
        <p className="text-muted-foreground">
          直前期の利益を「0」と仮定した場合の株価試算と比較します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Result Comparison */}
        <Card
          className={`col-span-1 md:col-span-2 p-8 border-4 shadow-xl bg-gradient-to-br from-white to-primary/5 ${simulationResults.diff < 0 ? "border-primary/20" : "border-secondary/20"}`}
        >
          <div className="flex flex-col md:flex-row justify-around items-center gap-8">
            {/* Current */}
            <div className="text-center space-y-2 flex-1">
              <h3 className="text-sm font-bold text-muted-foreground">
                現状の評価額
              </h3>
              <div className="text-4xl font-black text-foreground">
                {simulationResults.current.finalValue.toLocaleString()}
                <span className="text-lg text-muted-foreground ml-1">円</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {simulationResults.current.methodDescription}
              </p>
            </div>

            {/* Arrow */}
            <div className="text-2xl text-muted-foreground font-bold">→</div>

            {/* Simulation */}
            <div className="text-center space-y-2 flex-1">
              <h3 className="text-sm font-bold text-primary">
                直前期利益=0 の場合
              </h3>
              <div className="text-4xl font-black text-primary">
                {simulationResults.simulated.finalValue.toLocaleString()}
                <span className="text-lg text-muted-foreground ml-1">円</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {simulationResults.simulated.methodDescription}
              </p>
            </div>
          </div>

          {/* Diff Display */}
          <div className="mt-8 text-center bg-white/50 p-4 rounded-xl border border-dashed">
            <span className="text-sm font-bold text-muted-foreground mr-4">
              差額
            </span>
            <span
              className={`text-2xl font-black ${simulationResults.diff < 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {simulationResults.diff > 0 ? "+" : ""}
              {simulationResults.diff.toLocaleString()} 円
            </span>
          </div>
        </Card>

        {/* Details Comparison */}
        <Card className="p-6 border-secondary/20">
          <h4 className="font-bold border-b pb-2 mb-4">現状 (詳細)</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">類似業種比準価額</span>
              <span className="font-bold">
                {simulationResults.current.comparableValue.toLocaleString()} 円
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">純資産価額</span>
              <span className="font-bold">
                {simulationResults.current.netAssetPerShare.toLocaleString()} 円
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-primary/20">
          <h4 className="font-bold border-b pb-2 mb-4 text-primary">
            直前期利益=0 (詳細)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">類似業種比準価額</span>
              <span className="font-bold">
                {simulationResults.simulated.comparableValue.toLocaleString()}{" "}
                円
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">純資産価額</span>
              <span className="font-bold">
                {simulationResults.simulated.netAssetPerShare.toLocaleString()}{" "}
                円
              </span>
            </div>
          </div>
        </Card>
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
          variant="outline"
          onClick={() => exportValuationData(basicInfo, financials)}
          size="lg"
        >
          データをエクスポート
        </Button>
        {onSummary && (
          <Button
            type="button"
            onClick={onSummary}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            まとめを見る
          </Button>
        )}
      </div>
    </div>
  );
}
