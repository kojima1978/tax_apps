import { useCallback } from 'react';
import { calculateYearComparison } from '@/lib/tax-calculation';
import { hasInvalidTax } from '@/lib/utils';
import { useBaseGiftForm } from './useBaseGiftForm';

export const useYearComparisonForm = () => {
    const calculate = useCallback(calculateYearComparison, []);
    const base = useBaseGiftForm(calculate, hasInvalidTax);

    // 分割の元になる贈与総額は、計算が成立した時点の金額をそのまま使う
    return { ...base, totalAmount: base.calculatedAmount };
};
