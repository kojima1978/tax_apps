import React, { memo } from 'react';
import type { BracketAnalysisRow } from '../utils';
import { formatCurrency, formatPercent } from '../utils';
import { isHighlightRow } from '../constants';
import { TH, TD } from './tableStyles';

interface BracketRateTableProps {
  data: BracketAnalysisRow[];
  hasSpouse: boolean;
  heirLabel: string;
}

export const BracketRateTable: React.FC<BracketRateTableProps> = memo(({ data, hasSpouse, heirLabel }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto" role="region" aria-label="加重平均適用税率表">
      <h2 className="text-xl font-bold text-gray-800 mb-1" id="bracket-table-heading">加重平均適用税率表</h2>
      <p className="text-sm text-gray-500 mb-4">
        各法定相続人の法定取得額に適用される税率ブラケットを法定相続分で加重平均した値です。
        財産が増減したときの税額変動の目安になります。
      </p>

      <table className="w-full border-collapse text-sm" aria-labelledby="bracket-table-heading">
        <thead>
          <tr className="bg-green-600 text-white">
            <th scope="col" className={TH}>相続財産</th>
            {hasSpouse && (
              <>
                <th scope="col" className={TH}>配偶者 適用税率</th>
                <th scope="col" className={TH}>{heirLabel} 適用税率</th>
                <th scope="col" className={TH}>加重平均適用税率</th>
                <th scope="col" className={TH}>控除後加重平均</th>
              </>
            )}
            {!hasSpouse && (
              <th scope="col" className={TH}>加重平均適用税率</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.estateValue} className={`${isHighlightRow(row.estateValue) ? 'bg-yellow-50' : ''} hover:bg-green-50`}>
              <td className={`${TD} font-medium`}>
                {formatCurrency(row.estateValue)}
              </td>
              {hasSpouse && (
                <>
                  <td className={`${TD} text-center`}>{formatPercent(row.spouseRate ?? 0)}</td>
                  <td className={`${TD} text-center`}>{formatPercent(row.otherRate)}</td>
                  <td className={`${TD} text-center font-medium`}>{formatPercent(row.weightedRate)}</td>
                  <td className={`${TD} text-center font-bold text-green-700`}>{formatPercent(row.weightedRateAfterSpouse)}</td>
                </>
              )}
              {!hasSpouse && (
                <td className={`${TD} text-center font-bold text-green-700`}>{formatPercent(row.weightedRate)}</td>
              )}
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
