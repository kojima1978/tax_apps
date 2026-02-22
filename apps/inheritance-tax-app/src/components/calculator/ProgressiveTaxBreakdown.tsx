import React, { memo, useMemo } from 'react';
import type { HeirTaxBreakdown } from '../../types';
import { TAX_BRACKETS } from '../../constants';
import { formatCurrency } from '../../utils';
import { TH, TD } from '../tableStyles';

interface ProgressiveTaxBreakdownProps {
  breakdowns: HeirTaxBreakdown[];
}

interface BracketRow {
  label: string;
  taxableInBracket: number;
  rate: number;
  taxInBracket: number;
  cumulativeTax: number;
}

function computeBracketRows(shareAmount: number): BracketRow[] {
  if (shareAmount <= 0) return [];
  const rows: BracketRow[] = [];
  let remaining = shareAmount;
  let prevThreshold = 0;
  let cumulative = 0;

  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (remaining <= 0) break;
    const bracket = TAX_BRACKETS[i];
    const bracketWidth = bracket.threshold === Infinity
      ? remaining
      : bracket.threshold - prevThreshold;
    const taxable = Math.min(remaining, bracketWidth);
    const tax = Math.floor(taxable * bracket.rate / 100);
    cumulative += tax;

    const lowerLabel = prevThreshold === 0 ? '' : `${formatCurrency(prevThreshold)}超 `;
    const upperLabel = bracket.threshold === Infinity
      ? ''
      : `${formatCurrency(bracket.threshold)}以下`;
    const label = lowerLabel + upperLabel || `${formatCurrency(prevThreshold)}超`;

    rows.push({
      label,
      taxableInBracket: taxable,
      rate: bracket.rate,
      taxInBracket: tax,
      cumulativeTax: cumulative,
    });

    remaining -= taxable;
    prevThreshold = bracket.threshold;
  }

  return rows;
}

interface HeirGroup {
  labels: string[];
  legalShareAmount: number;
  taxOnShare: number;
  rows: BracketRow[];
}

export const ProgressiveTaxBreakdown: React.FC<ProgressiveTaxBreakdownProps> = memo(({ breakdowns }) => {
  const groups = useMemo((): HeirGroup[] => {
    const map = new Map<number, { labels: string[]; taxOnShare: number }>();
    for (const b of breakdowns) {
      const existing = map.get(b.legalShareAmount);
      if (existing) {
        existing.labels.push(b.label);
      } else {
        map.set(b.legalShareAmount, { labels: [b.label], taxOnShare: b.taxOnShare });
      }
    }
    return Array.from(map.entries()).map(([amount, { labels, taxOnShare }]) => ({
      labels,
      legalShareAmount: amount,
      taxOnShare,
      rows: computeBracketRows(amount),
    }));
  }, [breakdowns]);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-1">累進税額の内訳</h3>
      <p className="text-sm text-gray-500 mb-4">
        法定取得額が各ブラケットでどのように課税されるかの詳細です。
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.legalShareAmount} style={{ breakInside: 'avoid' }}>
            <h4 className="text-base font-bold text-green-700 mb-2">
              {group.labels.join('・')}
              <span className="text-sm font-normal text-gray-500 ml-2">
                （法定取得額: {formatCurrency(group.legalShareAmount)}）
              </span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className={TH}>区分</th>
                    <th className={TH}>課税金額</th>
                    <th className={TH}>税率</th>
                    <th className={TH}>税額</th>
                    <th className={TH}>累計税額</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-green-50">
                      <td className={`${TD} text-center`}>{row.label}</td>
                      <td className={TD}>{formatCurrency(row.taxableInBracket)}</td>
                      <td className={`${TD} text-center font-medium text-green-700`}>{row.rate}%</td>
                      <td className={TD}>{formatCurrency(row.taxInBracket)}</td>
                      <td className={`${TD} font-medium`}>{formatCurrency(row.cumulativeTax)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 font-bold">
                    <td className={`${TD} text-center`}>合計</td>
                    <td className={TD}>{formatCurrency(group.legalShareAmount)}</td>
                    <td className={TD} />
                    <td className={TD}>{formatCurrency(group.taxOnShare)}</td>
                    <td className={TD} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ProgressiveTaxBreakdown.displayName = 'ProgressiveTaxBreakdown';
