import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, getHeirBaseAcquisition, getHeirNetProceeds, heirLabelColumn, currencyColumn } from '../../utils';
import { HeirScenarioTable, type HeirColumn } from '../HeirScenarioTable';
import { HeirNetComparisonTable } from '../HeirNetComparisonTable';
import { CARD } from '../tableStyles';

interface InsuranceHeirTableProps {
  result: InsuranceSimulationResult;
}

function buildInsuranceColumns(scenario: InsuranceScenarioResult): HeirColumn[] {
  const { heirBreakdowns, taxResult } = scenario;
  const totalPremiumPaid = heirBreakdowns.reduce((s, b) => s + b.premiumPaid, 0);
  const totalBaseAcquisition = scenario.adjustedEstate + scenario.premiumDeduction - scenario.taxableInsurance;

  return [
    heirLabelColumn(i => heirBreakdowns[i]?.label),
    currencyColumn('遺産取得額', i => getHeirBaseAcquisition(scenario, i), totalBaseAcquisition),
    {
      label: '保険料負担',
      getValue: i => heirBreakdowns[i]?.premiumPaid > 0 ? `ー${formatCurrency(heirBreakdowns[i].premiumPaid)}` : '—',
      getTotalValue: () => totalPremiumPaid > 0 ? `ー${formatCurrency(totalPremiumPaid)}` : '—',
    },
    currencyColumn('受取保険金', i => heirBreakdowns[i]?.totalBenefit ?? 0, scenario.totalBenefit),
    currencyColumn('納付税額', i => taxResult.heirBreakdowns[i]?.finalTax ?? 0, taxResult.totalFinalTax),
    currencyColumn('納税後', i => getHeirNetProceeds(scenario, i), scenario.totalNetProceeds, { bold: true }),
  ];
}

export const InsuranceHeirTable: React.FC<InsuranceHeirTableProps> = ({ result }) => {
  const { current, proposed } = result;
  const heirCount = current.heirBreakdowns.length;

  return (
    <div className={CARD}>
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別内訳</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <HeirScenarioTable
          label={current.label}
          taxTotal={current.taxResult.totalFinalTax}
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => current.heirBreakdowns[i]?.label || String(i)}
          columns={buildInsuranceColumns(current)}
        />
        <HeirScenarioTable
          label={proposed.label}
          taxTotal={proposed.taxResult.totalFinalTax}
          headerBg="bg-green-600"
          heirCount={heirCount}
          getHeirKey={i => proposed.heirBreakdowns[i]?.label || String(i)}
          columns={buildInsuranceColumns(proposed)}
        />
      </div>

      <div className="print-page-break">
        <HeirNetComparisonTable
          heirCount={heirCount}
          getLabel={i => current.heirBreakdowns[i]?.label || ''}
          getCurrentNet={i => getHeirNetProceeds(current, i)}
          getProposedNet={i => getHeirNetProceeds(proposed, i)}
          totalCurrentNet={current.totalNetProceeds}
          totalProposedNet={proposed.totalNetProceeds}
          totalDiff={result.netProceedsDiff}
        />
      </div>
    </div>
  );
};
