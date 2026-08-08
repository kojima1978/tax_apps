/**
 * 譲渡所得税の計算ロジック
 *
 * UI から独立した純関数として保つ（入力は素の数値・文字列のみ）。
 */

import {
    DEPRECIATION_BASE_RATIO,
    DEPRECIATION_LIMIT_RATIO,
    ESTIMATED_COST_RATIO,
    LONG_TERM_RATE,
    LONG_TERM_YEARS,
    RECONSTRUCTION_RATIO,
    REDUCED_RATE,
    REDUCED_RATE_LIMIT,
    REDUCED_RATE_YEARS,
    RESIDENCE_SPECIAL_DEDUCTION,
    SECURITIES_RATE,
    SHORT_TERM_RATE,
    findStructure,
    totalRate,
    type TaxRateSet,
} from './tax-rates';

export type Term = 'short' | 'long';
/** 取得費の算定方法（実額 / 概算5%） */
export type CostMode = 'actual' | 'estimated';
/** 建物の用途（減価償却の計算方法が変わる） */
export type BuildingUsage = 'non-business' | 'business';

export type TaxAmounts = {
    incomeTax: number;
    reconstruction: number;
    residentTax: number;
    total: number;
};

/** 税率区分ごとの内訳（軽減税率の特例では2段になる） */
export type TaxBracket = {
    label: string;
    taxableAmount: number;
    /** 所得税・復興・住民税の合計税率（%） */
    ratePercent: number;
    /** 税目ごとの税率。結果表で「所得税（15%）」のように併記するために持つ */
    rate: TaxRateSet;
    amounts: TaxAmounts;
};

const ZERO_TAX: TaxAmounts = { incomeTax: 0, reconstruction: 0, residentTax: 0, total: 0 };

/**
 * 課税標準に税率を適用する。
 * 復興特別所得税は「所得税額 × 2.1%」なので、譲渡所得に直接掛けずに所得税額から求める。
 */
const applyRate = (base: number, rate: TaxRateSet): TaxAmounts => {
    if (base <= 0) return { ...ZERO_TAX };
    const incomeTax = Math.floor(base * rate.incomeTax);
    const reconstruction = Math.floor(incomeTax * RECONSTRUCTION_RATIO);
    const residentTax = Math.floor(base * rate.residentTax);
    return {
        incomeTax,
        reconstruction,
        residentTax,
        total: incomeTax + reconstruction + residentTax,
    };
};

const sumTax = (list: TaxAmounts[]): TaxAmounts =>
    list.reduce<TaxAmounts>(
        (acc, t) => ({
            incomeTax: acc.incomeTax + t.incomeTax,
            reconstruction: acc.reconstruction + t.reconstruction,
            residentTax: acc.residentTax + t.residentTax,
            total: acc.total + t.total,
        }),
        { ...ZERO_TAX },
    );

const toPercent = (rate: TaxRateSet): number => Math.round(totalRate(rate) * 1e6) / 1e4;

const parseDate = (value: string): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * 譲渡した年の1月1日時点の所有期間（満年数）。
 * 長期・短期の判定は譲渡日ではなくこの日を基準にする。
 */
export const ownershipYearsAtJan1 = (acquisition: string, transfer: string): number | null => {
    const acq = parseDate(acquisition);
    const tr = parseDate(transfer);
    if (!acq || !tr) return null;

    const jan1 = new Date(tr.getFullYear(), 0, 1);
    if (jan1 < acq) return 0;

    let years = jan1.getFullYear() - acq.getFullYear();
    const monthDiff = jan1.getMonth() - acq.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && jan1.getDate() < acq.getDate())) years -= 1;
    return Math.max(0, years);
};

/**
 * 減価償却に使う経過年数（取得日から譲渡日まで）。
 * 6ヶ月以上の端数は1年に切上げ、6ヶ月未満は切捨て。
 */
export const elapsedYearsForDepreciation = (acquisition: string, transfer: string): number | null => {
    const acq = parseDate(acquisition);
    const tr = parseDate(transfer);
    if (!acq || !tr) return null;

    let months = (tr.getFullYear() - acq.getFullYear()) * 12 + (tr.getMonth() - acq.getMonth());
    if (tr.getDate() < acq.getDate()) months -= 1;
    if (months <= 0) return 0;

    const years = Math.floor(months / 12);
    return months % 12 >= 6 ? years + 1 : years;
};

/**
 * 非事業用建物の償却費相当額
 * 建物の取得価額 × 0.9 × 旧定額法の償却率 × 経過年数（取得価額の95%が上限）
 */
