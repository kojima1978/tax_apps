import type { TableProps } from '@/types/form';
import { DEFAULT_ERA, westernYear } from './wareki';

/**
 * 評価差額に対する法人税額等相当額の割合（第5表⑧・第7表の3⑧㉑）。
 *
 * 率は課税時期で変わる（令和8年4月1日以後の取得分から38％）ので、0.38 を各表に置くと
 * 境目を跨いだ瞬間に黙って誤った金額を出す。適用する率はここ1か所で決め、
 * 計算にもラベルにも同じ値を配る。
 *
 * 既定は課税時期から決まるが、第5表⑧のラベル「（⑦×○％）」の○を直接書き換えて
 * 任意の率にできる ── 経過措置や個別の取扱いで年分どおりでない率を使う場面があり、
 * そのときに計算を手で外へ出させないため。**金額（⑧）は率からの自動計算のまま**で、
 * 上書きできるのは率だけ（金額を直接入れられると、印字される算式と金額がずれる）。
 */

/** 率の上書き（％）。第5表のデータバケットに置くが、様式の欄ではないので `_` 始まり。 */
export const CORPORATE_TAX_RATE_FIELD = '_corporate_tax_rate';

/** 令和8年（2026年）4月1日以後の相続・遺贈・贈与による取得分から38％。 */
const RATE_CHANGE_YEAR = 2026;
const RATE_CHANGE_MONTH = 4;
const RATE_FROM = 38;
const RATE_BEFORE = 37;

/**
 * 課税時期（第1表の1 ⑭）の西暦年。年が未入力なら null。
 * 日は見ない ── 境目が4月1日なので年と月だけで決まる
 * （`readWarekiDate` は月日が揃うまで null を返すので、ここでは使えない）。
 */
export function taxTimeYear(getField: TableProps['getField']): number | null {
  const year = Number(getField('table1_1', 'f14_y'));
  if (!year) return null;
  return westernYear(getField('table1_1', 'f14_g') || DEFAULT_ERA, year);
}

/** 課税時期の月。未入力なら null。 */
export function taxTimeMonth(getField: TableProps['getField']): number | null {
  const month = Number(getField('table1_1', 'f14_m'));
  return month >= 1 && month <= 12 ? month : null;
}

/**
 * 課税時期から決まる率（％）。
 * 課税時期が未入力のときはこの様式の年分（令和8年4月以後）の率を使う。
 * 令和8年で月だけ未入力のときは、改正後の38％を既定にする（年内の大半が4月以後のため）。
 */
export function defaultCorporateTaxRatePercent(getField: TableProps['getField']): number {
  const year = taxTimeYear(getField);
  if (year === null || year > RATE_CHANGE_YEAR) return RATE_FROM;
  if (year < RATE_CHANGE_YEAR) return RATE_BEFORE;
  const month = taxTimeMonth(getField);
  return month !== null && month < RATE_CHANGE_MONTH ? RATE_BEFORE : RATE_FROM;
}

/**
 * 第5表に入力された率を％として読む。
 * 空・数字でない・0〜100の外は「上書きなし」として既定に戻す（黙って異常な率で計算しない）。
 */
export function parseCorporateTaxRatePercent(value: string): number | null {
  const s = value.trim().replace(/[％%]\s*$/, '');
  if (s === '') return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0 || v > 100) return null;
  return v;
}

/** この評価に適用する率（％）。第5表の入力があればそれ、なければ課税時期の既定。 */
export function getCorporateTaxRatePercent(getField: TableProps['getField']): number {
  return parseCorporateTaxRatePercent(getField('table5', CORPORATE_TAX_RATE_FIELD))
    ?? defaultCorporateTaxRatePercent(getField);
}

/**
 * 評価差額 × 率（表示単位未満切捨て）。
 * ％のまま掛けてから100で割る ── 0.38 という二進小数を先に作らないぶん誤差が小さい。
 * それでも端数は出るので、切捨ての手前で 1e-9 を足して「0.9999…を切り捨てる」を防ぐ。
 */
export function corporateTaxEquivalentOf(evaluationDifference: number, ratePercent: number): number {
  return Math.floor((evaluationDifference * ratePercent) / 100 + 1e-9);
}

/** ラベルや算式に出す表記（38 → '38'、37.5 → '37.5'）。 */
export function formatRatePercent(ratePercent: number): string {
  return String(Number(ratePercent.toFixed(2)));
}
