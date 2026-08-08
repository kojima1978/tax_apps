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
