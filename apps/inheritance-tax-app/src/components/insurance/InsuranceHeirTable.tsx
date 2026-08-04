import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, getHeirBaseAcquisition, getHeirNetProceeds, heirLabelColumn, currencyColumn } from '../../utils';
import { HeirScenarioTable, type HeirColumn } from '../HeirScenarioTable';
import { HeirNetComparisonTable } from '../HeirNetComparisonTable';
import { CARD } from '../tableStyles';
import { InsuranceExemptionChart } from './InsuranceExemptionChart';
import { InsuranceTaxCellConnectors } from './InsuranceTaxCellConnectors';
import { InsuranceNetFlowConnector } from './InsuranceNetFlowConnector';

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
    {
      label: '支払う相続税',
      getValue: i => formatCurrency(taxResult.heirBreakdowns[i]?.finalTax ?? 0),
      getTotalValue: () => formatCurrency(taxResult.totalFinalTax),
      cellClassName: 'insurance-tax-cell',
    },
    {
      ...currencyColumn('残る財産', i => getHeirNetProceeds(scenario, i), scenario.totalNetProceeds, { bold: true }),
      cellClassName: 'insurance-net-proceeds-cell',
    },
  ];
}

function InsuranceResultSummary({ result }: { result: InsuranceSimulationResult }) {
  const { current, proposed, netProceedsDiff } = result;
  const taxDiff = proposed.taxResult.totalFinalTax - current.taxResult.totalFinalTax;
  const positive = netProceedsDiff >= 0;
  const taxImpact = taxDiff < 0
    ? `相続税は${formatCurrency(Math.abs(taxDiff))}減少`
    : taxDiff > 0
      ? `相続税は${formatCurrency(taxDiff)}増加`
      : '相続税は変化なし';
  const taxImpactClass = taxDiff < 0 ? 'text-green-700' : taxDiff > 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="space-y-3">
      <div className="insurance-conclusion-row grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2.3fr)_minmax(260px,1fr)]">
        <div className={`insurance-conclusion-card flex flex-col rounded-lg border px-4 py-4 ${positive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-xs font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}>3. 結論</p>
          <div className="mt-1 flex flex-1 flex-col gap-2">
            <div>
              <p className={`text-2xl font-bold ${positive ? 'text-green-700' : 'text-red-700'}`}>
                税金を払った後に残る財産 {formatTriangleDelta(netProceedsDiff)}
                <span className={`insurance-tax-impact ml-2 text-base font-semibold ${taxImpactClass}`}>
                  （{taxImpact}）
                </span>
              </p>
            </div>
          </div>
        </div>

        <InsuranceExemptionChart current={current} proposed={proposed} />
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

      <div className="insurance-asset-flow relative">
        <div className="insurance-heir-table-comparison relative">
          <div className="insurance-heir-table-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            className="insurance-current-table"
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
            className="insurance-proposed-table"
          />
          </div>
          <InsuranceTaxCellConnectors result={result} />
        </div>

        <div className="insurance-net-comparison-section mt-8 border-t border-gray-200 pt-5">
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
        <InsuranceNetFlowConnector />
      </div>

      <div className="mt-6 border-t border-gray-200 pt-5">
        <InsuranceResultSummary result={result} />
      </div>
    </div>
  );
};
