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
    const [resultsState, setResultsState] = useState<T | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    // 入力が変わったのに再計算されていない状態。結果は消さずに「古い」印だけ付ける
    const [isStale, setIsStale] = useState(false);

    const handleFormattedInput = useFormattedInput();

    // 新しい計算結果（またはエラーによる破棄）が来たら「古い」印は解除する
    const setResults = useCallback((value: T | null) => {
        setResultsState(value);
        setIsStale(false);
    }, []);

    const markResultStale = useCallback(() => {
        setErrorMsg('');
        setIsStale(true);
    }, []);

    const setIncludeLand = useCallback((value: boolean) => {
        setIncludeLandState(value);
        markResultStale();
    }, [markResultStale]);

    const setIncludeBuilding = useCallback((value: boolean) => {
        setIncludeBuildingState(value);
        markResultStale();
    }, [markResultStale]);

    const setTransactionType = useCallback((value: TransactionType) => {
        setTransactionTypeState(value);
        markResultStale();
    }, [markResultStale]);

    const resetBase = useCallback(() => {
        setIncludeLandState(false);
        setIncludeBuildingState(false);
        setTransactionTypeState('gift');
        setShowDetails(false);
        setResultsState(null);
        setErrorMsg('');
        setIsStale(false);
    }, []);

    return {
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        transactionType, setTransactionType,
        showDetails, setShowDetails,
        results: resultsState, setResults,
        errorMsg, setErrorMsg,
        isStale,
        handleFormattedInput,
        resetBase, markResultStale,
    };
}
