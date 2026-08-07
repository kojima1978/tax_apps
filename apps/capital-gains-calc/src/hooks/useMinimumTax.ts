import { useMemo } from 'react';
import { calcMinimumTax, type MinimumTaxResult } from '@/lib/minimum-tax';
import { parseFormattedNumber } from '@/lib/utils';
import { useFormState } from './useFormState';

export type MinimumTaxFormState = {
    /** 判定を行うかどうか（該当者は稀なので既定は無効） */
    enabled: boolean;
    otherIncome: string;
    otherIncomeTax: string;
};

const INITIAL_STATE: MinimumTaxFormState = {
    enabled: false,
    otherIncome: '',
    otherIncomeTax: '',
};

/**
 * 判定に使う、本ツール側で計算済みの数値。
 * 基準所得金額はその年の全所得の合算なので、不動産・株式等の両タブを足し込んだ値を渡す。
 */
export type MinimumTaxSource = {
    year: number;
    capitalGainsIncome: number;
    capitalGainsIncomeTax: number;
};

export function useMinimumTax(source: MinimumTaxSource) {
    const { form, setField, reset } = useFormState<MinimumTaxFormState>(INITIAL_STATE);
    const { year, capitalGainsIncome, capitalGainsIncomeTax } = source;

    const result: MinimumTaxResult = useMemo(
        () =>
            calcMinimumTax({
                year,
                capitalGainsIncome,
                capitalGainsIncomeTax,
                otherIncome: parseFormattedNumber(form.otherIncome),
                otherIncomeTax: parseFormattedNumber(form.otherIncomeTax),
            }),
        [year, capitalGainsIncome, capitalGainsIncomeTax, form.otherIncome, form.otherIncomeTax],
    );

    return { form, setField, reset, result };
}
