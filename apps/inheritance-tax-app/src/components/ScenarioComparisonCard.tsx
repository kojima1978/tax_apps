import React from 'react';
import { formatCurrency, formatDelta, formatDeltaArrow, formatSavingArrow, deltaColor } from '../utils';
import { TH, TD } from './tableStyles';

export type ComparisonRowDef<T> = {
  id: string;
  label: string;
  getCurrent: (r: T) => number;
  getProposed: (r: T) => number;
  highlight?: boolean;
  sectionEnd?: boolean;
  valuePrefix?: string;
  invertColor?: boolean;
};

export type HighlightItem = {
  label: string;
  value: number;
  format: 'saving' | 'gain' | 'ratio';
  footnote?: React.ReactNode;
};

interface ScenarioComparisonCardProps<T> {
  title: string;
  result: T;
  rows: ComparisonRowDef<T>[];
  topSlot?: React.ReactNode;
  highlights: HighlightItem[];
  bottomSlot?: React.ReactNode;
}

export function ScenarioComparisonCard<T>({
  title,
  result,
  rows,
  topSlot,
  highlights,
  bottomSlot,
}: ScenarioComparisonCardProps<T>) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>

      {topSlot && <div className="mb-6">{topSlot}</div>}

      {/* 比較テーブル */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}>項目</th>
              <th className={TH}>現状</th>
              <th className={TH}>提案</th>
              <th className={TH}>差額（Δ）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const currentVal = row.getCurrent(result);
              const proposedVal = row.getProposed(result);
              const diff = proposedVal - currentVal;
              const isTaxRow = row.invertColor ?? (row.label.includes('税') || row.label.includes('保険料'));
              const borderClass = row.sectionEnd ? 'border-b-2 border-b-gray-400' : '';
              const pfx = row.valuePrefix || '';
              const fmtVal = (v: number) => v > 0 && pfx ? `${pfx}${formatCurrency(v)}` : formatCurrency(v);
              return (
                <tr key={row.id} className={row.highlight ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                  <td className={`${TD} text-left font-medium ${borderClass}`}>{row.label}</td>
                  <td className={`${TD} ${borderClass}`}>{fmtVal(currentVal)}</td>
                  <td className={`${TD} ${borderClass}`}>{fmtVal(proposedVal)}</td>
                  <td className={`${TD} font-medium ${diff !== 0 ? deltaColor(diff, isTaxRow) : 'text-gray-400'} ${borderClass}`}>
                    {diff !== 0 ? (pfx ? `${pfx}${formatCurrency(Math.abs(diff))}` : formatDelta(diff)) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 結果ハイライト */}
      <div className={`grid grid-cols-1 gap-4 ${highlights.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {highlights.map(h => {
          const isRatio = h.format === 'ratio';
          const isPositive = isRatio ? h.value >= 100 : h.value > 0;
          const isNegative = h.format === 'gain' && h.value < 0;
          const formatted = isRatio
            ? (h.value >= 0 ? `${h.value}%` : '—')
            : h.format === 'saving' ? formatSavingArrow(h.value) : formatDeltaArrow(h.value);
          const bgClass = isRatio
            ? (isPositive ? 'bg-blue-50 border-2 border-blue-300' : 'bg-amber-50 border-2 border-amber-300')
            : (isPositive ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200');
          const textClass = isRatio
            ? (isPositive ? 'text-blue-700' : 'text-amber-700')
            : (isPositive ? 'text-green-700' : isNegative ? 'text-red-600' : 'text-gray-600');
          return (
            <div key={h.label} className={`rounded-lg p-4 text-center ${bgClass}`}>
              <p className="text-xs text-gray-500 mb-1">{h.label}</p>
              <p className={`text-xl font-bold ${textClass}`}>{formatted}</p>
              {h.footnote && (
                <p className="text-xs text-gray-500 mt-1">{h.footnote}</p>
              )}
            </div>
          );
        })}
      </div>

      {bottomSlot && <div className="mt-4">{bottomSlot}</div>}
    </div>
  );
}
