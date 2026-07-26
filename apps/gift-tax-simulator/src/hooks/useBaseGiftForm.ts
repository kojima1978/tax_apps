import { useState, useCallback } from 'react';
import { type GiftType } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';
import { validateGiftAmount } from '@/lib/validate-gift-amount';

const CALC_ERROR = '※計算結果に異常が発生しました。入力値を確認してください。';

export const useBaseGiftForm = <T>(
    calculate: (amount: number, giftType: GiftType) => T[],
    validateResults: (results: T[]) => boolean,
) => {
    const [amount, setAmount] = useState('');
    const [giftType, setGiftType] = useState<GiftType>('special');
    const [results, setResults] = useState<T[] | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const normalized = normalizeNumberString(e.target.value);
        setAmount(normalized ? Number(normalized).toLocaleString() : '');
        setResults(null);
        setErrorMsg('');
    }, []);

    const runCalculation = useCallback((inputAmount: string) => {
        setErrorMsg('');
        const validation = validateGiftAmount(inputAmount);
        if (!validation.ok) {
            setErrorMsg(validation.error);
            setResults(null);
            return { amount: 0 };
        }

        const rows = calculate(validation.amount, giftType);
        if (validateResults(rows)) {
            setErrorMsg(CALC_ERROR);
            setResults(null);
            return { amount: 0 };
        }
        setResults(rows);
        return { amount: validation.amount };
    }, [giftType, calculate, validateResults]);

    const handleCalculate = useCallback(() => runCalculation(amount), [amount, runCalculation]);

    const handleGiftTypeChange = useCallback((value: GiftType) => {
        setGiftType(value);
        setResults(null);
        setErrorMsg('');
    }, []);

    const handleSample = useCallback(() => {
        const sampleAmount = '10,000,000';
        setAmount(sampleAmount);
        return runCalculation(sampleAmount);
    }, [runCalculation]);

    const handleReset = useCallback(() => {
        setAmount('');
        setGiftType('special');
        setResults(null);
        setErrorMsg('');
    }, []);

    return {
        amount, setAmount: handleAmountChange,
        giftType, setGiftType: handleGiftTypeChange,
        results, errorMsg,
        handleCalculate, handleSample, handleReset,
    };
};
