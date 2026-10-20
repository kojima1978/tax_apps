/**
 * 円換算レートは明細ごとではなく年度（Snapshot）ごとに持つ。
 * B/Sは基準日時点の評価なので、同じ年度・同じ通貨のレートが明細ごとに食い違うことはないため。
 */

/** 通常使う通貨。例外的な通貨はアプリ共通設定から追加する。 */
export const entryForeignCurrencies = ["USD", "EUR"];
export const positionCurrencies = ["JPY", ...entryForeignCurrencies];
const isoCurrencies = new Set(Intl.supportedValuesOf("currency"));
export const isCurrencyCode = (code: string) => /^[A-Z]{3}$/.test(code) && isoCurrencies.has(code);
export const currencyOptions = (configured = positionCurrencies, current = "JPY") => [...new Set([...positionCurrencies, ...configured, current])];

/** 入力額・受取配分の表示。外貨はセント単位、円は整数で表示する。 */
export const contractAmountText = (amount: number, currency: string) =>
  `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(amount)}${currency === "JPY" ? "円" : ` ${currency}`}`;

export type FxRates = Record<string, number>;

/** `Snapshot.fxRates`(Json) を通貨→レートの表に整える。無効なISOコードと壊れた値は捨てる。 */
export function parseFxRates(value: unknown): FxRates {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const rates: FxRates = {};
  for (const currency of Object.keys(source).filter((code) => code !== "JPY" && isCurrencyCode(code))) {
    const rate = Number(source[currency]);
    if (Number.isFinite(rate) && rate > 0) rates[currency] = rate;
  }
  return rates;
}

/** 明細の円換算に使うレート。円建ては常に1、レート未登録の外貨は null。 */
export function fxRateFor(rates: FxRates, currency: string) {
  if (currency === "JPY") return 1;
  return rates[currency] ?? null;
}

export const missingFxRateMessage = (currency: string) => `${currency}の円換算レートが年度設定に登録されていません。年度設定でレートを登録してください。`;
