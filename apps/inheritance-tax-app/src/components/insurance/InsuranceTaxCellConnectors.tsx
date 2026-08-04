import { memo } from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';

interface InsuranceTaxCellConnectorsProps {
  result: InsuranceSimulationResult;
}

export const InsuranceTaxCellConnectors = memo(({
  result,
}: InsuranceTaxCellConnectorsProps) => {
  const difference = result.proposed.taxResult.totalFinalTax - result.current.taxResult.totalFinalTax;
  if (difference === 0) return null;

  const direction = difference < 0 ? '減少' : '増加';
  const label = `${formatCurrency(Math.abs(difference))}${direction}`;

  return (
    <div
      className={`insurance-tax-total-connector hidden lg:block ${difference < 0 ? 'insurance-tax-decrease' : 'insurance-tax-increase'}`}
      role="img"
      aria-label={`相続税合計は${label}`}
    >
      <span className="insurance-tax-total-connector-line" aria-hidden="true" />
      <span className="insurance-tax-total-connector-label">{label}</span>
    </div>
  );
});

InsuranceTaxCellConnectors.displayName = 'InsuranceTaxCellConnectors';
