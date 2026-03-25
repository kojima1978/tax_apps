import React from 'react';
import type { DetailedTaxCalculationResult } from '../../types';
import { formatCurrency, formatPercent } from '../../utils';
import { CARD } from '../tableStyles';
import { PrintHeader } from '../PrintHeader';
import { CalculationSteps } from './CalculationSteps';
import { ProgressiveTaxBreakdown } from './ProgressiveTaxBreakdown';
import { HeirBreakdownTable } from './HeirBreakdownTable';
import { TaxBracketTable } from '../TaxBracketTable';

interface CalculationResultProps {
  result: DetailedTaxCalculationResult;
  weightedRate: number;
}

const SUMMARY_ITEMS = [
  { label: '遺産総額', getValue: (r: DetailedTaxCalculationResult) => formatCurrency(r.estateValue) },
  { label: '基礎控除', getValue: (r: DetailedTaxCalculationResult) => formatCurrency(r.basicDeduction) },
  { label: '課税遺産総額', getValue: (r: DetailedTaxCalculationResult) => formatCurrency(r.taxableAmount) },
  { label: '相続税の総額', getValue: (r: DetailedTaxCalculationResult) => formatCurrency(r.totalTax) },
] as const;

const HIGHLIGHT_ITEMS = [
  { label: '納付税額合計', getValue: (r: DetailedTaxCalculationResult) => formatCurrency(r.totalFinalTax) },
  { label: '相続税負担率', getValue: (r: DetailedTaxCalculationResult, _w: number) => formatPercent(r.effectiveTaxRate) },
  { label: '加重平均適用税率', getValue: (_r: DetailedTaxCalculationResult, w: number) => formatPercent(w) },
] as const;

export const CalculationResult: React.FC<CalculationResultProps> = ({ result, weightedRate }) => {
  return (
    <>
      {/* Page 1: 計算結果 + 計算過程 */}
      <div className="space-y-6">
        <PrintHeader title="相続税計算結果" />

        {/* サマリーカード */}
        <div className={CARD}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">計算結果</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {SUMMARY_ITEMS.map(({ label, getValue }) => (
              <div key={label} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-800">{getValue(result)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HIGHLIGHT_ITEMS.map(({ label, getValue }) => (
              <div key={label} className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-sm">
                <p className="text-sm text-green-600 font-medium mb-1">{label}</p>
                <p className="text-2xl font-bold text-green-800">{getValue(result, weightedRate)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 計算過程 */}
        <CalculationSteps result={result} />

        {/* 相続人別内訳 */}
        <HeirBreakdownTable
          breakdowns={result.heirBreakdowns}
          totalFinalTax={result.totalFinalTax}
        />
      </div>

      {/* Page 2: 累進税額の内訳 + 速算表 */}
      <div className="mt-6 space-y-6 print-page-break">
        <PrintHeader title="累進税額の内訳" />

        <ProgressiveTaxBreakdown breakdowns={result.heirBreakdowns} />

        <TaxBracketTable />
      </div>
    </>
  );
};
