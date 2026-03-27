import React from 'react';
import type { DetailedTaxCalculationResult, HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatFraction } from '../../utils';
import { BASIC_DEDUCTION, TAX_BRACKETS } from '../../constants';
import { CARD } from '../tableStyles';

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
  <p className="text-sm text-gray-800">{formula} ＝ <span className="font-bold">{result}</span></p>
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

// ── ステップ生成関数 ──

function buildBaseSteps(result: DetailedTaxCalculationResult): Step[] {
  const { heirBreakdowns } = result;
  const heirCount = heirBreakdowns.length;

  return [
    {
      title: '遺産総額',
      content: <p className="text-sm font-bold text-gray-800">{formatCurrency(result.estateValue)}</p>,
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
  ];
}

function buildShareSteps(result: DetailedTaxCalculationResult): Step[] {
  const { heirBreakdowns } = result;

  return [
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
        <BreakdownList breakdowns={heirBreakdowns} renderContent={(b) => {
          const bracket = TAX_BRACKETS.find(br => b.legalShareAmount <= br.threshold)
            || TAX_BRACKETS[TAX_BRACKETS.length - 1];
          return (
            <>
              {formatCurrency(b.legalShareAmount)} × {bracket.rate}%
              {bracket.deduction > 0 && <> − {formatCurrency(bracket.deduction)}</>}
              {' '}= <span className="font-medium">{formatCurrency(b.taxOnShare)}</span>
            </>
          );
        }} />
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
}

function buildSpouseDeductionStep(result: DetailedTaxCalculationResult): Step | null {
  const d = result.spouseDeductionDetail;
  if (!d) return null;

  const withinLimit = d.acquisitionAmount <= d.deductionLimit;
  return {
    title: '配偶者の税額軽減',
    content: (
      <div className="space-y-1">
        <FormulaResult
          formula={<>控除限度額: max({formatCurrency(d.legalShareAmount)}, {formatCurrency(d.limit160m)})</>}
          result={formatCurrency(d.deductionLimit)}
        />
        <p className="text-sm text-gray-800">
          配偶者の取得額 {formatCurrency(d.acquisitionAmount)} {withinLimit ? '≦' : '＞'} 控除限度額 {formatCurrency(d.deductionLimit)}
        </p>
        {withinLimit ? (
          <p className="text-sm text-gray-800">
            取得額が限度額以下 → 按分税額 {formatCurrency(d.taxBeforeDeduction)} を全額控除 ＝ <span className="font-bold">控除額: {formatCurrency(d.actualDeduction)}</span>
          </p>
        ) : (
          <FormulaResult
            formula={<>{formatCurrency(result.totalTax)} × ({formatCurrency(d.deductionLimit)} / {formatCurrency(result.estateValue)})</>}
            result={<>控除額: {formatCurrency(d.actualDeduction)}</>}
          />
        )}
      </div>
    ),
  };
}

function buildSurchargeStep(heirBreakdowns: HeirTaxBreakdown[]): Step | null {
  const rank3Heirs = heirBreakdowns.filter(b => b.surchargeAmount > 0);
  if (rank3Heirs.length === 0) return null;

  return {
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
  };
}

function buildFinalStep(result: DetailedTaxCalculationResult): Step {
  return {
    title: '納付すべき相続税額',
    content: (
      <div>
        <div className="mb-2">
          <BreakdownList breakdowns={result.heirBreakdowns} renderContent={(b) => (
            <span className="font-bold">{formatCurrency(b.finalTax)}</span>
          )} />
        </div>
        <p className="text-lg font-bold text-gray-800 border-t pt-2">
          合計: {formatCurrency(result.totalFinalTax)}
        </p>
      </div>
    ),
  };
}

function buildSteps(result: DetailedTaxCalculationResult): Step[] {
  const steps: Step[] = [
    ...buildBaseSteps(result),
    ...buildShareSteps(result),
  ];

  const spouseStep = buildSpouseDeductionStep(result);
  if (spouseStep) steps.push(spouseStep);

  const surchargeStep = buildSurchargeStep(result.heirBreakdowns);
  if (surchargeStep) steps.push(surchargeStep);

  steps.push(buildFinalStep(result));
  return steps;
}

export const CalculationSteps: React.FC<CalculationStepsProps> = ({ result }) => {
  const steps = buildSteps(result);

  return (
    <div className={CARD}>
      <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 md:mb-6">計算過程</h3>
      <div className="calc-steps-grid space-y-4 md:space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3 md:gap-4 calc-step-item">
            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
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
