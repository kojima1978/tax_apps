import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { formatInputValue, parseFormattedNumber } from '@/lib/utils';
import { saveValuations, loadValuations } from '@/lib/valuation-storage';

export const useRegistrationTaxForm = () => {
    // 共通設定
    const [includeLand, setIncludeLand] = useState(true);
    const [includeBuilding, setIncludeBuilding] = useState(true);
    const [transactionType, setTransactionType] = useState<TransactionType>('purchase');

    // 土地（評価額のみ）
    const [landValuation, setLandValuation] = useState('');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);

    // 結果
    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<TaxResults | null>(null);

    // 評価額をlocalStorageに保存
    useEffect(() => {
        saveValuations('registration-tax', { landValuation, buildingValuation });
    }, [landValuation, buildingValuation]);

    // 取得税ページの評価額を引用
    const importValuations = useCallback(() => {
        const data = loadValuations('acquisition-tax');
        if (!data) return;
        if (data.landValuation) setLandValuation(data.landValuation);
        if (data.buildingValuation) setBuildingValuation(data.buildingValuation);
    }, []);

    const handleFormattedInput = useCallback((
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setter(formatInputValue(e.target.value));
    }, []);

    const calculateTax = useCallback(() => {
        const result = calculateRealEstateTax({
            includeLand,
            includeBuilding,
            landValuation: parseFormattedNumber(landValuation),
            buildingValuation: parseFormattedNumber(buildingValuation),
            transactionType,
            landType: 'residential',
            landArea: 0,
            buildingArea: 0,
            isResidential,
            hasHousingCertificate,
            acquisitionDeduction: 0,
        });
        setResults(result);
    }, [
        includeLand, includeBuilding, landValuation, buildingValuation,
        transactionType, isResidential, hasHousingCertificate
    ]);

    return {
        transactionType, setTransactionType,
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        handleFormattedInput,
        landValuation, setLandValuation,
        buildingValuation, setBuildingValuation,
        isResidential, setIsResidential,
        hasHousingCertificate, setHasHousingCertificate,
        results, showDetails, setShowDetails, calculateTax,
        importValuations,
    };
};
