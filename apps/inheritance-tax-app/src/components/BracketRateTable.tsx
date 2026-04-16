import React, { memo } from 'react';
import type { BracketAnalysisRow } from '../utils';
import { formatCurrency, formatPercent } from '../utils';
import { isHighlightRow } from '../constants';
import { CARD, TH, TD } from './tableStyles';

interface BracketRateTableProps {
  data: BracketAnalysisRow[];
  hasSpouse: boolean;
  heirLabel: string;
  conditionLabel?: string;
}

type Column = {
  label: string;
  getValue: (row: BracketAnalysisRow) => string;
  cellClass: string;
};

function buildColumns(hasSpouse: boolean, heirLabel: string): Column[] {
  if (!hasSpouse) {
    return [
      { label: '加重平均適用税率', getValue: r => formatPercent(r.weightedRate), cellClass: 'text-center font-bold text-green-700' },
    ];
  }
  return [
    { label: '配偶者 適用税率', getValue: r => formatPercent(r.spouseRate ?? 0), cellClass: 'text-center' },
    { label: `${heirLabel} 適用税率`, getValue: r => formatPercent(r.otherRate), cellClass: 'text-center' },
    { label: '加重平均適用税率', getValue: r => formatPercent(r.weightedRate), cellClass: 'text-center font-medium' },
    { label: '控除後加重平均', getValue: r => formatPercent(r.weightedRateAfterSpouse), cellClass: 'text-center font-bold text-green-700' },
  ];
}

export const BracketRateTable: React.FC<BracketRateTableProps> = memo(({ data, hasSpouse, heirLabel, conditionLabel }) => {
  const columns = buildColumns(hasSpouse, heirLabel);

  return (
    <div className={`${CARD} overflow-x-auto table-scroll-hint`} role="region" aria-label="加重平均適用税率表">
      <div className="flex items-baseline gap-4 mb-1">
        <h2 className="text-xl font-bold text-gray-800" id="bracket-table-heading">加重平均適用税率表</h2>
        {conditionLabel && (
          <span className="text-sm text-gray-500">{conditionLabel}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        各法定相続人の法定取得額に適用される税率ブラケットを法定相続分で加重平均した値です。
        財産が増減したときの税額変動の目安になります。
      </p>

      <table className="w-full border-collapse text-sm" aria-labelledby="bracket-table-heading">
        <thead>
          <tr className="bg-green-600 text-white">
            <th scope="col" className={TH}>相続財産</th>
            {columns.map(col => (
              <th key={col.label} scope="col" className={TH}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.estateValue} className={`${isHighlightRow(row.estateValue) ? 'bg-yellow-50' : ''} hover:bg-green-50`}>
              <td className={`${TD} font-medium`}>
                {formatCurrency(row.estateValue)}
              </td>
              {columns.map(col => (
                <td key={col.label} className={`${TD} ${col.cellClass}`}>
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

BracketRateTable.displayName = 'BracketRateTable';
