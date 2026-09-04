import type { GridCell } from '@/components/ui/GridForm';

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

/** 算式に埋める数値（入力側） */
export const hv = (v: number | null | undefined, digits = 0, empty = '未入力'): string =>
  v === null || v === undefined ? empty : v.toLocaleString('ja-JP', { maximumFractionDigits: digits });

/** 算式に埋める数値（計算結果側） */
export const rv = (v: number | null | undefined, digits = 0): string => hv(v, digits, NOT_CALC);

/** 文字列で持っている入力値をそのまま埋める（カンマ付きのまま。空なら「未入力」） */
export const hs = (value: string): string => (value.trim() === '' ? '未入力' : value);

/** 円未満を銭で持つ値を「○円○銭」にする（入力側） */
export const hyen = (v: number | null | undefined, empty = '未入力'): string => {
  if (v === null || v === undefined) return empty;
  const yen = Math.floor(v + 1e-9);
  const sen = Math.round((v - yen) * 100);
  return `${yen.toLocaleString('ja-JP')}円${String(sen).padStart(2, '0')}銭`;
};

/** 「○円○銭」（計算結果側） */
export const ryen = (v: number | null | undefined): string => hyen(v, NOT_CALC);

/** field をキーにした算式表をセルへ流し込む（値のないキーは素通り） */
export function withFormulaHints(cells: GridCell[], hints: Record<string, string | undefined>): GridCell[] {
  return cells.map((cell) => (cell.field && hints[cell.field] ? { ...cell, formulaHint: hints[cell.field] } : cell));
}
