import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { parseFormattedNumber } from '@/lib/utils';
import { validateRealEstateInput, validateResult } from '@/lib/validate-real-estate';
import { saveValuations } from '@/lib/valuation-storage';
import { useFormattedInput } from './useFormattedInput';
import { useValuationImport } from './useValuationImport';

export const useRegistrationTaxForm = () => {
    // 共通設定
    const [includeLand, setIncludeLand] = useState(false);
    const [includeBuilding, setIncludeBuilding] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>('gift');

    // 土地（評価額のみ）
    const [landValuation, setLandValuation] = useState('');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);

    // 結果
    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<TaxResults | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 評価額をlocalStorageに保存
    useEffect(() => {
        saveValuations('registration-tax', { landValuation, buildingValuation });
    }, [landValuation, buildingValuation]);

    const { importLandValuation, importBuildingValuation } =
        useValuationImport('acquisition-tax', setLandValuation, setBuildingValuation);

    const handleFormattedInput = useFormattedInput();

    const calculateTax = useCallback(() => {
        setErrorMsg('');
        const landVal = parseFormattedNumber(landValuation);
        const bldgVal = parseFormattedNumber(buildingValuation);

        const validation = validateRealEstateInput(
            includeLand && landVal > 0,
            includeBuilding && bldgVal > 0,
            [landVal, bldgVal],
        );
        if (!validation.ok) {
            setErrorMsg(validation.error);
            setResults(null);
            return;
        }

        const result = calculateRealEstateTax({
            includeLand,
            includeBuilding,
            landValuation: landVal,
            buildingValuation: bldgVal,
            transactionType,
            landType: 'residential',
            landArea: 0,
            buildingArea: 0,
            isResidential,
            hasHousingCertificate,
            acquisitionDeduction: 0,
        });
        const resultError = validateResult(result.total);
        if (resultError) {
            setErrorMsg(resultError);
            setResults(null);
            return;
        }
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
        errorMsg,
        importLandValuation, importBuildingValuation,
    };
};
