/** 画面表示・入力欄で共通に使う数値と日付の整形。 */

export const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
export const percent = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });

/** 会計慣行に合わせ、マイナス額を△付きで表示する（相続税負担額の軽減など）。 */
export const triangleYen = (value: number) => value < 0 ? `△${yen.format(Math.abs(value))}` : yen.format(value);

export const valuationNumber = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 6 });

/** 書き出しファイルの名前に使う日時（JST の YYYYMMDD-HHMM）。JSONとCSVで同じ付け方に揃える。 */
export const fileTimestamp = (now: Date = new Date()) => {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${jst.slice(0, 4)}${jst.slice(5, 7)}${jst.slice(8, 10)}-${jst.slice(11, 13)}${jst.slice(14, 16)}`;
};

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

/**
 * 和暦表記。`era: "long"` と `year: "numeric"` の組み合わせで改元年が「令和元年」になる
 * （`era: "short"` だと「令和1年」）。生年月日は西暦と和暦のどちらで聞かれても答えられるよう、
 * 画面・印刷とも西暦に和暦を添えて出す。
 */
const warekiFormat = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", { era: "long", year: "numeric", month: "long", day: "numeric" });
export const dateWareki = (date: string) => warekiFormat.format(new Date(`${date}T00:00:00`));

/** 和暦の年だけ（「令和9年」）。`year: "numeric"` なので改元年は「令和元年」になる。 */
const warekiYearFormat = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", { era: "long", year: "numeric" });
export const yearWareki = (date: string) => warekiYearFormat.format(new Date(`${date}T00:00:00`));

/** 和暦の元号＋年から「年」を外したもの（「昭和53」「令和元」）。括弧の中に入れる用。 */
export const eraYearWareki = (date: string) => yearWareki(date).replace(/年$/, "");

/**
 * 「1978（昭和53）年12月22日」。西暦を主に、和暦は年だけを括弧で添える。
 * 月日は西暦と和暦で同じなので繰り返さない（「1978年12月22日（昭和53年12月22日）」は
 * 同じ月日が2回出て長く、欄をまたいで折り返していた）。
 */
export const dateJaWithWareki = (date: string) =>
  `${Number(date.slice(0, 4))}（${eraYearWareki(date)}）年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
