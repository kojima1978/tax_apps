import React, { useState, memo } from 'react';
import type { TaxCalculationResult } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { isHighlightRow } from '../constants';

interface TaxTableProps {
  data: TaxCalculationResult[];
  hasSpouse: boolean;
}

export const TaxTable: React.FC<TaxTableProps> = memo(({ data, hasSpouse }) => {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const headerHover = (col: number) => hoveredCol === col ? 'bg-green-700' : '';
  const cellHighlight = (col: number) => hoveredCol === col ? 'bg-green-100' : '';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto" role="region" aria-label="相続税額一覧表">
      <h2 className="text-xl font-bold text-gray-800 mb-4" id="tax-table-heading">相続税額一覧表</h2>

      <table className="w-full border-collapse text-sm" aria-labelledby="tax-table-heading">
        <thead>
          {/* メインヘッダー */}
          <tr className="bg-green-600 text-white">
            <th
              scope="col"
              className={`border border-gray-300 px-4 py-3 text-center font-semibold ${headerHover(0)}`}
              rowSpan={2}
              onMouseEnter={() => setHoveredCol(0)}
              onMouseLeave={() => setHoveredCol(null)}
            >
              相続財産
            </th>
            {hasSpouse && (
              <th
                scope="colgroup"
                className="border border-gray-300 px-4 py-2 text-center font-semibold bg-green-600"
                colSpan={3}
              >
                1次相続（配偶者あり）
              </th>
            )}
            <th
              scope="colgroup"
              className={`border border-gray-300 px-4 py-2 text-center font-semibold ${hasSpouse ? 'bg-green-700' : 'bg-green-600'}`}
              colSpan={2}
            >
              {hasSpouse ? '2次相続（配偶者なし）' : '相続税額'}
            </th>
          </tr>
          {/* サブヘッダー */}
          <tr className="bg-green-600 text-white">
            {hasSpouse && (
              <>
                <th
                  scope="col"
                  className={`border border-gray-300 px-4 py-3 text-center font-semibold text-xs ${headerHover(1)}`}
                  onMouseEnter={() => setHoveredCol(1)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  相続税額
                </th>
                <th
                  scope="col"
                  className={`border border-gray-300 px-4 py-3 text-center font-semibold text-xs ${headerHover(2)}`}
                  onMouseEnter={() => setHoveredCol(2)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  実効税率
                </th>
                <th
                  scope="col"
                  className={`border border-gray-300 px-4 py-3 text-center font-semibold text-xs ${headerHover(3)}`}
                  onMouseEnter={() => setHoveredCol(3)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  配偶者控除後
                </th>
              </>
            )}
            <th
              scope="col"
              className={`border border-gray-300 px-4 py-3 text-center font-semibold text-xs ${headerHover(hasSpouse ? 4 : 1)}`}
              onMouseEnter={() => setHoveredCol(hasSpouse ? 4 : 1)}
              onMouseLeave={() => setHoveredCol(null)}
            >
              相続税額
            </th>
            <th
              scope="col"
              className={`border border-gray-300 px-4 py-3 text-center font-semibold text-xs ${headerHover(hasSpouse ? 5 : 2)}`}
              onMouseEnter={() => setHoveredCol(hasSpouse ? 5 : 2)}
              onMouseLeave={() => setHoveredCol(null)}
            >
              実効税率
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isHighlight = isHighlightRow(row.estateValue);

            return (
              <tr
                key={row.estateValue}
                className={`group ${isHighlight ? 'bg-yellow-50' : ''} hover:bg-green-50`}
              >
                <td className={`border border-gray-300 px-4 py-2 text-right font-medium ${cellHighlight(0)} group-hover:bg-green-100`}>
                  {formatCurrency(row.estateValue)}
                </td>
                {hasSpouse && (
                  <>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${cellHighlight(1)} group-hover:bg-green-100`}>
                      {formatCurrency(row.totalTax)}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${cellHighlight(2)} group-hover:bg-green-100`}>
                      {formatPercent(row.effectiveTaxRate)}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${cellHighlight(3)} group-hover:bg-green-100`}>
                      {formatCurrency(row.taxAfterSpouseDeduction)}
                    </td>
                  </>
                )}
                <td className={`border border-gray-300 px-4 py-2 text-right ${cellHighlight(hasSpouse ? 4 : 1)} group-hover:bg-green-100`}>
                  {formatCurrency(
                    hasSpouse ? row.taxAfterSpouseDeduction : row.totalTax
                  )}
                </td>
                <td className={`border border-gray-300 px-4 py-2 text-right ${cellHighlight(hasSpouse ? 5 : 2)} group-hover:bg-green-100`}>
                  {formatPercent(
                    hasSpouse
                      ? row.effectiveTaxRateAfterSpouse
                      : row.effectiveTaxRate
                  )}
                </td>
              </tr>
            );
          })}
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
