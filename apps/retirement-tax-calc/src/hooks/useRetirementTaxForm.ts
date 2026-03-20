import { useState, useCallback, useRef } from "react";
import { calcRetirementTax, PATTERN_COUNT, type RetirementType, type RetirementTaxResult } from "@/lib/retirement-tax";
import { DEFAULT_YEAR } from "@/lib/tax-rates";
import { parseFormattedNumber, formatInputValue } from "@/lib/utils";

const INITIAL_AMOUNTS = Array<string>(PATTERN_COUNT).fill("");
const INITIAL_RESULTS = Array<RetirementTaxResult | null>(PATTERN_COUNT).fill(null);

export const useRetirementTaxForm = () => {
    const [amounts, setAmounts] = useState(INITIAL_AMOUNTS);
    const [serviceYears, setServiceYears] = useState(0);
    const [retirementType, setRetirementType] = useState<RetirementType>("general");
    const [isDisability, setIsDisability] = useState(false);
    const [taxYear, setTaxYear] = useState(DEFAULT_YEAR);
    const [results, setResults] = useState<(RetirementTaxResult | null)[]>(INITIAL_RESULTS);
    const [isDirty, setIsDirty] = useState(false);

    const hasCalculated = useRef(false);

    const canCalculate = amounts.some((a) => parseFormattedNumber(a) > 0) && serviceYears > 0;

    const markDirty = useCallback(() => {
        if (hasCalculated.current) setIsDirty(true);
    }, []);

    const handleCalculate = useCallback(() => {
        if (serviceYears <= 0) return;
        const parsed = amounts.map(parseFormattedNumber);
        if (!parsed.some((a) => a > 0)) return;
        const newResults = parsed.map((amt) => {
            if (amt <= 0) return null;
            return calcRetirementTax({
                amount: amt,
                serviceYears,
                retirementType,
                isDisability,
                taxYear,
            });
        });
        setResults(newResults);
        setIsDirty(false);
        hasCalculated.current = true;
    }, [amounts, serviceYears, retirementType, isDisability, taxYear]);

    const handleAmountChange = useCallback((index: number, val: string) => {
        setAmounts((prev) => {
            const next = [...prev];
            next[index] = formatInputValue(val);
            return next;
        });
        markDirty();
    }, [markDirty]);

    const handleApplyLimit = useCallback((limitAmount: number, index: number) => {
        handleAmountChange(index, String(limitAmount));
    }, [handleAmountChange]);

    const withDirty = useCallback(
        <T,>(setter: (val: T) => void) => (val: T) => { setter(val); markDirty(); },
        [markDirty],
    );

    const handleServiceYearsChange = withDirty(setServiceYears);
    const handleRetirementTypeChange = withDirty(setRetirementType);
    const handleDisabilityChange = withDirty(setIsDisability);
    const handleTaxYearChange = withDirty(setTaxYear);

    const handleClear = useCallback(() => {
        setAmounts(INITIAL_AMOUNTS);
        setServiceYears(0);
        setRetirementType("general");
        setIsDisability(false);
        setTaxYear(DEFAULT_YEAR);
        setResults(INITIAL_RESULTS);
        setIsDirty(false);
        hasCalculated.current = false;
    }, []);

    return {
        formProps: {
            amounts,
            onAmountChange: handleAmountChange,
            onApplyLimit: handleApplyLimit,
            serviceYears,
            onServiceYearsChange: handleServiceYearsChange,
            retirementType,
            onRetirementTypeChange: handleRetirementTypeChange,
            isDisability,
            onDisabilityChange: handleDisabilityChange,
            taxYear,
            onTaxYearChange: handleTaxYearChange,
            canCalculate,
            onCalculate: handleCalculate,
            onClear: handleClear,
        },
        results,
        isDirty,
    };
};
