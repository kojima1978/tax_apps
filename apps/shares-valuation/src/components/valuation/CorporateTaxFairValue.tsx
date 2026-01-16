"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMemo } from "react";
import { calculateCorporateTaxFairValue } from "@/lib/valuation-logic";

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

              // 比準要素数0
              if (financials.isZeroElementCompany) {
                return (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      比準要素数0の会社
                    </p>
                    <p className="text-muted-foreground">
                      純資産価額（土地は時価＋法人税控除しない）
                    </p>
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
                        ロ　純資産価額（土地は時価＋法人税控除しない）
                      </p>
                      <p className="text-foreground pl-6">
                        = {N.toLocaleString()}円
                      </p>
                    </div>
                  </div>
                );
              }

              // 比準要素数0、1以外は小会社の株式の価額で評価（会社規模に関わらず）
              const blended = Math.floor(S * 0.5 + N * 0.5);
              return (
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">
                    法人税法上の時価（小会社の株式の価額）
                  </p>
                  <p className="text-muted-foreground">
                    次のうちいずれか低い方の金額
                  </p>
                  <div className="pl-4 space-y-1">
                    <p className="text-muted-foreground">
                      イ　純資産価額（土地は時価＋法人税控除しない）
                    </p>
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
          className="shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          次へ進む
        </Button>
      </div>
    </div>
  );
}
