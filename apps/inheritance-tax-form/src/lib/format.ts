/**
 * 数字欄の表示形（3桁区切り・△・小数桁）。
 *
 * 用紙（`GridForm`）と明細の入力画面（`DetailPanel`）の両方で同じ形にする必要がある。
 * どちらも保存するのは整形後の文字列で、読むときは `num()` がカンマと△を落とす。
 */

/** 数字以外を落とし、頭の余分な0も落とす */
export function normalizeInteger(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function formatCommaInteger(value: string): string {
  return normalizeInteger(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 様式では還付額の頭に「△」を付ける。入力は - / △ のどちらでも受け付け、表示は △ に統一する。 */
export function formatSignedCommaInteger(value: string): string {
  const raw = value.replace(/,/g, '').trim();
  const negative = raw.startsWith('-') || raw.startsWith('△');
  const digits = normalizeInteger(raw);
  if (negative && digits === '') return '△';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative && formatted !== '' ? `△${formatted}` : formatted;
}

export function sanitizeDecimal(value: string, places: number): string {
  const normalized = value.replace(/[^\d.]/g, '');
  const [integer = '', ...fractions] = normalized.split('.');
  const fraction = fractions.join('').slice(0, places);
  return normalized.includes('.') ? `${integer}.${fraction}` : integer;
}

export function formatFixedDecimal(value: string, places: number): string {
  const sanitized = sanitizeDecimal(value, places);
  if (!sanitized || sanitized === '.') return '';
  return Number(sanitized).toFixed(places);
}

/** 小数のある数を3桁区切りで表示する（面積など。整数部だけにカンマを打つ） */
export function formatCommaDecimal(value: string, places: number): string {
  const sanitized = sanitizeDecimal(value, places);
  const [integer = '', fraction = ''] = sanitized.split('.');
  const head = normalizeInteger(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sanitized.includes('.') ? `${head}.${fraction}` : head;
}

/**
 * 整数部だけ3桁区切りにし、小数部があればそのまま残す。
 * 整数にも小数にもなる欄（付表1の「単価（円）又は倍数」）で使う。
 */
export function formatCommaNumber(value: string): string {
  const [integer = '', ...fractions] = value.replace(/,/g, '').split('.');
  const head = normalizeInteger(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fractions.length > 0 ? `${head}.${fractions.join('')}` : head;
}

/**
 * 数字欄の書式（用紙のセルの定義のうち、表示形に関わる部分だけ）。
 * 用紙（`GridForm`）と明細の入力画面（`DetailPanel`）で同じ整形を使うために切り出してある。
 */
export interface NumericFormat {
  commaInteger?: boolean;
  /** 整数部だけカンマを打ち、小数はそのまま出す（桁数を決められない欄） */
  commaNumber?: boolean;
  signedCommaInteger?: boolean;
  decimalPlaces?: number;
  integerDigits?: number;
}

/** 打っている最中の値を欄の書式に整える（保存されるのもこの形） */
export function cleanNumeric(c: NumericFormat, raw: string): string {
  if (c.decimalPlaces !== undefined) {
    return c.commaInteger ? formatCommaDecimal(raw, c.decimalPlaces) : sanitizeDecimal(raw, c.decimalPlaces);
  }
  if (c.signedCommaInteger) return formatSignedCommaInteger(raw);
  if (c.commaNumber) return formatCommaNumber(raw);
  if (c.commaInteger) return formatCommaInteger(raw);
  if (c.integerDigits !== undefined) return normalizeInteger(raw).slice(0, c.integerDigits);
  return raw;
}

/** 保存済みの値の表示形（カンマの無い古い値も同じ見た目に直す） */
export function displayNumeric(c: NumericFormat, value: string): string {
  if (c.decimalPlaces !== undefined) {
    return c.commaInteger ? formatCommaDecimal(value, c.decimalPlaces) : value;
  }
  if (c.signedCommaInteger) return formatSignedCommaInteger(value);
  if (c.commaNumber) return formatCommaNumber(value);
  if (c.commaInteger) return formatCommaInteger(value);
  if (c.integerDigits !== undefined) return normalizeInteger(value);
  return value;
}

/** 欄から離れたときに小数の桁をそろえる（小数欄以外はそのまま） */
export function fixNumeric(c: NumericFormat, value: string): string {
  if (c.decimalPlaces === undefined) return value;
  const fixed = formatFixedDecimal(value, c.decimalPlaces);
  return c.commaInteger ? formatCommaDecimal(fixed, c.decimalPlaces) : fixed;
}
