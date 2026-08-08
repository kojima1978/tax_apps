import { RECONSTRUCTION_RATIO, type TaxRateSet } from '@/lib/tax-rates';
import type { TaxAmounts } from '@/lib/capital-gains';
import { formatRate, formatYen } from '@/lib/utils';

/** 結果テーブルの1行 */
export type ResultRow = {
    label: string;
    value: string;
    /** 内訳行（インデント表示） */
    sub?: boolean;
    /** 強調行（合計・税額など） */
    highlight?: boolean;
    note?: string;
};

/**
 * 税目ごとの内訳3行（所得税・復興特別所得税・住民税）。
 * 税率はラベルに括弧書きで併記する。行を増やさないので印刷1枚に収まる形を崩さない。
 * 不動産・株式等の両タブで同じ見た目にするためここに置く。
 */
export const taxBreakdownRows = (
    amounts: TaxAmounts,
    rate: TaxRateSet,
    sub = false,
): ResultRow[] => [
    { label: `所得税（${formatRate(rate.incomeTax)}）`, value: formatYen(amounts.incomeTax), sub },
    {
        label: `復興特別所得税（所得税額の${formatRate(RECONSTRUCTION_RATIO)}）`,
        value: formatYen(amounts.reconstruction),
        sub,
    },
    { label: `住民税（${formatRate(rate.residentTax)}）`, value: formatYen(amounts.residentTax), sub },
];

/**
 * 税目の合計4行。並びは申告書の順ではなく「いつ納めるか」で切る。
 * 所得税と復興特別所得税は確定申告で一緒に納め、住民税は翌年度に別途納付するので、
 * 単純に足し上げず小計を挟む。区分が1つしかないケースでは税目ごとの合計行が
 * すぐ上の明細と同じ数字の繰り返しになるため、納付時期という別の情報を持たせている。
 * 税率は不動産だと区分ごとに違って合計には書けないので、株式等のときだけ渡す。
 */
export const taxTotalRows = (amounts: TaxAmounts, rate?: TaxRateSet): ResultRow[] => {
    const withRate = (label: string, value: number | undefined) =>
        value === undefined ? label : `${label}（${formatRate(value)}）`;

    return [
        { label: withRate('所得税', rate?.incomeTax), value: formatYen(amounts.incomeTax) },
        {
            label: `復興特別所得税（所得税額の${formatRate(RECONSTRUCTION_RATIO)}）`,
            value: formatYen(amounts.reconstruction),
        },
        {
            label: '小計',
            note: '確定申告で納付',
            value: formatYen(amounts.incomeTax + amounts.reconstruction),
        },
        {
            label: withRate('住民税', rate?.residentTax),
            note: '翌年度6月〜納付',
            value: formatYen(amounts.residentTax),
        },
    ];
};

/**
 * 手取り概算とその内訳3行。
 * 3つの数字はいずれも上の表に出ているが、印刷物では離れた位置に散るので、
 * 手取りの行だけを見て検算できるように再掲する。
 * 不動産・株式等の両タブで同じ見た目にするためここに置く。
 */
export const netProceedsRows = (params: {
    transferPrice: number;
    transferExpense: number;
    tax: number;
    netProceeds: number;
}): ResultRow[] => [
    { label: '手取り概算', value: formatYen(params.netProceeds), highlight: true },
    { label: '譲渡価額', value: formatYen(params.transferPrice), sub: true },
    { label: '譲渡費用', value: `− ${formatYen(params.transferExpense)}`, sub: true },
    {
        label: '税額（所得税・復興特別所得税・住民税）',
        value: `− ${formatYen(params.tax)}`,
        sub: true,
    },
];
