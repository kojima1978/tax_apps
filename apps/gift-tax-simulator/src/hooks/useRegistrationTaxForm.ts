import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { parseFormattedNumber } from '@/lib/utils';
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

        const hasLandInput = includeLand && landVal > 0;
        const hasBuildingInput = includeBuilding && bldgVal > 0;
        if (!hasLandInput && !hasBuildingInput) {
            setErrorMsg('※土地または建物を選択し、固定資産税評価額を入力してください。');
            setResults(null);
            return;
        }
        const MAX_VALUATION = 10_000_000_000;
        if (landVal > MAX_VALUATION || bldgVal > MAX_VALUATION) {
            setErrorMsg('※評価額は100億円以下で入力してください。');
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
        if (!isFinite(result.total) || isNaN(result.total) || result.total < 0) {
            setErrorMsg('※計算結果に異常が発生しました。入力値を確認してください。');
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
