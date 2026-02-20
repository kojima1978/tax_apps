import { TAX_RATES, type TaxRateYear } from "./tax-rates";

/** 退職区分 */
export type RetirementType = "general" | "officer" | "short_term";

/** 退職区分一覧 */
export const RETIREMENT_TYPES: RetirementType[] = ["general", "officer", "short_term"];

/** 退職区分ラベル */
export const RETIREMENT_TYPE_LABELS: Record<RetirementType, string> = {
    general: "一般退職手当等",
    officer: "特定役員退職手当等（勤続5年以下）",
    short_term: "短期退職手当等（勤続5年以下）",
};

/** パターン比較ラベル */
export const PATTERN_LABELS = ["案①", "案②", "案③"] as const;

/** 功績倍率プリセット */
type OfficerPreset = {
    label: string;
    multiplier: number;
};

export const OFFICER_PRESETS: OfficerPreset[] = [
    { label: "社長", multiplier: 3.0 },
    { label: "専務取締役", multiplier: 2.5 },
    { label: "常務取締役", multiplier: 2.5 },
    { label: "取締役", multiplier: 2.0 },
    { label: "監査役", multiplier: 2.0 },
];

/** 計算結果 */
export type RetirementTaxResult = {
    /** 勤続年数 */
    serviceYears: number;
    /** 退職金支給額 */
    amount: number;
    /** 退職所得控除額 */
    deduction: number;
    /** 課税退職所得金額（1,000円未満切捨て） */
    taxableIncome: number;
    /** 所得税額（100円未満切捨て） */
    incomeTax: number;
    /** 復興特別所得税額（1円未満切捨て） */
    reconstructionTax: number;
    /** 住民税額（100円未満切捨て） */
    residentTax: number;
    /** 住民税内訳: 市民税 */
    municipalTax: number;
    /** 住民税内訳: 県民税 */
    prefecturalTax: number;
    /** 税額合計 */
    totalTax: number;
    /** 手取額 */
    netAmount: number;
    /** 退職区分 */
    retirementType: RetirementType;
    /** 障害者退職 */
    isDisability: boolean;
    /** 適用税率年度 */
    taxYear: string;
};

/**
 * 勤続年数を算出（1年未満切上げ）
 */
export const calcServiceYears = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return 0;
    }

    let years = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();

    // 月日で1年に満たない端数があるかチェック
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        years--;
    }

    // 端数日がある場合は切り上げ
    const anniversaryDate = new Date(start);
    anniversaryDate.setFullYear(start.getFullYear() + years);
    if (end > anniversaryDate) {
        years++;
    }

    return Math.max(years, 1);
};

/**
 * 退職所得控除額を算出
 */
const calcDeduction = (years: number, isDisability: boolean): number => {
    if (years <= 0) return 0;

    let deduction: number;
    if (years <= 20) {
        deduction = 400_000 * years;
        // 最低80万円
        deduction = Math.max(deduction, 800_000);
    } else {
        deduction = 8_000_000 + 700_000 * (years - 20);
    }

    if (isDisability) {
        deduction += 1_000_000;
    }

    return deduction;
};

/**
 * 課税退職所得金額を算出（1,000円未満切捨て）
 */
const calcTaxableIncome = (
    amount: number,
    deduction: number,
    type: RetirementType,
): number => {
    const diff = Math.max(amount - deduction, 0);

    let taxableIncome: number;

    switch (type) {
        case "general":
            // 一般: (支給額 - 控除額) × 1/2
            taxableIncome = diff / 2;
            break;
        case "officer":
            // 特定役員: (支給額 - 控除額) ※1/2なし
            taxableIncome = diff;
            break;
        case "short_term":
            // 短期: 300万円以下は1/2、超過部分は1/2なし
            if (diff <= 3_000_000) {
                taxableIncome = diff / 2;
            } else {
                taxableIncome = 1_500_000 + (amount - (3_000_000 + deduction));
            }
            break;
    }

    // 1,000円未満切捨て
    return Math.floor(taxableIncome / 1000) * 1000;
};

/**
 * 所得税額を算出（100円未満切捨て）
 */
const calcIncomeTax = (taxableIncome: number, rates: TaxRateYear): number => {
    if (taxableIncome <= 0) return 0;

    const bracket = rates.brackets.find((b) => taxableIncome <= b.limit);
    if (!bracket) return 0;

    const tax = taxableIncome * bracket.rate - bracket.deduction;
    // 100円未満切捨て
    return Math.floor(Math.max(tax, 0) / 100) * 100;
};

/**
 * 復興特別所得税額を算出（1円未満切捨て）
 */
const calcReconstructionTax = (incomeTax: number, rates: TaxRateYear): number => {
    return Math.floor(incomeTax * rates.reconstructionTaxRate);
};

/**
 * 住民税額を算出（100円未満切捨て）
 */
const calcResidentTax = (
    taxableIncome: number,
    rates: TaxRateYear,
): { total: number; municipal: number; prefectural: number } => {
    if (taxableIncome <= 0) return { total: 0, municipal: 0, prefectural: 0 };

    const municipal = Math.floor((taxableIncome * rates.municipalTaxRate) / 100) * 100;
    const prefectural = Math.floor((taxableIncome * rates.prefecturalTaxRate) / 100) * 100;

    return {
        total: municipal + prefectural,
        municipal,
        prefectural,
    };
};

/**
 * 役員退職金限度額を算出
 */
export const calcOfficerLimit = (
    monthlyCompensation: number,
    multiplier: number,
    years: number,
): number => {
    return monthlyCompensation * multiplier * years;
};

/** メイン計算関数のパラメータ */
type CalcRetirementTaxParams = {
    amount: number;
    serviceYears: number;
    retirementType: RetirementType;
    isDisability: boolean;
    taxYear: string;
};

/**
 * 退職金税額一括計算（メイン関数）
 */
export const calcRetirementTax = (params: CalcRetirementTaxParams): RetirementTaxResult => {
    const { amount, serviceYears, retirementType, isDisability, taxYear } = params;
    const rates = TAX_RATES[taxYear];

    const deduction = calcDeduction(serviceYears, isDisability);
    const taxableIncome = calcTaxableIncome(amount, deduction, retirementType);
    const incomeTax = calcIncomeTax(taxableIncome, rates);
    const reconstructionTax = calcReconstructionTax(incomeTax, rates);
    const resident = calcResidentTax(taxableIncome, rates);
    const totalTax = incomeTax + reconstructionTax + resident.total;

    return {
        serviceYears,
        amount,
        deduction,
        taxableIncome,
        incomeTax,
        reconstructionTax,
        residentTax: resident.total,
        municipalTax: resident.municipal,
        prefecturalTax: resident.prefectural,
        totalTax,
        netAmount: amount - totalTax,
        retirementType,
        isDisability,
        taxYear,
    };
};

/**
 * 実効税率を算出（表示用文字列）
 */
export const calcEffectiveTaxRate = (amount: number, totalTax: number): string => {
    return amount > 0 ? ((totalTax / amount) * 100).toFixed(2) : "0.00";
};
