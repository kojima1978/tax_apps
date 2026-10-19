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
    /** 所得税及び復興特別所得税（確定申告で一緒に納める額。合計では100円未満切捨て） */
    nationalTax: number;
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

const ZERO_TAX: TaxAmounts = { incomeTax: 0, reconstruction: 0, nationalTax: 0, residentTax: 0, total: 0 };

const floorTo = (value: number, unit: number): number => Math.floor(value / unit) * unit;

/** 課税標準（課税譲渡所得金額）は1,000円未満切捨て（国税通則法118条1項・地方税法20条の4の2第1項） */
export const truncateTaxBase = (value: number): number => floorTo(Math.max(0, value), 1_000);

/**
 * 住民税の所得割は市町村民税と道府県民税に分かれ、それぞれ100円未満を切り捨てる。
 * 分離課税の税率は指定都市以外ではどの区分も 3：2（長期 3%＋2%、短期 5.4%＋3.6%、軽減 2.4%＋1.6%）。
 * 指定都市は 4：1 なので、そこでは100円ずれることがある（注記で知らせる）
 */
const RESIDENT_MUNICIPAL_SHARE = { numerator: 3, denominator: 5 } as const;

/**
 * 課税標準に税率を適用する（税率区分ごとの明細。100円未満の切捨ては合計側の finalizeTax で行う）。
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
        nationalTax: incomeTax + reconstruction,
        residentTax,
        total: incomeTax + reconstruction + residentTax,
    };
};

/**
 * 税率区分ごとの明細を、申告書と同じ端数処理で1つの税額にまとめる。
 * - 復興特別所得税は区分ごとではなく、合計した所得税額（基準所得税額）× 2.1%（1円未満切捨て）
 * - 所得税及び復興特別所得税の申告納税額は、合計して100円未満切捨て（国税通則法119条1項）
 * - 住民税は市町村民税・道府県民税ごとに100円未満切捨て（地方税法20条の4の2第3項）
 */
const finalizeTax = (list: TaxAmounts[]): TaxAmounts => {
    const incomeTax = list.reduce((sum, t) => sum + t.incomeTax, 0);
    const residentRaw = list.reduce((sum, t) => sum + t.residentTax, 0);
    const reconstruction = Math.floor(incomeTax * RECONSTRUCTION_RATIO);
    const nationalTax = floorTo(incomeTax + reconstruction, 100);
    const municipalRaw = Math.floor(
        (residentRaw * RESIDENT_MUNICIPAL_SHARE.numerator) / RESIDENT_MUNICIPAL_SHARE.denominator,
    );
    const residentTax = floorTo(municipalRaw, 100) + floorTo(residentRaw - municipalRaw, 100);
    return { incomeTax, reconstruction, nationalTax, residentTax, total: nationalTax + residentTax };
};

const toPercent = (rate: TaxRateSet): number => Math.round(totalRate(rate) * 1e6) / 1e4;

/**
 * 納付時期の案内。所得税と住民税で納める時期が分かれることは資金繰りに直結するが、
 * 結果表の行に書くと行の高さが揃わなくなるので注記へ回す。
 */
const PAYMENT_SCHEDULE_NOTE =
    '納付時期: 所得税・復興特別所得税は翌年3月15日までの確定申告で納付し、住民税は翌年6月以降に別途納付します（普通徴収は年4回）。';

/** 端数処理の案内。合計が明細の足し算と一致しない理由を、表を見た人が自分で確かめられるようにする */
const ROUNDING_NOTE =
    '端数は申告と同じく、課税譲渡所得金額は1,000円未満、所得税＋復興特別所得税と住民税は100円未満を切り捨てています（住民税は市町村民税・道府県民税ごと。指定都市では100円ずれることがあります）。';

/** 実額より概算取得費（5%）のほうが大きいときの案内。不動産・株式等で同じ判断をする */
const estimatedCostAdvantageNote = (estimatedCost: number, actualCost: number): string =>
    `概算取得費（${estimatedCost.toLocaleString('ja-JP')}円）のほうが実額（${actualCost.toLocaleString('ja-JP')}円）より大きいため、概算を選択すると譲渡所得が ${(estimatedCost - actualCost).toLocaleString('ja-JP')}円 少なくなります。`;

const parseDate = (value: string): Date | null => {
    if (!value) return null;
    // new Date('YYYY-MM-DD') は UTC の0時として読むので、UTC より西の時間帯では前日になる。
    // 比べる相手（1月1日など）は現地時刻で作るので、こちらも現地の日付として組み立てる
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
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
    // 0.9・償却率（小数3桁）を小数のまま掛けると、割り切れるはずの積が 492992.99999… になり
    // 切り捨てで1円少なくなる（木造 1,178,000円×15年など）。千分率の整数にして最後に1回だけ割る
    const rateMilli = Math.round(structure.rate * 1000);
    const baseTenths = Math.round(DEPRECIATION_BASE_RATIO * 10);
    const raw = Math.floor((buildingCost * baseTenths * rateMilli * elapsedYears) / 10_000);
    return Math.min(raw, depreciationLimit(buildingCost));
};

/** 償却費の上限（取得価額の95%）。0.95 を小数のまま掛けず百分率の整数で求める */
export const depreciationLimit = (buildingCost: number): number =>
    Math.floor((buildingCost * Math.round(DEPRECIATION_LIMIT_RATIO * 100)) / 100);

// ============================================================
// 不動産（土地・建物）の譲渡所得
// ============================================================

