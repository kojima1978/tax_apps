/** 円表示フォーマット */
export function formatYen(amount: number): string {
  return `¥${Math.floor(amount).toLocaleString('ja-JP')}`;
}

/** パーセント表示フォーマット */
export function formatPercent(rate: number): string {
  return `${rate.toFixed(3)}%`;
}
