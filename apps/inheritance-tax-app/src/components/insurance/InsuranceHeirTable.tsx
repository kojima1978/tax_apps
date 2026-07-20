import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, getHeirBaseAcquisition, getHeirNetProceeds, heirLabelColumn, currencyColumn } from '../../utils';
import { HeirScenarioTable, type HeirColumn } from '../HeirScenarioTable';
import { HeirNetComparisonTable } from '../HeirNetComparisonTable';
import { INSURANCE_EXEMPT_PER_HEIR } from '../../constants';
import { CARD } from '../tableStyles';

interface InsuranceHeirTableProps {
  result: InsuranceSimulationResult;
}

function formatTriangleDelta(value: number): string {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `△${formatCurrency(Math.abs(value))}`;
  return '±0';
}

function formatTriangleDeduction(value: number): string {
  return `△${formatCurrency(value)}`;
}

function buildInsuranceColumns(scenario: InsuranceScenarioResult): HeirColumn[] {
  const { heirBreakdowns, taxResult } = scenario;
  const totalPremiumPaid = heirBreakdowns.reduce((s, b) => s + b.premiumPaid, 0);
  const totalBaseAcquisition = scenario.adjustedEstate + scenario.premiumDeduction - scenario.taxableInsurance;
  const getPretaxProceeds = (i: number) => {
    const insurance = heirBreakdowns[i];
    return getHeirBaseAcquisition(scenario, i) - (insurance?.premiumPaid ?? 0) + (insurance?.totalBenefit ?? 0);
  };
  const totalPretaxProceeds = totalBaseAcquisition - totalPremiumPaid + scenario.totalBenefit;

  return [
    heirLabelColumn(i => heirBreakdowns[i]?.label),
    currencyColumn('相続する財産', i => getHeirBaseAcquisition(scenario, i), totalBaseAcquisition),
    {
      label: '支払う保険料',
      getValue: i => heirBreakdowns[i]?.premiumPaid > 0 ? formatTriangleDeduction(heirBreakdowns[i].premiumPaid) : '—',
      getTotalValue: () => totalPremiumPaid > 0 ? formatTriangleDeduction(totalPremiumPaid) : '—',
    },
    currencyColumn('受け取る保険金', i => heirBreakdowns[i]?.totalBenefit ?? 0, scenario.totalBenefit),
    currencyColumn('税引前の財産', getPretaxProceeds, totalPretaxProceeds),
    currencyColumn('支払う相続税', i => taxResult.heirBreakdowns[i]?.finalTax ?? 0, taxResult.totalFinalTax),
    currencyColumn('残る財産', i => getHeirNetProceeds(scenario, i), scenario.totalNetProceeds, { bold: true }),
  ];
}

