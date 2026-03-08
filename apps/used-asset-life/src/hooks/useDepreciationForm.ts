import { useState, useCallback, useMemo } from "react";
import {
    type DepreciationMethod,
    type DepreciationResult,
    calcDepreciationSchedule,
} from "@/lib/depreciation";
import { type AssetType } from "@/lib/used-asset-life";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";
import { useMethodSuggestion } from "@/hooks/useMethodSuggestion";

export type CarryOverValues = {
    usefulLife: number;
    acquisitionCost: number;
    acquisitionDate: string;
};

export const useDepreciationForm = () => {
    const [assetType, setAssetType] = useState<AssetType>('building');
    const [acquisitionCost, setAcquisitionCost] = useState('');
    const [usefulLife, setUsefulLife] = useState('');
    const [method, setMethod] = useState<DepreciationMethod>('straight_line');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [serviceStartDate, setServiceStartDate] = useState('');
    const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState('3');
    const [targetDate, setTargetDate] = useState('');
    const [result, setResult] = useState<DepreciationResult | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [carriedOver, setCarriedOver] = useState(false);

    const { availableMethods, suggestedLabel, isMethodSuggested } = useMethodSuggestion(acquisitionDate, method, setMethod);

    const canCalculate = useMemo(() => {
        const cost = parseFormattedNumber(acquisitionCost);
        const life = parseIntInput(usefulLife);
        return cost > 0 && life >= 2 && !!acquisitionDate && !!serviceStartDate;
    }, [acquisitionCost, usefulLife, acquisitionDate, serviceStartDate]);

    const markDirty = useCallback(() => {
        if (result) setIsDirty(true);
    }, [result]);

    const handleAssetType = useCallback((val: AssetType) => {
        setAssetType(val);
        markDirty();
    }, [markDirty]);

    const handleAcquisitionCost = useCallback((val: string) => {
        setAcquisitionCost(formatInputValue(val));
        markDirty();
    }, [markDirty]);

    const handleUsefulLife = useCallback((val: string) => {
        setUsefulLife(val);
        markDirty();
    }, [markDirty]);

    const handleMethod = useCallback((val: DepreciationMethod) => {
        setMethod(val);
        markDirty();
    }, [markDirty]);

    const handleAcquisitionDate = useCallback((val: string) => {
        setAcquisitionDate(val);
        if (val && !serviceStartDate) {
            setServiceStartDate(val);
        }
        markDirty();
    }, [markDirty, serviceStartDate]);

    const handleServiceStartDate = useCallback((val: string) => {
        setServiceStartDate(val);
        markDirty();
    }, [markDirty]);

    const handleFiscalYearEndMonth = useCallback((val: string) => {
        setFiscalYearEndMonth(val);
        markDirty();
    }, [markDirty]);

    const handleTargetDate = useCallback((val: string) => {
        setTargetDate(val);
        markDirty();
    }, [markDirty]);

    const handleCalculate = useCallback(() => {
        if (!canCalculate) return;

        const calcResult = calcDepreciationSchedule({
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            usefulLife: parseIntInput(usefulLife),
            method,
            acquisitionDate,
            serviceStartDate,
            fiscalYearEndMonth: parseIntInput(fiscalYearEndMonth),
            targetDate: targetDate || undefined,
        });

        setResult(calcResult);
        setIsDirty(false);
    }, [canCalculate, acquisitionCost, usefulLife, method, acquisitionDate, serviceStartDate, fiscalYearEndMonth, targetDate]);

    const handleClear = useCallback(() => {
        setAssetType('building');
        setAcquisitionCost('');
        setUsefulLife('');
        setMethod('straight_line');
        setAcquisitionDate('');
        setServiceStartDate('');
        setFiscalYearEndMonth('3');
        setTargetDate('');
        setResult(null);
        setIsDirty(false);
        setCarriedOver(false);
    }, []);

    const applyCarryOver = useCallback((values: CarryOverValues) => {
        setUsefulLife(String(values.usefulLife));
        if (values.acquisitionCost > 0) {
            setAcquisitionCost(formatInputValue(values.acquisitionCost));
        }
        if (values.acquisitionDate) {
            setAcquisitionDate(values.acquisitionDate);
            if (!serviceStartDate) {
                setServiceStartDate(values.acquisitionDate);
            }
        }
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
            targetDate,
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
            onTargetDateChange: handleTargetDate,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        result,
        isDirty,
        applyCarryOver,
    };
};
