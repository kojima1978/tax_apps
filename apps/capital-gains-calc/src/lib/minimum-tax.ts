/**
 * ミニマムタックス（極めて高い水準の所得に対する課税・措法41条の19）
 *
 * 分離課税の譲渡所得は税率が低いため、所得が大きいほど負担率が下がる。
 * その是正として、令和7年分以後の所得税に次の追加課税が入る。
 *
 *   （基準所得金額 − 3億3,000万円）× 22.5% ＞ 基準所得税額 → 差額を追加で申告納付
 *
 * - 基準所得金額: 申告不要制度を適用しないで計算した合計所得金額（特別控除後）
 * - 基準所得税額: 上記に係る所得税額。復興特別所得税を含まず、外国税額控除も適用しない
 * - 追加分にも復興特別所得税がかかる。住民税には影響しない
 */

import { RECONSTRUCTION_RATIO } from './tax-rates';

/** 適用開始年分（令和7年） */
export const MINIMUM_TAX_START_YEAR = 2025;

/** 基準所得金額から控除する金額（3億3,000万円） */
export const MINIMUM_TAX_THRESHOLD = 330_000_000;

/** 追加課税の税率 */
export const MINIMUM_TAX_RATE = 0.225;

export type MinimumTaxInput = {
    /** 譲渡した年分 */
    year: number;
    /** 本ツールで計算した課税譲渡所得金額の合計（特別控除後） */
    capitalGainsIncome: number;
    /** 上記に対する所得税額の合計（復興特別所得税を含まない） */
    capitalGainsIncomeTax: number;
    /** 本ツールで計算していない所得の合計額 */
    otherIncome: number;
    /** 上記に対する所得税額（復興特別所得税を含まない） */
    otherIncomeTax: number;
};

export type MinimumTaxResult = {
    /** 適用年分（令和7年分以後）かどうか */
    isApplicableYear: boolean;
    baseIncome: number;
    baseIncomeTax: number;
    /** 3億3,000万円を超える部分 */
    excessIncome: number;
    /** （基準所得金額 − 3億3,000万円）× 22.5% */
    calculatedTax: number;
    /** 追加で納付する所得税額 */
    additionalIncomeTax: number;
    additionalReconstruction: number;
    additionalTotal: number;
    /** 追加課税が発生するかどうか */
    applies: boolean;
    notes: string[];
};

export const calcMinimumTax = (input: MinimumTaxInput): MinimumTaxResult => {
    const isApplicableYear = input.year >= MINIMUM_TAX_START_YEAR;

    const baseIncome = input.capitalGainsIncome + input.otherIncome;
    const baseIncomeTax = input.capitalGainsIncomeTax + input.otherIncomeTax;

    const excessIncome = Math.max(0, baseIncome - MINIMUM_TAX_THRESHOLD);
    const calculatedTax = Math.floor(excessIncome * MINIMUM_TAX_RATE);

    // 基準所得税額を超える部分だけが追加納付の対象
    const difference = calculatedTax - baseIncomeTax;
    const applies = isApplicableYear && difference > 0;

    const additionalIncomeTax = applies ? difference : 0;
    const additionalReconstruction = Math.floor(additionalIncomeTax * RECONSTRUCTION_RATIO);

    const notes: string[] = [];
    if (!isApplicableYear) {
        notes.push(
            `ミニマムタックスは令和7年分（${MINIMUM_TAX_START_YEAR}年分）以後の所得税に適用されます。${input.year}年分の譲渡は対象外です。`,
        );
    } else if (baseIncome <= MINIMUM_TAX_THRESHOLD) {
        notes.push('基準所得金額が3億3,000万円以下のため、追加課税は生じません。');
    } else if (!applies) {
        notes.push(
            '基準所得金額は3億3,000万円を超えていますが、通常の所得税額（基準所得税額）が上回るため追加課税は生じません。',
        );
    }

    notes.push(
        '基準所得金額には、申告不要を選択した上場株式等の配当・利子等も含めて判定します（NISA等の非課税所得は含めません）。',
        '住民税には影響しません。追加課税は所得税のみです。',
    );

    return {
        isApplicableYear,
        baseIncome,
        baseIncomeTax,
        excessIncome,
        calculatedTax,
        additionalIncomeTax,
        additionalReconstruction,
        additionalTotal: additionalIncomeTax + additionalReconstruction,
        applies,
        notes,
    };
};