export type RealEstateInput = {
    transferPrice: number;
    transferExpense: number;
    costMode: CostMode;
    landCost: number;
    buildingCost: number;
    /**
     * 建物の取得価額を建築価額表などから求めた場合の算出根拠（1行）。
     * 申告時に必ず問われるところなので、計算上の補足に載せて印刷物にも残す。
     */
    buildingCostBasis?: string;
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
    /** 実額取得費の内訳。求め方によっては入力値ではなく算出値なので、結果側から参照できるようにする */
    landCost: number;
    buildingCost: number;
    actualCost: number;
    estimatedCost: number;
    acquisitionCost: number;
    costAddition: number;
    transferExpense: number;
    grossProfit: number;
    specialDeduction: number;
    /** 特別控除後の譲渡所得金額（1,000円未満を切り捨てる前。ミニマムタックスの基準所得金額はこちら） */
    incomeAfterDeduction: number;
    /** 課税譲渡所得金額（1,000円未満切捨て） */
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
            : Math.min(Math.floor(input.depreciationInput), depreciationLimit(input.buildingCost));

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

    const incomeAfterDeduction = Math.max(0, grossProfit - specialDeduction);
    const taxableIncome = truncateTaxBase(incomeAfterDeduction);
    const reducedRateApplied = input.useReducedRate && input.isResidence && isOver10Years;

    const brackets: TaxBracket[] = [];
    if (taxableIncome > 0) {
        if (reducedRateApplied) {
            const lowerPart = Math.min(taxableIncome, REDUCED_RATE_LIMIT);
            brackets.push({
                // 税率は結果表で行を増やさずに出したいので、区分名と同じ括弧にまとめる
                label: `6,000万円以下の部分（軽減税率 ${toPercent(REDUCED_RATE)}%）`,
                taxableAmount: lowerPart,
                ratePercent: toPercent(REDUCED_RATE),
                rate: REDUCED_RATE,
                amounts: applyRate(lowerPart, REDUCED_RATE),
            });
            const upperPart = taxableIncome - lowerPart;
            if (upperPart > 0) {
                brackets.push({
                    label: `6,000万円超の部分（税率 ${toPercent(LONG_TERM_RATE)}%）`,
                    taxableAmount: upperPart,
                    ratePercent: toPercent(LONG_TERM_RATE),
                    rate: LONG_TERM_RATE,
                    amounts: applyRate(upperPart, LONG_TERM_RATE),
                });
            }
        } else {
            const rate = isLongTerm ? LONG_TERM_RATE : SHORT_TERM_RATE;
            // 日付が未入力だと短期扱いになる。注記だけだと表を見て確定した区分と誤解するので区分名にも添える
            const undated = !isLongTerm && ownershipYears === null;
            brackets.push({
                label: `${isLongTerm ? '長期譲渡所得' : '短期譲渡所得'}（${undated ? '日付未入力・' : ''}税率 ${toPercent(rate)}%）`,
                taxableAmount: taxableIncome,
                ratePercent: toPercent(rate),
                rate,
                amounts: applyRate(taxableIncome, rate),
            });
        }
    }

    const tax = finalizeTax(brackets.map((b) => b.amounts));

    const notes: string[] = [];
    if (ownershipYears === null) {
        notes.push('取得日と譲渡日を入力すると、長期・短期の判定が行われます。現在は短期税率で計算しています。');
    }
    if (input.costMode === 'actual' && input.buildingCostBasis) {
        notes.push(input.buildingCostBasis);
    }
    if (input.costMode === 'estimated') {
        notes.push('概算取得費（譲渡価額の5%）で計算しています。実額の取得費が判明している場合はそちらが有利になることがあります。');
    } else if (estimatedCost > actualCost && input.transferPrice > 0) {
        notes.push(estimatedCostAdvantageNote(estimatedCost, actualCost));
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
    if (tax.total > 0) {
        notes.push(PAYMENT_SCHEDULE_NOTE, ROUNDING_NOTE);
    }

    return {
        ownershipYears,
        elapsedYears,
        isLongTerm,
        isOver10Years,
        term,
        depreciation,
        landCost: input.landCost,
        buildingCost: input.buildingCost,
        actualCost,
        estimatedCost,
        acquisitionCost,
        costAddition,
        transferExpense: input.transferExpense,
        grossProfit,
        specialDeduction,
        incomeAfterDeduction,
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
    /** 1,000円未満を切り捨てる前の譲渡所得金額（ミニマムタックスの基準所得金額はこちら） */
    incomeAfterDeduction: number;
    /** 課税譲渡所得金額（1,000円未満切捨て） */
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
    const incomeAfterDeduction = Math.max(0, grossProfit);
    const taxableIncome = truncateTaxBase(incomeAfterDeduction);
    const tax = finalizeTax([applyRate(taxableIncome, SECURITIES_RATE)]);

    const notes: string[] = [];
    if (input.costMode === 'estimated') {
        notes.push('取得費が不明な場合の概算取得費（譲渡価額の5%）で計算しています。');
    } else if (estimatedCost > input.actualCost && input.transferPrice > 0) {
        notes.push(estimatedCostAdvantageNote(estimatedCost, input.actualCost));
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
    if (tax.total > 0) {
        notes.push(PAYMENT_SCHEDULE_NOTE, ROUNDING_NOTE);
    }

    return {
        actualCost: input.actualCost,
        estimatedCost,
        acquisitionCost,
        transferExpense: input.transferExpense,
        grossProfit,
        incomeAfterDeduction,
        taxableIncome,
        ratePercent: toPercent(SECURITIES_RATE),
        rate: SECURITIES_RATE,
        tax,
        netProceeds: input.transferPrice - input.transferExpense - tax.total,
        isLoss: grossProfit < 0,
        notes,
    };
};
