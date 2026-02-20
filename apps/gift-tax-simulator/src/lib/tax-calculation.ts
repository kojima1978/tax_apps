export type TaxRate = {
    limit: number;
    rate: number;
    deduction: number;
};

export type GiftType = 'general' | 'special';

export type CalculationResult = {
    name: string;
    div: number;
    oneTimeAmount: number;
    oneTimeTax: number;
    totalTax: number;
    effectiveRate: number;
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

/**
 * 1回あたりの税額を計算
 */
export const calcTaxOneTime = (amount: number, type: GiftType): number => {
    const taxable = amount - BASIC_DEDUCTION;
    if (taxable <= 0) return 0;

    const rates = type === 'special' ? SPECIAL_RATES : GENERAL_RATES;
    const bracket = rates.find((r) => taxable <= r.limit);

    if (!bracket) return 0;
    return Math.floor(taxable * bracket.rate) - bracket.deduction;
};

/**
 * 全パターンの計算結果を取得
 */
export const calculateAllPatterns = (amount: number, type: GiftType): CalculationResult[] => {
    return PATTERNS.map((pattern) => {
        const oneTimeAmount = Math.floor(amount / pattern.div);
        const oneTimeTax = calcTaxOneTime(oneTimeAmount, type);
        const totalTax = oneTimeTax * pattern.div;
        const effectiveRate = oneTimeAmount > 0 ? oneTimeTax / oneTimeAmount : 0;

        return {
            name: pattern.name,
            div: pattern.div,
            oneTimeAmount,
            oneTimeTax,
            totalTax,
            effectiveRate,
        };
    });
};
