import React from 'react';
import type { CashGiftSimulationResult } from '../../types';
import { FlowSteps, type FlowStep } from '../FlowSteps';

interface CashGiftFlowStepsProps {
  result: CashGiftSimulationResult;
}

export const CashGiftFlowSteps: React.FC<CashGiftFlowStepsProps> = ({ result }) => {
  const { current, proposed, baseEstate, totalGifts, totalGiftTax } = result;

  const steps: FlowStep[] = [
    {
      title: '元の財産額',
      description: '被相続人の相続財産',
      currentValue: baseEstate,
      proposedValue: baseEstate,
    },
    {
      title: '生前贈与 総額',
      description: '子・孫への現金贈与',
      currentValue: 0,
      proposedValue: totalGifts,
      sign: '−',
      displayPrefix: 'ー',
    },
    {
      title: '課税遺産額',
      description: '遺産 − 生前贈与',
      currentValue: current.estateValue,
      proposedValue: proposed.estateValue,
    },
    {
      title: '相続税額',
      description: '控除後の納付税額',
      currentValue: current.taxResult.totalFinalTax,
      proposedValue: proposed.taxResult.totalFinalTax,
      sign: '−',
    },
    {
      title: '贈与税 合計',
      description: '受贈者が負担する贈与税',
      currentValue: 0,
      proposedValue: totalGiftTax,
      sign: '−',
    },
    {
      title: '税引後財産額',
      description: '遺産 − 相続税 − 贈与税',
      currentValue: current.totalNetProceeds,
      proposedValue: proposed.totalNetProceeds,
    },
  ];

  return <FlowSteps steps={steps} />;
};
