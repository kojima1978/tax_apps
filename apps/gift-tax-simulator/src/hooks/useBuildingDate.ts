import { useState, useEffect, useMemo } from 'react';
import {
    calculateBuildingDeduction,
    getWareki,
    parseYearInput,
    type TransactionType,
} from '@/lib/real-estate-tax';
import { formatInputValue, formatYen } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const MIN_YEAR = 1900;

// 候補一覧（新しい順）。datalist の補完用で、直接入力もできる
export const YEAR_OPTIONS: number[] = Array.from(
    { length: currentYear - MIN_YEAR + 1 },
    (_, i) => currentYear - i,
);

const YEAR_FORMAT_HINT = '西暦4桁（1985）または和暦（昭和60 / S60）で入力';
const YEAR_FORMAT_ERROR = `※${YEAR_FORMAT_HINT}してください。`;
const YEAR_RANGE_ERROR = `※${MIN_YEAR}年〜${currentYear}年の範囲で入力してください。`;

export const useBuildingDate = (
    transactionType: TransactionType,
    isResidential: boolean,
    isLongLifeQuality: boolean,
) => {
    // 打った文字列をそのまま保持し、西暦年は解決結果として導出する
    const [yearInput, setYearInput] = useState('');
    const [selMonth, setSelMonth] = useState('');
    const [selDay, setSelDay] = useState('');
    const [buildingDate, setBuildingDate] = useState('');
    const [acquisitionDeduction, setAcquisitionDeduction] = useState('');
    const [deductionMessage, setDeductionMessage] = useState('');

    const { selYear, yearError, yearHint } = useMemo(() => {
        if (!yearInput.trim()) {
            return { selYear: '', yearError: '', yearHint: YEAR_FORMAT_HINT };
        }
        const parsed = parseYearInput(yearInput);
        if (parsed === null) {
            return { selYear: '', yearError: YEAR_FORMAT_ERROR, yearHint: '' };
        }
        if (parsed < MIN_YEAR || parsed > currentYear) {
            return { selYear: '', yearError: YEAR_RANGE_ERROR, yearHint: '' };
        }
        return { selYear: String(parsed), yearError: '', yearHint: `${parsed}年 (${getWareki(parsed)})` };
    }, [yearInput]);

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
        const result = calculateBuildingDeduction(buildingDate, transactionType, isResidential, isLongLifeQuality);
        setAcquisitionDeduction(formatInputValue(result.deduction));
        if (result.deduction > 0) {
            setDeductionMessage(`建築時期により自動設定: ${formatYen(result.deduction)} (${result.message})`);
        } else {
            setDeductionMessage(result.message);
        }
    }, [buildingDate, transactionType, isResidential, isLongLifeQuality]);

    return {
        yearInput, setYearInput,
        selYear, yearError, yearHint,
        selMonth, setSelMonth,
        selDay, setSelDay,
        acquisitionDeduction, setAcquisitionDeduction,
        deductionMessage,
    };
};
