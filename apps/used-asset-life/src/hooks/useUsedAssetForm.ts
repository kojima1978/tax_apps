import { useState, useCallback, useMemo, useEffect } from "react";
import { type AssetType, type UsedAssetResult, calcUsedAssetLife } from "@/lib/used-asset-life";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";

/**
 * 2つの日付間の経過年数・月数を計算する
 */
function calcElapsedFromDates(startDate: string, endDate: string): { years: number; months: number } | null {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();

    if (end.getDate() < start.getDate()) {
        months--;
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months };
}

export const useUsedAssetForm = () => {
    const [assetType, setAssetType] = useState<AssetType>('building');
    const [statutoryLife, setStatutoryLife] = useState('');
    const [elapsedYears, setElapsedYears] = useState('');
    const [elapsedMonths, setElapsedMonths] = useState('');
    const [newDate, setNewDate] = useState('');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [autoCalcEnabled, setAutoCalcEnabled] = useState(false);
    const [acquisitionCost, setAcquisitionCost] = useState('');
    const [renovationCost, setRenovationCost] = useState('');
    const [result, setResult] = useState<UsedAssetResult | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // 日付から経過年数を自動計算
    useEffect(() => {
        const elapsed = calcElapsedFromDates(newDate, acquisitionDate);
        if (elapsed) {
            setElapsedYears(String(elapsed.years));
            setElapsedMonths(String(elapsed.months));
            setAutoCalcEnabled(true);
            if (result) setIsDirty(true);
        } else {
            if (autoCalcEnabled && !newDate && !acquisitionDate) {
                setAutoCalcEnabled(false);
            }
        }
    }, [newDate, acquisitionDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const canCalculate = useMemo(() => {
        const life = parseIntInput(statutoryLife);
        const years = parseIntInput(elapsedYears);
        const months = parseIntInput(elapsedMonths);
        return life > 0 && (years > 0 || months > 0);
    }, [statutoryLife, elapsedYears, elapsedMonths]);

    const markDirty = useCallback(() => {
        if (result) setIsDirty(true);
    }, [result]);

    const handleStatutoryLife = useCallback((val: string) => {
        setStatutoryLife(val);
        markDirty();
    }, [markDirty]);

    const handleElapsedYears = useCallback((val: string) => {
        setElapsedYears(val);
        setAutoCalcEnabled(false);
        setNewDate('');
        setAcquisitionDate('');
        markDirty();
    }, [markDirty]);

    const handleElapsedMonths = useCallback((val: string) => {
        const num = parseIntInput(val);
        setElapsedMonths(num > 11 ? '11' : val);
        setAutoCalcEnabled(false);
        setNewDate('');
        setAcquisitionDate('');
        markDirty();
    }, [markDirty]);

    const handleNewDate = useCallback((val: string) => {
        setNewDate(val);
        markDirty();
    }, [markDirty]);

    const handleAcquisitionDate = useCallback((val: string) => {
        setAcquisitionDate(val);
        markDirty();
    }, [markDirty]);

    const handleAcquisitionCost = useCallback((val: string) => {
        setAcquisitionCost(formatInputValue(val));
        markDirty();
    }, [markDirty]);

    const handleRenovationCost = useCallback((val: string) => {
        setRenovationCost(formatInputValue(val));
        markDirty();
    }, [markDirty]);

    const handleAssetType = useCallback((val: AssetType) => {
        setAssetType(val);
        markDirty();
    }, [markDirty]);

    const handleCalculate = useCallback(() => {
        if (!canCalculate) return;

        const calcResult = calcUsedAssetLife({
            assetType,
            statutoryLife: parseIntInput(statutoryLife),
            elapsedYears: parseIntInput(elapsedYears),
            elapsedMonths: parseIntInput(elapsedMonths),
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            renovationCost: parseFormattedNumber(renovationCost),
        });

        setResult(calcResult);
        setIsDirty(false);
    }, [canCalculate, assetType, statutoryLife, elapsedYears, elapsedMonths, acquisitionCost, renovationCost]);

    const handleClear = useCallback(() => {
        setAssetType('building');
        setStatutoryLife('');
        setElapsedYears('');
        setElapsedMonths('');
        setNewDate('');
        setAcquisitionDate('');
        setAutoCalcEnabled(false);
        setAcquisitionCost('');
        setRenovationCost('');
        setResult(null);
        setIsDirty(false);
    }, []);

    return {
        formProps: {
            assetType,
            statutoryLife,
            elapsedYears,
            elapsedMonths,
            newDate,
            acquisitionDate,
            autoCalcEnabled,
            acquisitionCost,
            renovationCost,
            canCalculate,
            onAssetTypeChange: handleAssetType,
            onStatutoryLifeChange: handleStatutoryLife,
            onElapsedYearsChange: handleElapsedYears,
            onElapsedMonthsChange: handleElapsedMonths,
            onNewDateChange: handleNewDate,
            onAcquisitionDateChange: handleAcquisitionDate,
            onAcquisitionCostChange: handleAcquisitionCost,
            onRenovationCostChange: handleRenovationCost,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        result,
        isDirty,
    };
};
