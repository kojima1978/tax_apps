"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMemo } from "react";

import { calculateFinalValuation } from "@/lib/valuation-logic";

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
        {/* Main Result */}
        <Card className="col-span-1 md:col-span-2 p-8 border-4 border-green-300 shadow-xl bg-gradient-to-br from-green-50 to-green-100/30">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-green-900">
                計算結果：1株あたりの評価額
              </h3>
            </div>
            <div className="text-5xl md:text-6xl font-black text-foreground tracking-tighter">
              {results.finalValue.toLocaleString()}
              <span className="text-xl md:text-2xl text-muted-foreground ml-2 font-bold">
                円
              </span>
            </div>

            {/* Comparison Table */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">算定方法</p>
              <p className="text-sm text-foreground">
                {results.comparisonDetails.length > 0
                  ? results.comparisonDetails[0].name
                  : ""}
              </p>
            </div>
          </div>
        </Card>

        {/* Breakdown: Comparable */}
        <Card className="p-6 border-2 border-green-200 bg-green-50/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold">
                A
              </span>
              <h4 className="font-bold">類似業種比準価額 (S)</h4>
            </div>
            <div className="text-3xl font-bold text-right text-secondary">
              {results.comparableValue.toLocaleString()}{" "}
              <span className="text-sm text-foreground">円</span>
            </div>
          </div>
        </Card>

        {/* Breakdown: Net Asset */}
        <Card className="p-6 border-2 border-green-200 bg-green-50/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                B
              </span>
              <h4 className="font-bold">純資産価額 (N)</h4>
            </div>
            <div className="text-3xl font-bold text-right text-secondary">
              {results.netAssetPerShare.toLocaleString()}{" "}
              <span className="text-sm text-foreground">円</span>
            </div>
          </div>
        </Card>

        {/* 計算過程 */}
        <Card className="col-span-1 md:col-span-2 p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/20">
          <div className="text-sm">
            {(() => {
              const S = results.comparableValue;
              const N = results.netAssetPerShare;
              const L = results.lRatio;

              // 比準要素数0
              if (financials.isZeroElementCompany) {
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      比準要素数0の会社
                    </p>
                    <p className="text-muted-foreground">純資産価額</p>
                    <p className="text-foreground pl-4">
                      {N.toLocaleString()}円
                    </p>
                  </div>
                );
              }

              // 比準要素数1
              if (financials.isOneElementCompany) {
                const blended = Math.floor(S * 0.25 + N * 0.75);
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      比準要素数1の会社
                    </p>
                    <p className="text-muted-foreground">
                      次のうちいずれか低い方の金額
                    </p>
                    <div className="pl-4 space-y-1">
                      <p className="text-muted-foreground">
                        イ　（類似業種比準価額 × 0.25）＋（純資産価額 × 0.75）
                      </p>
                      <p className="text-foreground pl-6">
                        = ({S.toLocaleString()} × 0.25) + ({N.toLocaleString()}{" "}
                        × 0.75)
                      </p>
                      <p className="text-foreground pl-6">
                        = {blended.toLocaleString()}円
                      </p>
                      <p className="text-muted-foreground mt-2">
                        ロ　純資産価額
                      </p>
                      <p className="text-foreground pl-6">
                        = {N.toLocaleString()}円
                      </p>
                    </div>
                  </div>
                );
              }

              // 大会社
              if (results.size === "Big") {
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      大会社の株式の価額
                    </p>
                    <p className="text-muted-foreground">
                      次のうちいずれか低い方の金額
                    </p>
                    <div className="pl-4 space-y-1">
                      <p className="text-muted-foreground">
                        イ　類似業種比準価額
                      </p>
                      <p className="text-foreground pl-6">
                        {S.toLocaleString()}円
                      </p>
                      <p className="text-muted-foreground mt-2">
                        ロ　純資産価額
                      </p>
                      <p className="text-foreground pl-6">
                        {N.toLocaleString()}円
                      </p>
                    </div>
                  </div>
                );
              }

              // 中会社
              if (results.size === "Medium") {
                const minValue = Math.min(S, N);
                const blended = Math.floor(minValue * L + N * (1 - L));
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      中会社の株式の価額 (L={L})
                    </p>
                    <p className="text-muted-foreground">
                      （「類似業種比準価額」と「純資産価額」いずれか低い方）× L
                      ＋ 純資産価額 × (1 - L)
                    </p>
                    <div className="pl-4 space-y-1 mt-2">
                      <p className="text-muted-foreground">
                        ({minValue.toLocaleString()} × {L}) ＋ (
                        {N.toLocaleString()} × {(1 - L).toFixed(2)})
                      </p>
                      <p className="text-foreground pl-6">
                        = {blended.toLocaleString()}円
                      </p>
                    </div>
                  </div>
                );
              }

              // 小会社
              const blended = Math.floor(S * 0.5 + N * 0.5);
              return (
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">
                    小会社の株式の価額
                  </p>
                  <p className="text-muted-foreground">
                    次のうちいずれか低い方の金額
                  </p>
                  <div className="pl-4 space-y-1">
                    <p className="text-muted-foreground">イ　純資産価額</p>
                    <p className="text-foreground pl-6">
                      {N.toLocaleString()}円
                    </p>
                    <p className="text-muted-foreground mt-2">
                      ロ　（類似業種比準価額 × 0.50）＋（純資産価額 × 0.50）
                    </p>
                    <p className="text-foreground pl-6">
                      = ({S.toLocaleString()} × 0.50) + ({N.toLocaleString()} ×
                      0.50)
                    </p>
                    <p className="text-foreground pl-6">
                      = {blended.toLocaleString()}円
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
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
            className="shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            次へ進む
          </Button>
        )}
      </div>
    </div>
  );
}
