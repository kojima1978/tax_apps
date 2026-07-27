import React from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';
import type { DetailedTaxCalculationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { CARD } from '../tableStyles';
import { ProgressiveTaxBreakdown } from './ProgressiveTaxBreakdown';
import { TaxBracketTable } from '../TaxBracketTable';

interface CalculationBasisDetailsProps {
  result: DetailedTaxCalculationResult;
}

/** 按分計算の式（結果表と重複するため通常は畳んでおく） */
const ApportionmentDetail: React.FC<{ result: DetailedTaxCalculationResult }> = ({ result }) => (
  <div className={CARD}>
    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-1">按分計算の内訳</h3>
    <p className="text-xs md:text-sm text-gray-500 mb-3">
      相続税の総額を、各相続人が実際に取得する割合で按分します。
    </p>
    <div className="space-y-1">
      {result.heirBreakdowns.map((b) => (
        <p key={b.label} className="text-sm text-gray-700 pl-4">
          {b.label}: {formatCurrency(result.totalTax)} × ({formatCurrency(b.acquisitionAmount)} /{' '}
          {formatCurrency(result.estateValue)}) ={' '}
          <span className="font-medium">{formatCurrency(b.proportionalTax)}</span>
        </p>
      ))}
    </div>
  </div>
);

/**
 * 税理士向けの計算根拠。
 * 顧客配布用の印刷物には含めないため no-print。
 */
export const CalculationBasisDetails: React.FC<CalculationBasisDetailsProps> = ({ result }) => (
  <details className="no-print group">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      詳細な計算根拠を表示（按分計算・累進税額の内訳・速算表）
    </summary>

    <div className="mt-4 space-y-4 md:space-y-6">
      <ApportionmentDetail result={result} />
      <ProgressiveTaxBreakdown breakdowns={result.heirBreakdowns} />
      <TaxBracketTable />
    </div>
  </details>
);
