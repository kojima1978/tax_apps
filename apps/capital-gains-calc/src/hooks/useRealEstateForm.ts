import { useMemo } from 'react';
import { calcRealEstate, type BuildingUsage, type CostMode, type RealEstateResult } from '@/lib/capital-gains';
import { BUILDING_STRUCTURES } from '@/lib/tax-rates';
import { parseFormattedNumber } from '@/lib/utils';
import { useFormState } from './useFormState';

export type RealEstateFormState = {
    transferPrice: string;
    transferExpense: string;
    costMode: CostMode;
    landCost: string;
    buildingCost: string;
    buildingUsage: BuildingUsage;
    structureKey: string;
    depreciationInput: string;
    acquisitionDate: string;
    transferDate: string;
    isResidence: boolean;
    useSpecialDeduction: boolean;
    useReducedRate: boolean;
    inheritedCostAddition: string;
};

const INITIAL_STATE: RealEstateFormState = {
    transferPrice: '',
    transferExpense: '',
    costMode: 'actual',
    landCost: '',
    buildingCost: '',
    buildingUsage: 'non-business',
    structureKey: BUILDING_STRUCTURES[0].key,
    depreciationInput: '',
    acquisitionDate: '',
    transferDate: '',
    isResidence: false,
    useSpecialDeduction: false,
    useReducedRate: false,
    inheritedCostAddition: '',
};

export function useRealEstateForm() {
    const { form, setField, reset } = useFormState<RealEstateFormState>(INITIAL_STATE);

    const result: RealEstateResult = useMemo(
        () =>
            calcRealEstate({
                transferPrice: parseFormattedNumber(form.transferPrice),
                transferExpense: parseFormattedNumber(form.transferExpense),
                costMode: form.costMode,
                landCost: parseFormattedNumber(form.landCost),
                buildingCost: parseFormattedNumber(form.buildingCost),
                buildingUsage: form.buildingUsage,
                structureKey: form.structureKey,
                depreciationInput: parseFormattedNumber(form.depreciationInput),
                acquisitionDate: form.acquisitionDate,
                transferDate: form.transferDate,
                isResidence: form.isResidence,
                useSpecialDeduction: form.useSpecialDeduction,
                useReducedRate: form.useReducedRate,
                inheritedCostAddition: parseFormattedNumber(form.inheritedCostAddition),
            }),
        [form],
    );

    /** 譲渡価額が未入力のうちは結果を出さない */
    const hasInput = parseFormattedNumber(form.transferPrice) > 0;

    return { form, setField, reset, result, hasInput };
}
