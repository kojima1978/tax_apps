import React, { useMemo } from 'react';
import type { DeemedAssetSummary, HeirTaxBreakdown } from '../../types';
import { formatCurrency, formatFraction } from '../../utils';
import { CARD } from '../tableStyles';

interface HeirBreakdownTableProps {
  breakdowns: HeirTaxBreakdown[];
  totalFinalTax: number;
  /** 生命保険金・死亡退職金の内訳（入力がある時だけ列を増やす） */
  deemedAssets?: DeemedAssetSummary | null;
}

const TH = 'px-3 py-2';

interface Column {
  label: string;
  align: string;
  render: (b: HeirTaxBreakdown, index: number) => React.ReactNode;
}

/**
 * 保険金等の入力があるときだけ「うち保険金等」列を挟み、「取得額」を「課税価格」に改める。
 * heirAmounts は heirBreakdowns と同じ並び（配偶者 → 各相続人）なので index で対応付ける。
 */
function buildColumns(deemedAssets?: DeemedAssetSummary | null): Column[] {
  return [
    { label: '相続人', align: 'text-left', render: (b) => <span className="font-medium">{b.label}</span> },
    { label: '法定相続分', align: 'text-right', render: (b) => formatFraction(b.legalShareRatio) },
    ...(deemedAssets
      ? [{
          label: '受取保険金等',
          align: 'text-right',
          render: (_b: HeirTaxBreakdown, index: number) => {
            const amount = deemedAssets.heirAmounts[index];
            if (!amount || amount.totalBenefit === 0) return '—';
            return (
              <>
                {formatCurrency(amount.totalBenefit)}
                <span className="ml-1 text-xs text-gray-500">
                  （課税 {formatCurrency(amount.taxableAmount)}）
                </span>
              </>
            );
          },
        }]
      : []),
    {
      label: deemedAssets ? '課税価格' : '取得額',
      align: 'text-right',
      render: (b) => formatCurrency(b.acquisitionAmount),
    },
    { label: '按分税額', align: 'text-right', render: (b) => formatCurrency(b.proportionalTax) },
    {
      label: '加算/控除', align: 'text-right', render: (b) => {
        const adjustment = b.surchargeAmount - b.spouseDeduction;
        return (
          <>
            {b.spouseDeduction > 0 && <span className="text-green-600">-{formatCurrency(b.spouseDeduction)}</span>}
            {b.surchargeAmount > 0 && <span className="text-orange-600">+{formatCurrency(b.surchargeAmount)}</span>}
            {adjustment === 0 && '—'}
          </>
        );
      },
    },
    { label: '納付税額', align: 'text-right', render: (b) => <span className="font-bold">{formatCurrency(b.finalTax)}</span> },
  ];
}

export const HeirBreakdownTable: React.FC<HeirBreakdownTableProps> = ({
  breakdowns,
  totalFinalTax,
  deemedAssets,
}) => {
  const columns = useMemo(() => buildColumns(deemedAssets), [deemedAssets]);

  if (breakdowns.length === 0) return null;

  return (
    <div className={`${CARD} heir-breakdown-card`}>
      <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4">
        誰がいくら納めるか
        <span className="ml-2 text-xs font-normal text-gray-500">相続人別 税額内訳</span>
      </h3>

      <div className="overflow-x-auto table-scroll-hint">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-700 text-white">
              {columns.map(({ label, align }) => (
                <th key={label} className={`${TH} ${align}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((b, index) => (
              <tr key={b.label} className="border-b border-gray-200 hover:bg-gray-50">
                {columns.map(({ label, align, render }) => (
                  <td key={label} className={`${TH} ${align}`}>{render(b, index)}</td>
                ))}
              </tr>
            ))}
            <tr className="bg-green-50 font-bold">
              <td className={TH}>合計</td>
              <td className={TH} colSpan={columns.length - 2} />
              <td className={`${TH} text-right text-green-800`}>{formatCurrency(totalFinalTax)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
