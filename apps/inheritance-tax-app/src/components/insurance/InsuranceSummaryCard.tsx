import React from 'react';
import type { InsuranceSimulationResult, InsuranceScenarioResult } from '../../types';
import { formatCurrency, formatDelta, deltaColor } from '../../utils';

interface InsuranceSummaryCardProps {
  result: InsuranceSimulationResult;
}

const TH_CLASS = 'border border-gray-300 px-3 py-2 text-center font-semibold text-sm';
const TD_CLASS = 'border border-gray-300 px-3 py-2 text-right text-sm';

type ComparisonRow = {
  label: string;
  getCurrent: (r: InsuranceSimulationResult) => number;
  getProposed: (r: InsuranceSimulationResult) => number;
  highlight?: boolean;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: '元の遺産額', getCurrent: r => r.baseEstate, getProposed: r => r.baseEstate },
  { label: '新規保険料支出', getCurrent: () => 0, getProposed: r => r.newPremiumTotal },
  { label: '受取保険金（全額）', getCurrent: r => r.current.totalBenefit, getProposed: r => r.proposed.totalBenefit },
  { label: '非課税額', getCurrent: r => r.current.nonTaxableAmount, getProposed: r => r.proposed.nonTaxableAmount },
  { label: '課税対象保険金', getCurrent: r => r.current.taxableInsurance, getProposed: r => r.proposed.taxableInsurance },
  { label: '課税遺産額（税計算用）', getCurrent: r => r.current.adjustedEstate, getProposed: r => r.proposed.adjustedEstate },
  { label: '相続税額', getCurrent: r => r.current.taxResult.totalFinalTax, getProposed: r => r.proposed.taxResult.totalFinalTax },
  { label: '手取り合計', getCurrent: r => r.current.totalNetProceeds, getProposed: r => r.proposed.totalNetProceeds, highlight: true },
];

export const InsuranceSummaryCard: React.FC<InsuranceSummaryCardProps> = ({ result }) => {
  const { current, taxSaving, netProceedsDiff, newPremiumTotal } = result;
  const hasGain = netProceedsDiff > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-2">シミュレーション結果</h3>

      {/* 非課税限度額 */}
      <div className="bg-green-50 rounded-lg px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-green-700 font-medium">死亡保険金の非課税限度額</span>
          <span className="text-lg font-bold text-green-800">{formatCurrency(current.nonTaxableLimit)}</span>
        </div>
      </div>

      {/* 比較テーブル */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH_CLASS}>項目</th>
              <th className={`${TH_CLASS} bg-gray-600`}>現状</th>
              <th className={`${TH_CLASS} bg-green-600`}>提案</th>
              <th className={`${TH_CLASS} bg-green-800`}>差額（Δ）</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map(row => {
              const currentVal = row.getCurrent(result);
              const proposedVal = row.getProposed(result);
              const diff = proposedVal - currentVal;
              // 相続税は「減った方が良い」ので色を反転
              const isTaxRow = row.label === '相続税額' || row.label === '新規保険料支出';
              return (
                <tr key={row.label} className={row.highlight ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                  <td className={`${TD_CLASS} text-left font-medium`}>{row.label}</td>
                  <td className={TD_CLASS}>{formatCurrency(currentVal)}</td>
                  <td className={TD_CLASS}>{formatCurrency(proposedVal)}</td>
                  <td className={`${TD_CLASS} font-medium ${diff !== 0 ? deltaColor(diff, isTaxRow) : 'text-gray-400'}`}>
                    {diff !== 0 ? formatDelta(diff) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 結果ハイライト */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 節税効果 */}
        <div className={`rounded-lg p-4 text-center ${taxSaving > 0 ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">節税効果</p>
          <p className={`text-xl font-bold ${taxSaving > 0 ? 'text-green-700' : 'text-gray-600'}`}>
            {taxSaving > 0 ? `▼ ${formatCurrency(taxSaving)}` : taxSaving < 0 ? `▲ ${formatCurrency(Math.abs(taxSaving))}` : '±0'}
          </p>
        </div>

        {/* 手取り増減 */}
        <div className={`rounded-lg p-4 text-center ${hasGain ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">手取り増減</p>
          <p className={`text-xl font-bold ${hasGain ? 'text-green-700' : netProceedsDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {netProceedsDiff > 0 ? `▲ ${formatCurrency(netProceedsDiff)}` : netProceedsDiff < 0 ? `▼ ${formatCurrency(Math.abs(netProceedsDiff))}` : '±0'}
          </p>
          {newPremiumTotal > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              保険料 {formatCurrency(newPremiumTotal)} → 節税 {formatCurrency(taxSaving)}
              {netProceedsDiff !== taxSaving && ` / 手取り増 ${formatDelta(netProceedsDiff)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
