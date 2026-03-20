import { useState, useCallback } from "react";
import { type DepreciationMethod } from "@/lib/depreciation";
import { type AssetType } from "@/lib/used-asset-life";
import { formatInputValue } from "@/lib/utils";
import { useMethodSuggestion } from "@/hooks/useMethodSuggestion";
import { useCanCalculate } from "@/hooks/useCanCalculate";
import { useDirtyFlag } from "@/hooks/useDirtyFlag";

/**
 * useDepreciationForm / usePeriodDepForm 共通の状態管理
 */
export const useBaseDepreciationState = <TResult,>() => {
    const [assetType, setAssetType] = useState<AssetType>('building');
    const [acquisitionCost, setAcquisitionCost] = useState('');
    const [usefulLife, setUsefulLife] = useState('');
    const [method, setMethod] = useState<DepreciationMethod>('straight_line');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [serviceStartDate, setServiceStartDate] = useState('');
    const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState('3');
    const [result, setResult] = useState<TResult | null>(null);
    const [carriedOver, setCarriedOver] = useState(false);
    const { isDirty, setIsDirty, markDirty, clearDirty } = useDirtyFlag(result);

    const { availableMethods, suggestedLabel, isMethodSuggested } = useMethodSuggestion(acquisitionDate, method, setMethod);
    const canCalculate = useCanCalculate(acquisitionCost, usefulLife, acquisitionDate, serviceStartDate);

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

    const resetBase = useCallback(() => {
        setAssetType('building');
        setAcquisitionCost('');
        setUsefulLife('');
        setMethod('straight_line');
        setAcquisitionDate('');
        setServiceStartDate('');
        setFiscalYearEndMonth('3');
        setResult(null);
        clearDirty();
        setCarriedOver(false);
    }, [clearDirty]);

    return {
        // raw state (for calculate/carryOver logic)
        state: {
            assetType, acquisitionCost, usefulLife, method,
            acquisitionDate, serviceStartDate, fiscalYearEndMonth,
            carriedOver,
        },
        // setters needed by specific hooks
        setters: {
            setUsefulLife, setAcquisitionCost, setAcquisitionDate,
            setServiceStartDate, setMethod, setFiscalYearEndMonth,
            setCarriedOver, setResult,
        },
        // result & dirty
        result, setResult, isDirty, setIsDirty, markDirty, clearDirty,
        // canCalculate
        canCalculate,
        // method suggestion
        availableMethods, suggestedLabel, isMethodSuggested,
        // shared form props
        baseFormProps: {
            assetType,
            acquisitionCost,
            usefulLife,
            method,
            acquisitionDate,
            serviceStartDate,
            fiscalYearEndMonth,
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
        },
        resetBase,
    };
};
