import { Financials } from "@/types/valuation";
import { PrintSection } from "./PrintSection";

interface PrintStep3OwnDataProps {
  financials: Financials;
  totalShares: number;
}

export function PrintStep3OwnData({ financials, totalShares }: PrintStep3OwnDataProps) {
  return (
    <PrintSection title="Step 3: 自社データの入力">
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2">配当金額</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-black">直前期</div>
              <div className="font-semibold">
                {(financials.ownDividendPrev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々期</div>
              <div className="font-semibold">
                {(financials.ownDividend2Prev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々々期</div>
              <div className="font-semibold">
                {(financials.ownDividend3Prev || 0).toLocaleString()}千円
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">所得金額・繰越欠損金</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-black">直前期 所得金額</div>
              <div className="font-semibold">
                {(financials.ownTaxableIncomePrev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前期 繰越欠損金</div>
              <div className="font-semibold">
                {(financials.ownCarryForwardLossPrev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々期 所得金額</div>
              <div className="font-semibold">
                {(financials.ownTaxableIncome2Prev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々期 繰越欠損金</div>
              <div className="font-semibold">
                {(financials.ownCarryForwardLoss2Prev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々々期 所得金額</div>
              <div className="font-semibold">
                {(financials.ownTaxableIncome3Prev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々々期 繰越欠損金</div>
              <div className="font-semibold">
                {(financials.ownCarryForwardLoss3Prev || 0).toLocaleString()}千円
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">資本金・利益剰余金</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-black">直前期末 資本金</div>
              <div className="font-semibold">
                {(financials.ownCapitalPrev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前期末 利益剰余金</div>
              <div className="font-semibold">
                {(financials.ownRetainedEarningsPrev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々期末 資本金</div>
              <div className="font-semibold">
                {(financials.ownCapital2Prev || 0).toLocaleString()}千円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">直前々期末 利益剰余金</div>
              <div className="font-semibold">
                {(financials.ownRetainedEarnings2Prev || 0).toLocaleString()}千円
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-300 p-2 space-y-2">
          <h3 className="font-bold border-b border-gray-300 pb-1 mb-1">計算結果（詳細）</h3>

          <div className="space-y-2">
            {/* b: 配当の計算 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-1">① b: 配当金額（直前期・直前々期の平均）</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>直前期の配当:</span>
                  <span className="font-semibold">{(financials.ownDividendPrev || 0).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between">
                  <span>直前々期の配当:</span>
                  <span className="font-semibold">{(financials.ownDividend2Prev || 0).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>合計:</span>
                  <span className="font-semibold">
                    {((financials.ownDividendPrev || 0) + (financials.ownDividend2Prev || 0)).toLocaleString()}千円
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>2期平均 (b):</span>
                  <span className="font-bold">
                    {(financials.ownDividends || 0).toFixed(1)}円
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  計算式: ({(financials.ownDividendPrev || 0).toLocaleString()} + {(financials.ownDividend2Prev || 0).toLocaleString()})千円 ÷ 2 ÷ {totalShares.toLocaleString()}株 = {(financials.ownDividends || 0).toFixed(1)}円
                </div>
              </div>
            </div>

            {/* c: 利益の計算 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-1">② c: 利益金額（直前期利益と2期平均の小さい方）</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="font-semibold">直前期の利益:</div>
                  <div className="pl-2 space-y-1">
                    <div className="flex justify-between">
                      <span>所得金額 (P1):</span>
                      <span className="font-semibold">{(financials.ownTaxableIncomePrev || 0).toLocaleString()}千円</span>
                    </div>
                    <div className="flex justify-between">
                      <span>繰越欠損金 (L1):</span>
                      <span className="font-semibold">{(financials.ownCarryForwardLossPrev || 0).toLocaleString()}千円</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>利益 (P1 + L1):</span>
                      <span className="font-semibold">
                        {((financials.ownTaxableIncomePrev || 0) + (financials.ownCarryForwardLossPrev || 0)).toLocaleString()}千円
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 border-t pt-2">
                  <div className="font-semibold">直前々期の利益:</div>
                  <div className="pl-2 space-y-1">
                    <div className="flex justify-between">
                      <span>所得金額 (P2):</span>
                      <span className="font-semibold">{(financials.ownTaxableIncome2Prev || 0).toLocaleString()}千円</span>
                    </div>
                    <div className="flex justify-between">
                      <span>繰越欠損金 (L2):</span>
                      <span className="font-semibold">{(financials.ownCarryForwardLoss2Prev || 0).toLocaleString()}千円</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>利益 (P2 + L2):</span>
                      <span className="font-semibold">
                        {((financials.ownTaxableIncome2Prev || 0) + (financials.ownCarryForwardLoss2Prev || 0)).toLocaleString()}千円
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span>2期平均:</span>
                    <span className="font-semibold">
                      {(
                        (((financials.ownTaxableIncomePrev || 0) + (financials.ownCarryForwardLossPrev || 0)) +
                        ((financials.ownTaxableIncome2Prev || 0) + (financials.ownCarryForwardLoss2Prev || 0))) / 2
                      ).toLocaleString()}千円
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span>直前期利益と2期平均の小さい方 (c):</span>
                    <span className="font-bold">
                      {(financials.ownProfit || 0).toLocaleString()}円
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-xs">
                  計算式: min({((financials.ownTaxableIncomePrev || 0) + (financials.ownCarryForwardLossPrev || 0)).toLocaleString()}千円, {((((financials.ownTaxableIncomePrev || 0) + (financials.ownCarryForwardLossPrev || 0)) + ((financials.ownTaxableIncome2Prev || 0) + (financials.ownCarryForwardLoss2Prev || 0))) / 2).toLocaleString()}千円) ÷ {totalShares.toLocaleString()}株 = {(financials.ownProfit || 0).toLocaleString()}円
                </div>
              </div>
            </div>

            {/* d: 純資産の計算 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-1">③ d: 純資産価額（直前期末の簿価純資産）</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>直前期末 資本金:</span>
                  <span className="font-semibold">{(financials.ownCapitalPrev || 0).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between">
                  <span>直前期末 利益剰余金:</span>
                  <span className="font-semibold">{(financials.ownRetainedEarningsPrev || 0).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>合計:</span>
                  <span className="font-semibold">
                    {((financials.ownCapitalPrev || 0) + (financials.ownRetainedEarningsPrev || 0)).toLocaleString()}千円
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>簿価純資産 (d):</span>
                  <span className="font-bold">
                    {(financials.ownBookValue || 0).toLocaleString()}円
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  計算式: ({(financials.ownCapitalPrev || 0).toLocaleString()} + {(financials.ownRetainedEarningsPrev || 0).toLocaleString()})千円 ÷ {totalShares.toLocaleString()}株 = {(financials.ownBookValue || 0).toLocaleString()}円
                </div>
              </div>
            </div>

            {/* 最終結果のサマリー */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-bold mb-2">④ 自社の財務指標（比準用）</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center border border-gray-300 p-1">
                  <div className="mb-1">b: 配当</div>
                  <div className="font-bold">
                    {(financials.ownDividends || 0).toFixed(1)}円
                  </div>
                </div>
                <div className="text-center border border-gray-300 p-1">
                  <div className="mb-1">c: 利益</div>
                  <div className="font-bold">
                    {(financials.ownProfit || 0).toLocaleString()}円
                  </div>
                </div>
                <div className="text-center border border-gray-300 p-1">
                  <div className="mb-1">d: 純資産</div>
                  <div className="font-bold">
                    {(financials.ownBookValue || 0).toLocaleString()}円
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                これらの値が類似業種比準価額の計算に使用されます
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintSection>
  );
}
