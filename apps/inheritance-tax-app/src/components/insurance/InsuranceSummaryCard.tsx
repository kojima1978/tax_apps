import React from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency, formatDelta } from '../../utils';
import { ScenarioComparisonCard, type ComparisonRowDef, type HighlightItem } from '../ScenarioComparisonCard';

interface InsuranceSummaryCardProps {
  result: InsuranceSimulationResult;
}

const ROWS: ComparisonRowDef<InsuranceSimulationResult>[] = [
  { id: 'estate', label: '元の財産額', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate },
  { id: 'premium', label: '新規保険料', getCurrent: () => 0, getProposed: r => r.newPremiumTotal, valuePrefix: 'ー' },
  { id: 'benefit', label: '受取保険金（全額）', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { id: 'exempt', label: '非課税額', getCurrent: r => r.current.nonTaxableAmount, getProposed: r => r.proposed.nonTaxableAmount },
  { id: 'taxable-ins', label: '課税対象保険金', getCurrent: r => r.current.taxableInsurance, getProposed: r => r.proposed.taxableInsurance },
  { id: 'adjusted', label: '課税遺産額（税計算用）', getCurrent: r => r.current.adjustedEstate, getProposed: r => r.proposed.adjustedEstate },
  { id: 'tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax },
  { id: 'net', label: '税引後財産額', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({ result }) => {
  const { current, proposed, taxSaving, netProceedsDiff, newPremiumTotal } = result;

  const benefit = proposed.totalBenefit;
  const tax = proposed.taxResult.totalFinalTax;
  const coverageRatio = tax > 0 ? Math.round(benefit / tax * 100) : -1;

  const highlights: HighlightItem[] = [
    { label: '節税効果', value: taxSaving, format: 'saving' },
    {
      label: '財産額の増減',
      value: netProceedsDiff,
      format: 'gain',
      footnote: newPremiumTotal > 0
        ? <>保険料 {formatCurrency(newPremiumTotal)} → 節税 {formatCurrency(taxSaving)} / 保険金 {formatCurrency(proposed.totalBenefit - current.totalBenefit)}</>
        : undefined,
    },
    {
      label: 'カバー率',
      value: coverageRatio,
      format: 'ratio',
      footnote: <>{formatCurrency(benefit)}（受取保険金）/ {formatCurrency(tax)}（相続税額）</>,
    },
  ];

  return (
    <ScenarioComparisonCard
      title="シミュレーション結果"
      result={result}
      rows={ROWS}
      topSlot={
        <div className="space-y-2">
          {newPremiumTotal > 0 && (
            <>
              <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">支払保険料（新規契約）</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(newPremiumTotal)}</span>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">受取保険金（新規契約）</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(proposed.totalBenefit - current.totalBenefit)}</span>
              </div>
            </>
          )}
          <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">保険金の非課税限度額（500万円×{current.nonTaxableLimit / 500}人（相続人の数））</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(current.nonTaxableLimit)}</span>
          </div>
        </div>
      }
      highlights={highlights}
    />
  );
};
