export type TaxRate = {
    limit: number;
    rate: number;
    deduction: number;
};

export type GiftType = 'general' | 'special';

export type CalculationDetail = {
    giftAmount: number;
    basicDeduction: number;
    taxableAmount: number;
    rate: number;
    deduction: number;
    taxBeforeDeduction: number;
    tax: number;
    bracketIndex: number;
};

export type CalculationResult = {
    name: string;
    div: number;
    oneTimeAmount: number;
    oneTimeTax: number;
    totalTax: number;
    effectiveRate: number;
    detail: CalculationDetail;
};

// 基礎控除 110万円
export const BASIC_DEDUCTION = 1_100_000;

// 一般贈与税率表（国税庁の速算表に基づく）
export const GENERAL_RATES: TaxRate[] = [
    { limit: 2_000_000, rate: 0.10, deduction: 0 },
    { limit: 3_000_000, rate: 0.15, deduction: 100_000 },
    { limit: 4_000_000, rate: 0.20, deduction: 250_000 },
    { limit: 6_000_000, rate: 0.30, deduction: 650_000 },
    { limit: 10_000_000, rate: 0.40, deduction: 1_250_000 },
    { limit: 15_000_000, rate: 0.45, deduction: 1_750_000 },
    { limit: 30_000_000, rate: 0.50, deduction: 2_500_000 },
    { limit: Infinity, rate: 0.55, deduction: 4_000_000 },
];

// 特例贈与税率表（国税庁の速算表に基づく）
export const SPECIAL_RATES: TaxRate[] = [
    { limit: 2_000_000, rate: 0.10, deduction: 0 },
    { limit: 4_000_000, rate: 0.15, deduction: 100_000 },
    { limit: 6_000_000, rate: 0.20, deduction: 300_000 },
    { limit: 10_000_000, rate: 0.30, deduction: 900_000 },
    { limit: 15_000_000, rate: 0.40, deduction: 1_900_000 },
    { limit: 30_000_000, rate: 0.45, deduction: 2_650_000 },
    { limit: 45_000_000, rate: 0.50, deduction: 4_150_000 },
    { limit: Infinity, rate: 0.55, deduction: 6_400_000 },
];

// 分割パターン
export const PATTERNS = [
    { name: '一括贈与', div: 1 },
    { name: '2年分割', div: 2 },
    { name: '4年分割', div: 4 },
] as const;

// パターン別カラー（濃緑→緑→明緑）
export const PATTERN_COLORS = ['#166534', '#16a34a', '#4ade80'] as const;

/**
 * 1回あたりの計算詳細を取得
 */
export const calcTaxDetail = (amount: number, type: GiftType): CalculationDetail => {
    const taxable = amount - BASIC_DEDUCTION;
    if (taxable <= 0) {
        return {
            giftAmount: amount,
            basicDeduction: BASIC_DEDUCTION,
            taxableAmount: 0,
            rate: 0,
            deduction: 0,
            taxBeforeDeduction: 0,
            tax: 0,
            bracketIndex: -1,
        };
    }

    const rates = type === 'special' ? SPECIAL_RATES : GENERAL_RATES;
    const bracketIndex = rates.findIndex((r) => taxable <= r.limit);
    const bracket = rates[bracketIndex]; // 末尾が Infinity なので必ずヒット

    const taxBeforeDeduction = Math.floor(taxable * bracket.rate);
    const tax = Math.max(0, taxBeforeDeduction - bracket.deduction);

    return {
        giftAmount: amount,
        basicDeduction: BASIC_DEDUCTION,
        taxableAmount: taxable,
        rate: bracket.rate,
        deduction: bracket.deduction,
        taxBeforeDeduction,
        tax,
        bracketIndex,
    };
};

/**
 * 1回あたりの税額を計算
 */
export const calcTaxOneTime = (amount: number, type: GiftType): number => {
    return calcTaxDetail(amount, type).tax;
};

export type YearComparisonResult = {
    years: number;
    oneTimeAmount: number;
    oneTimeTax: number;
    totalTax: number;
    effectiveRate: number;
    taxFree: boolean;
    optimal: boolean;
};

const MAX_YEARS = 20;

/**
 * 分割年数ごとの税額を一覧で取得（1〜20年）
 */
export const calculateYearComparison = (amount: number, type: GiftType): YearComparisonResult[] => {
    const rows: YearComparisonResult[] = [];
    let minTax = Infinity;
    let minIdx = 0;

    for (let years = 1; years <= MAX_YEARS; years++) {
        const oneTimeAmount = Math.floor(amount / years);
        const oneTimeTax = calcTaxOneTime(oneTimeAmount, type);
        const totalTax = oneTimeTax * years;
        rows.push({
            years,
            oneTimeAmount,
            oneTimeTax,
            totalTax,
            effectiveRate: amount > 0 ? totalTax / amount : 0,
            taxFree: oneTimeTax === 0,
            optimal: false,
        });
        if (totalTax < minTax) {
            minTax = totalTax;
            minIdx = rows.length - 1;
        }
    }

    rows[minIdx].optimal = true;
    return rows;
};

/**
 * 全パターンの計算結果を取得
 */
export const calculateAllPatterns = (amount: number, type: GiftType): CalculationResult[] => {
    return PATTERNS.map((pattern) => {
        const oneTimeAmount = Math.floor(amount / pattern.div);
        const detail = calcTaxDetail(oneTimeAmount, type);
        const totalTax = detail.tax * pattern.div;
        const effectiveRate = oneTimeAmount > 0 ? detail.tax / oneTimeAmount : 0;

        return {
            name: pattern.name,
            div: pattern.div,
            oneTimeAmount,
            oneTimeTax: detail.tax,
            totalTax,
            effectiveRate,
            detail,
        };
    });
};
