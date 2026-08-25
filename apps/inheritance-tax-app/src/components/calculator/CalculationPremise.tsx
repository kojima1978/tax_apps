import React, { memo } from 'react';
import ClipboardList from 'lucide-react/icons/clipboard-list';
import HeartHandshake from 'lucide-react/icons/heart-handshake';
import Landmark from 'lucide-react/icons/landmark';
import ShieldCheck from 'lucide-react/icons/shield-check';
import UsersRound from 'lucide-react/icons/users-round';
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
  const heirCount = result.heirBreakdowns.length;
  const spouseRatio = result.estateValue > 0 && spouse
    ? (spouse.acquisitionAmount / result.estateValue) * 100
    : 0;

  const items = [
    {
      label: '遺産総額',
      value: formatCurrency(result.estateValue),
      detail: '税額計算の基となる財産額',
      icon: <Landmark aria-hidden="true" />,
    },
    {
      label: '法定相続人',
      value: `${heirCount}人`,
      detail: summarizeHeirs(result),
      icon: <UsersRound aria-hidden="true" />,
    },
    {
      label: '基礎控除',
      value: formatCurrency(result.basicDeduction),
      detail: `3,000万円 + 600万円 × ${heirCount}人`,
      icon: <ShieldCheck aria-hidden="true" />,
    },
    {
      label: '配偶者の取得条件',
      value: spouse ? formatCurrency(spouse.acquisitionAmount) : '配偶者なし',
      detail: spouse
        ? `遺産総額の${spouseRatio.toFixed(1)}%`
        : '配偶者の税額軽減は適用なし',
      icon: <HeartHandshake aria-hidden="true" />,
    },
  ];

  return (
    <section className="print-only-block print-conditions calc-premise" aria-labelledby="calc-premise-title">
      <div className="calc-premise-heading">
        <span className="calc-premise-heading-icon" aria-hidden="true">
          <ClipboardList />
        </span>
        <div>
          <h2 id="calc-premise-title">計算の条件</h2>
          <p>以下の前提で相続税を試算しています</p>
        </div>
      </div>
      <dl className="calc-premise-grid">
        {items.map(item => (
          <div className="calc-premise-item" key={item.label}>
            <span className="calc-premise-item-icon" aria-hidden="true">{item.icon}</span>
            <dt>{item.label}</dt>
            <dd>
              <strong>{item.value}</strong>
              <span>{item.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
});

CalculationPremise.displayName = 'CalculationPremise';
