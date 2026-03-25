import { useState, useMemo, useCallback } from 'react';
import type { InsuranceContract, InsuranceSimulationResult } from '../types';
import { calculateInsuranceSimulation, getBeneficiaryOptions } from '../utils';
import { useSimulationBase } from './useSimulationBase';
import { useCleanOptions } from './useCleanOptions';

export function useInsuranceSimulation() {
  const base = useSimulationBase();
  const { composition, estateValue, spouseMode } = base;

  const [existingContracts, setExistingContracts] = useState<InsuranceContract[]>([]);
  const [newContracts, setNewContracts] = useState<InsuranceContract[]>([]);

  const beneficiaryOptions = useMemo(
    () => getBeneficiaryOptions(composition),
    [composition],
  );

  const getContractId = useCallback((c: InsuranceContract) => c.beneficiaryId, []);
  const setContractId = useCallback((c: InsuranceContract, id: string, label: string) => ({ ...c, beneficiaryId: id, beneficiaryLabel: label }), []);
  const cleanedExisting = useCleanOptions(existingContracts, beneficiaryOptions, getContractId, setContractId);
  const cleanedNew = useCleanOptions(newContracts, beneficiaryOptions, getContractId, setContractId);

  const [result, setResult] = useState<InsuranceSimulationResult | null>(null);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || [...cleanedExisting, ...cleanedNew].length === 0) {
      setResult(null);
      return;
    }
    setResult(calculateInsuranceSimulation(estateValue, composition, cleanedExisting, cleanedNew, spouseMode));
  }, [estateValue, composition, cleanedExisting, cleanedNew, spouseMode]);

  return {
    ...base,
    existingContracts, setExistingContracts,
    newContracts, setNewContracts,
    beneficiaryOptions,
    cleanedExisting,
    cleanedNew,
    result,
    handleCalculate,
  };
}
