/**
 * 譲渡所得税の税率・償却率テーブル
 *
 * 税率はすべて「所得税・復興特別所得税・住民税」の3本立てで保持する。
 * 復興特別所得税は所得税額の2.1%（令和19年分まで）。
 */

export type TaxRateSet = {
    /** 所得税率 */
    incomeTax: number;
    /** 復興特別所得税率（= incomeTax × 2.1%） */
    reconstruction: number;
    /** 住民税率 */
    residentTax: number;
};

const rateSet = (incomeTax: number, residentTax: number): TaxRateSet => ({
    incomeTax,
    // 復興特別所得税は所得税額に対する2.1%。浮動小数点の桁ブレを避けて丸める
    reconstruction: Math.round(incomeTax * 0.021 * 1e6) / 1e6,
    residentTax,
});

export const totalRate = (r: TaxRateSet): number =>
    r.incomeTax + r.reconstruction + r.residentTax;

/** 長期譲渡所得（所有期間5年超）… 合計 20.315% */
export const LONG_TERM_RATE = rateSet(0.15, 0.05);

/** 短期譲渡所得（所有期間5年以下）… 合計 39.63% */
export const SHORT_TERM_RATE = rateSet(0.30, 0.09);

/** 軽減税率の特例（10年超所有の居住用財産）6,000万円以下の部分 … 合計 14.21% */
export const REDUCED_RATE = rateSet(0.10, 0.04);

/** 株式等の譲渡所得（申告分離課税）… 合計 20.315% */
export const SECURITIES_RATE = rateSet(0.15, 0.05);

/** 軽減税率の特例で低い税率が適用される上限（課税長期譲渡所得 6,000万円） */
export const REDUCED_RATE_LIMIT = 60_000_000;

/** 居住用財産の3,000万円特別控除 */
export const RESIDENCE_SPECIAL_DEDUCTION = 30_000_000;

/** 概算取得費の割合（譲渡価額の5%） */
export const ESTIMATED_COST_RATIO = 0.05;

/** 長期譲渡と判定される所有期間（譲渡年1月1日時点でこの年数を「超える」こと） */
export const LONG_TERM_YEARS = 5;

/** 軽減税率の特例の対象となる所有期間（同じく「超える」こと） */
export const REDUCED_RATE_YEARS = 10;

/**
 * 非事業用建物の減価償却率（旧定額法）
 *
 * 非事業用資産は「法定耐用年数 × 1.5」の年数に対応する旧定額法の償却率を使う。
 * 償却費相当額 = 建物の取得価額 × 0.9 × 償却率 × 経過年数（取得価額の95%が上限）
 */
export type BuildingStructure = {
    key: string;
    label: string;
    /** 法定耐用年数（事業用） */
    statutoryYears: number;
    /** 非事業用の耐用年数（法定 × 1.5、端数切捨て） */
    nonBusinessYears: number;
    /** 非事業用の旧定額法償却率 */
    rate: number;
};

export const BUILDING_STRUCTURES: BuildingStructure[] = [
    { key: 'wood', label: '木造・合成樹脂造', statutoryYears: 22, nonBusinessYears: 33, rate: 0.031 },
    { key: 'wood-mortar', label: '木骨モルタル造', statutoryYears: 20, nonBusinessYears: 30, rate: 0.034 },
    { key: 'rc', label: '鉄筋・鉄骨鉄筋コンクリート造', statutoryYears: 47, nonBusinessYears: 70, rate: 0.015 },
    { key: 'brick', label: 'れんが造・石造・ブロック造', statutoryYears: 38, nonBusinessYears: 57, rate: 0.018 },
    { key: 'steel-3', label: '金属造（骨格材3mm以下）', statutoryYears: 19, nonBusinessYears: 28, rate: 0.036 },
    { key: 'steel-4', label: '金属造（骨格材3mm超4mm以下）', statutoryYears: 27, nonBusinessYears: 40, rate: 0.025 },
    { key: 'steel-over4', label: '金属造（骨格材4mm超）', statutoryYears: 34, nonBusinessYears: 51, rate: 0.020 },
];

export const findStructure = (key: string): BuildingStructure =>
    BUILDING_STRUCTURES.find((s) => s.key === key) ?? BUILDING_STRUCTURES[0];

/** 減価償却の限度（取得価額の95%まで＝残存簿価5%） */
export const DEPRECIATION_LIMIT_RATIO = 0.95;

/** 償却費計算に使う取得価額の掛目（旧定額法の 0.9） */
export const DEPRECIATION_BASE_RATIO = 0.9;
