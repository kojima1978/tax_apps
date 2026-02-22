import React, { memo } from 'react';
import { TAX_BRACKETS } from '../constants';
import { formatCurrency } from '../utils';
import { TH, TD } from './tableStyles';

const formatThreshold = (value: number, index: number): string => {
  if (index === TAX_BRACKETS.length - 1) {
    const prev = TAX_BRACKETS[index - 1];
    return `${formatCurrency(prev.threshold)}超`;
  }
  return `${formatCurrency(value)}以下`;
};

export const TaxBracketTable: React.FC = memo(() => (
  <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto" role="region" aria-label="相続税の速算表">
    <h2 className="text-xl font-bold text-gray-800 mb-1" id="bracket-heading">相続税の速算表</h2>
    <p className="text-sm text-gray-500 mb-4">
      法定相続分に応ずる取得金額に対する税率と控除額です。
    </p>

    <table className="w-full border-collapse text-sm" aria-labelledby="bracket-heading">
      <thead>
        <tr className="bg-green-600 text-white">
          <th scope="col" className={TH}>法定相続分に応ずる取得金額</th>
          <th scope="col" className={TH}>税率</th>
          <th scope="col" className={TH}>控除額</th>
        </tr>
      </thead>
      <tbody>
        {TAX_BRACKETS.map((bracket, i) => (
          <tr key={bracket.threshold} className="hover:bg-green-50">
            <td className={`${TD} text-center font-medium`}>{formatThreshold(bracket.threshold, i)}</td>
            <td className={`${TD} text-center font-bold text-green-700`}>{bracket.rate}%</td>
            <td className={`${TD} text-center`}>{bracket.deduction > 0 ? formatCurrency(bracket.deduction) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

TaxBracketTable.displayName = 'TaxBracketTable';
