import { useMemo, useEffect } from "react";
import {
    type DepreciationMethod,
    type MethodWithSuggestion,
    getAllMethodsWithSuggestion,
    getSuggestedMethodLabels,
} from "@/lib/depreciation";

/**
 * 償却方法の推奨判定ロジック（useDepreciationForm / usePeriodDepForm 共通）
 */
export const useMethodSuggestion = (
    acquisitionDate: string,
    method: DepreciationMethod,
    setMethod: (val: DepreciationMethod) => void,
) => {
    const availableMethods: MethodWithSuggestion[] = useMemo(() => {
        return getAllMethodsWithSuggestion(acquisitionDate || undefined);
    }, [acquisitionDate]);

    const suggestedLabel = useMemo(() => {
        if (!acquisitionDate) return '';
        return getSuggestedMethodLabels(acquisitionDate);
    }, [acquisitionDate]);

    const isMethodSuggested = useMemo(() => {
        if (!acquisitionDate) return true;
        const current = availableMethods.find(m => m.value === method);
        return current?.suggested ?? true;
    }, [acquisitionDate, availableMethods, method]);

    // 取得日変更時に推奨方法へ自動切替
    useEffect(() => {
        if (!acquisitionDate) return;
        const suggested = availableMethods.find(m => m.suggested);
        if (suggested && !availableMethods.find(m => m.value === method)?.suggested) {
            setMethod(suggested.value);
        }
    }, [acquisitionDate]); // eslint-disable-line react-hooks/exhaustive-deps

    return { availableMethods, suggestedLabel, isMethodSuggested };
};
