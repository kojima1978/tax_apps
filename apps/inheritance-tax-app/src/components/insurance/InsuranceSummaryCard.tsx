import React from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency, formatDelta } from '../../utils';
import { ScenarioComparisonCard, type ComparisonRowDef, type HighlightItem } from '../ScenarioComparisonCard';

interface InsuranceSummaryCardProps {
  result: InsuranceSimulationResult;
}

const ROWS: ComparisonRowDef<InsuranceSimulationResult>[] = [
  { id: 'estate', label: '元の遺産額', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate },
  { id: 'premium', label: '新規保険料', getCurrent: () => 0, getProposed: r => r.newPremiumTotal, valuePrefix: 'ー' },
  { id: 'benefit', label: '受取保険金（全額）', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { id: 'exempt', label: '非課税額', getCurrent: r => r.current.nonTaxableAmount, getProposed: r => r.proposed.nonTaxableAmount },
  { id: 'taxable-ins', label: '課税対象保険金', getCurrent: r => r.current.taxableInsurance, getProposed: r => r.proposed.taxableInsurance },
  { id: 'adjusted', label: '課税遺産額（税計算用）', getCurrent: r => r.current.adjustedEstate, getProposed: r => r.proposed.adjustedEstate },
  { id: 'tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax },
  { id: 'net', label: '手取り合計', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({ result }) => {
  const { current, taxSaving, netProceedsDiff, newPremiumTotal } = result;

  const highlights: HighlightItem[] = [
    { label: '節税効果', value: taxSaving, format: 'saving' },
    {
      label: '手取り増減',
      value: netProceedsDiff,
      format: 'gain',
      footnote: newPremiumTotal > 0
        ? <>保険料 {formatCurrency(newPremiumTotal)} → 節税 {formatCurrency(taxSaving)}{netProceedsDiff !== taxSaving && ` / 手取り増 ${formatDelta(netProceedsDiff)}`}</>
        : undefined,
    },
  ];

  return (
    <ScenarioComparisonCard
      title="シミュレーション結果"
      result={result}
      rows={ROWS}
      topSlot={
        <div className="bg-green-50 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">保険金の非課税限度額（500万円×{current.nonTaxableLimit / 500}人）</span>
            <span className="text-lg font-bold text-green-800">{formatCurrency(current.nonTaxableLimit)}</span>
          </div>
        </div>
      }
      highlights={highlights}
    />
  );
};
