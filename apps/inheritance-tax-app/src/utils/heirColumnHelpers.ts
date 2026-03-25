import { formatCurrency } from './formatters';
import type { HeirColumn } from '../components/HeirScenarioTable';

/** 先頭の「相続人」列 */
export function heirLabelColumn(
  getLabel: (i: number) => string | undefined,
): HeirColumn {
  return {
    label: '相続人',
    align: 'left',
    getValue: i => getLabel(i),
    getTotalValue: () => '合計',
  };
}

/** 汎用通貨列 */
export function currencyColumn(
  label: string,
  getValue: (i: number) => number,
  totalValue: number,
  opts?: { bold?: boolean; prefix?: string },
): HeirColumn {
  const fmt = (v: number) => {
    if (opts?.prefix && v > 0) return `${opts.prefix}${formatCurrency(v)}`;
    return formatCurrency(v);
  };
  return {
    label,
    bold: opts?.bold,
    getValue: i => fmt(getValue(i)),
    getTotalValue: () => fmt(totalValue),
  };
}

/** 通貨列（0の場合 '—' 表示） */
export function currencyOrDashColumn(
  label: string,
  getValue: (i: number) => number,
  totalValue: number,
): HeirColumn {
  const fmt = (v: number) => v > 0 ? formatCurrency(v) : '—';
  return {
    label,
    getValue: i => fmt(getValue(i)),
    getTotalValue: () => fmt(totalValue),
  };
}
