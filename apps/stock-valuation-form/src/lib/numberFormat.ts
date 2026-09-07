/**
 * 入力欄の数値表記。第1〜8表のグリッドとサマリーの想定利益欄で共通に使う。
 * 打鍵のたびに整形するので、保存値もカンマ入りのまま持つ（読み取り側でカンマを外す）。
 */

/** 数字以外を落とし、先頭の余分な0を詰める */
export function normalizeInteger(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

/** 3桁区切りカンマ付きの整数へ */
export function formatCommaInteger(value: string): string {
  const digits = normalizeInteger(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 3桁区切りカンマ付きの整数へ。欠損を入れられるよう先頭のマイナスだけ残す */
export function formatSignedCommaInteger(value: string): string {
  const raw = value.replace(/,/g, '').trim();
  const negative = raw.startsWith('-');
  const digits = normalizeInteger(raw);
  if (negative && digits === '') return '-';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative && formatted !== '' ? `-${formatted}` : formatted;
}
