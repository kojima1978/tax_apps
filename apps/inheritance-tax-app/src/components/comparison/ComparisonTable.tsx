import React, { useState, memo, useMemo } from 'react';
import type { ComparisonRow } from '../../types';
import { formatCurrency } from '../../utils';
import { useColumnHover } from '../../hooks/useColumnHover';
import { ComparisonDetailPanel } from './ComparisonDetailPanel';
import { CARD, TH_WIDE, TD_WIDE } from '../tableStyles';

interface ComparisonTableProps {
  data: ComparisonRow[];
  spouseOwnEstate: number;
}

/** 印刷時に残す取得割合の刻み（画面は5%刻みのまま） */
const PRINT_RATIO_STEP = 10;

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

  const handleRowClick = (ratio: number) => {
    setSelectedRatio(prev => prev === ratio ? null : ratio);
  };

  return (
    <div className={CARD} role="region" aria-label="1次2次比較表">
      <h2 className="text-xl font-bold text-gray-800 mb-2 md:mb-4" id="comparison-heading">
        配偶者取得割合別 税額比較
      </h2>

      <div className="overflow-x-auto table-scroll-hint">
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
            // 印刷はA4横1枚に収めるため10%刻みに間引く（最適解の行は5%単位でも必ず残す）
            const printable = isOptimal || row.ratio % PRINT_RATIO_STEP === 0;
            return (
              <tr
                key={row.ratio}
                onClick={() => handleRowClick(row.ratio)}
                className={`group cursor-pointer transition-colors ${printable ? '' : 'no-print'} ${isSelected ? 'bg-green-200 ring-2 ring-inset ring-green-400' : 'hover:bg-green-50'} ${isOptimal && !isSelected ? 'bg-green-100 border-l-4 border-l-green-500 font-semibold' : ''}`}
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
      </div>

      {data.length > 0 && (
        <p className="mt-3 text-xs text-green-700">
          ★ 緑色の行が合計税額が最も低い取得割合です
          <span className="ml-3 text-gray-500 no-print">（行をクリックで相続人別内訳を表示）</span>
          <span className="ml-3 text-gray-500 print-only-inline">
            （{PRINT_RATIO_STEP}%刻みで抜粋しています）
          </span>
        </p>
      )}

      {selectedRow && (
        <div className="no-print">
          <ComparisonDetailPanel
            row={selectedRow}
            spouseOwnEstate={spouseOwnEstate}
            onClose={() => setSelectedRatio(null)}
          />
        </div>
      )}
    </div>
  );
});

ComparisonTable.displayName = 'ComparisonTable';
