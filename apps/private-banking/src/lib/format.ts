/** 画面表示・入力欄で共通に使う数値と日付の整形。 */

export const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
export const percent = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });
export const valuationNumber = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 6 });

/** 億・万円で丸めた表示。B/Sの区画やサマリーで使う。 */
export const compactYen = (value: number) => {
  const manYen = Math.round(value / 10000);
  const sign = manYen < 0 ? "-" : "";
  const absoluteManYen = Math.abs(manYen);
  const okuYen = Math.floor(absoluteManYen / 10000);
  const remainderManYen = absoluteManYen % 10000;
  if (okuYen === 0) return `${sign}${remainderManYen.toLocaleString("ja-JP")}万円`;
  if (remainderManYen === 0) return `${sign}${okuYen.toLocaleString("ja-JP")}億円`;
  return `${sign}${okuYen.toLocaleString("ja-JP")}億${remainderManYen.toLocaleString("ja-JP")}万円`;
};

const normalizeNumericCharacters = (value: string) => value
  .replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
  .replace(/，/g, ",")
  .replace(/．/g, ".");

/** 入力途中の文字列を3桁区切りに整える（全角も受け付ける）。 */
export const formatCommaNumberInput = (value: string, maxFractionDigits: number) => {
  const normalized = normalizeNumericCharacters(value).replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalIndex = normalized.indexOf(".");
  const hasDecimalPoint = maxFractionDigits > 0 && decimalIndex >= 0;
  const integerSource = decimalIndex >= 0 ? normalized.slice(0, decimalIndex) : normalized;
  const integerPart = integerSource.replace(/^0+(?=\d)/, "") || (hasDecimalPoint ? "0" : "");
  const fractionPart = hasDecimalPoint ? normalized.slice(decimalIndex + 1).replace(/\./g, "").slice(0, maxFractionDigits) : "";
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDecimalPoint ? `${groupedInteger}.${fractionPart}` : groupedInteger;
};

export const unformatNumberInput = (value: FormDataEntryValue | undefined) => typeof value === "string" ? value.replace(/,/g, "") : value;

const greatestCommonDivisor = (first: number, second: number) => {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
};

/** 小数で保存された持分を、分子・分母に戻す（旧データの表示用）。 */
export const decimalToFraction = (value: number | null): [number, number] => {
  if (value === null || !Number.isFinite(value) || value <= 0) return [1, 1];
  const denominator = 1_000_000;
  const numerator = Math.round(value * denominator);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return [numerator / divisor, denominator / divisor];
};

export const dateJa = (date: string) => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));
