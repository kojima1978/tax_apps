import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    calculateRealEstateTax,
    calculateBuildingDeduction,
    type TaxResults,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { formatInputValue, parseFormattedNumber, formatYen } from '@/lib/utils';
import { saveValuations } from '@/lib/valuation-storage';
import { useFormattedInput } from './useFormattedInput';
import { useValuationImport } from './useValuationImport';

export type AcquisitionResults = TaxResults & {
    resLandAcq: number;
    otherLandAcq: number;
};

export const useAcquisitionTaxForm = () => {
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            years.push(y);
        }
        return years;
    }, []);

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
    const [selYear, setSelYear] = useState('');
    const [selMonth, setSelMonth] = useState('');
    const [selDay, setSelDay] = useState('');
    const [buildingDate, setBuildingDate] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [acquisitionDeduction, setAcquisitionDeduction] = useState('');
    const [deductionMessage, setDeductionMessage] = useState('');

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

    // 建築年月日の組み立て
    useEffect(() => {
        if (selYear && selMonth && selDay) {
            const m = selMonth.padStart(2, '0');
            const d = selDay.padStart(2, '0');
            setBuildingDate(`${selYear}-${m}-${d}`);
        } else {
            setBuildingDate('');
        }
    }, [selYear, selMonth, selDay]);

    // 建物控除額の自動計算
    useEffect(() => {
        const result = calculateBuildingDeduction(buildingDate, transactionType, isResidential);
        setAcquisitionDeduction(formatInputValue(result.deduction));
        if (result.deduction > 0) {
            setDeductionMessage(`建築時期により自動設定: ${formatYen(result.deduction)} (${result.message})`);
        } else {
            setDeductionMessage(result.message);
        }
    }, [buildingDate, transactionType, isResidential]);

    const calculateTax = useCallback(() => {
        setErrorMsg('');
        const resVal = parseFormattedNumber(resLandValuation);
        const otherVal = parseFormattedNumber(otherLandValuation);
        const bldgVal = parseFormattedNumber(buildingValuation);
        const bArea = parseFormattedNumber(buildingArea);

        const hasLandInput = includeLand && (resVal > 0 || otherVal > 0);
        const hasBuildingInput = includeBuilding && bldgVal > 0;
        if (!hasLandInput && !hasBuildingInput) {
            setErrorMsg('※土地または建物を選択し、固定資産税評価額を入力してください。');
            setResults(null);
            return;
        }
        const MAX_VALUATION = 10_000_000_000;
        if (resVal > MAX_VALUATION || otherVal > MAX_VALUATION || bldgVal > MAX_VALUATION) {
            setErrorMsg('※評価額は100億円以下で入力してください。');
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
            acquisitionDeduction: parseFormattedNumber(acquisitionDeduction),
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
        if (!isFinite(total) || isNaN(total) || total < 0) {
            setErrorMsg('※計算結果に異常が発生しました。入力値を確認してください。');
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
        transactionType, isResidential, acquisitionDeduction
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
        selYear, setSelYear,
        selMonth, setSelMonth,
        selDay, setSelDay,
        isResidential, setIsResidential,
        acquisitionDeduction, setAcquisitionDeduction,
        deductionMessage,
        yearOptions,
        results, showDetails, setShowDetails, calculateTax,
        errorMsg,
        importLandValuation, importBuildingValuation,
    };
};
