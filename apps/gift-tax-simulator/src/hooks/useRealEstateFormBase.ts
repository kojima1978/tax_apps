import { useCallback, useState } from 'react';
import type { TransactionType } from '@/lib/real-estate-tax';
import { useFormattedInput } from './useFormattedInput';

/**
 * 不動産税フォーム共通のstate + ユーティリティ。
 * useAcquisitionTaxForm / useRegistrationTaxForm の共通部分を集約。
 */
export function useRealEstateFormBase<T>() {
    const [includeLand, setIncludeLandState] = useState(false);
    const [includeBuilding, setIncludeBuildingState] = useState(false);
    const [transactionType, setTransactionTypeState] = useState<TransactionType>('gift');

    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<T | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFormattedInput = useFormattedInput();

    const clearCalculatedResult = useCallback(() => {
        setResults(null);
        setErrorMsg('');
    }, []);

    const setIncludeLand = useCallback((value: boolean) => {
        setIncludeLandState(value);
        clearCalculatedResult();
    }, [clearCalculatedResult]);

    const setIncludeBuilding = useCallback((value: boolean) => {
        setIncludeBuildingState(value);
        clearCalculatedResult();
    }, [clearCalculatedResult]);

    const setTransactionType = useCallback((value: TransactionType) => {
        setTransactionTypeState(value);
        clearCalculatedResult();
    }, [clearCalculatedResult]);

    const resetBase = useCallback(() => {
        setIncludeLandState(false);
        setIncludeBuildingState(false);
        setTransactionTypeState('gift');
        setShowDetails(false);
        setResults(null);
        setErrorMsg('');
    }, []);

    return {
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        transactionType, setTransactionType,
        showDetails, setShowDetails,
        results, setResults,
        errorMsg, setErrorMsg,
        handleFormattedInput,
        resetBase, clearCalculatedResult,
    };
}
