/**
 * 様式PDFを持つ24様式を、空欄のまま1枚ずつ組み立てる（罫線の回帰テスト用）。
 *
 * 罫線の位置は入力内容ではなく行数・枚数で決まるので、各様式の1枚目を
 * 既定の行数で作れば様式の全ての罫線が出る。`App.tsx` の割り付けを写したものではなく、
 * 「空の申告書を1部印刷したときの姿」を並べたもの。
 *
 * ここへ様式を足すのは、様式PDFと突き合わせて罫線を確かめた後。
 * `formRules.test.ts` のスナップショットが、その後に罫線が動いたことを知らせる。
 */
import type { GridCell } from '../components/ui/GridForm';
import { DETAIL_GROUPS, buildDetail, type DetailItem, type DetailSpec, type DetailShareCodes } from './detail';
import { COMMON, TOTALS, buildTable1 } from './table1';
import { buildTable1Cont } from './table1cont';
import { LAWFUL_ROWS, buildTable2 } from './table2';
import { buildTable4 } from './table4';
import { buildTable42 } from './table42';
import { buildTable5 } from './table5';
import { buildTable6 } from './table6';
import { buildTable7 } from './table7';
import { buildTable88 } from './table88';
import { TABLE9_ROWS, buildTable9 } from './table9';
import { TABLE10_ROWS, buildTable10 } from './table10';
import { TABLE11_ROWS, buildTable11 } from './table11';
import { buildTable112 } from './table112';
import { TABLE11F1_SHARE, TABLE11F1_SPEC } from './table11f1';
import { TABLE11F2_SHARE, TABLE11F2_SPEC } from './table11f2';
import { TABLE11F3_SHARE, TABLE11F3_SPEC } from './table11f3';
import { TABLE11F4_SHARE, TABLE11F4_SPEC } from './table11f4';
import {
  TABLE1112F1_CONT_ROWS, TABLE1112F1_ROWS, buildTable1112f1, table1112f1First,
} from './table1112f1';
import { buildTable1112f1b } from './table1112f1b';
import { TABLE13_DEBT_ROWS, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS, buildTable13 } from './table13';
import { TABLE14_BEQUEST_ROWS, TABLE14_DONATION_ROWS, TABLE14_GIFT_ROWS, buildTable14 } from './table14';
import { buildTable15 } from './table15';
import type { FormRow } from './geometry';

const heir = (i: number): FormRow => ({ prefix: `h${i}.`, label: `${i + 1}人目` });
const rows = (name: string, count: number): FormRow[] => Array.from(
  { length: count },
  (_, i): FormRow => ({ prefix: `${name}#${i}.`, label: `${name}${i + 1}` }),
);
/** 氏名などの選択肢。罫線には効かないので1件だけ持たせる */
const OPTIONS: GridCell['options'] = [{ value: '0', label: '1人目' }];
/** 第1表の転記欄（クリックで転記元へ移る欄。入力欄ではなくなるので罫線に効きうる） */
const TRANSFERRED = ['v1', 'v2', 'v3', 'v5', 'v11', 'v12', 'v13', 'v14', 'v17'];
const SOURCE_FOR_ROW: Readonly<Record<string, string>> = Object.fromEntries(
  TRANSFERRED.map((row) => [row, 'table11']),
);

/** 付表1〜4（作りが同じなので明細の割り付けだけ変えて使う） */
const detail = (spec: DetailSpec, share: DetailShareCodes): GridCell[] => buildDetail(
  spec, share, COMMON,
  Array.from({ length: DETAIL_GROUPS }, (_, i): DetailItem => ({
    index: i, prefix: `d#${i}.`, label: `明細${i + 1}`, base: 0, first: true,
  })),
);

/** 第11・11の2表の付表1（本表 sheet=0・続 sheet≧1） */
function f1(sheet: number, count: number): GridCell[] {
  const first = table1112f1First(sheet);
  return buildTable1112f1(COMMON, TOTALS, sheet, Array.from({ length: count }, (_, i) => ({
    prefix: `table1112f1#${first + i}.`, index: first + i, label: `明細${first + i + 1}`, linked: false,
  })), OPTIONS);
}

export interface FormFixture {
  /** 様式ID（`App.tsx` の `FORMS` と同じ呼び名） */
  id: string;
  /** 様式の名前（スナップショットの見出し） */
  name: string;
  cells: GridCell[];
}

