import { BasicInfo, Financials } from "@/types/valuation";
import { getCompanySizeLabel, SimilarIndustryResult } from "@/lib/valuation-logic";
import { PrintSection } from "./PrintSection";

interface PrintStep4IndustryDataProps {
  basicInfo: BasicInfo;
  financials: Financials;
  industryDetails: SimilarIndustryResult | null;
  taxationMonth: string;
  oneMonthBefore: string;
  twoMonthsBefore: string;
  prevYear: string;
}

export function PrintStep4IndustryData({
  basicInfo,
  financials,
  industryDetails,
  taxationMonth,
  oneMonthBefore,
  twoMonthsBefore,
  prevYear,
}: PrintStep4IndustryDataProps) {
  return (
    <PrintSection title="Step 4: 類似業種データ">
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2">A: 株価</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-black">
                {prevYear ? `前年平均（${prevYear}）` : "前年平均"}
              </div>
              <div className="font-semibold">
                {(financials.industryStockPricePrevYearAverage || 0).toLocaleString()}円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">
                {twoMonthsBefore ? `前々月（${twoMonthsBefore}月）` : "前々月"}
              </div>
              <div className="font-semibold">
                {(financials.industryStockPrice2MonthsBefore || 0).toLocaleString()}円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">
                {oneMonthBefore ? `前月（${oneMonthBefore}月）` : "前月"}
              </div>
              <div className="font-semibold">
                {(financials.industryStockPrice1MonthBefore || 0).toLocaleString()}円
              </div>
            </div>
            <div>
              <div className="text-xs text-black">
                {taxationMonth ? `課税時期の月（${taxationMonth}月）` : "課税時期の月"}
              </div>
              <div className="font-semibold">
                {(financials.industryStockPriceCurrent || 0).toLocaleString()}円
              </div>
            </div>
          </div>
          {industryDetails && (
            <div className="mt-2 p-2">
              <div className="text-sm font-bold">
                採用株価: {industryDetails.A.toLocaleString()}円
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-bold mb-2">B: 配当</h3>
            <div className="font-semibold">
              {(financials.industryDividends || 0).toFixed(1)}円
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">C: 利益</h3>
            <div className="font-semibold">
              {(financials.industryProfit || 0).toLocaleString()}円
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">D: 純資産</h3>
            <div className="font-semibold">
              {(financials.industryBookValue || 0).toLocaleString()}円
            </div>
          </div>
        </div>

        {industryDetails && (
          <div className="border border-gray-300 p-2 space-y-2">
            <h3 className="font-bold border-b border-gray-300 pb-1 mb-1">比準価額計算結果（詳細）</h3>

            {/* 比準割合の計算 */}
            <div className="space-y-2">
              <div className="border border-gray-300 p-2">
                <h4 className="font-semibold mb-1">① 配当比準 (b/B)</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-black">自社の配当 (b):</span>
                    <span className="font-semibold">{industryDetails.ratios.b.toFixed(1)}円</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">類似業種の配当 (B):</span>
                    <span className="font-semibold">{industryDetails.ratios.B.toFixed(1)}円</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-black">配当比準割合 (b÷B):</span>
                    <span className="font-bold text-black">{industryDetails.ratios.ratioB.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 p-2">
                <h4 className="font-semibold mb-1">② 利益比準 (c/C)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>自社の利益 (c):</span>
                    <span className="font-semibold">{industryDetails.ratios.c.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between">
                    <span>類似業種の利益 (C):</span>
                    <span className="font-semibold">{industryDetails.ratios.C.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>利益比準割合 (c÷C):</span>
                    <span className="font-bold">{industryDetails.ratios.ratioC.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 p-2">
                <h4 className="font-semibold mb-1">③ 純資産比準 (d/D)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>自社の純資産 (d):</span>
                    <span className="font-semibold">{industryDetails.ratios.d.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between">
                    <span>類似業種の純資産 (D):</span>
                    <span className="font-semibold">{industryDetails.ratios.D.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>純資産比準割合 (d÷D):</span>
                    <span className="font-bold">{industryDetails.ratios.ratioD.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 p-2">
                <h4 className="font-semibold mb-2">④ 比準割合の平均</h4>
                <div className="space-y-1">
                  {basicInfo.industryType === "MedicalCorporation" ? (
                    <>
                      <div className="flex justify-between">
                        <span>利益比準割合:</span>
                        <span>{industryDetails.ratios.ratioC.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>純資産比準割合:</span>
                        <span>{industryDetails.ratios.ratioD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>平均 (利益+純資産)÷2:</span>
                        <span className="font-bold">{industryDetails.ratios.avgRatio.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>配当比準割合:</span>
                        <span>{industryDetails.ratios.ratioB.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>利益比準割合:</span>
                        <span>{industryDetails.ratios.ratioC.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>純資産比準割合:</span>
                        <span>{industryDetails.ratios.ratioD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>平均 (配当+利益+純資産)÷3:</span>
                        <span className="font-bold">{industryDetails.ratios.avgRatio.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 会社規模に応じた斟酌率 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-2">⑤ 会社規模に応じた斟酌率</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>会社規模:</span>
                  <span className="font-semibold">
                    {getCompanySizeLabel(basicInfo.size)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>斟酌率:</span>
                  <span className="font-bold">{industryDetails.multiplier}</span>
                </div>
              </div>
            </div>

            {/* 原株換算 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-semibold mb-2">⑥ 原株換算</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>資本金額:</span>
                  <span className="font-semibold">{((basicInfo.capital || 0) * 1000).toLocaleString()}円</span>
                </div>
                <div className="flex justify-between">
                  <span>発行済株式数:</span>
                  <span className="font-semibold">{(basicInfo.issuedShares || 1).toLocaleString()}株</span>
                </div>
                <div className="flex justify-between">
                  <span>1株当たり資本金額:</span>
                  <span className="font-semibold">
                    {(((basicInfo.capital || 0) * 1000) / (basicInfo.issuedShares || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}円
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>原株換算 (1株当たり資本金額÷50円):</span>
                  <span className="font-bold">
                    {industryDetails.conversion.ratio.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </span>
                </div>
              </div>
            </div>

            {/* 最終計算式 */}
            <div className="border border-gray-300 p-2">
              <h4 className="font-bold mb-3">⑦ 類似業種比準価額の計算</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>株価 (A):</span>
                  <span className="font-semibold">{industryDetails.A.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>比準割合:</span>
                  <span className="font-semibold">{industryDetails.ratios.avgRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>斟酌率:</span>
                  <span className="font-semibold">{industryDetails.multiplier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>原株換算:</span>
                  <span className="font-semibold">
                    {industryDetails.conversion.ratio.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="font-bold">
                    類似業種比準価額 = {industryDetails.A.toLocaleString()} × {industryDetails.ratios.avgRatio.toFixed(2)} × {industryDetails.multiplier} × {industryDetails.conversion.ratio.toLocaleString(undefined, { maximumFractionDigits: 3 })} = {industryDetails.value.toLocaleString()}円
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PrintSection>
  );
}
