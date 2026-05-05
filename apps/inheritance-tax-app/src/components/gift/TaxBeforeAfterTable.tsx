import React from 'react';
import type { CashGiftSimulationResult } from '../../types';
import { formatCurrency, formatDelta } from '../../utils';
import { CARD, TH, TD } from '../tableStyles';

interface Props {
  result: CashGiftSimulationResult;
}

export const TaxBeforeAfterTable: React.FC<Props> = ({ result }) => {
  const { current, proposed, totalGiftTax } = result;
  const currentInheritanceTax = current.taxResult.totalFinalTax;
  const proposedInheritanceTax = proposed.taxResult.totalFinalTax;
  const proposedTotalTax = proposedInheritanceTax + totalGiftTax;

  const cols = [
    { label: '相続税', current: currentInheritanceTax, proposed: proposedInheritanceTax },
    { label: '贈与税', current: 0, proposed: totalGiftTax },
    { label: '合計', current: currentInheritanceTax, proposed: proposedTotalTax, bold: true },
  ];

  const dataRows: { label: string; bold?: boolean; getValue: (col: typeof cols[number]) => React.ReactNode }[] = [
    { label: '対策前', getValue: col => col.current > 0 ? formatCurrency(col.current) : '—' },
    { label: '対策後', getValue: col => col.proposed > 0 ? formatCurrency(col.proposed) : '—' },
    {
      label: '差額（Δ）',
      getValue: col => {
        const diff = col.proposed - col.current;
        return (
          <span className={diff < 0 ? 'text-green-700' : diff > 0 ? 'text-red-600' : 'text-gray-400'}>
            {diff !== 0 ? formatDelta(diff) : '—'}
          </span>
        );
      },
    },
  ];

  return (
    <div className={CARD}>
      <h3 className="text-lg font-bold text-gray-800 mb-4">対策前後の税金（相続税・贈与税）の比較</h3>
      <div className="overflow-x-auto table-scroll-hint">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}></th>
              {cols.map(col => (
                <th key={col.label} className={`${TH}${col.bold ? ' font-bold' : ''}`}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map(row => (
              <tr key={row.label} className="hover:bg-green-50">
                <td className={`${TD} text-left font-medium`}>{row.label}</td>
                {cols.map(col => (
                  <td key={col.label} className={`${TD}${col.bold ? ' font-semibold' : ''}`}>
                    {row.getValue(col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
