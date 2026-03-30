import React, { useState, memo, useMemo } from 'react';
import type { TimelineSimulationResult, TimelineRow } from '../../types';
import { formatCurrency } from '../../utils';
import { ComparisonDetailPanel } from '../comparison/ComparisonDetailPanel';
import { CARD, TH_WIDE, TD_WIDE } from '../tableStyles';

interface TimelineTableProps {
  result: TimelineSimulationResult;
  spouseOwnEstate: number;
}

// 年数ごとのヘッダー色（区別しやすくする）
const YEAR_HEADER_COLORS = [
  'bg-green-600',
  'bg-green-700',
  'bg-emerald-600',
  'bg-emerald-700',
  'bg-teal-600',
  'bg-teal-700',
] as const;

function getYearColor(idx: number): string {
  return YEAR_HEADER_COLORS[idx % YEAR_HEADER_COLORS.length];
}

function getRowClassName(isSelected: boolean, isOptimalAny: boolean): string {
  if (isSelected) return 'bg-green-200 ring-2 ring-inset ring-green-400';
  if (isOptimalAny) return 'bg-green-50 hover:bg-green-100';
  return 'hover:bg-green-50';
}

export const TimelineTable: React.FC<TimelineTableProps> = memo(({ result, spouseOwnEstate }) => {
  const { rows, summaries, selectedYears } = result;
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(0);

  // 各年数での最小合計税額
  const minTotalTaxByYear = useMemo(() =>
    selectedYears.map((_, yi) => Math.min(...rows.map(r => r.yearColumns[yi].totalTax))),
    [rows, selectedYears],
  );

  const selectedRow = useMemo(() => {
    if (selectedRatio === null) return null;
    return rows.find(r => r.ratio === selectedRatio) ?? null;
  }, [rows, selectedRatio]);

  // 選択した行+年数のComparisonRow互換データ
  const detailRow = useMemo(() => {
    if (!selectedRow) return null;
    const col = selectedRow.yearColumns[selectedYearIdx];
    return {
      ratio: selectedRow.ratio,
      spouseAcquisition: selectedRow.spouseAcquisition,
      firstTax: selectedRow.firstTax,
      secondEstate: col.secondEstate,
      secondTax: col.secondTax,
      totalTax: col.totalTax,
      firstBreakdowns: selectedRow.firstBreakdowns,
      secondBreakdowns: col.secondBreakdowns,
    };
  }, [selectedRow, selectedYearIdx]);

  const handleRowClick = (ratio: number) => {
    setSelectedRatio(prev => prev === ratio ? null : ratio);
  };

  return (
    <div className={CARD} role="region" aria-label="タイムライン比較表">
      <h2 className="text-xl font-bold text-gray-800 mb-2 md:mb-4" id="timeline-heading">
        経過年数別 配偶者取得割合×税額比較
      </h2>

      {/* 年数タブ（詳細表示用） */}
      {selectedRatio !== null && (
        <div className="flex gap-1 mb-3 no-print">
          {selectedYears.map((year, idx) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYearIdx(idx)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                idx === selectedYearIdx
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {year}年後
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto table-scroll-hint">
        <table className="w-full border-collapse text-sm" aria-labelledby="timeline-heading">
          <thead>
            {/* 1段目: グループヘッダー */}
            <tr className="bg-green-600 text-white">
              <th scope="col" className={`${TH_WIDE} bg-green-800`} rowSpan={2}>
                取得割合
              </th>
              <th scope="col" className={`${TH_WIDE} bg-green-800`} rowSpan={2}>
                配偶者取得額
              </th>
              <th scope="col" className={`${TH_WIDE} bg-green-800`} rowSpan={2}>
                1次税額
              </th>
              {selectedYears.map((year, idx) => (
                <th
                  key={year}
                  scope="colgroup"
                  className={`${TH_WIDE} ${getYearColor(idx)}`}
                  colSpan={3}
                >
                  {year}年後
                </th>
              ))}
            </tr>
            {/* 2段目: サブヘッダー */}
            <tr className="text-white">
              {selectedYears.map((year, idx) => (
                <React.Fragment key={year}>
                  <th scope="col" className={`${TH_WIDE} ${getYearColor(idx)}`}>2次遺産額</th>
                  <th scope="col" className={`${TH_WIDE} ${getYearColor(idx)}`}>2次税額</th>
                  <th scope="col" className={`${TH_WIDE} ${getYearColor(idx)}`}>合計税額</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isSelected = row.ratio === selectedRatio;
              // この行がいずれかの年数で最適解か
              const isOptimalAny = row.yearColumns.some(
                (col, yi) => col.totalTax === minTotalTaxByYear[yi],
              );

              return (
                <tr
                  key={row.ratio}
                  onClick={() => handleRowClick(row.ratio)}
                  className={`group cursor-pointer transition-colors ${getRowClassName(isSelected, isOptimalAny)}`}
                >
                  <td className={`${TD_WIDE} font-medium text-center`}>{row.ratio}%</td>
                  <td className={TD_WIDE}>{formatCurrency(row.spouseAcquisition)}</td>
                  <td className={TD_WIDE}>{formatCurrency(row.firstTax)}</td>
                  {row.yearColumns.map((col, yi) => {
                    const isOptimal = col.totalTax === minTotalTaxByYear[yi];
                    return (
                      <React.Fragment key={col.years}>
                        <td className={TD_WIDE}>{formatCurrency(col.secondEstate)}</td>
                        <td className={TD_WIDE}>{formatCurrency(col.secondTax)}</td>
                        <td className={`${TD_WIDE} ${isOptimal ? 'text-green-800 font-bold bg-green-100' : ''}`}>
                          {formatCurrency(col.totalTax)}
                          {isOptimal && <span className="ml-1 text-[10px]">★</span>}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {summaries.map((s, idx) => (
            <span key={s.years} className="text-green-700">
              ★ {s.years}年後の最適: {s.optimalRatio}%（{formatCurrency(s.optimalTotalTax)}）
            </span>
          ))}
          <span className="text-gray-500">行クリックで相続人別内訳を表示</span>
        </div>
      )}

      {detailRow && (
        <ComparisonDetailPanel
          row={detailRow}
          spouseOwnEstate={spouseOwnEstate}
          onClose={() => setSelectedRatio(null)}
        />
      )}
    </div>
  );
});

TimelineTable.displayName = 'TimelineTable';
