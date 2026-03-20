import { useState, useCallback } from "react";
import {
    type DepreciationResult,
    calcDepreciationSchedule,
} from "@/lib/depreciation";
import { formatInputValue, parseFormattedNumber, parseIntInput } from "@/lib/utils";
import { useBaseDepreciationState } from "@/hooks/useBaseDepreciationState";

export type CarryOverValues = {
    usefulLife: number;
    acquisitionCost: number;
    acquisitionDate: string;
};

export const useDepreciationForm = () => {
    const base = useBaseDepreciationState<DepreciationResult>();
    const [targetDate, setTargetDate] = useState('');

    const handleTargetDate = useCallback((val: string) => {
        setTargetDate(val);
        base.markDirty();
    }, [base.markDirty]);

    const handleCalculate = useCallback(() => {
        if (!base.canCalculate) return;
        const { acquisitionCost, usefulLife, method, acquisitionDate, serviceStartDate, fiscalYearEndMonth } = base.state;

        const calcResult = calcDepreciationSchedule({
            acquisitionCost: parseFormattedNumber(acquisitionCost),
            usefulLife: parseIntInput(usefulLife),
            method,
            acquisitionDate,
            serviceStartDate,
            fiscalYearEndMonth: parseIntInput(fiscalYearEndMonth),
            targetDate: targetDate || undefined,
        });

        base.setResult(calcResult);
        base.clearDirty();
    }, [base.canCalculate, base.state, targetDate, base.setResult, base.clearDirty]);

    const handleClear = useCallback(() => {
        base.resetBase();
        setTargetDate('');
    }, [base.resetBase]);

    const applyCarryOver = useCallback((values: CarryOverValues) => {
        const { setUsefulLife, setAcquisitionCost, setAcquisitionDate, setServiceStartDate, setCarriedOver } = base.setters;
        setUsefulLife(String(values.usefulLife));
        if (values.acquisitionCost > 0) {
            setAcquisitionCost(formatInputValue(values.acquisitionCost));
        }
        if (values.acquisitionDate) {
            setAcquisitionDate(values.acquisitionDate);
            if (!base.state.serviceStartDate) {
                setServiceStartDate(values.acquisitionDate);
            }
        }
        setCarriedOver(true);
        if (base.result) base.setIsDirty(true);
    }, [base.result, base.state.serviceStartDate, base.setters, base.setIsDirty]);

    return {
        formProps: {
            ...base.baseFormProps,
            targetDate,
            onTargetDateChange: handleTargetDate,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        result: base.result,
        isDirty: base.isDirty,
        applyCarryOver,
    };
};
