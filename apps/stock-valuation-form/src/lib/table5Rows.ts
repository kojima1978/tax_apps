// 第5表「１．資産及び負債の金額」の明細行数。
//
// 本表と続紙の行数は様式で決まっていて、変わるのは続紙の枚数だけ。その行数は表の描画
// （Table5Grid）以外からも要る ── 翌年更新で金額欄を空にする範囲（rollover）、退職金試算が
// 足す仮想の負債行（retirementSimulation）、整合チェックの走査（consistencyChecks）。
// 書き写すと続紙の枚数を変えたときに一部だけ古い行数のまま残り、はみ出した行に前年の金額が
// 残るといった形で表に出てくるため、ここを唯一の定義元にする。

import type { TableProps } from '@/types/form';

/** 本表（1ページ目）のデータ行数 */
export const TABLE5_MAIN_ROWS = 15;
/** 続紙1枚のデータ行数（令和8年様式 第5表続） */
export const TABLE5_CONT_ROWS = 23;
/**
 * 用紙の上限枚数（本表1＋続紙9枚＝最大222行）。
 *
 * 続紙は公表様式をそのまま複製したもので、識別コードも1枚ごとに E01〜E92 を繰り返す。
 * 枚数の定めは様式側に無いため、上限は実務と描画量から決めている: 勘定科目は資産・負債
 * それぞれ多くて数十行なので222行あればまず足り、これを超える入力は貼り付け範囲の
 * 取り違えを疑う水準。用紙は必要になったときだけ作られる。
 */
export const TABLE5_MAX_PAGES = 10;

/** pageCountページ分の総行数 */
export const table5TotalRowsOf = (pageCount: number) =>
  TABLE5_MAIN_ROWS + Math.max(0, pageCount - 1) * TABLE5_CONT_ROWS;

/** 現在の用紙枚数（_pages。1＝本表のみ） */
export const table5PageCountOf = (getField: TableProps['getField']) =>
  Math.max(1, Number(getField('table5', '_pages')) || 1);

/** 現在の明細行数（続紙のぶんを含む）。表の外から行を走査するときの上限。 */
export const table5RowCount = (getField: TableProps['getField']) =>
  table5TotalRowsOf(table5PageCountOf(getField));
