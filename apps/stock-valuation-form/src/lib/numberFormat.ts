/**
 * 数値の表記。第1〜8表のグリッド・ヒント・サマリー・出力物で共通に使う。
 * 打鍵のたびに整形するので、保存値も整形後の文字列で持つ（読み取り側で外す）。
 */

/** 負数の符号。明細書は「△」で書く */
export const NEGATIVE_MARK = '△';

/**
 * 桁区切りと負号表記を落として Number が読める形にする。
 * 「-」も受けるのは、△に切り替える前の案件が保存済みの値を持っているため。
 * 「▲」「−」等は貼り付け取込で入りうる。
 */
export function stripAmountFormatting(value: string): string {
  return value.replace(/,/g, '').replace(/[△▲−–—]/g, '-').trim();
}

/** 表示用の文字列を数値にする。空欄・数値でないものは0 */
export function parseAmount(value: string): number {
  return Number(stripAmountFormatting(value)) || 0;
}

/**
 * 金額の表示文字列。整数は3桁区切り、分数等の小数は桁を落とさずそのまま出す
 * （`toLocaleString` の既定は小数第3位までなので、分数等の値を通すと0に潰れる）。
 * 負数は「△」を冠する。
 */
export function formatAmount(v: number | null | undefined, empty = ''): string {
  if (v === null || v === undefined) return empty;
  const abs = Math.abs(v);
  const body = Number.isInteger(v) ? abs.toLocaleString('ja-JP') : String(abs);
  return v < 0 ? `${NEGATIVE_MARK}${body}` : body;
}

/** 小数以下の桁数を指定して表示する（比準要素の割合など）。負数は「△」 */
export function formatDecimal(v: number | null | undefined, digits: number, empty = ''): string {
  if (v === null || v === undefined) return empty;
  const body = Math.abs(v).toLocaleString('ja-JP', { maximumFractionDigits: digits });
  return v < 0 ? `${NEGATIVE_MARK}${body}` : body;
}

/** 円銭で書く欄の「円」側。負数は「△」（符号は円側だけに付ける） */
export function formatYenPart(v: number | null | undefined, empty = ''): string {
  if (v === null || v === undefined) return empty;
  const yen = Math.floor(Math.abs(v) + 1e-9);
  return `${v < 0 ? NEGATIVE_MARK : ''}${yen.toLocaleString('ja-JP')}`;
}

/** 円銭で書く欄の「銭」側。2桁に揃える */
export function formatSenPart(v: number | null | undefined, empty = ''): string {
  if (v === null || v === undefined) return empty;
  const abs = Math.abs(v);
  return String(Math.round((abs - Math.floor(abs + 1e-9)) * 100)).padStart(2, '0');
}

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

/** 3桁区切りカンマ付きの整数へ。欠損を入れられるよう先頭の負号だけ残す（「-」と打つと「△」になる） */
export function formatSignedCommaInteger(value: string): string {
  const raw = stripAmountFormatting(value);
  const negative = raw.startsWith('-');
  const digits = normalizeInteger(raw);
  if (negative && digits === '') return NEGATIVE_MARK;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative && formatted !== '' ? `${NEGATIVE_MARK}${formatted}` : formatted;
}
