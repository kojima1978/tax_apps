import React, { memo } from 'react';
import type { DetailedTaxCalculationResult, HeirType } from '../../types';
import { formatCurrency } from '../../utils';
import { getHeirLabel } from '../../utils/heirUtils';

interface CalculationPremiseProps {
  result: DetailedTaxCalculationResult;
}

/** 「配偶者・子2人」のように相続人の顔ぶれを1行にまとめる */
function summarizeHeirs(result: DetailedTaxCalculationResult): string {
  const counts = new Map<HeirType, number>();
  for (const b of result.heirBreakdowns) {
    counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
  }

  const hasSpouse = counts.delete('spouse');
  const others = [...counts].map(([type, count]) => `${getHeirLabel(type, 0, 1)}${count}人`);

  return [...(hasSpouse ? ['配偶者'] : []), ...others].join('・');
}

/**
 * 印刷物の冒頭に置く「この金額は何を前提にしたものか」の1行バンド。
 * 入力欄は no-print のため、印刷物だけを見た人が前提を追えるようここで補う。
 * 比較ページ等の PrintConditions と同じ .print-conditions スタイルを共有する。
 */
export const CalculationPremise: React.FC<CalculationPremiseProps> = memo(({ result }) => {
  const spouse = result.heirBreakdowns.find(b => b.type === 'spouse');
  const spouseRatio = result.estateValue > 0 && spouse
    ? (spouse.acquisitionAmount / result.estateValue) * 100
    : 0;

  const items = [
    { label: '遺産総額', value: formatCurrency(result.estateValue) },
    { label: '相続人', value: `${result.heirBreakdowns.length}人（${summarizeHeirs(result)}）` },
    { label: '基礎控除', value: formatCurrency(result.basicDeduction) },
    ...(spouse
      ? [{
          label: '配偶者の取得額',
          value: `${formatCurrency(spouse.acquisitionAmount)}（遺産の${spouseRatio.toFixed(1)}%）`,
        }]
      : []),
  ];

  return (
    <div className="print-only-block print-conditions calc-premise">
      <dl>
        {items.map(item => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
});

CalculationPremise.displayName = 'CalculationPremise';