export const calcNonBusinessDepreciation = (
    buildingCost: number,
    structureKey: string,
    elapsedYears: number,
): number => {
    if (buildingCost <= 0 || elapsedYears <= 0) return 0;
    const structure = findStructure(structureKey);
    const raw = buildingCost * DEPRECIATION_BASE_RATIO * structure.rate * elapsedYears;
    return Math.floor(Math.min(raw, buildingCost * DEPRECIATION_LIMIT_RATIO));
};

// ============================================================
// 不動産（土地・建物）の譲渡所得
// ============================================================

export type RealEstateInput = {
    transferPrice: number;
    transferExpense: number;
    costMode: CostMode;
    landCost: number;
    buildingCost: number;
    buildingUsage: BuildingUsage;
    structureKey: string;
    /** 事業用の場合に手入力する償却費累計額 */
    depreciationInput: number;
    acquisitionDate: string;
    transferDate: string;
    isResidence: boolean;
    useSpecialDeduction: boolean;
    useReducedRate: boolean;
    inheritedCostAddition: number;
};

export type RealEstateResult = {
    ownershipYears: number | null;
    elapsedYears: number;
    isLongTerm: boolean;
    isOver10Years: boolean;
    term: Term;
    depreciation: number;
    actualCost: number;
    estimatedCost: number;
    acquisitionCost: number;
    costAddition: number;
    transferExpense: number;
    grossProfit: number;
    specialDeduction: number;
    taxableIncome: number;
    reducedRateApplied: boolean;
    brackets: TaxBracket[];
    tax: TaxAmounts;
    netProceeds: number;
    isLoss: boolean;
    notes: string[];
};

export const calcRealEstate = (input: RealEstateInput): RealEstateResult => {
    const elapsedYears = elapsedYearsForDepreciation(input.acquisitionDate, input.transferDate) ?? 0;

    const depreciation =
        input.buildingUsage === 'non-business'
            ? calcNonBusinessDepreciation(input.buildingCost, input.structureKey, elapsedYears)
            : Math.floor(Math.min(input.depreciationInput, input.buildingCost * DEPRECIATION_LIMIT_RATIO));

    const actualCost = Math.max(0, input.landCost + input.buildingCost - depreciation);
    const estimatedCost = Math.floor(input.transferPrice * ESTIMATED_COST_RATIO);
    const baseCost = input.costMode === 'actual' ? actualCost : estimatedCost;

    const costAddition = Math.max(0, input.inheritedCostAddition);
    const acquisitionCost = baseCost + costAddition;

    const grossProfit = input.transferPrice - acquisitionCost - input.transferExpense;

    const ownershipYears = ownershipYearsAtJan1(input.acquisitionDate, input.transferDate);
    const isLongTerm = ownershipYears !== null && ownershipYears > LONG_TERM_YEARS;
    const isOver10Years = ownershipYears !== null && ownershipYears > REDUCED_RATE_YEARS;
    const term: Term = isLongTerm ? 'long' : 'short';

    const deductionAvailable = input.useSpecialDeduction && input.isResidence;
    const specialDeduction = deductionAvailable
        ? Math.min(RESIDENCE_SPECIAL_DEDUCTION, Math.max(0, grossProfit))
        : 0;

    const taxableIncome = Math.max(0, grossProfit - specialDeduction);
    const reducedRateApplied = input.useReducedRate && input.isResidence && isOver10Years;

    const brackets: TaxBracket[] = [];
    if (taxableIncome > 0) {
        if (reducedRateApplied) {
            const lowerPart = Math.min(taxableIncome, REDUCED_RATE_LIMIT);
            brackets.push({
                label: '6,000万円以下の部分（軽減税率）',
                taxableAmount: lowerPart,
                ratePercent: toPercent(REDUCED_RATE),
                rate: REDUCED_RATE,
                amounts: applyRate(lowerPart, REDUCED_RATE),
            });
            const upperPart = taxableIncome - lowerPart;
            if (upperPart > 0) {
                brackets.push({
                    label: '6,000万円超の部分',
                    taxableAmount: upperPart,
                    ratePercent: toPercent(LONG_TERM_RATE),
                    rate: LONG_TERM_RATE,
                    amounts: applyRate(upperPart, LONG_TERM_RATE),
                });
            }
        } else {
            const rate = isLongTerm ? LONG_TERM_RATE : SHORT_TERM_RATE;
            brackets.push({
                label: isLongTerm ? '長期譲渡所得' : '短期譲渡所得',
                taxableAmount: taxableIncome,
                ratePercent: toPercent(rate),
                rate,
                amounts: applyRate(taxableIncome, rate),
            });
        }
    }

    const tax = sumTax(brackets.map((b) => b.amounts));

    const notes: string[] = [];
    if (ownershipYears === null) {
        notes.push('取得日と譲渡日を入力すると、長期・短期の判定が行われます。現在は短期税率で計算しています。');
    }
    if (input.costMode === 'estimated') {
        notes.push('概算取得費（譲渡価額の5%）で計算しています。実額の取得費が判明している場合はそちらが有利になることがあります。');
    } else if (estimatedCost > actualCost && input.transferPrice > 0) {
        notes.push(
            `概算取得費（${estimatedCost.toLocaleString('ja-JP')}円）のほうが実額（${actualCost.toLocaleString('ja-JP')}円）より大きいため、概算を選択すると譲渡所得が ${(estimatedCost - actualCost).toLocaleString('ja-JP')}円 少なくなります。`,
        );
    }
    if (input.useSpecialDeduction && !input.isResidence) {
        notes.push('3,000万円特別控除は居住用財産が対象です。「居住用財産である」にチェックを入れてください。');
    }
    if (input.useReducedRate && !input.isResidence) {
        notes.push('軽減税率の特例は居住用財産が対象です。');
    } else if (input.useReducedRate && !isOver10Years && ownershipYears !== null) {
        notes.push(`軽減税率の特例は所有期間10年超が要件です（現在 ${ownershipYears}年）。通常の税率で計算しています。`);
    }
    if (grossProfit < 0) {
        notes.push('譲渡損失が生じています。居住用財産の買換え等の要件を満たす場合、損益通算・繰越控除の適用余地があります。');
    }

    return {
        ownershipYears,
        elapsedYears,
        isLongTerm,
        isOver10Years,
        term,
        depreciation,
        actualCost,
        estimatedCost,
        acquisitionCost,
        costAddition,
        transferExpense: input.transferExpense,
        grossProfit,
        specialDeduction,
        taxableIncome,
        reducedRateApplied,
        brackets,
        tax,
        netProceeds: input.transferPrice - input.transferExpense - tax.total,
        isLoss: grossProfit < 0,
        notes,
    };
};

