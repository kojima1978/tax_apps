import { memo } from 'react';
import ClipboardList from 'lucide-react/icons/clipboard-list';
import HeartHandshake from 'lucide-react/icons/heart-handshake';
import Landmark from 'lucide-react/icons/landmark';
import ShieldCheck from 'lucide-react/icons/shield-check';
import UsersRound from 'lucide-react/icons/users-round';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';

interface InsuranceCalculationPremiseProps {
  result: InsuranceSimulationResult;
}

export const InsuranceCalculationPremise = memo(({
  result,
}: InsuranceCalculationPremiseProps) => {
  const { proposed, baseEstate, newPremiumTotal } = result;
  const heirCount = proposed.heirBreakdowns.length;
  const newBenefit = proposed.totalBenefit - result.current.totalBenefit;
  const benefitDifference = newBenefit - newPremiumTotal;
  const benefitDifferenceLabel = benefitDifference > 0
    ? `${formatCurrency(benefitDifference)}増加`
    : benefitDifference < 0
      ? `${formatCurrency(Math.abs(benefitDifference))}減少`
      : '増減なし';
  const heirSummary = proposed.heirBreakdowns.map(heir => heir.label).join('・');

  const items = [
    {
      label: '遺産総額',
      value: formatCurrency(baseEstate),
      detail: '保険金を含まない元の財産額',
      icon: <Landmark aria-hidden="true" />,
    },
    {
      label: '法定相続人',
      value: `${heirCount}人`,
      detail: heirSummary,
      icon: <UsersRound aria-hidden="true" />,
    },
    {
      label: '新たに支払う保険料',
      value: formatCurrency(newPremiumTotal),
      detail: '新規検討契約の保険料合計',
      icon: <HeartHandshake aria-hidden="true" />,
    },
    {
      label: '新たに受け取る保険金',
      value: formatCurrency(newBenefit),
      detail: '新規検討契約の保険金合計',
      icon: <ShieldCheck aria-hidden="true" />,
    },
  ];

  return (
    <section className="print-only-block print-conditions calc-premise" aria-labelledby="insurance-premise-title">
      <div className="calc-premise-heading">
        <span className="calc-premise-heading-icon" aria-hidden="true">
          <ClipboardList />
        </span>
        <div>
          <h2 id="insurance-premise-title">計算の条件</h2>
          <p>以下の前提で保険加入後の相続税を試算しています</p>
        </div>
      </div>
      <div className="insurance-premise-grid-wrap">
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
        <div
          className="insurance-premise-benefit-connector"
          role="img"
          aria-label={`新たに受け取る保険金は、新たに支払う保険料より${benefitDifferenceLabel}`}
        >
          <span className="insurance-premise-benefit-connector-label">{benefitDifferenceLabel}</span>
        </div>
      </div>
    </section>
  );
});

InsuranceCalculationPremise.displayName = 'InsuranceCalculationPremise';
