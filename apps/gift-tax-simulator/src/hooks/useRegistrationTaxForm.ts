import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
} from '@/lib/real-estate-tax';
import { formatInputValue, parseFormattedNumber, parseShare } from '@/lib/utils';
import { validateRealEstateInput, validateResult } from '@/lib/validate-real-estate';
import {
    applyIfPresent,
    saveRealEstateInputs,
    type RealEstateInputs,
} from '@/lib/real-estate-input-storage';
import { REAL_ESTATE_SAMPLE } from '@/lib/real-estate-sample';
import { useRealEstateImport } from './useRealEstateImport';
import { useRealEstateFormBase } from './useRealEstateFormBase';
import { useSampleFill } from './useSampleFill';

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

    // 入力が変わったら結果を消さずに「再計算が必要」の印を付ける
    useEffect(() => {
        base.markResultStale();
    }, [
        landValuation, buildingValuation,
        isResidential, hasHousingCertificate,
        landShareNumerator, landShareDenominator,
        buildingShareNumerator, buildingShareDenominator,
        base.markResultStale,
    ]);

    // 入力条件をlocalStorageに保存（面積・建築年月日はこのページに無いので持たない）
    useEffect(() => {
        saveRealEstateInputs('registration-tax', {
            landValuation,
            buildingValuation,
            isResidential,
            hasHousingCertificate,
            landShareNumerator,
            landShareDenominator,
            buildingShareNumerator,
            buildingShareDenominator,
        });
    }, [landValuation, buildingValuation, isResidential, hasHousingCertificate,
        landShareNumerator, landShareDenominator, buildingShareNumerator, buildingShareDenominator]);

    // 宅地とその他を区別しないので、引用元が分けて持っていれば合算して受け取る
    const applyLand = useCallback((data: RealEstateInputs) => {
        const total = parseFormattedNumber(data.landValuation) + parseFormattedNumber(data.otherLandValuation ?? '');
        applyIfPresent(setLandValuation, total > 0 ? formatInputValue(total) : '');
        applyIfPresent(setLandShareNumerator, data.landShareNumerator);
        applyIfPresent(setLandShareDenominator, data.landShareDenominator);
    }, []);

    const applyBuilding = useCallback((data: RealEstateInputs) => {
        applyIfPresent(setBuildingValuation, data.buildingValuation);
        applyIfPresent(setIsResidential, data.isResidential);
        applyIfPresent(setHasHousingCertificate, data.hasHousingCertificate);
        applyIfPresent(setBuildingShareNumerator, data.buildingShareNumerator);
        applyIfPresent(setBuildingShareDenominator, data.buildingShareDenominator);
    }, []);

    const importFrom = useRealEstateImport(applyLand, applyBuilding);

    const resetForm = useCallback(() => {
        base.resetBase();
        setLandValuation('');
        setBuildingValuation('');
        setIsResidential(true);
        setHasHousingCertificate(true);
        setLandShareNumerator('1');
        setLandShareDenominator('1');
        setBuildingShareNumerator('1');
        setBuildingShareDenominator('1');
    }, [base.resetBase]);

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
            landShare: parseShare(landShareNumerator, landShareDenominator),
            buildingShare: parseShare(buildingShareNumerator, buildingShareDenominator),
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

    const fillSample = useSampleFill(calculateTax);

    // 不動産取得税ページと同じ物件を入れる（取り込みを試しても金額が食い違わない）
    const handleSample = useCallback(() => fillSample(() => {
        base.setTransactionType('gift');
        base.setIncludeLand(true);
        base.setIncludeBuilding(true);
        setLandValuation(REAL_ESTATE_SAMPLE.landValuation);
        setBuildingValuation(REAL_ESTATE_SAMPLE.buildingValuation);
        setIsResidential(true);
        setHasHousingCertificate(true);
        setLandShareNumerator('1');
        setLandShareDenominator('1');
        setBuildingShareNumerator('1');
        setBuildingShareDenominator('1');
    }), [fillSample, base.setTransactionType, base.setIncludeLand, base.setIncludeBuilding]);

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
        resetForm,
        handleSample,
        importFrom,
    };
};
