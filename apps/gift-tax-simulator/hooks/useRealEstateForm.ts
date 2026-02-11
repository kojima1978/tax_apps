import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    calculateRealEstateTax,
    calculateBuildingDeduction,
    type TaxResults,
    type TransactionType,
    type LandType,
} from '@/lib/real-estate-tax';
import { formatInputValue, parseFormattedNumber, formatYen } from '@/lib/utils';

export const useRealEstateForm = () => {
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            years.push(y);
        }
        return years;
    }, []);

    // 共通設定
    const [includeLand, setIncludeLand] = useState(true);
    const [includeBuilding, setIncludeBuilding] = useState(true);
    const [transactionType, setTransactionType] = useState<TransactionType>('purchase');

    // 土地
    const [landValuation, setLandValuation] = useState('');
    const [landArea, setLandArea] = useState('');
    const [landType, setLandType] = useState<LandType>('residential');

    // 建物
    const [buildingValuation, setBuildingValuation] = useState('');
    const [buildingArea, setBuildingArea] = useState('');
    const [selYear, setSelYear] = useState('');
    const [selMonth, setSelMonth] = useState('');
    const [selDay, setSelDay] = useState('');
    const [buildingDate, setBuildingDate] = useState('');
    const [isResidential, setIsResidential] = useState(true);
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);
    const [acquisitionDeduction, setAcquisitionDeduction] = useState('');
    const [deductionMessage, setDeductionMessage] = useState('');

    // 結果
    const [showDetails, setShowDetails] = useState(false);
    const [results, setResults] = useState<TaxResults | null>(null);

    const handleFormattedInput = useCallback((
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setter(formatInputValue(e.target.value));
    }, []);

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

    // 税額の自動計算
    const calculateTax = useCallback(() => {
        const result = calculateRealEstateTax({
            includeLand,
            includeBuilding,
            landValuation: parseFormattedNumber(landValuation),
            buildingValuation: parseFormattedNumber(buildingValuation),
            transactionType,
            landType,
            landArea: parseFormattedNumber(landArea),
            buildingArea: parseFormattedNumber(buildingArea),
            isResidential,
            hasHousingCertificate,
            acquisitionDeduction: parseFormattedNumber(acquisitionDeduction),
        });
        setResults(result);
    }, [
        includeLand, includeBuilding, landValuation, buildingValuation,
        transactionType, landType, landArea, buildingArea,
        isResidential, hasHousingCertificate, acquisitionDeduction
    ]);

    return {
        // 共通
        transactionType, setTransactionType,
        includeLand, setIncludeLand,
        includeBuilding, setIncludeBuilding,
        handleFormattedInput,

        // 土地
        landValuation, setLandValuation,
        landArea, setLandArea,
        landType, setLandType,

        // 建物
        buildingValuation, setBuildingValuation,
        buildingArea, setBuildingArea,
        selYear, setSelYear,
        selMonth, setSelMonth,
        selDay, setSelDay,
        isResidential, setIsResidential,
        hasHousingCertificate, setHasHousingCertificate,
        acquisitionDeduction, setAcquisitionDeduction,
        deductionMessage,
        yearOptions,

        // 結果
        results, showDetails, setShowDetails, calculateTax,
    };
};
