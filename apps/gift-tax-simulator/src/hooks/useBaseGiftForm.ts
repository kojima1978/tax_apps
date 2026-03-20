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
    }, []);

    const handleCalculate = useCallback(() => {
        setErrorMsg('');
        const validation = validateGiftAmount(amount);
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
    }, [amount, giftType, calculate, validateResults]);

    return {
        amount, setAmount: handleAmountChange,
        giftType, setGiftType,
        results, errorMsg,
        handleCalculate,
    };
};
