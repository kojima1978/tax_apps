import { Financials } from "@/types/valuation";
import { PrintSection } from "./PrintSection";

interface PrintStep5NetAssetProps {
  financials: Financials;
  totalShares: number;
  netAssetPerShare: number;
}

export function PrintStep5NetAsset({ financials, totalShares, netAssetPerShare }: PrintStep5NetAssetProps) {
  return (
    <PrintSection title="Step 5: 純資産データ">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div>資産（相続税評価額）</div>
            <div className="font-semibold">
              {((financials.assetsInheritanceValue || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
          <div>
            <div>資産（帳簿価額）</div>
            <div className="font-semibold">
              {((financials.assetsBookValue || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
          <div>
            <div>負債（相続税評価額）</div>
            <div className="font-semibold">
              {((financials.liabilitiesInheritanceValue || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
          <div>
            <div>負債（帳簿価額）</div>
            <div className="font-semibold">
              {((financials.liabilitiesBookValue || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
        </div>

        <div className="border border-gray-300 p-2 space-y-4">
          <h3 className="font-bold border-b pb-2">純資産価額計算結果（詳細）</h3>

          <div className="space-y-3">
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-2">① 相続税評価額による純資産</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>資産（相続税評価額）:</span>
                  <span className="font-semibold">{((financials.assetsInheritanceValue || 0) / 1000).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between">
                  <span>負債（相続税評価額）:</span>
                  <span className="font-semibold">{((financials.liabilitiesInheritanceValue || 0) / 1000).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>純資産（相続税評価額）:</span>
                  <span className="font-bold">
                    {(((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) / 1000).toLocaleString()}千円
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-2">② 帳簿価額による純資産</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>資産（帳簿価額）:</span>
                  <span className="font-semibold">{((financials.assetsBookValue || 0) / 1000).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between">
                  <span>負債（帳簿価額）:</span>
                  <span className="font-semibold">{((financials.liabilitiesBookValue || 0) / 1000).toLocaleString()}千円</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>純資産（帳簿価額）:</span>
                  <span className="font-bold">
                    {(((financials.assetsBookValue || 0) - (financials.liabilitiesBookValue || 0)) / 1000).toLocaleString()}千円
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-2">③ 評価差額（含み益）</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>純資産（相続税評価額）:</span>
                  <span className="font-semibold">
                    {(((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) / 1000).toLocaleString()}千円
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>純資産（帳簿価額）:</span>
                  <span className="font-semibold">
                    {(((financials.assetsBookValue || 0) - (financials.liabilitiesBookValue || 0)) / 1000).toLocaleString()}千円
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>評価差額（含み益）:</span>
                  <span className="font-bold">
                    {(
                      (((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) -
                      ((financials.assetsBookValue || 0) - (financials.liabilitiesBookValue || 0))) / 1000
                    ).toLocaleString()}千円
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-300 p-2">
              <h4 className="font-bold mb-3">④ 1株あたりの純資産価額</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>純資産（相続税評価額）:</span>
                  <span className="font-semibold">
                    {(((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) / 1000).toLocaleString()}千円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>÷ 発行済株式数:</span>
                  <span className="font-semibold">{totalShares.toLocaleString()}株</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                  <span className="font-bold">1株あたりの純資産価額 =</span>
                  <span className="font-black">{netAssetPerShare.toLocaleString()}円</span>
                </div>
              </div>
              <div className="mt-3 border border-gray-300 p-2">
                計算式: {(((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) / 1000).toLocaleString()}千円 ÷ {totalShares.toLocaleString()}株 = {netAssetPerShare.toLocaleString()}円
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintSection>
  );
}
