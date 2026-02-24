import { useState, useMemo, useCallback } from 'react';
import type { HeirComposition, SpouseAcquisitionMode, InsuranceContract, InsuranceSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { calculateInsuranceSimulation, getBeneficiaryOptions } from '../utils';
import { useCleanOptions } from './useCleanOptions';

export function useInsuranceSimulation() {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });
  const [existingContracts, setExistingContracts] = useState<InsuranceContract[]>([]);
  const [newContracts, setNewContracts] = useState<InsuranceContract[]>([]);

  const beneficiaryOptions = useMemo(
    () => getBeneficiaryOptions(composition),
    [composition],
  );

  // 相続人構成が変わったら、無効な受取人を持つ契約をクリーンアップ
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
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    existingContracts, setExistingContracts,
    newContracts, setNewContracts,
    beneficiaryOptions,
    cleanedExisting,
    cleanedNew,
    result,
    handleCalculate,
  };
}
