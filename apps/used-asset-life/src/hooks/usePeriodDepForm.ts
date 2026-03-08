import { useState, useCallback, useMemo, useEffect } from "react";
import {
    type DepreciationMethod,
    type DepreciationYearRow,
    calcDepreciationSchedule,
} from "@/lib/depreciation";
import { type AssetType } from "@/lib/used-asset-life";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";
import { useMethodSuggestion } from "@/hooks/useMethodSuggestion";

export type PeriodDepResult = {
    rows: DepreciationYearRow[];
    totalDepreciation: number;
    startBookValue: number;
    endBookValue: number;
    methodLabel: string;
    appliedRate: number;
    usefulLife: number;
    acquisitionCost: number;
    displayYears: number;
    startYearIndex: number;
};

export type PeriodDepCarryOverValues = {
    usefulLife: number;
    acquisitionCost: number;
    acquisitionDate: string;
    method: DepreciationMethod;
    serviceStartDate: string;
    fiscalYearEndMonth: string;
};

export const usePeriodDepForm = () => {
    const [assetType, setAssetType] = useState<AssetType>('building');
    const [acquisitionCost, setAcquisitionCost] = useState('');
    const [usefulLife, setUsefulLife] = useState('');
    const [method, setMethod] = useState<DepreciationMethod>('straight_line');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [serviceStartDate, setServiceStartDate] = useState('');
    const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState('3');
    const [startYear, setStartYear] = useState('');
    const [displayYears, setDisplayYears] = useState('5');
    const [result, setResult] = useState<PeriodDepResult | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [carriedOver, setCarriedOver] = useState(false);

    const { availableMethods, suggestedLabel, isMethodSuggested } = useMethodSuggestion(acquisitionDate, method, setMethod);

    // 事業供用日変更時にデフォルト開始年度を設定
    useEffect(() => {
        if (serviceStartDate && !startYear) {
            const year = new Date(serviceStartDate).getFullYear();
            if (!isNaN(year)) setStartYear(String(year));
        }
    }, [serviceStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const canCalculate = useMemo(() => {
        const cost = parseFormattedNumber(acquisitionCost);
        const life = parseIntInput(usefulLife);
        return cost > 0 && life >= 2 && !!acquisitionDate && !!serviceStartDate;
    }, [acquisitionCost, usefulLife, acquisitionDate, serviceStartDate]);

    const markDirty = useCallback(() => {
        if (result) setIsDirty(true);
    }, [result]);

    const handleAssetType = useCallback((val: AssetType) => { setAssetType(val); markDirty(); }, [markDirty]);
    const handleAcquisitionCost = useCallback((val: string) => { setAcquisitionCost(formatInputValue(val)); markDirty(); }, [markDirty]);
    const handleUsefulLife = useCallback((val: string) => { setUsefulLife(val); markDirty(); }, [markDirty]);
    const handleMethod = useCallback((val: DepreciationMethod) => { setMethod(val); markDirty(); }, [markDirty]);
    const handleAcquisitionDate = useCallback((val: string) => {
        setAcquisitionDate(val);
        if (val && !serviceStartDate) setServiceStartDate(val);
        markDirty();
    }, [markDirty, serviceStartDate]);
    const handleServiceStartDate = useCallback((val: string) => { setServiceStartDate(val); markDirty(); }, [markDirty]);
    const handleFiscalYearEndMonth = useCallback((val: string) => { setFiscalYearEndMonth(val); markDirty(); }, [markDirty]);
    const handleStartYear = useCallback((val: string) => { setStartYear(val); markDirty(); }, [markDirty]);
    const handleDisplayYears = useCallback((val: string) => { setDisplayYears(val); markDirty(); }, [markDirty]);

    const handleCalculate = useCallback(() => {
        if (!canCalculate) return;

        const depResult = calcDepreciationSchedule({
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            usefulLife: parseIntInput(usefulLife),
            method,
            acquisitionDate,
            serviceStartDate,
            fiscalYearEndMonth: parseIntInput(fiscalYearEndMonth),
        });

        const schedule = depResult.schedule;
        const sy = parseIntInput(startYear);
        let startIdx = 0;
        if (sy > 0 && schedule.length > 0) {
            const found = schedule.findIndex(row => {
                const yearMatch = row.periodLabel.match(/^(\d{4})\//);
                return yearMatch && parseInt(yearMatch[1]) >= sy;
            });
            if (found >= 0) startIdx = found;
        }

        const numYears = parseIntInput(displayYears) || 5;
        const sliced = schedule.slice(startIdx, startIdx + numYears);
        const totalDep = sliced.reduce((sum, r) => sum + r.depreciation, 0);
        const startBV = sliced.length > 0 ? sliced[0].beginningBookValue : 0;
        const endBV = sliced.length > 0 ? sliced[sliced.length - 1].endingBookValue : 0;

        setResult({
            rows: sliced,
            totalDepreciation: totalDep,
            startBookValue: startBV,
            endBookValue: endBV,
            methodLabel: depResult.methodLabel,
            appliedRate: depResult.appliedRate,
            usefulLife: parseIntInput(usefulLife),
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            displayYears: numYears,
            startYearIndex: startIdx,
        });
        setIsDirty(false);
    }, [canCalculate, acquisitionCost, usefulLife, method, acquisitionDate, serviceStartDate, fiscalYearEndMonth, startYear, displayYears]);

    const handleClear = useCallback(() => {
        setAssetType('building');
        setAcquisitionCost('');
        setUsefulLife('');
        setMethod('straight_line');
        setAcquisitionDate('');
        setServiceStartDate('');
        setFiscalYearEndMonth('3');
        setStartYear('');
        setDisplayYears('5');
        setResult(null);
        setIsDirty(false);
        setCarriedOver(false);
    }, []);

    const applyCarryOver = useCallback((values: PeriodDepCarryOverValues) => {
        setUsefulLife(String(values.usefulLife));
        if (values.acquisitionCost > 0) {
            setAcquisitionCost(formatInputValue(values.acquisitionCost));
        }
        if (values.acquisitionDate) {
            setAcquisitionDate(values.acquisitionDate);
            if (!serviceStartDate) setServiceStartDate(values.acquisitionDate);
        }
        if (values.method) setMethod(values.method);
        if (values.serviceStartDate) setServiceStartDate(values.serviceStartDate);
        if (values.fiscalYearEndMonth) setFiscalYearEndMonth(values.fiscalYearEndMonth);
        setCarriedOver(true);
        if (result) setIsDirty(true);
    }, [result, serviceStartDate]);

    return {
        formProps: {
            assetType,
            acquisitionCost,
            usefulLife,
            method,
            acquisitionDate,
            serviceStartDate,
            fiscalYearEndMonth,
            startYear,
            displayYears,
            canCalculate,
            availableMethods,
            suggestedLabel,
            isMethodSuggested,
            carriedOver,
            onAssetTypeChange: handleAssetType,
            onAcquisitionCostChange: handleAcquisitionCost,
            onUsefulLifeChange: handleUsefulLife,
            onMethodChange: handleMethod,
            onAcquisitionDateChange: handleAcquisitionDate,
            onServiceStartDateChange: handleServiceStartDate,
            onFiscalYearEndMonthChange: handleFiscalYearEndMonth,
            onStartYearChange: handleStartYear,
            onDisplayYearsChange: handleDisplayYears,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        result,
        isDirty,
        applyCarryOver,
    };
};
