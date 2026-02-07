"use client";

import { Card } from "@/components/ui/Card";

interface ValuationResultCardsProps {
  finalValue: number;
  methodName: string;
  comparableValue: number;
  netAssetPerShare: number;
}

/** Step 6/7 共通のメイン結果カード + S/N内訳カード */
export function ValuationResultCards({
  finalValue,
  methodName,
  comparableValue,
  netAssetPerShare,
}: ValuationResultCardsProps) {
  return (
    <>
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
            {finalValue.toLocaleString()}
            <span className="text-xl md:text-2xl text-muted-foreground ml-2 font-bold">
              円
            </span>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">算定方法</p>
            <p className="text-sm text-foreground">{methodName}</p>
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
            {comparableValue.toLocaleString()}{" "}
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
            {netAssetPerShare.toLocaleString()}{" "}
            <span className="text-sm text-foreground">円</span>
          </div>
        </div>
      </Card>
    </>
  );
}
