import React, { useState } from 'react';
import type { TaxCalculationResult } from '../types';

interface TaxTableProps {
  data: TaxCalculationResult[];
  hasSpouse: boolean;
}

export const TaxTable: React.FC<TaxTableProps> = ({ data, hasSpouse }) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // 金額を「X億Y万円」形式にフォーマット
  const formatCurrency = (value: number): string => {
    const oku = Math.floor(value / 10000);
    const man = value % 10000;

    if (oku > 0 && man > 0) {
      return `${oku}億${man.toLocaleString()}万円`;
    } else if (oku > 0) {
      return `${oku}億円`;
    } else {
      return `${man.toLocaleString()}万円`;
    }
  };

  // パーセント表示
  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  // 1億円単位の行をハイライト
  const isHighlightRow = (estateValue: number): boolean => {
    return estateValue % 10000 === 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">相続税額一覧表</h2>

      <table className="w-full border-collapse text-sm">
        <thead>
          {/* メインヘッダー */}
          <tr className="bg-green-600 text-white">
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold"
              rowSpan={2}
              onMouseEnter={() => setHoveredCol(0)}
              onMouseLeave={() => setHoveredCol(null)}
              style={{
                backgroundColor: hoveredCol === 0 ? '#15803d' : undefined,
              }}
            >
              相続財産
            </th>
            {hasSpouse && (
              <th
                className="border border-gray-300 px-4 py-2 text-center font-semibold"
                colSpan={3}
                style={{
                  backgroundColor: '#16a34a',
                }}
              >
                1次相続（配偶者あり）
              </th>
            )}
            <th
              className="border border-gray-300 px-4 py-2 text-center font-semibold"
              colSpan={2}
              style={{
                backgroundColor: hasSpouse ? '#15803d' : '#16a34a',
              }}
            >
              {hasSpouse ? '2次相続（配偶者なし）' : '相続税額'}
            </th>
          </tr>
          {/* サブヘッダー */}
          <tr className="bg-green-600 text-white">
            {hasSpouse && (
              <>
                <th
                  className="border border-gray-300 px-4 py-3 text-center font-semibold text-xs"
                  onMouseEnter={() => setHoveredCol(1)}
                  onMouseLeave={() => setHoveredCol(null)}
                  style={{
                    backgroundColor: hoveredCol === 1 ? '#15803d' : undefined,
                  }}
                >
                  相続税額
                </th>
                <th
                  className="border border-gray-300 px-4 py-3 text-center font-semibold text-xs"
                  onMouseEnter={() => setHoveredCol(2)}
                  onMouseLeave={() => setHoveredCol(null)}
                  style={{
                    backgroundColor: hoveredCol === 2 ? '#15803d' : undefined,
                  }}
                >
                  実効税率
                </th>
                <th
                  className="border border-gray-300 px-4 py-3 text-center font-semibold text-xs"
                  onMouseEnter={() => setHoveredCol(3)}
                  onMouseLeave={() => setHoveredCol(null)}
                  style={{
                    backgroundColor: hoveredCol === 3 ? '#15803d' : undefined,
                  }}
                >
                  配偶者控除後
                </th>
              </>
            )}
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold text-xs"
              onMouseEnter={() => setHoveredCol(hasSpouse ? 4 : 1)}
              onMouseLeave={() => setHoveredCol(null)}
              style={{
                backgroundColor: hoveredCol === (hasSpouse ? 4 : 1) ? '#15803d' : undefined,
              }}
            >
              相続税額
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold text-xs"
              onMouseEnter={() => setHoveredCol(hasSpouse ? 5 : 2)}
              onMouseLeave={() => setHoveredCol(null)}
              style={{
                backgroundColor: hoveredCol === (hasSpouse ? 5 : 2) ? '#15803d' : undefined,
              }}
            >
              実効税率
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const isHighlight = isHighlightRow(row.estateValue);
            const isHovered = hoveredRow === rowIndex;

            return (
              <tr
                key={rowIndex}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`${
                  isHighlight ? 'bg-yellow-50' : 'hover:bg-gray-50'
                } ${isHovered ? 'bg-green-50' : ''}`}
              >
                <td
                  className="border border-gray-300 px-4 py-2 text-right font-medium"
                  style={{
                    backgroundColor:
                      hoveredCol === 0 || isHovered
                        ? '#dcfce7'
                        : isHighlight
                        ? undefined
                        : undefined,
                  }}
                >
                  {formatCurrency(row.estateValue)}
                </td>
                {hasSpouse && (
                  <>
                    <td
                      className="border border-gray-300 px-4 py-2 text-right"
                      style={{
                        backgroundColor:
                          hoveredCol === 1 || isHovered ? '#dcfce7' : undefined,
                      }}
                    >
                      {formatCurrency(row.totalTax)}
                    </td>
                    <td
                      className="border border-gray-300 px-4 py-2 text-right"
                      style={{
                        backgroundColor:
                          hoveredCol === 2 || isHovered ? '#dcfce7' : undefined,
                      }}
                    >
                      {formatPercent(row.effectiveTaxRate)}
                    </td>
                    <td
                      className="border border-gray-300 px-4 py-2 text-right"
                      style={{
                        backgroundColor:
                          hoveredCol === 3 || isHovered ? '#dcfce7' : undefined,
                      }}
                    >
                      {formatCurrency(row.taxAfterSpouseDeduction)}
                    </td>
                  </>
                )}
                <td
                  className="border border-gray-300 px-4 py-2 text-right"
                  style={{
                    backgroundColor:
                      hoveredCol === (hasSpouse ? 4 : 1) || isHovered
                        ? '#dcfce7'
                        : undefined,
                  }}
                >
                  {formatCurrency(
                    hasSpouse ? row.taxAfterSpouseDeduction : row.totalTax
                  )}
                </td>
                <td
                  className="border border-gray-300 px-4 py-2 text-right"
                  style={{
                    backgroundColor:
                      hoveredCol === (hasSpouse ? 5 : 2) || isHovered
                        ? '#dcfce7'
                        : undefined,
                  }}
                >
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
};
