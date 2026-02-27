import React from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { ScenarioComparisonCard, type ComparisonRowDef, type HighlightItem } from '../ScenarioComparisonCard';

interface InsuranceSummaryCardProps {
  result: InsuranceSimulationResult;
}

const ROWS: ComparisonRowDef<InsuranceSimulationResult>[] = [
  // ── 財産の構成 ──
  { id: 'estate', label: '手元資産', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate - r.newPremiumTotal, sectionHeader: '財産の構成', sectionDescription: '保険料支払い後の手元財産' },
  { id: 'premium', label: '新規保険料', getCurrent: () => 0, getProposed: r => r.newPremiumTotal },
  { id: 'estate-total', label: '資産合計', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate, sectionEnd: true },
  // ── 保険金の計算 ──
  { id: 'benefit', label: '受取保険金（全額）', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit, sectionHeader: '保険金の計算', sectionDescription: '非課税枠を適用した課税対象額' },
  { id: 'exempt', label: '非課税額', getCurrent: r => r.current.nonTaxableAmount, getProposed: r => r.proposed.nonTaxableAmount },
  { id: 'taxable-ins', label: '課税対象保険金', getCurrent: r => r.current.taxableInsurance, getProposed: r => r.proposed.taxableInsurance, sectionEnd: true },
  // ── 税額計算 ──
  { id: 'adjusted', label: '課税遺産額', getCurrent: r => r.current.adjustedEstate, getProposed: r => r.proposed.adjustedEstate, sectionHeader: '税額計算', sectionDescription: '課税遺産から算出した相続税' },
  { id: 'tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax, sectionEnd: true },
  // ── 結果 ──
  { id: 'r-estate', label: '手許資産', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate - r.newPremiumTotal, sectionHeader: '結果', sectionDescription: '手許資産 ＋ 保険金 − 税額 ＝ 納税後財産額' },
  { id: 'r-benefit', label: '受取保険金', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { id: 'r-tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax, valuePrefix: '−' },
  { id: 'net', label: '納税後財産額', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({ result }) => {
  const { current, proposed, taxSaving, netProceedsDiff, newPremiumTotal } = result;

  const benefit = proposed.totalBenefit;
  const tax = proposed.taxResult.totalFinalTax;
  const coverageRatio = tax > 0 ? Math.round(benefit / tax * 100) : -1;

  const newBenefit = proposed.totalBenefit - current.totalBenefit;
  const returnRatio = newPremiumTotal > 0 ? Math.round(newBenefit / newPremiumTotal * 100) : -1;

  const highlights: HighlightItem[] = [
    // 新規契約がある場合のみ「保険料→保険金」カードを左端に表示
    ...(newPremiumTotal > 0 ? [{
      label: '保険料 → 保険金',
      description: '支払った保険料に対する保険金の倍率',
      value: returnRatio,
      format: 'ratio' as const,
      footnote: <>{formatCurrency(newPremiumTotal)}（保険料）→ {formatCurrency(newBenefit)}（保険金）</>,
    }] : []),
    {
      label: '税金の増減',
      description: '保険加入による税額の変化',
      value: taxSaving,
      format: 'saving',
      footnote: <>{formatCurrency(current.taxResult.totalFinalTax)} → {formatCurrency(proposed.taxResult.totalFinalTax)}</>,
    },
    {
      label: '納税後財産額の増減',
      description: '保険加入後に残る財産の変化',
      value: netProceedsDiff,
      format: 'gain',
      footnote: <>{formatCurrency(current.totalNetProceeds)} → {formatCurrency(proposed.totalNetProceeds)}</>,
    },
    {
      label: '納税充当率',
      description: '保険金で税金をどれだけ賄えるか',
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
        <div className={`grid gap-3 ${newPremiumTotal > 0 ? 'grid-cols-1 md:grid-cols-3' : ''}`}>
          {newPremiumTotal > 0 && (
            <>
              <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">支払保険料（新規契約）</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(newPremiumTotal)}</p>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">受取保険金（新規契約）</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(proposed.totalBenefit - current.totalBenefit)}</p>
              </div>
            </>
          )}
          <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">非課税限度額（500万円×{current.nonTaxableLimit / 500}人）</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(current.nonTaxableLimit)}</p>
          </div>
        </div>
      }
      highlights={highlights}
    />
  );
};
