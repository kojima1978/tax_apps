import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, formatDelta } from '../../utils';
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

  const currentTax = current.taxResult.totalFinalTax;
  const proposedTax = proposed.taxResult.totalFinalTax;
  const taxIncrease = -taxSaving;
  const coversAll = proposedTax <= 0 || benefit >= proposedTax;

  highlights.push(
    {
      // ① 税金の動き: 増えるケースは「受取保険金 > 増える税」を対比して誤読を防ぐ
      label: '税金はどう動く？',
      description: '保険加入による相続税の変化',
      value: taxSaving,
      format: 'saving',
      tone: taxSaving > 0 ? 'positive' : taxSaving < 0 ? 'caution' : 'neutral',
      content: taxSaving > 0 ? (
        <p className="text-xl font-bold text-green-700">−{formatCurrency(taxSaving)} <span className="text-[11px] font-normal">節税</span></p>
      ) : taxSaving < 0 ? (
        <>
          <p className="text-xl font-bold text-amber-700">＋{formatCurrency(taxIncrease)} <span className="text-[11px] font-normal">増</span></p>
          <TaxContrastBars benefit={newBenefit} taxIncrease={taxIncrease} />
          <p className="text-[10px] text-gray-500 mt-2">受取保険金が増える税を上回り、差引でも手取りは {formatDelta(netProceedsDiff)}</p>
        </>
      ) : (
        <p className="text-xl font-bold text-gray-600">変化なし</p>
      ),
      footnote: <>{formatCurrency(currentTax)}（現状）→ {formatCurrency(proposedTax)}（提案）</>,
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
      // ② 納税充当率: 受取保険金を「相続税の支払い」と「余剰」に分けて可視化
      label: '保険金で相続税をまかなえる？',
      description: '受取保険金で相続税をどれだけ賄えるか',
      value: coverageRatio,
      format: 'ratio',
      tone: coversAll ? 'positive' : 'caution',
      content: (
        <>
          <p className={`text-xl font-bold ${coversAll ? 'text-green-700' : 'text-amber-700'}`}>
            {coverageRatio >= 0 ? `${coverageRatio}%` : '—'}
          </p>
          <CoverageBar benefit={benefit} tax={proposedTax} />
          <p className={`text-[11px] mt-1.5 ${coversAll ? 'text-green-700' : 'text-amber-700'}`}>
            {proposedTax <= 0 ? '相続税は発生しません' : coversAll ? '✓ 相続税を全額カバー' : '△ 一部をカバー'}
          </p>
        </>
      ),
      footnote: <>{formatCurrency(benefit)}（受取保険金）/ {formatCurrency(proposedTax)}（相続税額）</>,
    },
  );

  return highlights;
}

/** 同一スケールのミニ比較バー（受取保険金 vs 増える税） */
function TaxContrastBars({ benefit, taxIncrease }: { benefit: number; taxIncrease: number }) {
  const taxPct = benefit > 0 ? Math.min(100, Math.round((taxIncrease / benefit) * 100)) : 0;
  return (
    <div className="mt-2 space-y-1.5 text-left">
      <div>
        <p className="text-[10px] text-gray-500 mb-0.5">受取保険金 {formatCurrency(benefit)}</p>
        <div className="h-1.5 rounded-full bg-green-400 w-full" />
      </div>
      <div>
        <p className="text-[10px] text-gray-500 mb-0.5">増える税 {formatCurrency(taxIncrease)}</p>
        <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.max(taxPct, 4)}%` }} />
      </div>
    </div>
  );
}

/** 受取保険金を「相続税の支払い」と「余剰」に分割するバー */
function CoverageBar({ benefit, tax }: { benefit: number; tax: number }) {
  if (tax <= 0) return null;
  const enough = benefit >= tax;
  const scale = Math.max(benefit, tax);
  const firstPct = Math.round(((enough ? tax : benefit) / scale) * 100);
  return (
    <div className="mt-2 text-left">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
        {enough ? (
          <>
            <div className="bg-gray-300" style={{ width: `${firstPct}%` }} />
            <div className="bg-green-500 flex-1" />
          </>
        ) : (
          <>
            <div className="bg-green-500" style={{ width: `${firstPct}%` }} />
            <div className="bg-red-300 flex-1" />
          </>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-1">
        {enough
          ? <>相続税の支払い {formatCurrency(tax)}・余剰 {formatCurrency(benefit - tax)}</>
          : <>保険金でカバー {formatCurrency(benefit)}・不足 {formatCurrency(tax - benefit)}</>}
      </p>
    </div>
  );
}

/** ③ 結論ファーストの正味効果サマリー */
function InsuranceEffectSummary({ result }: { result: InsuranceSimulationResult }) {
  const { proposed, netProceedsDiff } = result;
  const benefit = proposed.totalBenefit;
  const tax = proposed.taxResult.totalFinalTax;
  const coverageRatio = tax > 0 ? Math.round((benefit / tax) * 100) : -1;
  const positive = netProceedsDiff >= 0;
  return (
    <div className={`rounded-lg border px-4 py-3 ${positive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className={`text-xs ${positive ? 'text-green-700' : 'text-amber-700'}`}>保険加入の正味効果（保険料を差し引いた後）</p>
      <p className={`text-2xl font-bold ${positive ? 'text-green-700' : 'text-amber-700'}`}>{formatDelta(netProceedsDiff)}</p>
      {tax > 0 && (
        <p className="text-xs text-gray-600 mt-1.5">
          {benefit >= tax
            ? <>相続税 {formatCurrency(tax)} は受取保険金 {formatCurrency(benefit)} で全額まかなえる（充当率 {coverageRatio}%・{formatCurrency(benefit - tax)}の余裕）</>
            : <>相続税 {formatCurrency(tax)} のうち {coverageRatio}% を受取保険金 {formatCurrency(benefit)} でカバー</>}
        </p>
      )}
    </div>
  );
}

/** 受取保険金を「非課税枠」と「課税対象」に塗り分けるゾーンバー */
function InsuranceZoneBar({ scenario }: { scenario: InsuranceScenarioResult }) {
  const total = scenario.totalBenefit;
  if (total <= 0) return null;

  const nonTaxable = scenario.nonTaxableAmount;
  const taxable = scenario.taxableInsurance;
  const nonTaxablePct = Math.round((nonTaxable / total) * 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500 mb-2">受取保険金 {formatCurrency(total)} の内訳</p>
      <div className="flex h-7 rounded-md overflow-hidden mb-2 bg-gray-100">
        {nonTaxable > 0 && <div className="bg-green-500" style={{ width: `${nonTaxablePct}%` }} />}
        {taxable > 0 && <div className="bg-amber-400 flex-1" />}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {nonTaxable > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0" />
            非課税枠 {formatCurrency(nonTaxable)}・相続税ゼロ＋倍率効果
          </span>
        )}
        {taxable > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
            課税対象 {formatCurrency(taxable)}・課税後も倍率で純増
          </span>
        )}
      </div>
      {taxable > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          非課税枠（{formatCurrency(scenario.nonTaxableLimit)}）を超えた分も、保険金が保険料を上回る限り「現金で持つより」手取りは増えます。
        </p>
      )}
    </div>
  );
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
        <div className="space-y-4">
          {newPremiumTotal > 0 && <InsuranceEffectSummary result={result} />}
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
          <InsuranceZoneBar scenario={proposed} />
        </div>
      }
      highlights={highlights}
      highlightCols={2}
    />
  );
};