// ============================================================
// 株式等の譲渡所得
// ============================================================

export type SecuritiesInput = {
    transferPrice: number;
    transferExpense: number;
    costMode: CostMode;
    actualCost: number;
    listed: boolean;
};

export type SecuritiesResult = {
    actualCost: number;
    estimatedCost: number;
    acquisitionCost: number;
    transferExpense: number;
    grossProfit: number;
    taxableIncome: number;
    /** 所得税・復興・住民税の合計税率（%） */
    ratePercent: number;
    /** 税目ごとの税率。結果表で「所得税（15%）」のように併記するために持つ */
    rate: TaxRateSet;
    tax: TaxAmounts;
    netProceeds: number;
    isLoss: boolean;
    notes: string[];
};

export const calcSecurities = (input: SecuritiesInput): SecuritiesResult => {
    const estimatedCost = Math.floor(input.transferPrice * ESTIMATED_COST_RATIO);
    const acquisitionCost = input.costMode === 'actual' ? input.actualCost : estimatedCost;

    const grossProfit = input.transferPrice - acquisitionCost - input.transferExpense;
    const taxableIncome = Math.max(0, grossProfit);
    const tax = applyRate(taxableIncome, SECURITIES_RATE);

    const notes: string[] = [];
    if (input.costMode === 'estimated') {
        notes.push('取得費が不明な場合の概算取得費（譲渡価額の5%）で計算しています。');
    }
    if (grossProfit < 0) {
        notes.push(
            input.listed
                ? '譲渡損失です。上場株式等の損失は、申告分離課税を選択した配当所得等との損益通算および3年間の繰越控除が可能です。'
                : '譲渡損失です。一般株式等の損失は、原則として他の所得と通算できません（同じ一般株式等の譲渡益とのみ通算）。',
        );
    } else if (!input.listed) {
        notes.push('一般株式等（非上場株式）の譲渡益は、上場株式等の譲渡損失とは通算できません。');
    }

    return {
        actualCost: input.actualCost,
        estimatedCost,
        acquisitionCost,
        transferExpense: input.transferExpense,
        grossProfit,
        taxableIncome,
        ratePercent: toPercent(SECURITIES_RATE),
        rate: SECURITIES_RATE,
        tax,
        netProceeds: input.transferPrice - input.transferExpense - tax.total,
        isLoss: grossProfit < 0,
        notes,
    };
};
