import { useState, useCallback } from 'react';
import { type GiftType } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';
import { validateGiftAmount } from '@/lib/validate-gift-amount';
import { useGiftInput } from '@/contexts/GiftInputContext';

const CALC_ERROR = '※計算結果に異常が発生しました。入力値を確認してください。';

type Calculate<T> = (amount: number, giftType: GiftType) => T[];

/**
 * 他ページで計算済みの入力を引き継いだ場合に、遷移直後の結果を復元する。
 * 入力は共有されるのに結果だけ消えて「計算する」を押し直させるのを避けるためのもので、
 * 未計算・入力が無効なら null を返して空状態のままにする。
 */
const restoreResults = <T>(
    amount: string,
    giftType: GiftType,
    isCalculated: boolean,
    calculate: Calculate<T>,
    validateResults: (results: T[]) => boolean,
): { results: T[] | null; amount: number } => {
    if (!isCalculated) return { results: null, amount: 0 };

    const validation = validateGiftAmount(amount);
    if (!validation.ok) return { results: null, amount: 0 };

    const rows = calculate(validation.amount, giftType);
    if (validateResults(rows)) return { results: null, amount: 0 };

    return { results: rows, amount: validation.amount };
};

export const useBaseGiftForm = <T>(
    calculate: Calculate<T>,
    validateResults: (results: T[]) => boolean,
) => {
    const {
        amount,
        giftType,
        isCalculated,
        setAmount: setSharedAmount,
        setGiftType: setSharedGiftType,
        markCalculated,
        resetInput,
    } = useGiftInput();

    const [restored] = useState(() =>
        restoreResults(amount, giftType, isCalculated, calculate, validateResults));
    const [results, setResults] = useState<T[] | null>(restored.results);
    // 直近に計算が成立した金額。分割の元になる贈与総額の表示に使う
    const [calculatedAmount, setCalculatedAmount] = useState(restored.amount);
    const [errorMsg, setErrorMsg] = useState('');

    const clearResults = useCallback(() => {
        setResults(null);
        setCalculatedAmount(0);
        setErrorMsg('');
    }, []);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const normalized = normalizeNumberString(e.target.value);
        setSharedAmount(normalized ? Number(normalized).toLocaleString() : '');
        clearResults();
    }, [setSharedAmount, clearResults]);

    const runCalculation = useCallback((inputAmount: string) => {
        setErrorMsg('');
        const validation = validateGiftAmount(inputAmount);
        if (!validation.ok) {
            setErrorMsg(validation.error);
            setResults(null);
            setCalculatedAmount(0);
            return { amount: 0 };
        }

        const rows = calculate(validation.amount, giftType);
        if (validateResults(rows)) {
            setErrorMsg(CALC_ERROR);
            setResults(null);
            setCalculatedAmount(0);
            return { amount: 0 };
        }
        setResults(rows);
        setCalculatedAmount(validation.amount);
        markCalculated();
        return { amount: validation.amount };
    }, [giftType, calculate, validateResults, markCalculated]);

    const handleCalculate = useCallback(() => runCalculation(amount), [amount, runCalculation]);

    const handleGiftTypeChange = useCallback((value: GiftType) => {
        setSharedGiftType(value);
        clearResults();
    }, [setSharedGiftType, clearResults]);

    const handleSample = useCallback(() => {
        const sampleAmount = '10,000,000';
        setSharedAmount(sampleAmount);
        return runCalculation(sampleAmount);
    }, [setSharedAmount, runCalculation]);

    const handleReset = useCallback(() => {
        resetInput();
        clearResults();
    }, [resetInput, clearResults]);

    return {
        amount, setAmount: handleAmountChange,
        giftType, setGiftType: handleGiftTypeChange,
        results, errorMsg, calculatedAmount,
        handleCalculate, handleSample, handleReset,
    };
};
