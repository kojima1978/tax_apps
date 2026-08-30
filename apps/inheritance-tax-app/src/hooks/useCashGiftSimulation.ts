import { useState, useMemo, useCallback, useTransition } from 'react';
import type { GiftRecipient, CashGiftSimulationResult } from '../types';
import { calculateCashGiftSimulation, getGiftRecipientOptions, getGiftTaxTypeForHeirId, optimizeGiftAmounts } from '../utils';
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
  const setRecipientId = useCallback((r: GiftRecipient, id: string, label: string) => ({
    ...r,
    heirId: id,
    heirLabel: label,
    taxType: getGiftTaxTypeForHeirId(id),
  }), []);

  // 相続人のみ cleanOptions でクリーン、相続人以外はそのまま保持
  const heirRecipientsRaw = useMemo(() => recipients.filter(r => r.isHeir), [recipients]);
  const nonHeirRecipients = useMemo(() => recipients.filter(r => !r.isHeir), [recipients]);
  const cleanedHeirRecipients = useCleanOptions(heirRecipientsRaw, recipientOptions, getRecipientId, setRecipientId);
  const cleanedNonHeirRecipients = useMemo(
    () => nonHeirRecipients.map(r => {
      const fallbackSource = recipientOptions[0];
      if (!r.sourceHeirId) {
        return fallbackSource
          ? { ...r, sourceHeirId: fallbackSource.id, sourceHeirLabel: fallbackSource.label }
          : r;
      }
      const source = recipientOptions.find(opt => opt.id === r.sourceHeirId);
      return source
        ? { ...r, sourceHeirLabel: source.label }
        : fallbackSource
          ? { ...r, sourceHeirId: fallbackSource.id, sourceHeirLabel: fallbackSource.label }
          : { ...r, sourceHeirId: undefined, sourceHeirLabel: undefined };
    }),
    [nonHeirRecipients, recipientOptions],
  );
  const cleanedRecipients = useMemo(
    () => [...cleanedHeirRecipients, ...cleanedNonHeirRecipients],
    [cleanedHeirRecipients, cleanedNonHeirRecipients],
  );

  const [result, setResult] = useState<CashGiftSimulationResult | null>(null);
  const [overAllocatedHeirsError, setOverAllocatedHeirsError] = useState<string[]>([]);
  const [isOptimizing, startOptimization] = useTransition();

  const commitSimulationResult = useCallback((simResult: CashGiftSimulationResult) => {
    if (simResult.overAllocatedHeirs.length > 0) {
      setResult(null);
      setOverAllocatedHeirsError(simResult.overAllocatedHeirs);
      return;
    }
    setOverAllocatedHeirsError([]);
    setResult(simResult);
  }, []);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || cleanedRecipients.length === 0 || cleanedRecipients.every(r => r.annualAmount <= 0 || r.years <= 0)) {
      setResult(null);
      setOverAllocatedHeirsError([]);
      return;
    }
    const simResult = calculateCashGiftSimulation(estateValue, composition, cleanedRecipients, spouseMode);
    commitSimulationResult(simResult);
  }, [estateValue, composition, cleanedRecipients, spouseMode, commitSimulationResult]);

  const optimizationBlockedReason = useMemo(() => {
    if (estateValue <= 0) return '先に遺産総額を入力してください';
    if (cleanedRecipients.length === 0) return '受贈者を追加してください';
    if (cleanedRecipients.some(r => r.years <= 0)) return 'すべての受贈者の贈与年数を選択してください';
    if (cleanedRecipients.some(r => !r.isHeir && (!r.heirLabel.trim() || !r.sourceHeirId))) {
      return '関係者の受贈者名と財源相続人を入力してください';
    }
    return null;
  }, [estateValue, cleanedRecipients]);

  const handleOptimizeGiftAmounts = useCallback(() => {
    if (optimizationBlockedReason) return;

    startOptimization(() => {
      const optimized = optimizeGiftAmounts(
        estateValue,
        composition,
        cleanedRecipients,
        spouseMode,
      );
      const annualAmountById = new Map(optimized.map(r => [r.id, r.annualAmount]));
      setRecipients(current => current.map(recipient => ({
        ...recipient,
        annualAmount: annualAmountById.get(recipient.id) ?? recipient.annualAmount,
      })));
      commitSimulationResult(calculateCashGiftSimulation(
        estateValue,
        composition,
        optimized,
        spouseMode,
      ));
    });
  }, [optimizationBlockedReason, estateValue, composition, cleanedRecipients, spouseMode, commitSimulationResult]);

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
    handleCalculate,
    handleOptimizeGiftAmounts,
    isOptimizing,
    optimizationBlockedReason,
    totalGiftsInput,
    overAllocatedHeirsError,
  };
}
