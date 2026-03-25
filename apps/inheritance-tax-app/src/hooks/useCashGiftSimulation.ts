import { useState, useMemo, useCallback } from 'react';
import type { GiftRecipient, CashGiftSimulationResult } from '../types';
import { calculateCashGiftSimulation, getGiftRecipientOptions } from '../utils';
import { useSimulationBase } from './useSimulationBase';
import { useCleanOptions } from './useCleanOptions';

export function useCashGiftSimulation() {
  const base = useSimulationBase();
  const { composition, estateValue, spouseMode } = base;

  const [recipients, setRecipients] = useState<GiftRecipient[]>([]);

  const recipientOptions = useMemo(
    () => getGiftRecipientOptions(composition),
    [composition],
  );

  const getRecipientId = useCallback((r: GiftRecipient) => r.heirId, []);
  const setRecipientId = useCallback((r: GiftRecipient, id: string, label: string) => ({ ...r, heirId: id, heirLabel: label }), []);
  const cleanedRecipients = useCleanOptions(recipients, recipientOptions, getRecipientId, setRecipientId);

  const [result, setResult] = useState<CashGiftSimulationResult | null>(null);
  const [calcInputs, setCalcInputs] = useState<{
    estateValue: number;
    composition: typeof composition;
    recipients: GiftRecipient[];
    spouseMode: typeof spouseMode;
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
    ...base,
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
