import React from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { ScenarioComparisonCard, type ComparisonRowDef, type HighlightItem, type WaterfallStep } from '../ScenarioComparisonCard';

interface InsuranceSummaryCardProps {
  result: InsuranceSimulationResult;
}

const ROWS: ComparisonRowDef<InsuranceSimulationResult>[] = [
  // ── 財産の構成 ──
  { id: 'estate', label: '手元資産', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate - r.newPremiumTotal, sectionHeader: '財産の構成', sectionDescription: '' },
  { id: 'existing-benefit', label: '既存保険金', getCurrent: r => r.current.totalBenefit, getProposed: r => r.current.totalBenefit },
  { id: 'premium', label: '新規保険料', getCurrent: () => 0, getProposed: r => r.newPremiumTotal },
  { id: 'estate-total', label: '財産合計', getCurrent: r => r.baseEstate + r.current.totalBenefit, getProposed: r => r.baseEstate + r.current.totalBenefit, sectionEnd: true },
  // ── 保険金の加算 ──
  { id: 'ins-estate', label: '手元資産', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate - r.newPremiumTotal, sectionHeader: '相続時の財産構成', sectionDescription: '' },
  { id: 'benefit', label: '受取保険金（全額）', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { id: 'estate-plus-benefit', label: '財産合計', getCurrent: r => r.baseEstate + r.current.totalBenefit, getProposed: r => r.baseEstate - r.newPremiumTotal + r.proposed.totalBenefit, sectionEnd: true },
  // ── 税額計算 ──
  { id: 'tax-estate-total', label: '財産合計', getCurrent: r => r.baseEstate + r.current.totalBenefit, getProposed: r => r.baseEstate - r.newPremiumTotal + r.proposed.totalBenefit, sectionHeader: '税額計算', sectionDescription: '非課税枠適用後の課税遺産から相続税を算出' },
  { id: 'exempt', label: '死亡保険金の非課税額', getCurrent: r => r.current.nonTaxableAmount, getProposed: r => r.proposed.nonTaxableAmount, valuePrefix: '−' },
  { id: 'adjusted', label: '課税遺産額', getCurrent: r => r.current.adjustedEstate, getProposed: r => r.proposed.adjustedEstate },
  { id: 'tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax, sectionEnd: true },
  // ── 結果 ──
  { id: 'r-estate', label: '手元資産', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate - r.newPremiumTotal, sectionHeader: '結果', sectionDescription: '手元資産 ＋ 保険金 − 税額 ＝ 納税後財産額' },
  { id: 'r-benefit', label: '受取保険金', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { id: 'r-tax', label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax, valuePrefix: '−' },
  { id: 'net', label: '納税後財産額', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

/** 納税後財産額の脚注を生成 */
function buildNetFootnote(result: InsuranceSimulationResult): React.ReactNode {
  const { current, proposed, taxSaving, newPremiumTotal } = result;
  const newBenefit = proposed.totalBenefit - current.totalBenefit;
  const insuranceNetGain = newBenefit - newPremiumTotal;

  if (newPremiumTotal <= 0) {
    return <>{formatCurrency(current.totalNetProceeds)} → {formatCurrency(proposed.totalNetProceeds)}</>;
  }
  if (taxSaving > 0) {
    return <>{formatCurrency(insuranceNetGain)}（保険増加分） ＋ {formatCurrency(taxSaving)}（税軽減分）</>;
  }
  if (taxSaving < 0) {
    return <>{formatCurrency(insuranceNetGain)}（保険増加分） − {formatCurrency(-taxSaving)}（税増加分）</>;
  }
  return <>{formatCurrency(insuranceNetGain)}（保険増加分）</>;
}

/** ハイライトカード群を生成 */
function buildHighlights(result: InsuranceSimulationResult): HighlightItem[] {
  const { current, proposed, taxSaving, netProceedsDiff, newPremiumTotal } = result;

  const benefit = proposed.totalBenefit;
  const tax = proposed.taxResult.totalFinalTax;
  const coverageRatio = tax > 0 ? Math.round(benefit / tax * 100) : -1;

  const newBenefit = proposed.totalBenefit - current.totalBenefit;
  const returnRatio = newPremiumTotal > 0 ? Math.round(newBenefit / newPremiumTotal * 100) : -1;
  const insuranceNetGain = newBenefit - newPremiumTotal;

  const highlights: HighlightItem[] = [];

  if (newPremiumTotal > 0) {
    highlights.push({
      label: '保険料 → 保険金',
      description: '支払った保険料に対する保険金の倍率',
      value: returnRatio,
      format: 'ratio',
      valueSuffix: <>（＋{formatCurrency(insuranceNetGain)}）</>,
      footnote: <>{formatCurrency(newPremiumTotal)}（保険料）→ {formatCurrency(newBenefit)}（保険金）</>,
    });
  }

  // 保険加入の効果（ウォーターフォール分解）
  const effectBreakdown: WaterfallStep[] = [];
  if (newPremiumTotal > 0) {
    effectBreakdown.push(
      { label: '受取保険金', value: newBenefit },
      { label: '支払保険料', value: -newPremiumTotal },
      { label: '保険の純増分', value: insuranceNetGain, separator: 'single' },
    );
  }
  if (taxSaving !== 0) {
    effectBreakdown.push({
      label: taxSaving > 0 ? '税軽減効果' : '税増加分',
      value: taxSaving,
    });
  }
  effectBreakdown.push({
    label: '手取り増加額',
    value: netProceedsDiff,
    separator: 'double',
    isSummary: true,
  });

  highlights.push(
    {
      label: '税金の増減',
      description: '保険加入による税額の変化',
      value: taxSaving,
      format: 'saving',
      footnote: <>{formatCurrency(current.taxResult.totalFinalTax)}（現状） → {formatCurrency(proposed.taxResult.totalFinalTax)}（提案）</>,
    },
    {
      label: '保険加入の効果',
      description: '保険料を差し引いた上での財産増加額',
      value: netProceedsDiff,
      format: 'gain',
      breakdown: newPremiumTotal > 0 ? effectBreakdown : undefined,
      footnote: newPremiumTotal > 0 ? <>※保険料は差引済みの金額です</> : buildNetFootnote(result),
    },
    {
      label: '納税充当率',
      description: '保険金で税金をどれだけ賄えるか',
      value: coverageRatio,
      format: 'ratio',
      footnote: <>{formatCurrency(benefit)}（受取保険金）/ {formatCurrency(tax)}（相続税額）</>,
    },
  );

  return highlights;
}

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({ result }) => {
  const { current, proposed, newPremiumTotal } = result;
  const highlights = buildHighlights(result);

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
