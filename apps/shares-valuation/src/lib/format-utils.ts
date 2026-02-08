/**
 * カンマ区切りの数値文字列を数値に変換する。
 * 例: "1,000,000" → 1000000
 */
export function parseNumericInput(value: string): number {
  return Number(value.replace(/,/g, ""));
}