function valueToneClass(value: number): string {
  if (value > 0) return 'text-green-700';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

function taxToneClass(taxDiff: number): string {
  if (taxDiff > 0) return 'text-amber-700';
  if (taxDiff < 0) return 'text-green-700';
  return 'text-gray-500';
}

function MetricCard({
  label,
  value,
  note,
  className = 'text-gray-900',
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${className}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function InsuranceResultSummary({ result }: { result: InsuranceSimulationResult }) {
  const { current, proposed, newPremiumTotal, netProceedsDiff } = result;
  const currentNet = current.totalNetProceeds;
  const proposedNet = proposed.totalNetProceeds;
  const newBenefit = proposed.totalBenefit - current.totalBenefit;
  const taxDiff = proposed.taxResult.totalFinalTax - current.taxResult.totalFinalTax;
  const positive = netProceedsDiff >= 0;

  // 死亡保険金の非課税枠（500万円 × 法定相続人数）の適用状況
  const exemptLimit = proposed.nonTaxableLimit;
  const exemptHeirs = Math.round(exemptLimit / INSURANCE_EXEMPT_PER_HEIR);
  const exemptApplied = proposed.nonTaxableAmount;
  const exemptRemaining = exemptLimit - exemptApplied;

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-4 py-4 ${positive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <p className={`text-xs font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}>3. 結論</p>
        <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-2xl font-bold ${positive ? 'text-green-700' : 'text-red-700'}`}>
              税金を払った後に残る財産 {formatTriangleDelta(netProceedsDiff)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {formatCurrency(currentNet)}（現在のまま） → {formatCurrency(proposedNet)}（保険に加入した場合）
            </p>
          </div>
          <p className="text-xs text-gray-500 md:text-right">
            支払う保険料、受け取る保険金、相続税をすべて反映した差額です。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="新たに支払う保険料"
          value={newPremiumTotal > 0 ? formatTriangleDeduction(newPremiumTotal) : '—'}
          note="保険に加入した場合に支払う金額"
          className={newPremiumTotal > 0 ? 'text-gray-900' : 'text-gray-500'}
        />
        <MetricCard
          label="新たに受け取る保険金"
          value={newBenefit !== 0 ? formatTriangleDelta(newBenefit) : '—'}
          note="保険に加入した場合に増える保険金"
          className={valueToneClass(newBenefit)}
        />
        <MetricCard
          label="相続税がどう変わるか"
          value={taxDiff !== 0 ? formatTriangleDelta(taxDiff) : '—'}
          note={taxDiff > 0 ? '相続税は増えます' : taxDiff < 0 ? '相続税は下がります' : '相続税は変わりません'}
          className={taxToneClass(taxDiff)}
        />
        <MetricCard
          label="相続税の非課税枠"
          value={formatCurrency(exemptLimit)}
          note={
            exemptRemaining > 0
              ? `${INSURANCE_EXEMPT_PER_HEIR}万円×${exemptHeirs}人・うち${formatCurrency(exemptApplied)}を適用（残り${formatCurrency(exemptRemaining)}）`
              : `${INSURANCE_EXEMPT_PER_HEIR}万円×${exemptHeirs}人・全額適用済`
          }
          className="text-green-700"
        />
      </div>
    </div>
  );
}

export const InsuranceHeirTable: React.FC<InsuranceHeirTableProps> = ({ result }) => {
  const { current, proposed } = result;
  const heirCount = current.heirBreakdowns.length;

  return (
    <div className={CARD}>
      <h3 className="text-lg font-bold text-gray-800 mb-4">試算結果</h3>

      <div>
        <h4 className="text-base font-bold text-gray-700 mb-2">1. 相続人別内訳</h4>
        <p className="text-xs text-gray-500 mb-3">
          税引前の財産から相続税を差し引き、最後に残る財産までを確認できます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeirScenarioTable
          label="現在のまま"
          taxTotal={current.taxResult.totalFinalTax}
          taxLabel="支払う相続税"
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => current.heirBreakdowns[i]?.label || String(i)}
          columns={buildInsuranceColumns(current)}
          compactRows
          showTaxTotal={false}
        />
        <HeirScenarioTable
          label="保険に加入した場合"
          taxTotal={proposed.taxResult.totalFinalTax}
          taxLabel="支払う相続税"
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => proposed.heirBreakdowns[i]?.label || String(i)}
          columns={buildInsuranceColumns(proposed)}
          compactRows
          showTaxTotal={false}
        />
      </div>

      <div className="mt-6 border-t border-gray-200 pt-5">
        <HeirNetComparisonTable
          title="2. 相続人別 残る財産比較"
          description="現在のままと保険に加入した場合で、税金を払った後に残る財産を比べます。"
          heirCount={heirCount}
          getLabel={i => current.heirBreakdowns[i]?.label || ''}
          getCurrentNet={i => getHeirNetProceeds(current, i)}
          getProposedNet={i => getHeirNetProceeds(proposed, i)}
          totalCurrentNet={current.totalNetProceeds}
          totalProposedNet={proposed.totalNetProceeds}
          totalDiff={result.netProceedsDiff}
        />
      </div>

      <div className="mt-6 border-t border-gray-200 pt-5">
        <InsuranceResultSummary result={result} />
      </div>
    </div>
  );
};
