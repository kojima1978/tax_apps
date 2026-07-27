import React, { memo, useMemo } from 'react';
import type { HeirTaxBreakdown } from '../../types';
import { TAX_BRACKETS } from '../../constants';
import { formatCurrency } from '../../utils';
import { CARD } from '../tableStyles';

interface ProgressiveTaxBreakdownProps {
  breakdowns: HeirTaxBreakdown[];
}

interface BracketRow {
  label: string;
  taxableInBracket: number;
  rate: number;
  taxInBracket: number;
}

/** 税率の低い順に濃くなる緑。ブラケットの並び順と対応させる */
const BRACKET_COLORS = [
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e',
  '#16a34a', '#15803d', '#166534', '#14532d',
] as const;

const bracketColor = (index: number) => BRACKET_COLORS[Math.min(index, BRACKET_COLORS.length - 1)];

/** 薄い色の帯には濃い文字、濃い色の帯には白文字を載せる */
const bracketTextClass = (index: number) => (index < 3 ? 'text-green-900' : 'text-white');

function computeBracketRows(shareAmount: number): BracketRow[] {
  if (shareAmount <= 0) return [];
  const rows: BracketRow[] = [];
  let remaining = shareAmount;
  let prevThreshold = 0;

  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (remaining <= 0) break;
    const bracket = TAX_BRACKETS[i];
    const bracketWidth = bracket.threshold === Infinity
      ? remaining
      : bracket.threshold - prevThreshold;
    const taxable = Math.min(remaining, bracketWidth);
    const tax = Math.floor(taxable * bracket.rate / 100);

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
    <div className={CARD}>
      <h3 className="text-base md:text-lg font-bold text-gray-800 mb-1">累進税額の内訳</h3>
      <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
        法定取得額のうち、どの部分にどの税率がかかっているかを帯の長さで表しています。
      </p>

      <div className="space-y-5 md:space-y-6">
        {groups.map((group) => (
          <div key={group.legalShareAmount} style={{ breakInside: 'avoid' }}>
            <h4 className="text-sm md:text-base font-bold text-green-700 mb-2">
              {group.labels.join('・')}
              <span className="text-xs md:text-sm font-normal text-gray-500 ml-2">
                法定取得額 {formatCurrency(group.legalShareAmount)}
              </span>
            </h4>

            <div
              className="flex h-10 w-full overflow-hidden rounded-lg border border-gray-200"
              role="img"
              aria-label={group.rows
                .map((row) => `${row.label} ${row.rate}% ${formatCurrency(row.taxInBracket)}`)
                .join('、')}
            >
              {group.rows.map((row, i) => {
                const widthPercent = (row.taxableInBracket / group.legalShareAmount) * 100;
                return (
                  <div
                    key={row.label}
                    className={`flex items-center justify-center overflow-hidden text-xs font-bold ${bracketTextClass(i)}`}
                    style={{ width: `${widthPercent}%`, backgroundColor: bracketColor(i) }}
                    title={`${row.label}／税率 ${row.rate}%／課税 ${formatCurrency(row.taxableInBracket)} → 税額 ${formatCurrency(row.taxInBracket)}`}
                  >
                    {widthPercent >= 10 && `${row.rate}%`}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {group.rows.map((row, i) => (
                <span key={row.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: bracketColor(i) }}
                    aria-hidden="true"
                  />
                  {row.label}
                  <span className="font-medium text-green-700">{row.rate}%</span>
                  <span className="text-gray-400">{formatCurrency(row.taxableInBracket)} →</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(row.taxInBracket)}</span>
                </span>
              ))}
            </div>

            <p className="mt-2 border-t pt-2 text-sm">
              <span className="text-gray-500">法定相続分に対する税額</span>{' '}
              <span className="font-bold text-green-800">{formatCurrency(group.taxOnShare)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

ProgressiveTaxBreakdown.displayName = 'ProgressiveTaxBreakdown';
