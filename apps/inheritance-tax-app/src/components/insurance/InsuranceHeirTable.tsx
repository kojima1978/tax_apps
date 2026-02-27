import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, getHeirBaseAcquisition, getHeirNetProceeds } from '../../utils';
import { TH, TD } from '../tableStyles';
import { HeirNetComparisonTable } from '../HeirNetComparisonTable';

interface InsuranceHeirTableProps {
  result: InsuranceSimulationResult;
}

const ScenarioTable: React.FC<{
  scenario: InsuranceScenarioResult;
  headerBg: string;
}> = ({ scenario, headerBg }) => {
  const { heirBreakdowns, taxResult } = scenario;
  const taxBreakdowns = taxResult.heirBreakdowns;
  const totalPremiumPaid = heirBreakdowns.reduce((s, b) => s + b.premiumPaid, 0);
  const totalBaseAcquisition = scenario.adjustedEstate + scenario.premiumDeduction - scenario.taxableInsurance;

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full bg-green-600`} />
        {scenario.label}
        <span className="text-sm font-normal text-gray-500">
          （税額合計: {formatCurrency(taxResult.totalFinalTax)}）
        </span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${headerBg} text-white`}>
              <th className={TH}>相続人</th>
              <th className={TH}>遺産取得額</th>
              <th className={TH}>保険料負担</th>
              <th className={TH}>受取保険金</th>
              <th className={TH}>納付税額</th>
              <th className={TH}>納税後</th>
            </tr>
          </thead>
          <tbody>
            {heirBreakdowns.map((heir, i) => {
              const taxEntry = taxBreakdowns[i];
              const baseAcq = getHeirBaseAcquisition(scenario, i);
              const netProceeds = getHeirNetProceeds(scenario, i);
              return (
                <tr key={heir.label} className="hover:bg-green-50">
                  <td className={`${TD} text-left font-medium`}>{heir.label}</td>
                  <td className={TD}>{formatCurrency(baseAcq)}</td>
                  <td className={TD}>{heir.premiumPaid > 0 ? `ー${formatCurrency(heir.premiumPaid)}` : '—'}</td>
                  <td className={TD}>{formatCurrency(heir.totalBenefit)}</td>
                  <td className={TD}>{taxEntry ? formatCurrency(taxEntry.finalTax) : '—'}</td>
                  <td className={`${TD} font-bold`}>{formatCurrency(netProceeds)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className={`${TD} text-left`}>合計</td>
              <td className={TD}>{formatCurrency(totalBaseAcquisition)}</td>
              <td className={TD}>{totalPremiumPaid > 0 ? `ー${formatCurrency(totalPremiumPaid)}` : '—'}</td>
              <td className={TD}>{formatCurrency(scenario.totalBenefit)}</td>
              <td className={TD}>{formatCurrency(taxResult.totalFinalTax)}</td>
              <td className={`${TD} font-bold`}>{formatCurrency(scenario.totalNetProceeds)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const InsuranceHeirTable: React.FC<InsuranceHeirTableProps> = ({ result }) => {
  const { current, proposed } = result;
  const heirCount = current.heirBreakdowns.length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別内訳</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ScenarioTable scenario={current} headerBg="bg-green-600" />
        <ScenarioTable scenario={proposed} headerBg="bg-green-600" />
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
