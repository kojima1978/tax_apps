import React from 'react';
import type { HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatFraction } from '../../utils';
import { CARD } from '../tableStyles';

interface HeirBreakdownTableProps {
  breakdowns: HeirTaxBreakdown[];
  totalFinalTax: number;
}

const TH = 'px-3 py-2';

const COLUMNS = [
  { label: '相続人', align: 'text-left', render: (b: HeirTaxBreakdown) => <span className="font-medium">{b.label}</span> },
  { label: '法定相続分', align: 'text-right', render: (b: HeirTaxBreakdown) => formatFraction(b.legalShareRatio) },
  { label: '取得額', align: 'text-right', render: (b: HeirTaxBreakdown) => formatCurrency(b.acquisitionAmount) },
  { label: '按分税額', align: 'text-right', render: (b: HeirTaxBreakdown) => formatCurrency(b.proportionalTax) },
  {
    label: '加算/控除', align: 'text-right', render: (b: HeirTaxBreakdown) => {
      const adjustment = b.surchargeAmount - b.spouseDeduction;
      return (
        <>
          {b.spouseDeduction > 0 && <span className="text-green-600">-{formatCurrency(b.spouseDeduction)}</span>}
          {b.surchargeAmount > 0 && <span className="text-orange-600">+{formatCurrency(b.surchargeAmount)}</span>}
          {adjustment === 0 && '—'}
        </>
      );
    },
  },
  { label: '納付税額', align: 'text-right', render: (b: HeirTaxBreakdown) => <span className="font-bold">{formatCurrency(b.finalTax)}</span> },
] as const;

export const HeirBreakdownTable: React.FC<HeirBreakdownTableProps> = ({
  breakdowns,
  totalFinalTax,
}) => {
  if (breakdowns.length === 0) return null;

  return (
    <div className={`${CARD} heir-breakdown-card`}>
      <h3 className="text-lg font-bold text-gray-800 mb-4">相続人別 税額内訳</h3>

      <div className="overflow-x-auto table-scroll-hint">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-700 text-white">
              {COLUMNS.map(({ label, align }) => (
                <th key={label} className={`${TH} ${align}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((b) => (
              <tr key={b.label} className="border-b border-gray-200 hover:bg-gray-50">
                {COLUMNS.map(({ label, align, render }) => (
                  <td key={label} className={`${TH} ${align}`}>{render(b)}</td>
                ))}
              </tr>
            ))}
            <tr className="bg-green-50 font-bold">
              <td className={TH}>合計</td>
              <td className={TH} colSpan={4} />
              <td className={`${TH} text-right text-green-800`}>{formatCurrency(totalFinalTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
