import React, { useState, memo } from 'react';
import type { TaxCalculationResult } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { isHighlightRow } from '../constants';

interface TaxTableProps {
  data: TaxCalculationResult[];
  hasSpouse: boolean;
}

type SubColumn = {
  label: string;
  getValue: (row: TaxCalculationResult) => string;
};

const TH_CLASS = 'border border-gray-300 px-4 py-3 text-center font-semibold text-sm';
const TD_CLASS = 'border border-gray-300 px-5 py-2.5 text-right';

const SPOUSE_COLUMNS: SubColumn[] = [
  { label: '相続税額', getValue: r => formatCurrency(r.totalTax) },
  { label: '実効税率', getValue: r => formatPercent(r.effectiveTaxRate) },
  { label: '配偶者控除後', getValue: r => formatCurrency(r.taxAfterSpouseDeduction) },
];

const MAIN_COLUMNS_WITH_SPOUSE: SubColumn[] = [
  { label: '相続税額', getValue: r => formatCurrency(r.taxAfterSpouseDeduction) },
  { label: '実効税率', getValue: r => formatPercent(r.effectiveTaxRateAfterSpouse) },
];

const MAIN_COLUMNS_NO_SPOUSE: SubColumn[] = [
  { label: '相続税額', getValue: r => formatCurrency(r.totalTax) },
  { label: '実効税率', getValue: r => formatPercent(r.effectiveTaxRate) },
];

export const TaxTable: React.FC<TaxTableProps> = memo(({ data, hasSpouse }) => {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const headerHover = (col: number) => hoveredCol === col ? 'bg-green-700' : '';
  const cellHighlight = (col: number) => hoveredCol === col ? 'bg-green-100' : '';
  const hoverProps = (col: number) => ({
    onMouseEnter: () => setHoveredCol(col),
    onMouseLeave: () => setHoveredCol(null),
  });

  const spouseColumns = hasSpouse ? SPOUSE_COLUMNS : [];
  const mainColumns = hasSpouse ? MAIN_COLUMNS_WITH_SPOUSE : MAIN_COLUMNS_NO_SPOUSE;
  const allSubColumns = [...spouseColumns, ...mainColumns];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto" role="region" aria-label="相続税額一覧表">
      <h2 className="text-xl font-bold text-gray-800 mb-4" id="tax-table-heading">相続税額一覧表</h2>

      <table className="w-full border-collapse text-sm" aria-labelledby="tax-table-heading">
        <thead>
          <tr className="bg-green-600 text-white">
            <th
              scope="col"
              className={`border border-gray-300 px-4 py-3 text-center font-semibold ${headerHover(0)}`}
              rowSpan={2}
              {...hoverProps(0)}
            >
              相続財産
            </th>
            {hasSpouse && (
              <th scope="colgroup" className="border border-gray-300 px-4 py-2 text-center font-semibold bg-green-600" colSpan={spouseColumns.length}>
                1次相続（配偶者あり）
              </th>
            )}
            <th
              scope="colgroup"
              className={`border border-gray-300 px-4 py-2 text-center font-semibold ${hasSpouse ? 'bg-green-700' : 'bg-green-600'}`}
              colSpan={mainColumns.length}
            >
              {hasSpouse ? '2次相続（配偶者なし）' : '相続税額'}
            </th>
          </tr>
          <tr className="bg-green-600 text-white">
            {allSubColumns.map((col, i) => (
              <th key={i} scope="col" className={`${TH_CLASS} ${headerHover(i + 1)}`} {...hoverProps(i + 1)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.estateValue} className={`group ${isHighlightRow(row.estateValue) ? 'bg-yellow-50' : ''} hover:bg-green-50`}>
              <td className={`${TD_CLASS} font-medium ${cellHighlight(0)} group-hover:bg-green-100`}>
                {formatCurrency(row.estateValue)}
              </td>
              {allSubColumns.map((col, i) => (
                <td key={i} className={`${TD_CLASS} ${cellHighlight(i + 1)} group-hover:bg-green-100`}>
                  {col.getValue(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          相続人の構成を設定してください
        </div>
      )}
    </div>
  );
});

TaxTable.displayName = 'TaxTable';
