import React, { memo } from 'react';
import type { TaxCalculationResult } from '../types';
import { formatCurrency, formatPercent } from '../utils';
import { isHighlightRow } from '../constants';
import { useColumnHover } from '../hooks/useColumnHover';
import { CARD, TH_WIDE, TH_MID, TD_WIDE } from './tableStyles';

interface TaxTableProps {
  data: TaxCalculationResult[];
  hasSpouse: boolean;
  secondaryData?: TaxCalculationResult[];
  conditionLabel?: string;
}

type SubColumn = {
  label: string;
  getValue: (row: TaxCalculationResult) => string;
};

const BASE_COLUMNS: SubColumn[] = [
  { label: '相続税額', getValue: r => formatCurrency(r.totalTax) },
  { label: '負担率', getValue: r => formatPercent(r.effectiveTaxRate) },
];

const SPOUSE_DEDUCTION_COLUMN: SubColumn = {
  label: '配偶者控除後',
  getValue: r => formatCurrency(r.taxAfterSpouseDeduction),
};

interface ColumnGroup {
  heading: string;
  headingClass: string;
  columns: SubColumn[];
  getData: (rowIdx: number, primary: TaxCalculationResult, secondary?: TaxCalculationResult) => TaxCalculationResult;
}

function buildColumnGroups(hasSpouse: boolean): ColumnGroup[] {
  if (!hasSpouse) {
    return [{
      heading: '相続税額',
      headingClass: 'bg-green-600',
      columns: BASE_COLUMNS,
      getData: (_i, primary) => primary,
    }];
  }
  return [
    {
      heading: '1次相続（配偶者あり）',
      headingClass: 'bg-green-600',
      columns: [...BASE_COLUMNS, SPOUSE_DEDUCTION_COLUMN],
      getData: (_i, primary) => primary,
    },
    {
      heading: '2次相続（配偶者なし）',
      headingClass: 'bg-green-700',
      columns: BASE_COLUMNS,
      getData: (_i, _primary, secondary) => secondary!,
    },
  ];
}

export const TaxTable: React.FC<TaxTableProps> = memo(({ data, hasSpouse, secondaryData = [], conditionLabel }) => {
  const { headerHover, cellHighlight, hoverProps } = useColumnHover();
  const groups = buildColumnGroups(hasSpouse);

  // 全サブカラムをフラット化（hover index用）
  const flatColumns = groups.flatMap(g =>
    g.columns.map(col => ({ col, getData: g.getData }))
  );

  return (
    <div className={`${CARD} overflow-x-auto table-scroll-hint`} role="region" aria-label="相続税額一覧表">
      <div className="flex items-baseline gap-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800" id="tax-table-heading">相続税額一覧表</h2>
        {conditionLabel && (
          <span className="text-sm text-gray-500">{conditionLabel}</span>
        )}
      </div>

      <table className="w-full border-collapse text-sm" aria-labelledby="tax-table-heading">
        <thead>
          <tr className="bg-green-600 text-white">
            <th
              scope="col"
              className={`${TH_WIDE} ${headerHover(0)}`}
              rowSpan={2}
              {...hoverProps(0)}
            >
              相続財産
            </th>
            {groups.map(g => (
              <th key={g.heading} scope="colgroup" className={`${TH_MID} ${g.headingClass}`} colSpan={g.columns.length}>
                {g.heading}
              </th>
            ))}
          </tr>
          <tr className="bg-green-600 text-white">
            {flatColumns.map(({ col }, i) => (
              <th key={i} scope="col" className={`${TH_WIDE} ${headerHover(i + 1)}`} {...hoverProps(i + 1)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row.estateValue} className={`group ${isHighlightRow(row.estateValue) ? 'bg-yellow-50' : ''} hover:bg-green-50`}>
              <td className={`${TD_WIDE} font-medium ${cellHighlight(0)} group-hover:bg-green-100`}>
                {formatCurrency(row.estateValue)}
              </td>
              {flatColumns.map(({ col, getData }, i) => (
                <td key={i} className={`${TD_WIDE} ${cellHighlight(i + 1)} group-hover:bg-green-100`}>
                  {col.getValue(getData(rowIdx, row, secondaryData[rowIdx]))}
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
