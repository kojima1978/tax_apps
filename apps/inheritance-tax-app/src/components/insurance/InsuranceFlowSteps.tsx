import React from 'react';
import type { InsuranceSimulationResult } from '../../types';
import { formatCurrency } from '../../utils';
import { FlowSteps, type FlowStep } from '../FlowSteps';

interface InsuranceFlowStepsProps {
  result: InsuranceSimulationResult;
}

export const InsuranceFlowSteps: React.FC<InsuranceFlowStepsProps> = ({ result }) => {
  const { current, proposed, baseEstate, newPremiumTotal } = result;

  const steps: FlowStep[] = [
    {
      title: '元の財産額',
      description: '保険金を含まない相続財産',
      currentValue: baseEstate,
      proposedValue: baseEstate,
    },
    {
      title: '新規保険料',
      description: '現金から保険へ振替',
      currentValue: 0,
      proposedValue: newPremiumTotal,
      sign: '−',
      displayPrefix: 'ー',
    },
    {
      title: '受取保険金（全額）',
      description: '死亡保険金の受取額',
      currentValue: current.totalBenefit,
      proposedValue: proposed.totalBenefit,
      sign: '+',
    },
    {
      title: '非課税控除',
      description: `限度額 ${formatCurrency(current.nonTaxableLimit)}`,
      currentValue: current.nonTaxableAmount,
      proposedValue: proposed.nonTaxableAmount,
      sign: '−',
    },
    {
      title: '課税遺産額',
      description: '遺産 − 保険料 + 課税対象保険金',
      currentValue: current.adjustedEstate,
      proposedValue: proposed.adjustedEstate,
    },
    {
      title: '相続税額',
      description: '控除後の納付税額',
      currentValue: current.taxResult.totalFinalTax,
      proposedValue: proposed.taxResult.totalFinalTax,
      sign: '−',
    },
    {
      title: '納税後財産額',
      description: '遺産 + 保険金 − 税額',
      currentValue: current.totalNetProceeds,
      proposedValue: proposed.totalNetProceeds,
    },
  ];

  return <FlowSteps steps={steps} />;
};
