import React, { useState, memo, useMemo } from 'react';
import type { ComparisonRow } from '../../types';
import { formatCurrency } from '../../utils';
import { useColumnHover } from '../../hooks/useColumnHover';
import { ComparisonDetailPanel } from './ComparisonDetailPanel';
import { TH_WIDE, TD_WIDE } from '../tableStyles';

interface ComparisonTableProps {
  data: ComparisonRow[];
  spouseOwnEstate: number;
}

type Column = {
  label: string;
  group: 'common' | 'first' | 'second';
  getValue: (row: ComparisonRow) => string;
};

const COLUMNS: Column[] = [
  { label: '取得割合', group: 'common', getValue: r => `${r.ratio}%` },
  { label: '配偶者取得額', group: 'first', getValue: r => formatCurrency(r.spouseAcquisition) },
  { label: '1次税額', group: 'first', getValue: r => formatCurrency(r.firstTax) },
  { label: '2次遺産額', group: 'second', getValue: r => formatCurrency(r.secondEstate) },
  { label: '2次税額', group: 'second', getValue: r => formatCurrency(r.secondTax) },
  { label: '合計税額', group: 'common', getValue: r => formatCurrency(r.totalTax) },
];

export const ComparisonTable: React.FC<ComparisonTableProps> = memo(({ data, spouseOwnEstate }) => {
  const { headerHover, cellHighlight, hoverProps } = useColumnHover();
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);

  const minTotalTax = useMemo(() => {
    if (data.length === 0) return -1;
    return Math.min(...data.map(r => r.totalTax));
  }, [data]);

  const selectedRow = useMemo(() => {
    if (selectedRatio === null) return null;
    return data.find(r => r.ratio === selectedRatio) ?? null;
  }, [data, selectedRatio]);

  const optimalRow = useMemo(() => {
    if (minTotalTax < 0) return null;
    return data.find(r => r.totalTax === minTotalTax) ?? null;
  }, [data, minTotalTax]);

  const handleRowClick = (ratio: number) => {
    setSelectedRatio(prev => prev === ratio ? null : ratio);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto" role="region" aria-label="1次2次比較表">
      <h2 className="text-xl font-bold text-gray-800 mb-4" id="comparison-heading">
        配偶者取得割合別 税額比較
      </h2>

      <table className="w-full border-collapse text-sm" aria-labelledby="comparison-heading">
        <thead>
          <tr className="bg-green-600 text-white">
            <th scope="col" className={`${TH_WIDE} ${headerHover(0)}`} rowSpan={2} {...hoverProps(0)}>
              取得割合
            </th>
            <th scope="colgroup" className={`${TH_WIDE} bg-green-600`} colSpan={2}>
              1次相続
            </th>
            <th scope="colgroup" className={`${TH_WIDE} bg-green-700`} colSpan={2}>
              2次相続
            </th>
            <th scope="col" className={`${TH_WIDE} bg-green-800 ${headerHover(5)}`} rowSpan={2} {...hoverProps(5)}>
              合計税額
            </th>
          </tr>
          <tr className="bg-green-600 text-white">
            {COLUMNS.slice(1, 5).map((col, i) => (
              <th
                key={col.label}
                scope="col"
                className={`${TH_WIDE} ${col.group === 'second' ? 'bg-green-700' : ''} ${headerHover(i + 1)}`}
                {...hoverProps(i + 1)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isOptimal = row.totalTax === minTotalTax;
            const isSelected = row.ratio === selectedRatio;
            return (
              <tr
                key={row.ratio}
                onClick={() => handleRowClick(row.ratio)}
                className={`group cursor-pointer transition-colors ${isSelected ? 'bg-green-200 ring-2 ring-inset ring-green-400' : 'hover:bg-green-50'} ${isOptimal && !isSelected ? 'bg-green-100 border-l-4 border-l-green-500 font-semibold' : ''}`}
              >
                {COLUMNS.map((col, i) => (
                  <td
                    key={col.label}
                    className={`${TD_WIDE} ${i === 0 ? 'font-medium text-center' : ''} ${i === 5 && isOptimal ? 'text-green-800 font-bold' : ''} ${!isSelected ? cellHighlight(i) : ''} ${!isSelected ? 'group-hover:bg-green-100' : ''}`}
                  >
                    {i === 3 ? (
                      <div>
                        <div>{col.getValue(row)}</div>
                        <div className="text-[10px] text-gray-400 leading-tight">
                          固有 {formatCurrency(spouseOwnEstate)} + 取得 {formatCurrency(row.spouseAcquisition)}
                        </div>
                      </div>
                    ) : col.getValue(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.length > 0 && (
        <p className="mt-3 text-xs text-green-700">
          ★ 緑色の行が合計税額が最も低い取得割合です
          <span className="ml-3 text-gray-500">（行をクリックで相続人別内訳を表示）</span>
        </p>
      )}

      {selectedRow && (
        <ComparisonDetailPanel
          row={selectedRow}
          spouseOwnEstate={spouseOwnEstate}
          onClose={() => setSelectedRatio(null)}
        />
      )}

      {!selectedRow && optimalRow && (
        <div className="print-only-block">
          <ComparisonDetailPanel
            row={optimalRow}
            spouseOwnEstate={spouseOwnEstate}
            onClose={() => {}}
            optimalLabel
          />
        </div>
      )}
    </div>
  );
});

ComparisonTable.displayName = 'ComparisonTable';
