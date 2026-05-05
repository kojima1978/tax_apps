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

  // 相続人のみ cleanOptions でクリーン、相続人以外はそのまま保持
  const heirRecipientsRaw = useMemo(() => recipients.filter(r => r.isHeir), [recipients]);
  const nonHeirRecipients = useMemo(() => recipients.filter(r => !r.isHeir), [recipients]);
  const cleanedHeirRecipients = useCleanOptions(heirRecipientsRaw, recipientOptions, getRecipientId, setRecipientId);
  const cleanedRecipients = useMemo(
    () => [...cleanedHeirRecipients, ...nonHeirRecipients],
    [cleanedHeirRecipients, nonHeirRecipients],
  );

  const [result, setResult] = useState<CashGiftSimulationResult | null>(null);
  const [calcInputs, setCalcInputs] = useState<{
    estateValue: number;
    composition: typeof composition;
    recipients: GiftRecipient[];
    spouseMode: typeof spouseMode;
  } | null>(null);
  const [overAllocatedHeirsError, setOverAllocatedHeirsError] = useState<string[]>([]);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || cleanedRecipients.length === 0 || cleanedRecipients.every(r => r.annualAmount <= 0 || r.years <= 0)) {
      setResult(null);
      setCalcInputs(null);
      setOverAllocatedHeirsError([]);
      return;
    }
    const simResult = calculateCashGiftSimulation(estateValue, composition, cleanedRecipients, spouseMode);
    if (simResult.overAllocatedHeirs.length > 0) {
      setResult(null);
      setCalcInputs(null);
      setOverAllocatedHeirsError(simResult.overAllocatedHeirs);
      return;
    }
    setOverAllocatedHeirsError([]);
    setResult(simResult);
    setCalcInputs({ estateValue, composition, recipients: cleanedRecipients, spouseMode });
  }, [estateValue, composition, cleanedRecipients, spouseMode]);

  const totalGiftsInput = useMemo(
    () => cleanedRecipients.reduce((s, r) => s + r.annualAmount * r.years, 0),
    [cleanedRecipients],
  );

  return {
    ...base,
    recipients, setRecipients,
    recipientOptions,
    cleanedRecipients,
    result,
    calcInputs,
    handleCalculate,
    totalGiftsInput,
    overAllocatedHeirsError,
  };
}
