import { useCallback, useState } from 'react';
import type { RealEstateInvestmentInput, RealEstateSimulationResult } from '../types';
import { calculateRealEstateSimulation } from '../utils/realEstateCalculator';
import { useSimulationBase } from './useSimulationBase';

const DEFAULT_INPUT: RealEstateInvestmentInput = {
  landPurchasePrice: 0,
  buildingPurchasePrice: 0,
  landSelfUseValue: 0,
  buildingFixedAssetTaxValue: 0,
  leaseholdRightRate: 60,
  tenantRightRate: 30,
  rentalRate: 100,
};

export function useRealEstateSimulation() {
  const base = useSimulationBase();
  const { composition, estateValue, spouseMode } = base;
  const [investment, setInvestment] = useState<RealEstateInvestmentInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<RealEstateSimulationResult | null>(null);

  const updateInvestment = useCallback((patch: Partial<RealEstateInvestmentInput>) => {
    setInvestment(current => ({ ...current, ...patch }));
  }, []);

  const handleCalculate = useCallback(() => {
    setResult(calculateRealEstateSimulation(estateValue, composition, investment, spouseMode));
  }, [estateValue, composition, investment, spouseMode]);

  return {
    ...base,
    investment,
    updateInvestment,
    result,
    handleCalculate,
  };
}
