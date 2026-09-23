import type { TableProps } from '@/types/form';
import { DEFAULT_ERA, westernYear } from './wareki';

/**
 * 評価差額に対する法人税額等相当額の割合（第5表⑧・第7表の3⑧㉑）。
 *
 * 率は年分で変わる（令和8年分から38％）ので、0.38 を各表に置くと年分を跨いだ瞬間に
 * 黙って誤った金額を出す。適用する率はここ1か所で決め、計算にもラベルにも同じ値を配る。
 *
 * 既定は課税時期の年分から決まるが、前提条件で上書きできる ── 経過措置や個別の取扱いで
 * 年分どおりでない率を使う場面があり、そのときに計算を手で外へ出させないため。
 */

/** 前提条件に持つ上書きの率（％）。第1表の1のデータバケットに置くが、様式の欄ではない。 */
export const CORPORATE_TAX_RATE_FIELD = '_corporate_tax_rate';

/** 令和8年（2026年）分から38％。 */
const RATE_CHANGE_YEAR = 2026;
const RATE_FROM = 38;
const RATE_BEFORE = 37;

/**
 * 課税時期（第1表の1 ⑭）の西暦年。年が未入力なら null。
 * 月日は見ない ── 率は年で決まるので、日付を入れ切る前から率が確定していてよい
 * （`readWarekiDate` は月日が揃うまで null を返すので、ここでは使えない）。
 */
export function taxTimeYear(getField: TableProps['getField']): number | null {
  const year = Number(getField('table1_1', 'f14_y'));
  if (!year) return null;
  return westernYear(getField('table1_1', 'f14_g') || DEFAULT_ERA, year);
}

/**
 * 課税時期の年分から決まる率（％）。
 * 課税時期が未入力のときはこの様式の年分（令和8年）の率を使う。
 */
export function defaultCorporateTaxRatePercent(getField: TableProps['getField']): number {
  const year = taxTimeYear(getField);
  return year !== null && year < RATE_CHANGE_YEAR ? RATE_BEFORE : RATE_FROM;
}

/**
 * 前提条件に入力された率を％として読む。
 * 空・数字でない・0〜100の外は「上書きなし」として既定に戻す（黙って異常な率で計算しない）。
 */
export function parseCorporateTaxRatePercent(value: string): number | null {
  const s = value.trim().replace(/[％%]\s*$/, '');
  if (s === '') return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0 || v > 100) return null;
  return v;
}

/** この評価に適用する率（％）。前提条件の入力があればそれ、なければ課税時期の年分の既定。 */
export function getCorporateTaxRatePercent(getField: TableProps['getField']): number {
  return parseCorporateTaxRatePercent(getField('table1_1', CORPORATE_TAX_RATE_FIELD))
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
