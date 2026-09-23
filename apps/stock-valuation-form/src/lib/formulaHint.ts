import type { GridCell } from '@/components/ui/GridForm';
import { NEGATIVE_MARK, formatAmount, formatDecimal, stripAmountFormatting } from '@/lib/numberFormat';

/**
 * 自動計算欄の算式ツールチップ。
 * 様式に印字された式をなぞるのではなく、**実際に使った値と分岐の理由**を出す
 * （「なぜこの数字になったか」が知りたいのであって、式そのものは様式に書いてある）。
 *
 * 入力側の欠けは「未入力」、計算できなかった結果は「（未計算）」と書き分ける。
 * どちらも空欄のままだと、入力待ちなのか計算が止まっているのか判別できない。
 */

const NOT_CALC = '（未計算）';

/** 医療法人（持分あり）は剰余金の配当ができないため、配当要素の欄は計算しない（評価通達194－2） */
export const MEDICAL_NO_DIVIDEND = '医療法人（持分あり）は剰余金の配当ができないため、配当要素は計算しません（評価通達194－2）';
export const MEDICAL_NO_SECOND_INDUSTRY = '医療法人（持分あり）は類似業種を1つだけ選んで評価するため、下側の欄は使いません';

/** 算式に埋める数値（入力側）。負数は明細書と同じく「△」で書く */
export const hv = (v: number | null | undefined, digits = 0, empty = '未入力'): string =>
  formatDecimal(v, digits, empty);

/** 算式に埋める数値（計算結果側） */
export const rv = (v: number | null | undefined, digits = 0): string => hv(v, digits, NOT_CALC);

/**
 * 文字列で持っている入力値を埋める（空なら「未入力」）。
 * 数値は3桁区切りにそろえる ── 読込んだJSONや試算で差し替えた値（String(数値)）はカンマなしで来るため。
 * 小数部は入力の桁のまま残し、数値でないもの（業種目名など）はそのまま埋める。
 */
export const hs = (value: string): string => {
  if (value.trim() === '') return '未入力';
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(stripAmountFormatting(value));
  if (!match) return value;
  const sign = match[1] ? NEGATIVE_MARK : '';
  return `${sign}${match[2]!.replace(/\B(?=(\d{3})+$)/g, ',')}${match[3] ?? ''}`;
};

/** 円未満を銭で持つ値を「○円○銭」にする（入力側） */
export const hyen = (v: number | null | undefined, empty = '未入力'): string => {
  if (v === null || v === undefined) return empty;
  // 符号は絶対値と切り離す（△を付けたまま円と銭に分けると、銭の側の符号が読めなくなる）
  const abs = Math.abs(v);
  const yen = Math.floor(abs + 1e-9);
  const sen = Math.round((abs - yen) * 100);
  const sign = v < 0 ? NEGATIVE_MARK : '';
  return `${sign}${yen.toLocaleString('ja-JP')}円${String(sen).padStart(2, '0')}銭`;
};

/** 「○円○銭」（計算結果側） */
export const ryen = (v: number | null | undefined): string => hyen(v, NOT_CALC);

/** 分数等の小数になりうる金額を算式に埋める（入力側）。切り捨てずそのまま出す */
export const hf = (v: number | null | undefined, empty = '未入力'): string => formatAmount(v, empty);

/** 分数等の小数になりうる金額を算式に埋める（計算結果側） */
export const rf = (v: number | null | undefined): string => formatAmount(v, NOT_CALC);

/** 分数等で書きうる欄の表示文字列（calcTableN の ○disp）を算式に埋める */
export const rd = (text: string): string => (text === '' ? NOT_CALC : text);

/** 分数等で書く欄の末尾に付ける注記（記載方法等 共通のイ・ロ） */
export const FRACTION_NOTE_TAX_TIME = '（円未満切捨て。切捨てで0になるときは分数等（課税時期基準）で記載）';
export const FRACTION_NOTE_PREV_END = '（円未満切捨て。切捨てで0になるときは分数等（直前期末基準）で記載）';

/** field をキーにした算式表をセルへ流し込む（値のないキーは素通り） */
export function withFormulaHints(cells: GridCell[], hints: Record<string, string | undefined>): GridCell[] {
  return cells.map((cell) => (cell.field && hints[cell.field] ? { ...cell, formulaHint: hints[cell.field] } : cell));
}
