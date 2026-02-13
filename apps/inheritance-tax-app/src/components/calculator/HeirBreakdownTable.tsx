import React from 'react';
import type { HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatPercent } from '../../utils';

interface HeirBreakdownTableProps {
  breakdowns: HeirTaxBreakdown[];
  totalFinalTax: number;
}

export const HeirBreakdownTable: React.FC<HeirBreakdownTableProps> = ({
  breakdowns,
  totalFinalTax,
}) => {
  if (breakdowns.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別 税額内訳</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="px-3 py-2 text-left">相続人</th>
              <th className="px-3 py-2 text-right">法定相続分</th>
              <th className="px-3 py-2 text-right">取得額</th>
              <th className="px-3 py-2 text-right">按分税額</th>
              <th className="px-3 py-2 text-right">加算/控除</th>
              <th className="px-3 py-2 text-right">納付税額</th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((b) => {
              const adjustment = b.surchargeAmount - b.spouseDeduction;
              return (
                <tr key={b.label} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{b.label}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(b.legalShareRatio * 100, 1)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(b.acquisitionAmount)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(b.proportionalTax)}</td>
                  <td className="px-3 py-2 text-right">
                    {b.spouseDeduction > 0 && (
                      <span className="text-green-600">-{formatCurrency(b.spouseDeduction)}</span>
                    )}
                    {b.surchargeAmount > 0 && (
                      <span className="text-orange-600">+{formatCurrency(b.surchargeAmount)}</span>
                    )}
                    {adjustment === 0 && '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency(b.finalTax)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 font-bold">
              <td className="px-3 py-2">合計</td>
              <td className="px-3 py-2" colSpan={4} />
              <td className="px-3 py-2 text-right text-green-800">{formatCurrency(totalFinalTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
