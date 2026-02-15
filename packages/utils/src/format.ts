const NUMBER_FORMAT = new Intl.NumberFormat('ja-JP');

/** カンマ区切り数値フォーマット: 1234567 → "1,234,567" */
export function formatCurrency(num: number): string {
  return NUMBER_FORMAT.format(num);
}

/** 円付きフォーマット: 1234567 → "1,234,567円" */
export function formatYen(num: number): string {
  return `${NUMBER_FORMAT.format(num)}円`;
}

/** カンマ除去パース: "1,234,567" → 1234567 */
export function parseNumericInput(value: string): number {
  return Number(value.replace(/,/g, ''));
}
