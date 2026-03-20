import { useState, useCallback } from 'react';
import { calculateYearComparison, type YearComparisonResult } from '@/lib/tax-calculation';
import { useBaseGiftForm } from './useBaseGiftForm';

const hasInvalidResults = (rows: YearComparisonResult[]) =>
    rows.some(r => !isFinite(r.totalTax) || isNaN(r.totalTax));

export const useYearComparisonForm = () => {
    const [totalAmount, setTotalAmount] = useState(0);
    const calculate = useCallback(calculateYearComparison, []);
    const base = useBaseGiftForm(calculate, hasInvalidResults);

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
