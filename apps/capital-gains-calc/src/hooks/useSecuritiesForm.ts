import { useMemo } from 'react';
import { calcSecurities, type CostMode, type SecuritiesResult } from '@/lib/capital-gains';
import { parseFormattedNumber } from '@/lib/utils';
import { useFormState } from './useFormState';

export type SecuritiesFormState = {
    transferPrice: string;
    transferExpense: string;
    costMode: CostMode;
    actualCost: string;
    listed: boolean;
};

const INITIAL_STATE: SecuritiesFormState = {
    transferPrice: '',
    transferExpense: '',
    costMode: 'actual',
    actualCost: '',
    listed: true,
};

export function useSecuritiesForm() {
    const { form, setField, reset } = useFormState<SecuritiesFormState>(INITIAL_STATE);

    const result: SecuritiesResult = useMemo(
        () =>
            calcSecurities({
                transferPrice: parseFormattedNumber(form.transferPrice),
                transferExpense: parseFormattedNumber(form.transferExpense),
                costMode: form.costMode,
                actualCost: parseFormattedNumber(form.actualCost),
                listed: form.listed,
            }),
        [form],
    );

    const hasInput = parseFormattedNumber(form.transferPrice) > 0;

    return { form, setField, reset, result, hasInput };
}
