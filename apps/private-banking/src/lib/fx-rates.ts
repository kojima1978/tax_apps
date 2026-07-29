/**
 * 円換算レートは明細ごとではなく年度（Snapshot）ごとに持つ。
 * B/Sは基準日時点の評価なので、同じ年度・同じ通貨のレートが明細ごとに食い違うことはないため。
 */

/** 外貨建て明細で選べる通貨。年度設定のレート欄もこの順で並べる。 */
export const foreignCurrencies = ["USD", "EUR", "GBP", "AUD", "CHF"];
/** 明細フォームの通貨選択肢。 */
export const positionCurrencies = ["JPY", ...foreignCurrencies];

export type FxRates = Record<string, number>;

/** `Snapshot.fxRates`(Json) を通貨→レートの表に整える。未知の通貨と壊れた値は捨てる。 */
export function parseFxRates(value: unknown): FxRates {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const rates: FxRates = {};
  for (const currency of foreignCurrencies) {
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
