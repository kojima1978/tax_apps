import { useState, useCallback } from 'react';
import { calculateYearComparison } from '@/lib/tax-calculation';
import { hasInvalidTax } from '@/lib/utils';
import { useBaseGiftForm } from './useBaseGiftForm';

export const useYearComparisonForm = () => {
    const [totalAmount, setTotalAmount] = useState(0);
    const calculate = useCallback(calculateYearComparison, []);
    const base = useBaseGiftForm(calculate, hasInvalidTax);

    const handleCalculate = useCallback(() => {
        const { amount } = base.handleCalculate();
        if (amount > 0) setTotalAmount(amount);
    }, [base.handleCalculate]);

    return {
        ...base,
        totalAmount,
        handleCalculate,
    };
};
