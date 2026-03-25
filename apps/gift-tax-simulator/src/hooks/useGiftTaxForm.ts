import { useCallback } from 'react';
import { calculateAllPatterns } from '@/lib/tax-calculation';
import { hasInvalidTax } from '@/lib/utils';
import { useBaseGiftForm } from './useBaseGiftForm';

export const useGiftTaxForm = () => {
    const calculate = useCallback(calculateAllPatterns, []);
    return useBaseGiftForm(calculate, hasInvalidTax);
};