export const ALL_FORMS: readonly FormFixture[] = [
  { id: 'table1', name: '第1表', cells: buildTable1('h0.', TRANSFERRED, OPTIONS, SOURCE_FOR_ROW) },
  {
    id: 'table1cont',
    name: '第1表（続）',
    cells: buildTable1Cont('h1.', '2人目', 'h2.', '3人目', TRANSFERRED, TRANSFERRED, SOURCE_FOR_ROW),
  },
  {
    id: 'table2',
    name: '第2表',
    cells: buildTable2(COMMON, TOTALS, Array.from({ length: LAWFUL_ROWS }, (_, i) => (
      { prefix: `h${i}.`, autoable: true }
    ))),
  },
  { id: 'table4', name: '第4表', cells: buildTable4(COMMON, TOTALS, 0, OPTIONS) },
  { id: 'table42', name: '第4表の2', cells: buildTable42(COMMON, TOTALS, 0, OPTIONS) },
  { id: 'table5', name: '第5表', cells: buildTable5(COMMON, TOTALS) },
  {
    id: 'table6',
    name: '第6表',
    cells: buildTable6(COMMON, TOTALS, { minor: [], disabled: [], support: [] }),
  },
  { id: 'table7', name: '第7表', cells: buildTable7(COMMON, TOTALS, OPTIONS) },
  { id: 'table88', name: '第8の8表', cells: buildTable88(COMMON, TOTALS, 0, false, false, OPTIONS) },
  {
    id: 'table9',
    name: '第9表',
    cells: buildTable9(COMMON, TOTALS, rows('保険金', TABLE9_ROWS), 0, true, OPTIONS),
  },
  {
    id: 'table10',
    name: '第10表',
    cells: buildTable10(COMMON, TOTALS, rows('退職手当金', TABLE10_ROWS), 0, true, OPTIONS),
  },
  {
    id: 'table11',
    name: '第11表',
    cells: buildTable11(COMMON, Array.from({ length: TABLE11_ROWS }, (_, i) => heir(i))),
  },
  { id: 'table112', name: '第11の2表', cells: buildTable112(COMMON, 'h0.', '1人目', 0, true, OPTIONS) },
  { id: 'table11f1', name: '第11表の付表1', cells: detail(TABLE11F1_SPEC, TABLE11F1_SHARE) },
  { id: 'table11f2', name: '第11表の付表2', cells: detail(TABLE11F2_SPEC, TABLE11F2_SHARE) },
  { id: 'table11f3', name: '第11表の付表3', cells: detail(TABLE11F3_SPEC, TABLE11F3_SHARE) },
  { id: 'table11f4', name: '第11表の付表4', cells: detail(TABLE11F4_SPEC, TABLE11F4_SHARE) },
  { id: 'table1112f1', name: '第11・11の2表の付表1', cells: f1(0, TABLE1112F1_ROWS) },
  { id: 'table1112f1c', name: '第11・11の2表の付表1（続）', cells: f1(1, TABLE1112F1_CONT_ROWS) },
  {
    id: 'table1112f1b',
    name: '第11・11の2表の付表1（別表1）',
    cells: buildTable1112f1b(COMMON, TOTALS, 'table1112f1b#0.', 0, OPTIONS),
  },
  {
    id: 'table13',
    name: '第13表',
    cells: buildTable13(COMMON, TOTALS, {
      people: Array.from({ length: TABLE13_PERSONS }, (_, i) => heir(i)),
      debt: rows('債務', TABLE13_DEBT_ROWS),
      funeral: rows('葬式費用', TABLE13_FUNERAL_ROWS),
    }, true, OPTIONS),
  },
  {
    id: 'table14',
    name: '第14表',
    cells: buildTable14(COMMON, TOTALS, {
      gift: rows('1の贈与財産', TABLE14_GIFT_ROWS),
      bequest: rows('2の遺贈財産', TABLE14_BEQUEST_ROWS),
      donation: rows('3の寄附財産', TABLE14_DONATION_ROWS),
    }, 0, true, OPTIONS),
  },
  {
    id: 'table15',
    name: '第15表',
    cells: buildTable15(COMMON, [
      { prefix: TOTALS, label: '各人の合計' },
      { prefix: 'h0.', label: '1人目', nameCode: 'E02' },
    ], new Set<string>()),
  },
  {
    id: 'table15cont',
    name: '第15表（続）',
    cells: buildTable15(COMMON, [
      { prefix: 'h1.', label: '2人目', nameCode: 'E02' },
      { prefix: 'h2.', label: '3人目', nameCode: 'E03' },
    ], new Set<string>()),
  },
];
