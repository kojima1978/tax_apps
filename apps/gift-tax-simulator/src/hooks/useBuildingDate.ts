import { useState, useEffect } from 'react';
import { calculateBuildingDeduction, type TransactionType } from '@/lib/real-estate-tax';
import { formatInputValue, formatYen } from '@/lib/utils';

const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS: number[] = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, i) => currentYear - i,
);

export const useBuildingDate = (transactionType: TransactionType, isResidential: boolean) => {
    const [selYear, setSelYear] = useState('');
    const [selMonth, setSelMonth] = useState('');
    const [selDay, setSelDay] = useState('');
    const [buildingDate, setBuildingDate] = useState('');
    const [acquisitionDeduction, setAcquisitionDeduction] = useState('');
    const [deductionMessage, setDeductionMessage] = useState('');

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

    return {
        selYear, setSelYear,
        selMonth, setSelMonth,
        selDay, setSelDay,
        acquisitionDeduction, setAcquisitionDeduction,
        deductionMessage,
    };
};
