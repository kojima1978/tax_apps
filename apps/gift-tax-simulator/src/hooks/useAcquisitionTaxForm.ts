import { useState, useEffect, useCallback } from 'react';
import {
    calculateRealEstateTax,
    type TaxResults,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { formatInputValue, parseFormattedNumber } from '@/lib/utils';
import { validateRealEstateInput, validateResult } from '@/lib/validate-real-estate';
import { saveValuations } from '@/lib/valuation-storage';
import { useFormattedInput } from './useFormattedInput';
import { useValuationImport } from './useValuationImport';
import { useBuildingDate, YEAR_OPTIONS } from './useBuildingDate';

export type AcquisitionResults = TaxResults & {
    resLandAcq: number;
    otherLandAcq: number;
};

export const useAcquisitionTaxForm = () => {
    // 共通設定
    const [includeLand, setIncludeLand] = useState(false);
    const [includeBuilding, setIncludeBuilding] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>('gift');

    // 土地（宅地）
    const [resLandValuation, setResLandValuation] = useState('');
    const [resLandArea, setResLandArea] = useState('');

    // 土地（その他）
    const [otherLandValuation, setOtherLandValuation] = useState('');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [buildingArea, setBuildingArea] = useState('');
    const [isResidential, setIsResidential] = useState(true);

    // 建築年月日・控除額
    const buildingDate = useBuildingDate(transactionType, isResidential);

    // 結果
    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<AcquisitionResults | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFormattedInput = useFormattedInput();

    // 評価額をlocalStorageに保存（土地は宅地+その他の合計値を保存）
    useEffect(() => {
        const resVal = parseFormattedNumber(resLandValuation);
        const otherVal = parseFormattedNumber(otherLandValuation);
        const total = resVal + otherVal;
        const landValuation = total > 0 ? formatInputValue(total) : '';
        saveValuations('acquisition-tax', { landValuation, buildingValuation });
    }, [resLandValuation, otherLandValuation, buildingValuation]);

    const { importLandValuation, importBuildingValuation } =
        useValuationImport('registration-tax', setResLandValuation, setBuildingValuation);

    const calculateTax = useCallback(() => {
        setErrorMsg('');
        const resVal = parseFormattedNumber(resLandValuation);
        const otherVal = parseFormattedNumber(otherLandValuation);
        const bldgVal = parseFormattedNumber(buildingValuation);
        const bArea = parseFormattedNumber(buildingArea);

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

        // 宅地の計算
        const resResult = (includeLand && resVal > 0) ? calculateRealEstateTax({
            includeLand: true,
            includeBuilding: false,
            landValuation: resVal,
            buildingValuation: 0,
            transactionType,
            landType: 'residential',
            landArea: parseFormattedNumber(resLandArea),
            buildingArea: bArea,
            isResidential: true,
            hasHousingCertificate: false,
            acquisitionDeduction: 0,
        }) : null;

        // その他（宅地以外）の計算
        const otherResult = (includeLand && otherVal > 0) ? calculateRealEstateTax({
            includeLand: true,
            includeBuilding: false,
            landValuation: otherVal,
            buildingValuation: 0,
            transactionType,
            landType: 'other',
            landArea: 0,
            buildingArea: 0,
            isResidential: false,
            hasHousingCertificate: false,
            acquisitionDeduction: 0,
        }) : null;

        // 建物の計算
        const bldgResult = (includeBuilding && bldgVal > 0) ? calculateRealEstateTax({
            includeLand: false,
            includeBuilding: true,
            landValuation: 0,
            buildingValuation: bldgVal,
            transactionType,
            landType: 'residential',
            landArea: 0,
            buildingArea: bArea,
            isResidential,
            hasHousingCertificate: false,
            acquisitionDeduction: parseFormattedNumber(buildingDate.acquisitionDeduction),
        }) : null;

        const resLandAcq = resResult?.landAcq ?? 0;
        const otherLandAcq = otherResult?.landAcq ?? 0;
        const bldgAcq = bldgResult?.bldgAcq ?? 0;

        // 計算過程を結合
        const landAcqProcess: string[] = [];
        if (resResult && resResult.process.landAcq.length > 0) {
            landAcqProcess.push('【宅地（特例あり）】');
            landAcqProcess.push(...resResult.process.landAcq);
        }
        if (otherResult && otherResult.process.landAcq.length > 0) {
            if (landAcqProcess.length > 0) landAcqProcess.push('');
            landAcqProcess.push('【その他（宅地以外）】');
            landAcqProcess.push(...otherResult.process.landAcq);
        }

        const total = resLandAcq + otherLandAcq + bldgAcq;
        const resultError = validateResult(total);
        if (resultError) {
            setErrorMsg(resultError);
            setResults(null);
            return;
        }
        setResults({
            landAcq: resLandAcq + otherLandAcq,
            bldgAcq,
            landReg: 0,
            bldgReg: 0,
            totalAcq: total,
            totalReg: 0,
            total,
            process: {
                landAcq: landAcqProcess,
                bldgAcq: bldgResult?.process.bldgAcq ?? [],
                landReg: [],
                bldgReg: [],
            },
            resLandAcq,
            otherLandAcq,
        });
    }, [
        includeLand, includeBuilding,
        resLandValuation, resLandArea,
        otherLandValuation,
        buildingValuation, buildingArea,
        transactionType, isResidential, buildingDate.acquisitionDeduction
    ]);

    return {
        transactionType, setTransactionType,
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        handleFormattedInput,
        resLandValuation, setResLandValuation,
        resLandArea, setResLandArea,
        otherLandValuation, setOtherLandValuation,
        buildingValuation, setBuildingValuation,
        buildingArea, setBuildingArea,
        ...buildingDate,
        isResidential, setIsResidential,
        yearOptions: YEAR_OPTIONS,
        results, showDetails, setShowDetails, calculateTax,
        errorMsg,
        importLandValuation, importBuildingValuation,
    };
};
