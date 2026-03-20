import { useState, useCallback, useEffect } from "react";
import {
    type DepreciationMethod,
    type DepreciationYearRow,
    calcDepreciationSchedule,
} from "@/lib/depreciation";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";
import { useBaseDepreciationState } from "@/hooks/useBaseDepreciationState";

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
    const base = useBaseDepreciationState<PeriodDepResult>();
    const [startYear, setStartYear] = useState('');
    const [displayYears, setDisplayYears] = useState('5');

    // 事業供用日変更時にデフォルト開始年度を設定
    useEffect(() => {
        if (base.state.serviceStartDate && !startYear) {
            const year = new Date(base.state.serviceStartDate).getFullYear();
            if (!isNaN(year)) setStartYear(String(year));
        }
    }, [base.state.serviceStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStartYear = useCallback((val: string) => { setStartYear(val); base.markDirty(); }, [base.markDirty]);
    const handleDisplayYears = useCallback((val: string) => { setDisplayYears(val); base.markDirty(); }, [base.markDirty]);

    const handleCalculate = useCallback(() => {
        if (!base.canCalculate) return;
        const { acquisitionCost, usefulLife, method, acquisitionDate, serviceStartDate, fiscalYearEndMonth } = base.state;

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
                const y = yearMatch?.[1];
                return y != null && parseInt(y) >= sy;
            });
            if (found >= 0) startIdx = found;
        }

        const numYears = parseIntInput(displayYears) || 5;
        const sliced = schedule.slice(startIdx, startIdx + numYears);
        const totalDep = sliced.reduce((sum, r) => sum + r.depreciation, 0);
        const firstRow = sliced[0];
        const lastRow = sliced[sliced.length - 1];

        base.setResult({
            rows: sliced,
            totalDepreciation: totalDep,
            startBookValue: firstRow ? firstRow.beginningBookValue : 0,
            endBookValue: lastRow ? lastRow.endingBookValue : 0,
            methodLabel: depResult.methodLabel,
            appliedRate: depResult.appliedRate,
            usefulLife: parseIntInput(usefulLife),
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            displayYears: numYears,
            startYearIndex: startIdx,
        });
        base.clearDirty();
    }, [base.canCalculate, base.state, startYear, displayYears, base.setResult, base.clearDirty]);

    const handleClear = useCallback(() => {
        base.resetBase();
        setStartYear('');
        setDisplayYears('5');
    }, [base.resetBase]);

    const applyCarryOver = useCallback((values: PeriodDepCarryOverValues) => {
        const { setUsefulLife, setAcquisitionCost, setAcquisitionDate, setServiceStartDate, setMethod, setFiscalYearEndMonth, setCarriedOver } = base.setters;
        setUsefulLife(String(values.usefulLife));
        if (values.acquisitionCost > 0) {
            setAcquisitionCost(formatInputValue(values.acquisitionCost));
        }
        if (values.acquisitionDate) {
            setAcquisitionDate(values.acquisitionDate);
            if (!base.state.serviceStartDate) setServiceStartDate(values.acquisitionDate);
        }
        if (values.method) setMethod(values.method);
        if (values.serviceStartDate) setServiceStartDate(values.serviceStartDate);
        if (values.fiscalYearEndMonth) setFiscalYearEndMonth(values.fiscalYearEndMonth);
        setCarriedOver(true);
        if (base.result) base.setIsDirty(true);
    }, [base.result, base.state.serviceStartDate, base.setters, base.setIsDirty]);

    return {
        formProps: {
            ...base.baseFormProps,
            startYear,
            displayYears,
            onStartYearChange: handleStartYear,
            onDisplayYearsChange: handleDisplayYears,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        result: base.result,
        isDirty: base.isDirty,
        applyCarryOver,
    };
};
