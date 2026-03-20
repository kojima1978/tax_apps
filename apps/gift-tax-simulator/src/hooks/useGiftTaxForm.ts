import { useCallback } from 'react';
import { calculateAllPatterns, type CalculationResult } from '@/lib/tax-calculation';
import { useBaseGiftForm } from './useBaseGiftForm';

const hasInvalidResults = (rows: CalculationResult[]) =>
    rows.some(r => !isFinite(r.totalTax) || isNaN(r.totalTax));

export const useGiftTaxForm = () => {
    const calculate = useCallback(calculateAllPatterns, []);
    return useBaseGiftForm(calculate, hasInvalidResults);
};
