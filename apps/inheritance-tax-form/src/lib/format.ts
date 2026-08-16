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
