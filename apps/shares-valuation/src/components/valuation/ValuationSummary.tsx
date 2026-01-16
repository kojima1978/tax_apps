"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMemo } from "react";
import {
  calculateFinalValuation,
  calculateCorporateTaxFairValue,
  calculateOwnFinancials,
} from "@/lib/valuation-logic";
import { exportValuationData } from "@/lib/data-export-import";

interface ValuationSummaryProps {
  basicInfo: BasicInfo;
  financials: Financials;
  onBack: () => void;
  onHome?: () => void;
  onDetails?: () => void;
}

export function ValuationSummary({
  basicInfo,
  financials,
  onBack,
  onHome,
  onDetails,
}: ValuationSummaryProps) {
  const results = useMemo(() => {
    // Step 6: 計算結果
    const step6Result = calculateFinalValuation(basicInfo, financials);

    // Step 7: 法人税法上の時価
    const step7Result = calculateCorporateTaxFairValue(basicInfo, financials);

    // Step 8: シミュレーション（直前期利益=0の場合）
    const simData = {
      divPrev: financials.ownDividendPrev || 0,
      div2Prev: financials.ownDividend2Prev || 0,
      div3Prev: financials.ownDividend3Prev || 0,
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

    const simFinancials: Financials = {
      ...financials,
      ownProfit: simOwnFinancials.ownProfit,
    };

    const step8Result = calculateFinalValuation(basicInfo, simFinancials);

    return {
      step6: step6Result,
      step7: step7Result,
      step8: step8Result,
    };
  }, [basicInfo, financials]);

  const totalShares = basicInfo.issuedShares || 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-primary">比較表</h2>
          <p className="text-muted-foreground">
            各ステップの評価結果を比較します。
          </p>
          <p className="text-sm text-muted-foreground">
            発行済株式数: {totalShares.toLocaleString()}株
          </p>
        </div>

      <div className="space-y-6">
        {/* 比較表 */}
        <Card className="p-8 border-2 border-primary/20 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-left py-4 px-4 font-bold text-lg">
                    項目
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-lg text-primary">
                      相続税評価額
                    </div>
                    <div className="text-xs font-normal text-muted-foreground mt-1">
                      Step 6
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-lg text-green-700">
                      法人税法上の時価
                    </div>
                    <div className="text-xs font-normal text-muted-foreground mt-1">
                      Step 7
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-bold text-lg text-amber-700">
                      シミュレーション
                    </div>
                    <div className="text-xs font-normal text-muted-foreground mt-1">
                      Step 8（直前期利益=0）
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50 border-b border-slate-200">
                  <td className="py-4 px-4 font-bold text-base">
                    評価額（1株）
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-2xl font-bold text-primary">
                      {results.step6.finalValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-2xl font-bold text-green-700">
                      {results.step7.finalValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-2xl font-bold text-amber-700">
                      {results.step8.finalValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                </tr>
                <tr className="bg-white border-b border-slate-200">
                  <td className="py-4 px-4 font-bold text-base">
                    評価額（総額）
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-xl font-bold text-primary">
                      {(
                        results.step6.finalValue * totalShares
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-xl font-bold text-green-700">
                      {(
                        results.step7.finalValue * totalShares
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-xl font-bold text-amber-700">
                      {(
                        results.step8.finalValue * totalShares
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                </tr>
                <tr className="bg-blue-50 border-b border-slate-200">
                  <td className="py-4 px-4 font-semibold">類似業種比準価額</td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step6.comparableValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step7.comparableValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step8.comparableValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                </tr>
                <tr className="bg-white border-b border-slate-200">
                  <td className="py-4 px-4 font-semibold">純資産価額</td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step6.netAssetPerShare.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step7.netAssetPerShare.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step8.netAssetPerShare.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">円</div>
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="py-4 px-4 font-semibold">Lの割合</td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step6.lRatio}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step7.lRatio}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-lg font-semibold">
                      {results.step8.lRatio}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-center gap-4 pt-8 no-print">
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
        {onDetails && (
          <Button type="button" variant="outline" onClick={onDetails} size="lg">
            詳細を見る
          </Button>
        )}
      </div>
    </div>
  );
}
