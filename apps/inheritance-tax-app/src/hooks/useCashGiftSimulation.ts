import { useState, useMemo, useCallback } from 'react';
import type { HeirComposition, SpouseAcquisitionMode, GiftRecipient, CashGiftSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { calculateCashGiftSimulation, getGiftRecipientOptions } from '../utils';
import { useCleanOptions } from './useCleanOptions';

export function useCashGiftSimulation() {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });
  const [recipients, setRecipients] = useState<GiftRecipient[]>([]);

  const recipientOptions = useMemo(
    () => getGiftRecipientOptions(composition),
    [composition],
  );

  // 相続人構成が変わったら、無効な受取人をクリーンアップ
  const getRecipientId = useCallback((r: GiftRecipient) => r.heirId, []);
  const setRecipientId = useCallback((r: GiftRecipient, id: string, label: string) => ({ ...r, heirId: id, heirLabel: label }), []);
  const cleanedRecipients = useCleanOptions(recipients, recipientOptions, getRecipientId, setRecipientId);

  const [result, setResult] = useState<CashGiftSimulationResult | null>(null);
  const [calcInputs, setCalcInputs] = useState<{
    estateValue: number;
    composition: HeirComposition;
    recipients: GiftRecipient[];
    spouseMode: SpouseAcquisitionMode;
  } | null>(null);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || cleanedRecipients.length === 0 || cleanedRecipients.every(r => r.annualAmount <= 0 || r.years <= 0)) {
      setResult(null);
      setCalcInputs(null);
      return;
    }
    setResult(calculateCashGiftSimulation(estateValue, composition, cleanedRecipients, spouseMode));
    setCalcInputs({ estateValue, composition, recipients: cleanedRecipients, spouseMode });
  }, [estateValue, composition, cleanedRecipients, spouseMode]);

  const totalGiftsInput = useMemo(
    () => cleanedRecipients.reduce((s, r) => s + r.annualAmount * r.years, 0),
    [cleanedRecipients],
  );

  const noEligibleRecipients = composition.selectedRank !== 'rank1' && composition.selectedRank !== 'none';

  return {
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    recipients, setRecipients,
    recipientOptions,
    cleanedRecipients,
    result,
    calcInputs,
    handleCalculate,
    totalGiftsInput,
    noEligibleRecipients,
  };
}
