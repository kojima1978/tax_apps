import React from 'react';
import type { DetailedTaxCalculationResult, HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatFraction } from '../../utils';
import { BASIC_DEDUCTION } from '../../constants';

interface CalculationStepsProps {
  result: DetailedTaxCalculationResult;
}

interface Step {
  title: string;
  content: React.ReactNode;
}

const FormulaResult: React.FC<{
  formula: React.ReactNode;
  result: React.ReactNode;
}> = ({ formula, result }) => (
  <div>
    <p className="text-sm text-gray-600 mb-1">{formula}</p>
    <p className="text-lg font-bold text-green-800">= {result}</p>
  </div>
);

const BreakdownList: React.FC<{
  breakdowns: HeirTaxBreakdown[];
  renderContent: (b: HeirTaxBreakdown) => React.ReactNode;
}> = ({ breakdowns, renderContent }) => (
  <div className="space-y-1">
    {breakdowns.map((b) => (
      <p key={b.label} className="text-sm text-gray-700 pl-4">
        {b.label}: {renderContent(b)}
      </p>
    ))}
  </div>
);

export const CalculationSteps: React.FC<CalculationStepsProps> = ({ result }) => {
  const { heirBreakdowns, spouseDeductionDetail } = result;
  const heirCount = heirBreakdowns.length;
  const hasRank3 = heirBreakdowns.some(b => b.surchargeAmount > 0);

  const steps: Step[] = [
    {
      title: '遺産総額',
      content: <p className="text-lg font-bold text-green-800">{formatCurrency(result.estateValue)}</p>,
    },
    {
      title: '基礎控除額',
      content: (
        <FormulaResult
          formula={<>{BASIC_DEDUCTION.BASE.toLocaleString()}万円 + {BASIC_DEDUCTION.PER_HEIR.toLocaleString()}万円 × {heirCount}人（法定相続人）</>}
          result={formatCurrency(result.basicDeduction)}
        />
      ),
    },
    {
      title: '課税遺産総額',
      content: (
        <FormulaResult
          formula={<>{formatCurrency(result.estateValue)} − {formatCurrency(result.basicDeduction)}</>}
          result={formatCurrency(result.taxableAmount)}
        />
      ),
    },
    {
      title: '法定相続分に応じた取得金額',
      content: (
        <BreakdownList breakdowns={heirBreakdowns} renderContent={(b) => (
          <>{formatCurrency(result.taxableAmount)} × {formatFraction(b.legalShareRatio)} = <span className="font-medium">{formatCurrency(b.legalShareAmount)}</span></>
        )} />
      ),
    },
    {
      title: '各取得金額に対する税額（速算表適用）',
      content: (
        <BreakdownList breakdowns={heirBreakdowns} renderContent={(b) => (
          <span className="font-medium">{formatCurrency(b.taxOnShare)}</span>
        )} />
      ),
    },
    {
      title: '相続税の総額',
      content: (
        <FormulaResult
          formula={heirBreakdowns.map(b => formatCurrency(b.taxOnShare)).join(' + ')}
          result={formatCurrency(result.totalTax)}
        />
      ),
    },
    {
      title: '各相続人の按分後税額',
      content: (
        <BreakdownList breakdowns={heirBreakdowns} renderContent={(b) => (
          <>{formatCurrency(result.totalTax)} × ({formatCurrency(b.acquisitionAmount)} / {formatCurrency(result.estateValue)}) = <span className="font-medium">{formatCurrency(b.proportionalTax)}</span></>
        )} />
      ),
    },
  ];

  // 配偶者の税額軽減（該当時）
  if (spouseDeductionDetail) {
    steps.push({
      title: '配偶者の税額軽減',
      content: (
        <div className="bg-green-50 rounded-lg p-3">
          <div className="space-y-1 text-sm text-gray-700">
            <p>配偶者の取得額: {formatCurrency(spouseDeductionDetail.acquisitionAmount)}</p>
            <p>法定相続分相当額: {formatCurrency(spouseDeductionDetail.legalShareAmount)}</p>
            <p>控除限度額: max({formatCurrency(spouseDeductionDetail.legalShareAmount)}, {formatCurrency(spouseDeductionDetail.limit160m)}) = <span className="font-medium">{formatCurrency(spouseDeductionDetail.deductionLimit)}</span></p>
            <p className="text-green-700 font-bold">控除額: {formatCurrency(spouseDeductionDetail.actualDeduction)}</p>
          </div>
        </div>
      ),
    });
  }

  // 2割加算（該当時）
  if (hasRank3) {
    const rank3Heirs = heirBreakdowns.filter(b => b.surchargeAmount > 0);
    steps.push({
      title: '2割加算',
      content: (
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="space-y-1 text-sm text-gray-700">
            {rank3Heirs.map((b) => (
              <p key={b.label}>
                {b.label}: {formatCurrency(b.proportionalTax)} × 20% = <span className="font-medium text-orange-700">{formatCurrency(b.surchargeAmount)}</span>
              </p>
            ))}
          </div>
        </div>
      ),
    });
  }

  // 最終ステップ
  steps.push({
    title: '納付すべき相続税額',
    content: (
      <div>
        <div className="mb-2">
          <BreakdownList breakdowns={heirBreakdowns} renderContent={(b) => (
            <span className="font-bold">{formatCurrency(b.finalTax)}</span>
          )} />
        </div>
        <p className="text-xl font-bold text-green-800 border-t pt-2">
          合計: {formatCurrency(result.totalFinalTax)}
        </p>
      </div>
    ),
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">計算過程</h3>
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 mb-1">{step.title}</h4>
              {step.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
