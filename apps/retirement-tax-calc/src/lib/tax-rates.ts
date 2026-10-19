/**
 * 所得税速算表のブラケット
 */
type TaxBracket = {
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

/** 現行の所得税速算表ブラケット（令和6年〜8年共通） */
const CURRENT_BRACKETS: TaxBracket[] = [
    { limit: 1_950_000, rate: 0.05, deduction: 0 },
    { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
    { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
    { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
    { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
    { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
    { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
];

/** 現行の住民税・復興税率（令和6年〜8年共通） */
const CURRENT_RATES = {
    reconstructionTaxRate: 0.021,
    municipalTaxRate: 0.06,
    prefecturalTaxRate: 0.04,
} as const;

/**
 * 年度別税率データ（税率変更時は該当年度のみ個別定義）
 *
 * 年は自動では延ばさない。税率が変わる年に前年の表を黙って使い回すと、
 * 誰にも見えないまま違う税額を出すため。登録の無い年は画面に注意を出す
 * （`CURRENT_YEAR_NOTICE`）。
 */
export const TAX_RATES: Record<string, TaxRateYear> = {
    "2024": { label: "令和6年（2024年）", brackets: CURRENT_BRACKETS, ...CURRENT_RATES },
    "2025": { label: "令和7年（2025年）", brackets: CURRENT_BRACKETS, ...CURRENT_RATES },
    "2026": { label: "令和8年（2026年）", brackets: CURRENT_BRACKETS, ...CURRENT_RATES },
};

/** 利用可能な年度一覧（古い順） */
export const AVAILABLE_YEARS = Object.keys(TAX_RATES).sort();

/** 今日の年（日本時間）。TZ が UTC の環境で大晦日に前年にならないよう固定する */
const currentYear = (date: Date = new Date()): string =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Tokyo" }).format(date);

/**
 * 既定の年度キー: 今年の表があれば今年、無ければ今年以前で一番新しい年。
 * 以前は "2025" の手書きで、年が明けても前年のまま選ばれていた。
 */
export const pickDefaultYear = (date: Date = new Date()): string => {
    const year = currentYear(date);
    const past = AVAILABLE_YEARS.filter((y) => y <= year);
    return past.length > 0 ? past[past.length - 1] : AVAILABLE_YEARS[0];
};

/** デフォルト年度キー */
export const DEFAULT_YEAR = pickDefaultYear();

/**
 * 今年の税率表が未登録のときの注意文（登録済みなら null）。
 * 既定は登録済みの最新年へ落ちるので、その年の表で計算していることを画面に出す。
 */
export const unregisteredYearNotice = (date: Date = new Date()): string | null => {
    const year = currentYear(date);
    if (TAX_RATES[year]) return null;
    const fallback = pickDefaultYear(date);
    return `${year}年の税率表は未登録です。${TAX_RATES[fallback].label}の税率で計算しています。`;
};

export const CURRENT_YEAR_NOTICE = unregisteredYearNotice();

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
