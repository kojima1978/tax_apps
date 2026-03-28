/** 数値を丸囲み数字に変換（①②③...⑳、21以上は(21)形式） */
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
export function toCircledNumber(n: number): string {
  if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1];
  return `(${n})`;
}

export const REIWA_OFFSET = 2018;

export function formatReiwaYear(year: number): string {
  const reiwaYear = year - REIWA_OFFSET;
  if (reiwaYear === 1) return '令和元年';
  if (reiwaYear < 1) return `${year}年`;
  return `令和${reiwaYear}年`;
}

export function getDefaultYear(): number {
  return new Date().getFullYear();
}
