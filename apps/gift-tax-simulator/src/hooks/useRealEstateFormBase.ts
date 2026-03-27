import { useState } from 'react';
import type { TransactionType } from '@/lib/real-estate-tax';
import { useFormattedInput } from './useFormattedInput';

/**
 * 不動産税フォーム共通のstate + ユーティリティ。
 * useAcquisitionTaxForm / useRegistrationTaxForm の共通部分を集約。
 */
export function useRealEstateFormBase<T>() {
    const [includeLand, setIncludeLand] = useState(false);
    const [includeBuilding, setIncludeBuilding] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>('gift');

    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<T | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFormattedInput = useFormattedInput();

    return {
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        transactionType, setTransactionType,
        showDetails, setShowDetails,
        results, setResults,
        errorMsg, setErrorMsg,
        handleFormattedInput,
    };
}
