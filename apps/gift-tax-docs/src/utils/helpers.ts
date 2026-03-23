/** 数値を丸囲み数字に変換（①②③...⑳、21以上は(21)形式） */
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
export function toCircledNumber(n: number): string {
  if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1];
  return `(${n})`;
}
