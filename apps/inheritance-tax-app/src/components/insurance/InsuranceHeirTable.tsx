import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, getHeirBaseAcquisition, getHeirNetProceeds } from '../../utils';

interface InsuranceHeirTableProps {
  result: InsuranceSimulationResult;
}

const TH_CLASS = 'border border-gray-300 px-3 py-2 text-center font-semibold text-sm';
const TD_CLASS = 'border border-gray-300 px-3 py-2 text-right text-sm';

const ScenarioTable: React.FC<{
  scenario: InsuranceScenarioResult;
  headerBg: string;
}> = ({ scenario, headerBg }) => {
  const { heirBreakdowns, taxResult } = scenario;
  const taxBreakdowns = taxResult.heirBreakdowns;
  const totalPremiumPaid = heirBreakdowns.reduce((s, b) => s + b.premiumPaid, 0);
  // 遺産取得額合計 = 元の遺産額（adjustedEstate + premiumDeduction - taxableInsurance）
  const totalBaseAcquisition = scenario.adjustedEstate + scenario.premiumDeduction - scenario.taxableInsurance;

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${headerBg === 'bg-gray-600' ? 'bg-gray-600' : 'bg-green-600'}`} />
        {scenario.label}
        <span className="text-sm font-normal text-gray-500">
          （税額合計: {formatCurrency(taxResult.totalFinalTax)}）
        </span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${headerBg} text-white`}>
              <th className={TH_CLASS}>相続人</th>
              <th className={TH_CLASS}>遺産取得額</th>
              <th className={TH_CLASS}>保険料負担</th>
              <th className={TH_CLASS}>受取保険金</th>
              <th className={TH_CLASS}>納付税額</th>
              <th className={TH_CLASS}>手取り</th>
            </tr>
          </thead>
          <tbody>
            {heirBreakdowns.map((heir, i) => {
              const taxEntry = taxBreakdowns[i];
              const baseAcq = getHeirBaseAcquisition(scenario, i);
              const netProceeds = getHeirNetProceeds(scenario, i);
              return (
                <tr key={heir.label} className="hover:bg-green-50">
                  <td className={`${TD_CLASS} text-left font-medium`}>{heir.label}</td>
                  <td className={TD_CLASS}>{formatCurrency(baseAcq)}</td>
                  <td className={TD_CLASS}>{heir.premiumPaid > 0 ? formatCurrency(heir.premiumPaid) : '—'}</td>
                  <td className={TD_CLASS}>{formatCurrency(heir.totalBenefit)}</td>
                  <td className={TD_CLASS}>{taxEntry ? formatCurrency(taxEntry.finalTax) : '—'}</td>
                  <td className={`${TD_CLASS} font-bold`}>{formatCurrency(netProceeds)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className={`${TD_CLASS} text-left`}>合計</td>
              <td className={TD_CLASS}>{formatCurrency(totalBaseAcquisition)}</td>
              <td className={TD_CLASS}>{totalPremiumPaid > 0 ? formatCurrency(totalPremiumPaid) : '—'}</td>
              <td className={TD_CLASS}>{formatCurrency(scenario.totalBenefit)}</td>
              <td className={TD_CLASS}>{formatCurrency(taxResult.totalFinalTax)}</td>
              <td className={`${TD_CLASS} font-bold`}>{formatCurrency(scenario.totalNetProceeds)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

/** 相続人別 現状 vs 提案 比較テーブル */
const ComparisonTable: React.FC<{ result: InsuranceSimulationResult }> = ({ result }) => {
  const { current, proposed } = result;
  const heirCount = current.heirBreakdowns.length;

  return (
    <div>
      <h4 className="text-base font-bold text-gray-700 mb-2">相続人別 手取り比較</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className={TH_CLASS}>相続人</th>
              <th className={`${TH_CLASS} bg-gray-600`}>現状 手取り</th>
              <th className={`${TH_CLASS} bg-green-600`}>提案 手取り</th>
              <th className={`${TH_CLASS} bg-green-800`}>差額（Δ）</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: heirCount }, (_, i) => {
              const label = current.heirBreakdowns[i]?.label || '';
              const currentNet = getHeirNetProceeds(current, i);
              const proposedNet = getHeirNetProceeds(proposed, i);
              const diff = proposedNet - currentNet;
              return (
                <tr key={label} className="hover:bg-green-50">
                  <td className={`${TD_CLASS} text-left font-medium`}>{label}</td>
                  <td className={TD_CLASS}>{formatCurrency(currentNet)}</td>
                  <td className={TD_CLASS}>{formatCurrency(proposedNet)}</td>
                  <td className={`${TD_CLASS} font-medium ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? `−${formatCurrency(Math.abs(diff))}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 font-semibold">
              <td className={`${TD_CLASS} text-left`}>合計</td>
              <td className={TD_CLASS}>{formatCurrency(current.totalNetProceeds)}</td>
              <td className={TD_CLASS}>{formatCurrency(proposed.totalNetProceeds)}</td>
              {(() => {
                const diff = result.netProceedsDiff;
                return (
                  <td className={`${TD_CLASS} font-bold ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? `−${formatCurrency(Math.abs(diff))}` : '—'}
                  </td>
                );
              })()}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export const InsuranceHeirTable: React.FC<InsuranceHeirTableProps> = ({ result }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別内訳</h3>

      {/* シナリオ別テーブル */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ScenarioTable scenario={result.current} headerBg="bg-gray-600" />
        <ScenarioTable scenario={result.proposed} headerBg="bg-green-600" />
      </div>

      {/* 手取り比較テーブル */}
      <ComparisonTable result={result} />
    </div>
  );
};
