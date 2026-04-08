/** 数値を日本円フォーマット（3桁カンマ区切り） */
export function formatYen(value: number): string {
  return value.toLocaleString('ja-JP');
}

/** 入力文字列をカンマ除去して数値に変換 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[,、]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : Math.floor(num);
}

/** パーセント表示 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}
