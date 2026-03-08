import { useState, useCallback } from 'react';
import { calculateYearComparison, type GiftType, type YearComparisonResult } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';
import { validateGiftAmount } from '@/lib/validate-gift-amount';

export const useYearComparisonForm = () => {
    const [amount, setAmount] = useState('');
    const [giftType, setGiftType] = useState<GiftType>('special');
    const [results, setResults] = useState<YearComparisonResult[] | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const normalized = normalizeNumberString(e.target.value);
        setAmount(normalized ? Number(normalized).toLocaleString() : '');
    }, []);

    const handleCalculate = useCallback(() => {
        setErrorMsg('');
        const validation = validateGiftAmount(amount);
        if (!validation.ok) {
            setErrorMsg(validation.error);
            setResults(null);
            return;
        }

        const rows = calculateYearComparison(validation.amount, giftType);
        if (rows.some(r => !isFinite(r.totalTax) || isNaN(r.totalTax))) {
            setErrorMsg('※計算結果に異常が発生しました。入力値を確認してください。');
            setResults(null);
            return;
        }
        setTotalAmount(validation.amount);
        setResults(rows);
    }, [amount, giftType]);

    return {
        amount, setAmount: handleAmountChange,
        giftType, setGiftType,
        results, totalAmount, errorMsg,
        handleCalculate,
    };
};
