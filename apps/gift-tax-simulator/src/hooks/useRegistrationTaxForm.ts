import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
} from '@/lib/real-estate-tax';
import { parseFormattedNumber } from '@/lib/utils';
import { validateRealEstateInput, validateResult } from '@/lib/validate-real-estate';
import { saveValuations } from '@/lib/valuation-storage';
import { useValuationImport } from './useValuationImport';
import { useRealEstateFormBase } from './useRealEstateFormBase';

export const useRegistrationTaxForm = () => {
    const base = useRealEstateFormBase<TaxResults>();
    const { includeLand, includeBuilding, transactionType, setErrorMsg, setResults } = base;

    // 土地（評価額のみ）
    const [landValuation, setLandValuation] = useState('');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);

    // 評価額をlocalStorageに保存
    useEffect(() => {
        saveValuations('registration-tax', { landValuation, buildingValuation });
    }, [landValuation, buildingValuation]);

    const { importLandValuation, importBuildingValuation } =
        useValuationImport('acquisition-tax', setLandValuation, setBuildingValuation);

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
        ...base,
        landValuation, setLandValuation,
        buildingValuation, setBuildingValuation,
        isResidential, setIsResidential,
        hasHousingCertificate, setHasHousingCertificate,
        calculateTax,
        importLandValuation, importBuildingValuation,
    };
};
