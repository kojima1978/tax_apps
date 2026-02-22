import React from 'react';
import type { CashGiftSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { ScenarioComparisonCard, type ComparisonRowDef, type HighlightItem } from '../ScenarioComparisonCard';

interface CashGiftSummaryCardProps {
  result: CashGiftSimulationResult;
}

const ROWS: ComparisonRowDef<CashGiftSimulationResult>[] = [
  // ── 遺産縮小 ──
  { id: 'estate', label: '元の遺産額', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate },
  { id: 'gift-deduct', label: '生前贈与', getCurrent: () => 0, getProposed: r => r.totalGifts, valuePrefix: 'ー' },
  // ── 税額計算 ──
  { id: 'taxable', label: '課税遺産額', getCurrent: r => r.current.estateValue, getProposed: r => r.proposed.estateValue },
  { id: 'tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax, sectionEnd: true },
  // ── 贈与加算 ──
  { id: 'gift-add', label: '生前贈与', getCurrent: () => 0, getProposed: r => r.totalGifts },
  { id: 'gift-tax', label: '贈与税 合計', getCurrent: () => 0, getProposed: r => r.totalGiftTax, sectionEnd: true },
  { id: 'total-tax', label: '税負担合計（相続税＋贈与税）',
    getCurrent: r => r.current.taxResult.totalFinalTax,
    getProposed: r => r.proposed.taxResult.totalFinalTax + r.totalGiftTax },
  { id: 'net', label: '手取り合計', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

export const CashGiftSummaryCard: React.FC<CashGiftSummaryCardProps> = ({ result }) => {
  const { inheritanceTaxSaving, netProceedsDiff } = result;

  const highlights: HighlightItem[] = [
    { label: '相続税の節減', value: inheritanceTaxSaving, format: 'saving' },
    {
      label: '手取り増減',
      value: netProceedsDiff,
      format: 'gain',
      footnote: result.totalGifts > 0
        ? <>贈与 {formatCurrency(result.totalGifts)} → 節減 {formatCurrency(inheritanceTaxSaving)} − 贈与税 {formatCurrency(result.totalGiftTax)}</>
        : undefined,
    },
  ];

  return (
    <ScenarioComparisonCard
      title="シミュレーション結果"
      result={result}
      rows={ROWS}
      highlights={highlights}
    />
  );
};
