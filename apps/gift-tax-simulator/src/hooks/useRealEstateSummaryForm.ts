import { useState, useEffect, useCallback } from 'react';
import { calculateRealEstateTax, type TaxResults, type TransactionType } from '@/lib/real-estate-tax';
import { calculateAcquisitionBreakdown, type AcquisitionResults } from '@/lib/acquisition-breakdown';
import { parseFormattedNumber, parseDecimalNumber, parseShare } from '@/lib/utils';
import { validateRealEstateInput, validateResult, validateBuildingArea } from '@/lib/validate-real-estate';
import { useRealEstateFormBase } from './useRealEstateFormBase';
import { useRealEstateInputs } from './useRealEstateInputs';
import { useRealEstateInputSync } from './useRealEstateInputSync';
import { useSampleFill } from './useSampleFill';
import type { TokushimaBuildingStructure, TokushimaBuildingUse } from '@/lib/tokushima-new-building';

/** 同じ物件に対する不動産取得税と登録免許税を並べて持つ */
export type RealEstateSummaryResults = {
    acquisition: AcquisitionResults;
    registration: TaxResults;
    total: number;
};

/**
 * 不動産取得税と登録免許税を1つの入力からまとめて計算する。
 * 税額の中身は各ページと同じ関数（calculateAcquisitionBreakdown / calculateRealEstateTax）を
 * 呼ぶだけなので、こちらだけ金額が食い違うことはない。
 */
export const useRealEstateSummaryForm = () => {
    const base = useRealEstateFormBase<RealEstateSummaryResults>();
    const { includeLand, includeBuilding, setErrorMsg, setResults } = base;
    const [landTransactionType, setLandTransactionType] = useState<TransactionType>('gift');
    const [buildingTransactionType, setBuildingTransactionType] = useState<TransactionType>('gift');
    const [newBuildingUse, setNewBuildingUse] = useState<TokushimaBuildingUse>('residence');
    const [newBuildingStructure, setNewBuildingStructure] = useState<TokushimaBuildingStructure>('wood');
    const inputs = useRealEstateInputs(buildingTransactionType);

    // 登録免許税だけが使う条件
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);

    // 面積警告
    const [areaWarning, setAreaWarning] = useState('');

    // 入力条件の保存と、他ページからの引用。住宅用家屋証明書も運ぶ
    const importFrom = useRealEstateInputSync('real-estate-summary', inputs, {
        hasHousingCertificate,
        setHasHousingCertificate,
    });

    // 入力が変わったら結果を消さずに「再計算が必要」の印を付ける
    useEffect(() => {
        base.markResultStale();
    }, [
        inputs.resLandValuation, inputs.resLandArea, inputs.otherLandValuation,
        inputs.buildingValuation, inputs.buildingArea, inputs.isResidential, inputs.isLongLifeQuality,
        inputs.landShareNumerator, inputs.landShareDenominator,
        inputs.buildingShareNumerator, inputs.buildingShareDenominator,
        inputs.selYear, inputs.selMonth, inputs.selDay,
        hasHousingCertificate,
        landTransactionType, buildingTransactionType,
        base.markResultStale,
    ]);

    const resetForm = useCallback(() => {
        base.resetBase();
        inputs.resetInputs();
        setLandTransactionType('gift');
        setBuildingTransactionType('gift');
        setNewBuildingUse('residence');
        setNewBuildingStructure('wood');
        setHasHousingCertificate(true);
        setAreaWarning('');
    }, [base.resetBase, inputs.resetInputs]);

    const calculateTax = useCallback(() => {
        setErrorMsg('');
        const resVal = parseFormattedNumber(inputs.resLandValuation);
        const otherVal = parseFormattedNumber(inputs.otherLandValuation);
        const bldgVal = parseFormattedNumber(inputs.buildingValuation);
        const bArea = parseDecimalNumber(inputs.buildingArea);
        const rArea = parseDecimalNumber(inputs.resLandArea);

        const validation = validateRealEstateInput(
            includeLand && (resVal > 0 || otherVal > 0),
            includeBuilding && bldgVal > 0,
            [resVal, otherVal, bldgVal],
        );
        if (!validation.ok) {
            setErrorMsg(validation.error);
            setResults(null);
            return;
        }

        // 面積要件チェック（警告のみ、計算は続行）
        setAreaWarning(validateBuildingArea(bArea) ?? '');

        const landShare = parseShare(inputs.landShareNumerator, inputs.landShareDenominator);
        const buildingShare = parseShare(inputs.buildingShareNumerator, inputs.buildingShareDenominator);
        const acquisitionDeduction = parseFormattedNumber(inputs.acquisitionDeduction);

        const acquisition = calculateAcquisitionBreakdown({
            includeLand,
            includeBuilding,
            resLandValuation: resVal,
            otherLandValuation: otherVal,
            resLandArea: rArea,
            buildingValuation: bldgVal,
            buildingArea: bArea,
            transactionType: landTransactionType,
            landTransactionType,
            buildingTransactionType,
            isResidential: inputs.isResidential,
            acquisitionDeduction,
            landShare,
            buildingShare,
        });

        // 登録免許税は宅地とその他を区別しないので、土地は合算して1回で計算する
        const registration = calculateRealEstateTax({
            includeLand,
            includeBuilding,
            landValuation: resVal + otherVal,
            buildingValuation: bldgVal,
            transactionType: landTransactionType,
            landTransactionType,
            buildingTransactionType,
            landType: 'residential',
            landArea: 0,
            buildingArea: 0,
            isResidential: inputs.isResidential,
            hasHousingCertificate,
            acquisitionDeduction: 0,
            landShare,
            buildingShare,
        });

        const total = acquisition.total + registration.totalReg;
        const resultError = validateResult(total);
        if (resultError) {
            setErrorMsg(resultError);
            setResults(null);
            return;
        }
        setResults({ acquisition, registration, total });
    }, [
        includeLand, includeBuilding,
        inputs.resLandValuation, inputs.resLandArea,
        inputs.otherLandValuation,
        inputs.buildingValuation, inputs.buildingArea,
        landTransactionType, buildingTransactionType,
        inputs.isResidential, inputs.isLongLifeQuality,
        inputs.acquisitionDeduction,
        inputs.landShareNumerator, inputs.landShareDenominator,
        inputs.buildingShareNumerator, inputs.buildingShareDenominator,
        hasHousingCertificate,
    ]);

    const fillSample = useSampleFill(calculateTax);

    const handleSample = useCallback(() => fillSample(() => {
        setLandTransactionType('gift');
        setBuildingTransactionType('gift');
        setNewBuildingUse('residence');
        setNewBuildingStructure('wood');
        base.setIncludeLand(true);
        base.setIncludeBuilding(true);
        inputs.applySample();
        setHasHousingCertificate(true);
    }), [
        fillSample,
        base.setIncludeLand, base.setIncludeBuilding,
        inputs.applySample,
    ]);

    return {
        ...base,
        ...inputs,
        landTransactionType, setLandTransactionType,
        buildingTransactionType, setBuildingTransactionType,
        newBuildingUse, setNewBuildingUse,
        newBuildingStructure, setNewBuildingStructure,
        hasHousingCertificate, setHasHousingCertificate,
        areaWarning,
        calculateTax,
        resetForm,
        handleSample,
        importFrom,
    };
};
