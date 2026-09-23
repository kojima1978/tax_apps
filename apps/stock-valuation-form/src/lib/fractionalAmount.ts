// 分数等（記載方法等の冒頭「共通」イ・ロ）。
//
// 様式の金額欄はどれも「表示単位未満の端数を切り捨てる」で書くが、切り捨てると0になる欄だけは
// 0と書かずに、分数か、発行済株式数の桁数に相当する位まで切り捨てた小数で書く（どちらかは
// 納税者が選べる）。このアプリは小数の側を採る ── 様式の欄は1行で、分数は桁が増えるほど
// 収まらなくなるうえ、その値を次の欄へ転記する計算がそのまま続くため。
//
// 分母は2種類ある:
//   イ 分数等（課税時期基準）＝ 課税時期現在の発行済株式数
//      （第1表の1の⑤ － 課税時期に自己株式があればその数）
//   ロ 分数等（直前期末基準）＝ 直前期末の発行済株式数
//      （第4表の1の② － ③）
//
// このアプリでは第4表の1の②③が第1表の1の⑤・自己株式数からの転記（readOnly）なので、
// 2つの分母は実際には同じ値になる。それでも呼び分けるのは、その欄がどちらの定めで
// 書かれているかをコード側に残すため（様式は別々に定めていて、②③が独立入力に
// なったときに分かれる）。

import type { TableProps } from '@/types/form';
import { formatAmount, stripAmountFormatting } from '@/lib/numberFormat';

const parseNum = (value: string): number | null => {
  const s = stripAmountFormatting(value);
  if (s === '') return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};

/** 発行済株式数 － 自己株式数（0以下・未入力は null＝分数等にできない）。 */
function netIssuedShares(getField: TableProps['getField']): number | null {
  const issued = parseNum(getField('table1_1', '⑤') || getField('table1_1', 'total_shares_sum'));
  if (issued === null) return null;
  const treasury = parseNum(getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares'));
  const net = issued - (treasury ?? 0);
  return net > 0 ? net : null;
}

/** 分数等（課税時期基準）の分母 */
export const taxTimeShares = netIssuedShares;
/** 分数等（直前期末基準）の分母 */
export const prevPeriodEndShares = netIssuedShares;

/** 切捨て後の金額と、欄に書く文字列。 */
export interface FractionalAmount {
  /** 次の欄の計算にそのまま使う値（切捨て後、または分数等の小数）。null＝未計算 */
  value: number | null;
  /** 欄に表示する文字列。分数等のときは桁区切りを付けない（小数が読めなくなるため） */
  text: string;
}

export const EMPTY_FRACTIONAL: FractionalAmount = { value: null, text: '' };

/**
 * 円未満を切り捨てる。切り捨てて0になるときだけ分数等（株式数の桁数ぶんの小数）で返す。
 *
 * @param value  切捨て前の金額（円）
 * @param shares 分数等の分母。taxTimeShares / prevPeriodEndShares のどちらかを渡す
 */
export function yenOrFraction(value: number | null, shares: number | null): FractionalAmount {
  if (value === null) return EMPTY_FRACTIONAL;
  const floored = Math.floor(value + 1e-9);
  // 切り捨てても0にならない欄、株式数が分からず桁を決められない欄は、そのまま切り捨てる
  if (floored !== 0 || shares === null || shares <= 0) {
    return { value: floored, text: formatAmount(floored) };
  }
  const unit = Math.pow(10, String(Math.floor(shares)).length);
  const fraction = Math.floor(value * unit + 1e-9) / unit;
  return { value: fraction, text: formatAmount(fraction) };
}

/**
 * 表の計算から使うための束ね。getField から2つの分母を1度だけ読み、
 * 欄ごとに「どちらの基準か」だけを書けば済むようにする。
 */
export function fractionalWriters(getField: TableProps['getField']) {
  const taxTime = taxTimeShares(getField);
  const prevEnd = prevPeriodEndShares(getField);
  return {
    /** 分数等（課税時期基準） */
    atTaxTime: (value: number | null) => yenOrFraction(value, taxTime),
    /** 分数等（直前期末基準） */
    atPrevEnd: (value: number | null) => yenOrFraction(value, prevEnd),
  };
}
