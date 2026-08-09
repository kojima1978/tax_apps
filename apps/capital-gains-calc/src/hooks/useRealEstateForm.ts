import { useMemo } from 'react';
import {
    CONSTRUCTION_STRUCTURES,
    calcBuildingPrice,
    parseArea,
    type BuildingPriceMethod,
    type ConstructionStructureKey,
} from '@/lib/building-price';
import { calcRealEstate, type BuildingUsage, type CostMode, type RealEstateResult } from '@/lib/capital-gains';
import { BUILDING_STRUCTURES } from '@/lib/tax-rates';
import { parseFormattedNumber } from '@/lib/utils';
import { useFormState } from './useFormState';

/**
 * 譲渡費用の内訳。
 * 計算には合計だけを渡すが、申告時に内訳を問われる項目なので入力・印刷とも項目別に残す。
 */
export const TRANSFER_EXPENSE_ITEMS = [
    {
        key: 'brokerFee',
        label: '仲介手数料',
        hint: '売却時に不動産会社へ支払った手数料。自動計算は宅建業法の上限額（消費税込み）',
    },
    {
        key: 'stampTax',
        label: '印紙税',
        hint: '売買契約書に貼付した印紙代（売主負担分）。自動計算は契約書1通分（軽減措置適用後）',
    },
    { key: 'surveyFee', label: '測量費・登記費用', hint: '境界確定測量、登記名義人の表示変更登記など' },
    { key: 'demolitionCost', label: '建物取壊費用', hint: '土地を売るために建物を取り壊した場合の費用と建物の損失額' },
    { key: 'otherExpense', label: 'その他', hint: '借家人への立退料、より有利な条件で売るために支払った違約金など' },
] as const;

export type TransferExpenseKey = (typeof TRANSFER_EXPENSE_ITEMS)[number]['key'];

export type RealEstateFormState = {
    transferPrice: string;
    costMode: CostMode;
    landCost: string;
    buildingCost: string;
    /** 建物の取得価額の求め方（直接入力以外は土地・建物を自動算出する） */
    buildingPriceMethod: BuildingPriceMethod;
    /** 土地建物の合計取得価額（消費税込み） */
    totalCost: string;
    /** 消費税から逆算 */
    buildingConsumptionTax: string;
    consumptionTaxRate: string;
    /** 固定資産税評価額で按分 */
    landAssessedValue: string;
    buildingAssessedValue: string;
    /** 建築価額表から算出 */
    builtDate: string;
    constructionStructure: ConstructionStructureKey;
    floorArea: string;
    buildingUsage: BuildingUsage;
    structureKey: string;
    depreciationInput: string;
    acquisitionDate: string;
    transferDate: string;
    isResidence: boolean;
    useSpecialDeduction: boolean;
    useReducedRate: boolean;
    inheritedCostAddition: string;
} & Record<TransferExpenseKey, string>;

/** 内訳の初期値は配列から生成する（項目を足すのは配列の1行だけで済むように） */
const EMPTY_EXPENSES = Object.fromEntries(
    TRANSFER_EXPENSE_ITEMS.map((item) => [item.key, '']),
) as Record<TransferExpenseKey, string>;

const INITIAL_STATE: RealEstateFormState = {
    ...EMPTY_EXPENSES,
    transferPrice: '',
    costMode: 'actual',
    landCost: '',
    buildingCost: '',
    buildingPriceMethod: 'direct',
    totalCost: '',
    buildingConsumptionTax: '',
    consumptionTaxRate: '0.1',
    landAssessedValue: '',
    buildingAssessedValue: '',
    builtDate: '',
    constructionStructure: CONSTRUCTION_STRUCTURES[0].key,
    floorArea: '',
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

    /** 建物の取得価額の算出。直接入力のときは何も計算しない（resolved が false のまま） */
    const buildingPrice = useMemo(
        () =>
            calcBuildingPrice({
                method: form.buildingPriceMethod,
                totalCost: parseFormattedNumber(form.totalCost),
                taxRate: Number(form.consumptionTaxRate) || 0,
                consumptionTax: parseFormattedNumber(form.buildingConsumptionTax),
                landAssessedValue: parseFormattedNumber(form.landAssessedValue),
                buildingAssessedValue: parseFormattedNumber(form.buildingAssessedValue),
                builtDate: form.builtDate,
                acquisitionDate: form.acquisitionDate,
                constructionStructure: form.constructionStructure,
                floorArea: parseArea(form.floorArea),
                structureKey: form.structureKey,
                buildingUsage: form.buildingUsage,
            }),
        [form],
    );

    /** 求め方が直接入力以外なら、土地・建物の取得価額は算出結果を使う */
    const derived = form.buildingPriceMethod !== 'direct';

    const result: RealEstateResult = useMemo(
        () =>
            calcRealEstate({
                transferPrice: parseFormattedNumber(form.transferPrice),
                transferExpense: TRANSFER_EXPENSE_ITEMS.reduce(
                    (sum, item) => sum + parseFormattedNumber(form[item.key]),
                    0,
                ),
                costMode: form.costMode,
                landCost: derived ? buildingPrice.landCost : parseFormattedNumber(form.landCost),
                buildingCost: derived ? buildingPrice.buildingCost : parseFormattedNumber(form.buildingCost),
                buildingCostBasis: derived ? buildingPrice.basis : '',
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
        [form, derived, buildingPrice],
    );

    /** 譲渡価額が未入力のうちは結果を出さない */
    const hasInput = parseFormattedNumber(form.transferPrice) > 0;

    return { form, setField, reset, result, buildingPrice, hasInput };
}
