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

    // 持ち分
    const [landShareNumerator, setLandShareNumerator] = useState('1');
    const [landShareDenominator, setLandShareDenominator] = useState('1');
    const [buildingShareNumerator, setBuildingShareNumerator] = useState('1');
    const [buildingShareDenominator, setBuildingShareDenominator] = useState('1');

    // 評価額をlocalStorageに保存
    useEffect(() => {
        saveValuations('registration-tax', {
            landValuation,
            buildingValuation,
            landShareNumerator,
            landShareDenominator,
            buildingShareNumerator,
            buildingShareDenominator,
        });
    }, [landValuation, buildingValuation,
        landShareNumerator, landShareDenominator, buildingShareNumerator, buildingShareDenominator]);

    const { importLandValuation, importBuildingValuation } =
        useValuationImport('acquisition-tax', setLandValuation, setBuildingValuation,
            setLandShareNumerator, setLandShareDenominator, setBuildingShareNumerator, setBuildingShareDenominator);

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

        const lN = Math.max(1, parseInt(landShareNumerator) || 1);
        const lD = Math.max(1, parseInt(landShareDenominator) || 1);
        const bN = Math.max(1, parseInt(buildingShareNumerator) || 1);
        const bD = Math.max(1, parseInt(buildingShareDenominator) || 1);

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
            landShare: { n: lN, d: lD },
            buildingShare: { n: bN, d: bD },
        });

        const resultError = validateResult(result.totalReg);
        if (resultError) {
            setErrorMsg(resultError);
            setResults(null);
            return;
        }
        setResults({ ...result, total: result.totalReg });
    }, [
        includeLand, includeBuilding, landValuation, buildingValuation,
        transactionType, isResidential, hasHousingCertificate,
        landShareNumerator, landShareDenominator,
        buildingShareNumerator, buildingShareDenominator,
    ]);

    return {
        ...base,
        landValuation, setLandValuation,
        buildingValuation, setBuildingValuation,
        isResidential, setIsResidential,
        hasHousingCertificate, setHasHousingCertificate,
        landShareNumerator, setLandShareNumerator,
        landShareDenominator, setLandShareDenominator,
        buildingShareNumerator, setBuildingShareNumerator,
        buildingShareDenominator, setBuildingShareDenominator,
        calculateTax,
        importLandValuation, importBuildingValuation,
    };
};
