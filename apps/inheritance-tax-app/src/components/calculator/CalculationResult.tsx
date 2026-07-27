import React from 'react';
import type { DetailedTaxCalculationResult } from '../../types';
import { formatCurrency, formatPercent } from '../../utils';
import { CARD } from '../tableStyles';
import { PrintHeader } from '../PrintHeader';
import { PrintCautions } from '../PrintCautions';
import { CALCULATOR_PRINT_CAUTIONS } from '../../constants/cautionMessages';
import { CalculationPremise } from './CalculationPremise';
import { CalculationSteps } from './CalculationSteps';
import { CalculationBasisDetails } from './CalculationBasisDetails';
import { HeirBreakdownTable } from './HeirBreakdownTable';

interface CalculationResultProps {
  result: DetailedTaxCalculationResult;
}

/**
 * お客様配布用の1枚もの（A4横）を意識した構成。
 * 前提 → 結論 → 誰がいくら納めるか → どう計算したか → 注意事項 の順で、
 * 上から読むだけで説明が完結するようにしている。
 */
export const CalculationResult: React.FC<CalculationResultProps> = ({ result }) => {
  // 負担率は「納付税額 ÷ 遺産総額」。result.effectiveTaxRate は「相続税の総額 ÷ 遺産総額」で
  // 分子が納付税額と揃わないため、ここでは使わない（按分に使う実効税率は計算の流れ STEP 3 に表示）。
  const burdenRate = result.estateValue > 0 ? (result.totalFinalTax / result.estateValue) * 100 : 0;

  return (
    <div className="calc-result-body space-y-4 md:space-y-6">
      <PrintHeader title="相続税シミュレーション" />
      <CalculationPremise result={result} />

      {/* 結論 */}
      <div className={`${CARD} calc-summary-card`}>
        <h3 className="mb-3 text-base md:text-lg font-bold text-slate-800">試算結果</h3>

        <div className="calc-headline rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-5 text-center">
          <p className="calc-headline-label text-xs md:text-sm font-medium text-green-700">
            相続税の合計（納付税額）
          </p>
          <p className="calc-headline-value mt-1 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-green-800">
            {formatCurrency(result.totalFinalTax)}
          </p>
          <p className="calc-headline-sub mt-2 text-xs text-slate-600">
            遺産総額 {formatCurrency(result.estateValue)} に対する負担率{' '}
            <span className="font-semibold tabular-nums text-slate-800">{formatPercent(burdenRate)}</span>
          </p>
        </div>
      </div>

      {/* 誰がいくら納めるか */}
      <HeirBreakdownTable
        breakdowns={result.heirBreakdowns}
        totalFinalTax={result.totalFinalTax}
      />

      {/* どう計算したか */}
      <CalculationSteps result={result} />

      {/* 税理士向けの詳細根拠（画面のみ・折りたたみ） */}
      <CalculationBasisDetails result={result} />

      <PrintCautions items={CALCULATOR_PRINT_CAUTIONS} />
    </div>
  );
};
