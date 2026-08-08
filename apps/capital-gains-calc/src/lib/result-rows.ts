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
 * 税目の内訳4行。並びは申告書の順ではなく「いつ納めるか」で切り、
 * 確定申告で一緒に納める所得税＋復興特別所得税で小計を挟んでから住民税（翌年度納付）を出す。
 * 納付時期そのものは行に書かない（1行1行の高さを揃えるため注記を持たせない方針）。
 *
 * 税率区分が1つならこれが唯一の明細（`rate` に区分の税率を渡す）、
 * 軽減税率で区分が2つに割れるときだけ、区分ごとの明細に続く合計として `total` で使う。
 * 合計のときに税率を書かないのは、区分ごとに違って1つに定まらないため。
 */
export const taxTotalRows = (
    amounts: TaxAmounts,
    rate?: TaxRateSet,
    total = false,
): ResultRow[] => {
    const suffix = total ? ' 合計' : '';
    const label = (base: string, value: number | undefined) =>
        `${base}${value === undefined ? '' : `（${formatRate(value)}）`}${suffix}`;

    return [
        { label: label('所得税', rate?.incomeTax), value: formatYen(amounts.incomeTax), sub: true },
        {
            // 合計行では税率を書かない（区分ごとの明細に既に出ていて、ラベルが長くなるだけ）
            label: total
                ? '復興特別所得税 合計'
                : `復興特別所得税（所得税額の${formatRate(RECONSTRUCTION_RATIO)}）`,
            value: formatYen(amounts.reconstruction),
            sub: true,
        },
        { label: '小計', value: formatYen(amounts.incomeTax + amounts.reconstruction) },
        {
            label: label('住民税', rate?.residentTax),
            value: formatYen(amounts.residentTax),
            sub: true,
        },
    ];
};

/**
 * 手取り概算とその内訳3行。
 * 3つの数字はいずれも上の表に出ているが、印刷物では離れた位置に散るので、
 * 手取りの行だけを見て検算できるように再掲する。
 * 内訳を先に置いて手取りで締めるのは、税額の計算と同じ「明細 → 結果」の並びに揃えるため。
 * 不動産・株式等の両タブで同じ見た目にするためここに置く。
 */
export const netProceedsRows = (params: {
    transferPrice: number;
    transferExpense: number;
    tax: number;
    netProceeds: number;
}): ResultRow[] => [
    { label: '譲渡価額', value: formatYen(params.transferPrice), sub: true },
    { label: '譲渡費用', value: `− ${formatYen(params.transferExpense)}`, sub: true },
    { label: '税額合計', value: `− ${formatYen(params.tax)}`, sub: true },
    { label: '手取り概算', value: formatYen(params.netProceeds), highlight: true },
];
