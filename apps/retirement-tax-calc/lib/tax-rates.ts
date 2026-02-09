/**
 * 所得税速算表のブラケット
 */
export type TaxBracket = {
    /** 課税所得の上限（この金額以下に適用、最後のブラケットはInfinity） */
    limit: number;
    /** 税率（小数） */
    rate: number;
    /** 控除額 */
    deduction: number;
};

/**
 * 年度別税率データ
 */
export type TaxRateYear = {
    label: string;
    brackets: TaxBracket[];
    /** 復興特別所得税率 */
    reconstructionTaxRate: number;
    /** 住民税内訳: 市民税率 */
    municipalTaxRate: number;
    /** 住民税内訳: 県民税率 */
    prefecturalTaxRate: number;
};

/**
 * 令和6年・令和7年の税率（現行法ベース）
 */
export const TAX_RATES: Record<string, TaxRateYear> = {
    "2024": {
        label: "令和6年（2024年）",
        brackets: [
            { limit: 1_950_000, rate: 0.05, deduction: 0 },
            { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
            { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
            { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
            { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
            { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
            { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
        ],
        reconstructionTaxRate: 0.021,
        municipalTaxRate: 0.06,
        prefecturalTaxRate: 0.04,
    },
    "2025": {
        label: "令和7年（2025年）",
        brackets: [
            { limit: 1_950_000, rate: 0.05, deduction: 0 },
            { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
            { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
            { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
            { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
            { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
            { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
        ],
        reconstructionTaxRate: 0.021,
        municipalTaxRate: 0.06,
        prefecturalTaxRate: 0.04,
    },
};

/** デフォルト年度キー */
export const DEFAULT_YEAR = "2025";

/** 利用可能な年度一覧 */
export const AVAILABLE_YEARS = Object.keys(TAX_RATES);

/**
 * 税率ブラケットの範囲ラベルを生成
 */
export const formatBracketRange = (
    index: number,
    bracket: TaxBracket,
    allBrackets: TaxBracket[],
    formatFn: (n: number) => string,
): string => {
    const prevLimit = index > 0 ? allBrackets[index - 1].limit : 0;
    if (index === 0) return `${formatFn(bracket.limit)}円以下`;
    if (bracket.limit === Infinity) return `${formatFn(prevLimit)}円超`;
    return `${formatFn(prevLimit)}円超〜${formatFn(bracket.limit)}円以下`;
};

/**
 * 課税退職所得金額がブラケットに該当するか判定
 */
export const isBracketActive = (
    taxableIncome: number,
    index: number,
    allBrackets: TaxBracket[],
): boolean => {
    const prevLimit = index > 0 ? allBrackets[index - 1].limit : 0;
    return taxableIncome > 0 && taxableIncome > prevLimit && taxableIncome <= allBrackets[index].limit;
};
