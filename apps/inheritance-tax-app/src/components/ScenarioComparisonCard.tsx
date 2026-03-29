import React from 'react';
import { formatCurrency, formatDelta, formatDeltaArrow, formatSavingArrow, deltaColor } from '../utils';
import { CARD, TH, TD } from './tableStyles';

export type ComparisonRowDef<T> = {
  id: string;
  label: string;
  getCurrent: (r: T) => number;
  getProposed: (r: T) => number;
  highlight?: boolean;
  sectionEnd?: boolean;
  sectionHeader?: string;
  sectionDescription?: string;
  valuePrefix?: string;
  rowSign?: string;
};

export type WaterfallStep = {
  label: string;
  value: number;
  separator?: 'single' | 'double';
  isSummary?: boolean;
};

export type HighlightItem = {
  label: string;
  value: number;
  format: 'saving' | 'gain' | 'ratio';
  description?: string;
  valueSuffix?: React.ReactNode;
  footnote?: React.ReactNode;
  breakdown?: WaterfallStep[];
};

interface ScenarioComparisonCardProps<T> {
  title: string;
  result: T;
  rows: ComparisonRowDef<T>[];
  topSlot?: React.ReactNode;
  highlights: HighlightItem[];
  bottomSlot?: React.ReactNode;
}

function getHighlightStyle(h: HighlightItem) {
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
  return { formatted, bgClass, textClass };
}

const GRID_COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

function gridColsClass(count: number): string {
  return GRID_COLS[Math.min(count, 4)] || GRID_COLS[2];
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
    <div className={CARD}>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>

      {topSlot && <div className="mb-6">{topSlot}</div>}

      {/* 結果ハイライト */}
      <div className={`grid grid-cols-1 gap-4 ${gridColsClass(highlights.length)}`}>
        {highlights.map(h => {
          const { formatted, bgClass, textClass } = getHighlightStyle(h);

          if (h.breakdown) {
            return (
              <div key={h.label} className={`rounded-lg p-4 ${bgClass}`}>
                <p className="text-xs text-gray-500 mb-1 text-center">{h.label}</p>
                {h.description && (
                  <p className="text-[10px] text-gray-400 mb-2 text-center">{h.description}</p>
                )}
                <div className="space-y-0.5 max-w-xs mx-auto">
                  {h.breakdown.map((step, i) => (
                    <React.Fragment key={i}>
                      {step.separator === 'single' && (
                        <div className="border-t border-gray-300 my-1" />
                      )}
                      {step.separator === 'double' && (
                        <div className="border-t-2 border-double border-gray-400 my-1" />
                      )}
                      <div className={`flex justify-between text-sm ${step.isSummary ? 'font-bold' : ''}`}>
                        <span className={step.isSummary ? textClass : 'text-gray-600'}>{step.label}</span>
                        <span className={step.isSummary ? textClass : 'text-gray-700'}>
                          {formatDelta(step.value)}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                {h.footnote && (
                  <p className="text-[10px] text-gray-500 mt-2 text-center">{h.footnote}</p>
                )}
              </div>
            );
          }

          return (
            <div key={h.label} className={`rounded-lg p-4 text-center ${bgClass}`}>
              <p className="text-xs text-gray-500 mb-1">{h.label}</p>
              {h.description && (
                <p className="text-[10px] text-gray-400 mb-1">{h.description}</p>
              )}
              <p className={`text-xl font-bold ${textClass}`}>
                {formatted}
                {h.valueSuffix && <span className="text-sm">{h.valueSuffix}</span>}
              </p>
              {h.footnote && (
                <p className="text-[10px] text-gray-500 mt-1 md:whitespace-nowrap">{h.footnote}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 比較テーブル */}
      <div className="overflow-x-auto table-scroll-hint mt-6">
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
              const borderClass = row.sectionEnd ? 'border-b-2 border-b-gray-400' : '';
              const pfx = row.valuePrefix || '';
              const fmtVal = (v: number) => v > 0 && pfx ? `${pfx}${formatCurrency(v)}` : formatCurrency(v);
              return (
                <React.Fragment key={row.id}>
                  {row.sectionHeader && (
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="px-3 py-1.5 text-xs font-bold text-gray-600 tracking-wide">
                        {row.sectionHeader}
                        {row.sectionDescription && (
                          <span className="ml-2 font-normal text-gray-400">{row.sectionDescription}</span>
                        )}
                      </td>
                    </tr>
                  )}
                  <tr className={row.highlight ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className={`${TD} text-left font-medium ${borderClass}`}>
                      {row.rowSign && <span className="text-gray-400 mr-1">{row.rowSign}</span>}
                      {row.label}
                    </td>
                    <td className={`${TD} ${borderClass}`}>{fmtVal(currentVal)}</td>
                    <td className={`${TD} ${borderClass}`}>{fmtVal(proposedVal)}</td>
                    <td className={`${TD} font-medium ${diff !== 0 ? deltaColor(diff) : 'text-gray-400'} ${borderClass}`}>
                      {diff !== 0 ? formatDelta(diff) : '—'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {bottomSlot && <div className="mt-4">{bottomSlot}</div>}
    </div>
  );
}
