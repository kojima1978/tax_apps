export type TaxRate = {
    limit: number;
    rate: number;
    deduction: number;
};

// 基礎控除 110万円
export const BASIC_DEDUCTION = 1100000;

// 一般贈与税率表
export const GENERAL_RATES: TaxRate[] = [
    { limit: 2000000, rate: 0.10, deduction: 0 },
    { limit: 3000000, rate: 0.15, deduction: 100000 },
    { limit: 4000000, rate: 0.20, deduction: 250000 },
    { limit: 6000000, rate: 0.30, deduction: 650000 },
    { limit: 10000000, rate: 0.40, deduction: 1250000 },
    { limit: 15000000, rate: 0.45, deduction: 1750000 },
    { limit: 30000000, rate: 0.50, deduction: 2500000 },
    { limit: Infinity, rate: 0.55, deduction: 4000000 }
];

// 特例贈与税率表
export const SPECIAL_RATES: TaxRate[] = [
    { limit: 2000000, rate: 0.10, deduction: 0 },
    { limit: 4000000, rate: 0.15, deduction: 100000 },
    { limit: 6000000, rate: 0.20, deduction: 300000 },
    { limit: 10000000, rate: 0.30, deduction: 900000 },
    { limit: 15000000, rate: 0.40, deduction: 1900000 },
    { limit: 30000000, rate: 0.45, deduction: 2650000 },
    { limit: 45000000, rate: 0.50, deduction: 4150000 },
    { limit: Infinity, rate: 0.55, deduction: 6400000 }
];

export type GiftType = 'general' | 'special';

export type CalculationResult = {
    name: string;
    div: number;
    oneTimeAmount: number;
    oneTimeTax: number;
    totalTax: number;
    effectiveRate: number;
};

// 分割パターン
export const PATTERNS = [
    { name: "一括贈与", div: 1 },
    { name: "2年分割", div: 2 },
    { name: "4年分割", div: 4 }
] as const;

/**
 * 税額計算ロジック (1回あたり)
 */
export function calcTaxOneTime(amount: number, type: GiftType): number {
    const taxable = amount - BASIC_DEDUCTION;
    if (taxable <= 0) return 0;

    const rates = type === 'special' ? SPECIAL_RATES : GENERAL_RATES;
    const rate = rates.find(r => taxable <= r.limit);

    return rate ? Math.floor(taxable * rate.rate) - rate.deduction : 0;
}

/**
 * 全パターン計算
 */
export function calculateAllPatterns(amount: number, type: GiftType): CalculationResult[] {
    return PATTERNS.map(p => {
        // 割り切れない場合の端数は切り捨てで簡易化
        const oneTimeAmount = Math.floor(amount / p.div);
        const oneTimeTax = calcTaxOneTime(oneTimeAmount, type);
        const totalTax = oneTimeTax * p.div;

        // 実効税率 = 1回あたりの税額 / 1回あたりの贈与額 (※贈与額0なら0)
        const effectiveRate = oneTimeAmount > 0 ? (oneTimeTax / oneTimeAmount) : 0;

        return {
            name: p.name,
            div: p.div,
            oneTimeAmount,
            oneTimeTax,
            totalTax,
            effectiveRate
        };
    });
}
