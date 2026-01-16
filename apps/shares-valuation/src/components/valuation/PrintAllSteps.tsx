"use client";

import { BasicInfo, Financials } from "@/types/valuation";
import {
  calculateFinalValuation,
  calculateCorporateTaxFairValue,
  calculateOwnFinancials,
  calculateDetailedSimilarIndustryMethod,
} from "@/lib/valuation-logic";
import {
  getTaxationMonth,
  getPreviousYear,
  getMonthOffset,
} from "@/lib/date-utils";

interface PrintAllStepsProps {
  basicInfo: BasicInfo;
  financials: Financials;
}

export function PrintAllSteps({ basicInfo, financials }: PrintAllStepsProps) {
  // Calculate all results
  const step6Result = calculateFinalValuation(basicInfo, financials);
  const step7Result = calculateCorporateTaxFairValue(basicInfo, financials);

  // Step 8 simulation
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

  // Date helpers
  const taxationMonth = getTaxationMonth(basicInfo.taxationPeriod);
  const oneMonthBefore = getMonthOffset(basicInfo.taxationPeriod, 1);
  const twoMonthsBefore = getMonthOffset(basicInfo.taxationPeriod, 2);
  const prevYear = getPreviousYear(basicInfo.taxationPeriod);

  // Calculate industry comparison details
  const industryDetails = (() => {
    const A = Math.min(
      financials.industryStockPriceCurrent || Infinity,
      financials.industryStockPrice1MonthBefore || Infinity,
      financials.industryStockPrice2MonthsBefore || Infinity,
      financials.industryStockPricePrevYearAverage || Infinity,
    );

    if (A === Infinity || A === 0) return null;

    const B_ind = financials.industryDividends || 0;
    const C_ind = financials.industryProfit || 0;
    const D_ind = financials.industryBookValue || 0;

    if (C_ind === 0 || D_ind === 0) return null;

    const isMedicalCorporation = basicInfo.industryType === "MedicalCorporation";
    if (!isMedicalCorporation && B_ind === 0) return null;

    const b_own = financials.ownDividends || 0;
    const c_own = financials.ownProfit || 0;
    const d_own = financials.ownBookValue || 0;

    let multiplier = 0.7;
    if (basicInfo.sizeMultiplier) {
      multiplier = basicInfo.sizeMultiplier;
    } else {
      if (basicInfo.size === "Medium") multiplier = 0.6;
      if (basicInfo.size === "Small") multiplier = 0.5;
    }

    return calculateDetailedSimilarIndustryMethod(
      A,
      B_ind,
      C_ind,
      D_ind,
      b_own,
      c_own,
      d_own,
      multiplier,
      basicInfo,
    );
  })();

  const totalShares = basicInfo.issuedShares || 1;

  return (
    <div className="print-content space-y-4 p-4 text-xs">
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 9px;
            line-height: 1.3;
            color: #000 !important;
            background-color: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-content {
            max-width: 100%;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
          /* フォントサイズを統一 */
          h1 { font-size: 11px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
          h2 { font-size: 10px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
          h3 { font-size: 9px !important; line-height: 1.2 !important; font-weight: bold !important; color: #000 !important; }
          h4 { font-size: 9px !important; line-height: 1.2 !important; font-weight: 600 !important; color: #000 !important; }
          .text-xs { font-size: 8px !important; }
          .text-sm { font-size: 9px !important; }
          .text-base { font-size: 9px !important; }
          .text-lg { font-size: 9px !important; }
          .text-xl { font-size: 9px !important; }
          .text-2xl { font-size: 11px !important; }
          .text-3xl { font-size: 11px !important; }
          .text-4xl { font-size: 11px !important; }
          /* 全ての文字を黒に統一 */
          * {
            color: #000 !important;
          }
          .text-primary, .text-secondary, .text-green-700, .text-blue-700, .text-amber-700,
          .text-red-600, .text-blue-600,
          .font-black, .font-bold, .font-semibold,
          .text-black, .text-gray-600 {
            color: #000 !important;
          }
          /* スペーシングを削減 */
          .space-y-8 > * + *, .space-y-6 > * + *, .space-y-4 > * + * { margin-top: 4px !important; }
          .space-y-3 > * + * { margin-top: 3px !important; }
          .space-y-2 > * + * { margin-top: 2px !important; }
          .space-y-1 > * + * { margin-top: 1px !important; }
          .gap-6, .gap-4 { gap: 4px !important; }
          .gap-3 { gap: 3px !important; }
          .gap-2 { gap: 2px !important; }
          /* パディングを削減 */
          .p-8, .p-6, .p-4 { padding: 4px !important; }
          .p-3 { padding: 3px !important; }
          .p-2 { padding: 2px !important; }
          .px-4, .py-4 { padding-left: 3px !important; padding-right: 3px !important; }
          .py-3 { padding-top: 2px !important; padding-bottom: 2px !important; }
          /* マージンを削減 */
          .mb-4, .mb-3 { margin-bottom: 3px !important; }
          .mb-2 { margin-bottom: 2px !important; }
          .mb-1 { margin-bottom: 1px !important; }
          .mt-4, .mt-3 { margin-top: 3px !important; }
          .mt-2 { margin-top: 2px !important; }
          .mt-1 { margin-top: 1px !important; }
          .pb-4, .pb-3, .pb-2 { padding-bottom: 2px !important; }
          .pt-4, .pt-3, .pt-2 { padding-top: 2px !important; }
          /* 全てのボーダーを黒に統一 */
          .border-2, .border-4 { border-width: 1px !important; border-color: #000 !important; }
          .border { border-width: 1px !important; border-color: #000 !important; }
          .border-t { border-top-width: 1px !important; border-top-style: solid !important; border-top-color: #000 !important; }
          .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; border-bottom-color: #000 !important; }
          .border-gray-300, .border-gray-400,
          .border-primary, .border-green-300, .border-blue-300, .border-amber-300, .border-blue-200, .border-amber-200 {
            border-color: #000 !important;
          }
          .border-b-2 { border-bottom-width: 1px !important; border-bottom-color: #000 !important; }
          .border-t-2 { border-top-width: 1px !important; border-top-color: #000 !important; }
          /* 背景色を全て白に */
          .bg-blue-50, .bg-green-50, .bg-amber-50, .bg-primary\/10, .bg-primary\/5,
          .bg-white, .bg-gray-50, .bg-white\/50,
          .bg-green-300, .bg-blue-300, .bg-amber-300 {
            background-color: #fff !important;
          }
          /* 全ての要素の背景を白に */
          div[class*="bg-"] {
            background-color: #fff !important;
          }
          * {
            background-color: #fff !important;
          }
          /* 角丸を削除 */
          .rounded-xl, .rounded-lg, .rounded { border-radius: 0 !important; }
          /* テーブルのスタイル */
          table { border-collapse: collapse !important; }
          th, td {
            padding: 2px 3px !important;
            border: 1px solid #000 !important;
          }
          th { font-weight: bold !important; color: #000 !important; }
        }
      `}</style>

      {/* Title */}
      <div className="text-center border-b border-gray-400 pb-2 mb-3">
        <h1 className="text-base font-bold text-black">非上場株式評価明細書</h1>
        <p className="text-base text-black">全ステップ詳細（Step 1-8）</p>
      </div>

      {/* Step 1: 基本情報 */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 1: 基本情報
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-black">会社名:</span>
            <span className="font-semibold ml-1">{basicInfo.companyName}</span>
          </div>
          <div>
            <span className="text-black">課税時期:</span>
            <span className="font-semibold ml-1">{basicInfo.taxationPeriod}</span>
          </div>
          <div>
            <span className="text-black">直前期末:</span>
            <span className="font-semibold ml-1">{basicInfo.previousPeriod}</span>
          </div>
          <div>
            <span className="text-black">資本金:</span>
            <span className="font-semibold ml-1">{(basicInfo.capital || 0).toLocaleString()}千円</span>
          </div>
          <div>
            <span className="text-black">発行済株式数:</span>
            <span className="font-semibold ml-1">{(basicInfo.issuedShares || 0).toLocaleString()}株</span>
          </div>
        </div>

        {/* 計算結果プレビュー */}
        <div className="border border-gray-300 p-2 mt-2 space-y-2">
          <h3 className="font-bold border-b border-gray-300 pb-1 mb-1">計算結果：リアルタイムプレビュー</h3>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-black">1株当たりの資本金額</span>
              <span className="font-semibold">
                {((basicInfo.capital || 0) * 1000 / (basicInfo.issuedShares || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}円
              </span>
            </div>
            <div className="text-xs text-black">
              計算式: {(basicInfo.capital || 0).toLocaleString()}千円 ÷ {(basicInfo.issuedShares || 1).toLocaleString()}株
            </div>
          </div>

          <div className="space-y-1 border-t border-gray-300 pt-1">
            <div className="flex justify-between">
              <span className="text-black">1株50円とした場合の発行済株式数</span>
              <span className="font-semibold">
                {(((basicInfo.capital || 0) * 1000) / 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}株
              </span>
            </div>
            <div className="text-xs text-black">
              計算式: {(basicInfo.capital || 0).toLocaleString()}千円 ÷ 50円
            </div>
          </div>

          <div className="space-y-1 border-t border-gray-300 pt-1">
            <div className="flex justify-between">
              <span className="text-black">50円株での換算係数</span>
              <span className="font-semibold">
                {((basicInfo.issuedShares || 1) / (((basicInfo.capital || 0) * 1000) / 50)).toLocaleString(undefined, { maximumFractionDigits: 3 })}
              </span>
            </div>
            <div className="text-xs text-black">
              計算式: {(basicInfo.issuedShares || 1).toLocaleString()}株 ÷ {(((basicInfo.capital || 0) * 1000) / 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}株
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: 会社規模 */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 2: 会社規模の判定
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-sm text-black">従業員数</div>
            <div className="font-semibold">
              {(basicInfo.employees || 0).toLocaleString()}人
            </div>
          </div>
          <div>
            <div className="text-sm text-black">総資産価額</div>
            <div className="font-semibold">
              {((basicInfo.totalAssets || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
          <div>
            <div className="text-sm text-black">売上高</div>
            <div className="font-semibold">
              {((basicInfo.sales || 0) / 1000).toLocaleString()}千円
            </div>
          </div>
          <div>
            <div className="text-sm text-black">業種区分</div>
            <div className="font-semibold">
              {!basicInfo.industryType
                ? "その他"
                : basicInfo.industryType === "Wholesale"
                  ? "卸売業"
                  : basicInfo.industryType === "RetailService"
                    ? "小売・サービス業"
                    : basicInfo.industryType === "MedicalCorporation"
                      ? "医療法人"
                      : "その他"}
            </div>
          </div>
          <div>
            <div className="text-sm text-black">会社規模判定</div>
            <div className="font-semibold text-black">
              {basicInfo.size === "Big"
                ? "大会社"
                : basicInfo.size === "Medium"
                  ? "中会社"
                  : "小会社"}
            </div>
          </div>
          <div>
            <div className="text-sm text-black">斟酌率</div>
            <div className="font-semibold text-black">
              {basicInfo.sizeMultiplier || 0.7}
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: 自社データ */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 3: 自社データの入力
        </h2>

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
      </div>

      {/* Step 4: 類似業種データ */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 4: 類似業種データ
        </h2>

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
                      {basicInfo.size === "Big" ? "大会社" : basicInfo.size === "Medium" ? "中会社" : "小会社"}
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
      </div>

      {/* Step 5: 純資産データ */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 5: 純資産データ
        </h2>

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
                    <span className="font-black">{step6Result.netAssetPerShare.toLocaleString()}円</span>
                  </div>
                </div>
                <div className="mt-3 border border-gray-300 p-2">
                  計算式: {(((financials.assetsInheritanceValue || 0) - (financials.liabilitiesInheritanceValue || 0)) / 1000).toLocaleString()}千円 ÷ {totalShares.toLocaleString()}株 = {step6Result.netAssetPerShare.toLocaleString()}円
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 6: 相続税評価額 */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 6: 相続税評価額
        </h2>

        <div className="space-y-4">
          <div className="border border-gray-300 p-2">
            <div className="mb-1">採用した評価方式</div>
            <div className="font-bold">
              {step6Result.comparisonDetails.length > 0
                ? step6Result.comparisonDetails[0].name
                : ""}
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-3">
            <h3 className="font-bold border-b pb-2">評価方式の比較</h3>
            {step6Result.comparisonDetails.map((detail, index) => (
              <div
                key={index}
                className={`p-2 ${index === 0 ? "border-2 border-gray-300" : "border border-gray-300"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{detail.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{detail.value.toLocaleString()}円</div>
                    {index === 0 && (
                      <div className="font-semibold mt-1">
                        ← 最有利（採用）
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-2">
              <div className="mb-1">類似業種比準価額 (S)</div>
              <div className="font-bold">
                {step6Result.comparableValue.toLocaleString()}円
              </div>
            </div>
            <div className="border border-gray-300 p-2">
              <div className="mb-1">純資産価額 (N)</div>
              <div className="font-bold">
                {step6Result.netAssetPerShare.toLocaleString()}円
              </div>
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-2">
            <h3 className="font-bold border-b pb-2">Lの割合</h3>
            <div className="flex justify-between items-center">
              <span>適用されるLの割合:</span>
              <span className="font-bold">{step6Result.lRatio}</span>
            </div>
          </div>

          <div className="border-2 border-gray-300 p-4">
            <div className="text-center space-y-3">
              <div>
                相続税評価額（1株あたり）
              </div>
              <div className="font-black">
                {step6Result.finalValue.toLocaleString()}円
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 7: 法人税法上の時価 */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 7: 法人税法上の時価
        </h2>

        <div className="space-y-4">
          <div className="border border-gray-300 p-2">
            <div className="mb-1">採用した評価方式</div>
            <div className="font-bold">
              {step7Result.comparisonDetails.length > 0
                ? step7Result.comparisonDetails[0].name
                : ""}
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-3">
            <h3 className="font-bold border-b pb-2">評価方式の比較</h3>
            {step7Result.comparisonDetails.map((detail, index) => (
              <div
                key={index}
                className={`p-2 ${index === 0 ? "border-2 border-gray-300" : "border border-gray-300"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{detail.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{detail.value.toLocaleString()}円</div>
                    {index === 0 && (
                      <div className="font-semibold mt-1">
                        ← 最有利（採用）
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-2">
              <div className="mb-1">類似業種比準価額 (S)</div>
              <div className="font-bold">
                {step7Result.comparableValue.toLocaleString()}円
              </div>
            </div>
            <div className="border border-gray-300 p-2">
              <div className="mb-1">純資産価額 (N)</div>
              <div className="font-bold">
                {step7Result.netAssetPerShare.toLocaleString()}円
              </div>
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-2">
            <h3 className="font-bold border-b pb-2">Lの割合</h3>
            <div className="flex justify-between items-center">
              <span>適用されるLの割合:</span>
              <span className="font-bold">{step7Result.lRatio}</span>
            </div>
          </div>

          <div className="border-2 border-gray-300 p-4">
            <div className="text-center space-y-3">
              <div>
                法人税法上の時価（1株あたり）
              </div>
              <div className="font-black">
                {step7Result.finalValue.toLocaleString()}円
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 8: シミュレーション */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          Step 8: シミュレーション（直前期利益=0）
        </h2>

        <div className="space-y-4">
          <div className="border border-gray-300 p-2">
            <div className="mb-1">シミュレーション条件</div>
            <div className="font-bold">直前期の課税所得を「0」と仮定</div>
            <div className="mt-1">
              ※ 繰越欠損金がある場合、利益計算に影響します
            </div>
          </div>

          <div className="border border-gray-300 p-2">
            <div className="mb-1">採用した評価方式</div>
            <div className="font-bold">
              {step8Result.comparisonDetails.length > 0
                ? step8Result.comparisonDetails[0].name
                : ""}
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-3">
            <h3 className="font-bold border-b pb-2">評価方式の比較</h3>
            {step8Result.comparisonDetails.map((detail, index) => (
              <div
                key={index}
                className={`p-2 ${index === 0 ? "border-2 border-gray-300" : "border border-gray-300"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{detail.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{detail.value.toLocaleString()}円</div>
                    {index === 0 && (
                      <div className="font-semibold mt-1">
                        ← 最有利（採用）
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-2">
              <div className="mb-1">類似業種比準価額 (S)</div>
              <div className="font-bold">
                {step8Result.comparableValue.toLocaleString()}円
              </div>
            </div>
            <div className="border border-gray-300 p-2">
              <div className="mb-1">純資産価額 (N)</div>
              <div className="font-bold">
                {step8Result.netAssetPerShare.toLocaleString()}円
              </div>
            </div>
          </div>

          <div className="border border-gray-300 p-2 space-y-2">
            <h3 className="font-bold border-b pb-2">Lの割合</h3>
            <div className="flex justify-between items-center">
              <span>適用されるLの割合:</span>
              <span className="font-bold">{step8Result.lRatio}</span>
            </div>
          </div>

          <div className="border-2 border-gray-300 p-4">
            <div className="text-center space-y-3">
              <div>
                シミュレーション評価額（1株あたり）
              </div>
              <div className="font-black">
                {step8Result.finalValue.toLocaleString()}円
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 比較表 */}
      <div className="border border-gray-300 p-2 page-break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
          評価額比較表
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-4 font-bold">項目</th>
                <th className="text-center py-3 px-4">
                  <div className="font-bold text-black">相続税評価額</div>
                  <div className="text-xs font-normal text-black">Step 6</div>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="font-bold text-black">法人税法上の時価</div>
                  <div className="text-xs font-normal text-black">Step 7</div>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="font-bold text-black">シミュレーション</div>
                  <div className="text-xs font-normal text-black">Step 8</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold">評価額（1株）</td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {step6Result.finalValue.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {step7Result.finalValue.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {step8Result.finalValue.toLocaleString()}円
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold">評価額（総額）</td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {(step6Result.finalValue * totalShares).toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {(step7Result.finalValue * totalShares).toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4 font-bold text-black">
                  {(step8Result.finalValue * totalShares).toLocaleString()}円
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold">類似業種比準価額</td>
                <td className="text-center py-3 px-4">
                  {step6Result.comparableValue.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4">
                  {step7Result.comparableValue.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4">
                  {step8Result.comparableValue.toLocaleString()}円
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold">純資産価額</td>
                <td className="text-center py-3 px-4">
                  {step6Result.netAssetPerShare.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4">
                  {step7Result.netAssetPerShare.toLocaleString()}円
                </td>
                <td className="text-center py-3 px-4">
                  {step8Result.netAssetPerShare.toLocaleString()}円
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Lの割合</td>
                <td className="text-center py-3 px-4">{step6Result.lRatio}</td>
                <td className="text-center py-3 px-4">{step7Result.lRatio}</td>
                <td className="text-center py-3 px-4">{step8Result.lRatio}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
