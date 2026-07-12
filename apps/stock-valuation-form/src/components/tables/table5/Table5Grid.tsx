import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { companyFloatBox } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

const T = 'table5' as const;

// ── 資産の部・負債の部の繰り返し入力行（空行）を自動生成 ──
// 本表（1ページ目）は15行＋合計欄、続紙（2ページ目以降）は合計欄なしで23行（令和8年様式 第5表続）。
const MAIN_ROWS = 15;       // 本表のデータ行数
const CONT_ROWS = 23;       // 続紙のデータ行数
const MAX_PAGES = 2;        // 本表1＋続紙1枚まで（＝最大38行）
const ROW_TOP = 22.39;      // 本表データ1行目の上端%（r08-08実測）
const TOTAL_TOP = 63.02;    // 本表 合計行の上端%
const PITCH = (TOTAL_TOP - ROW_TOP) / MAIN_ROWS;
const CONT_ROW_TOP = 22.59; // 続紙データ1行目の上端%（r08-09実測）
const CONT_BOTTOM = 93.7;   // 続紙データ最終行の下端%（＝外枠の底）
const CONT_PITCH = (CONT_BOTTOM - CONT_ROW_TOP) / CONT_ROWS;
const CORPORATE_TAX_RATE = 0.38; // 評価差額に対する法人税額等相当額の割合（令和8年様式⑧: ⑦×38％）

/** ページpの先頭行番号（1始まり） */
const pageStartRow = (p: number) => (p === 0 ? 1 : MAIN_ROWS + (p - 1) * CONT_ROWS + 1);
/** pageCountページ分の総行数 */
const totalRowsOf = (pageCount: number) => MAIN_ROWS + Math.max(0, pageCount - 1) * CONT_ROWS;
const COMPUTED_FIELDS = new Set([
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫',
  'イ', 'ロ', 'ハ',
]);

const parseNum = (value: string) => Number(value.replace(/,/g, '')) || 0;
const pageCountOf = (getField: TableProps['getField']) => Math.max(1, Number(getField(T, '_pages')) || 1);

function isExcludedLiability(name: string) {
  return /引当金|準備金/.test(name.trim());
}

// 各列 = [識別コードの独立セル][入力欄]（r08-08/r08-09 の罫線実測値。code/input は [left, right]%）
type Col = { code: [number, number]; input: [number, number] };
const ASSET_COLS: Col[] = [
  { code: [6.77, 8.54], input: [8.54, 22.88] },   // 科目
  { code: [22.88, 24.74], input: [24.74, 34.17] }, // 相続税評価額
  { code: [34.17, 36.1], input: [36.1, 45.61] },   // 帳簿価額
  { code: [45.61, 47.46], input: [47.46, 51.09] }, // 備考
];
const LIAB_COLS: Col[] = [
  { code: [51.41, 53.18], input: [53.18, 64.54] },
  { code: [64.54, 66.4], input: [66.4, 75.87] },
  { code: [75.87, 77.76], input: [77.76, 87.27] },
  { code: [87.27, 89.12], input: [89.12, 92.83] },
];

/**
 * データ入力行（科目/相続税評価額/帳簿価額/備考）を 15 行ぶん生成。
 * startRow=このページの先頭行番号（1, 16, 31, …）。行頭にドラッグハンドルを付与。
 */
// 令和8年様式のe-Tax識別コード。i=行index(0始まり)、col順=科目/相続税/帳簿/備考。
// 資産: 科目E(2i+1)/相続税G(2i+1)/帳簿G(2i+2)/備考E(2i+2)、負債: liabBaseオフセット。
// 本表(15行)は負債base=30（E31〜E60）、続紙(23行)は負債base=46（E47〜E92）。
function rowCode(prefix: 'a' | 'l', i: number, ci: number, liabBase: number): string {
  const base = prefix === 'l' ? liabBase : 0;
  const pad = (p: string, n: number) => `${p}${String(n).padStart(2, '0')}`;
  if (ci === 0) return pad('E', base + 2 * i + 1); // 科目
  if (ci === 1) return pad('G', base + 2 * i + 1); // 相続税評価額
  if (ci === 2) return pad('G', base + 2 * i + 2); // 帳簿価額
  return pad('E', base + 2 * i + 2);               // 備考
}

function dataRows(prefix: 'a' | 'l', cols: Col[], startRow: number, showCodes: boolean, rowCount: number, rowTop: number, pitch: number, liabBase: number): GridCell[] {
  const out: GridCell[] = [];
  const height = +pitch.toFixed(2);
  const w = (r: [number, number]) => +(r[1] - r[0]).toFixed(2);
  for (let i = 0; i < rowCount; i++) {
    const row = startRow + i;
    const rowId = `${prefix}:${row}`;
    const isSelected = (g: (field: string) => string) => g('_sel') === rowId;
    const top = +(rowTop + i * pitch).toFixed(2);
    cols.forEach((c, ci) => {
      const isAmount = ci === 1 || ci === 2; // 相続税評価額 / 帳簿価額
      // 識別コードの独立セル。科目のコードセルは行選択ハンドル（⠿）を兼ねる
      if (ci === 0) {
        out.push({
          kind: 'label', text: '⠿',
          codeLabel: showCodes ? rowCode(prefix, i, ci, liabBase) : undefined,
          ariaLabel: `${prefix === 'a' ? '資産' : '負債'}${row}行を選択`,
          selectValue: { field: '_sel', value: rowId },
          highlightWhen: isSelected,
          top, left: c.code[0], width: w(c.code), height, fontSize: 8, noWrap: true,
        });
      } else {
        out.push({
          kind: 'cell',
          codeLabel: showCodes ? rowCode(prefix, i, ci, liabBase) : undefined,
          highlightWhen: isSelected,
          top, left: c.code[0], width: w(c.code), height,
        });
      }
      out.push({
        field: `${prefix}_${row}_${ci + 1}`,
        kind: 'input',
        options: prefix === 'a' && ci === 3 ? ['', '株式等', '土地等'] : undefined,
        commaInteger: isAmount,
        contextMenu: isAmount ? [
          { label: '相続税評価額 → 帳簿価額にコピー', copyFrom: `${prefix}_${row}_2`, copyTo: `${prefix}_${row}_3` },
          { label: '帳簿価額 → 相続税評価額にコピー', copyFrom: `${prefix}_${row}_3`, copyTo: `${prefix}_${row}_2` },
        ] : undefined,
        highlightWhen: isSelected,
        top,
        left: c.input[0],
        width: w(c.input),
        height,
        align: ci === 0 ? 'left' : 'right',
      });
    });
  }
  return out;
}

/**
 * 合計ブロックの1項目（丸番号の上帯＋Gコードセル＋値セル）。r08-08: 帯h≈0.9、値はGコード付きで残り高さ。
 */
function totalItem(mark: string, code: string, field: string, top: number, bandH: number, bottom: number, colL: number, codeR: number, colR: number, props?: Partial<GridCell>): GridCell[] {
  const valTop = +(top + bandH).toFixed(2);
  return [
    { kind: 'label', text: mark, top, left: colL, width: +(colR - colL).toFixed(2), height: bandH, fontSize: 6.5 },
    { kind: 'cell', codeLabel: code, top: valTop, left: colL, width: +(codeR - colL).toFixed(2), height: +(bottom - valTop).toFixed(2) },
    { field, kind: 'input', top: valTop, left: codeR, width: +(colR - codeR).toFixed(2), height: +(bottom - valTop).toFixed(2), align: 'right', ...props },
  ];
}

/** 2./3.セクションの1行（[ラベル][Gコード][値][単位]） */
function calcRow(label: string, aria: string, code: string, field: string, unit: string, top: number, bottom: number, x: [number, number, number, number, number], props?: Partial<GridCell>): GridCell[] {
  const h = +(bottom - top).toFixed(2);
  return [
    { kind: 'label', text: label, semanticRole: 'rowheader', ariaLabel: aria, top, left: x[0], width: +(x[1] - x[0]).toFixed(2), height: h, align: 'left', fontSize: 6.5 },
    { kind: 'cell', codeLabel: code, top, left: x[1], width: +(x[2] - x[1]).toFixed(2), height: h },
    { field, kind: 'input', top, left: x[2], width: +(x[3] - x[2]).toFixed(2), height: h, align: 'right', ...props },
    { kind: 'label', text: unit, top, left: x[3], width: +(x[4] - x[3]).toFixed(2), height: h, fontSize: 7 },
  ];
}

/** 本表（1ページ目）のグリッドセル：15行＋合計欄＋計算欄（座標は r08-08 の罫線実測値） */
function pageCells(pageIndex: number): GridCell[] {
  const startRow = pageStartRow(pageIndex);
  const showCodes = true; // 本表は識別コードあり（負債base=30）
  const CALC2_X: [number, number, number, number, number] = [6.77, 34.17, 36.1, 49.32, 51.09];  // 2.セクション列
  const CALC3_X: [number, number, number, number, number] = [51.41, 73.97, 75.83, 91.06, 92.83]; // 3.セクション列
  return [
  // ── 外枠・区分 ──
  { kind: 'cell', top: 14.93, left: 6.77, width: 86.06, height: 76.92 },
  { kind: 'cell', semanticRole: 'group', ariaLabel: '資産の部', top: 16.52, left: 6.77, width: 44.32, height: 61.94 },
  { kind: 'cell', semanticRole: 'group', ariaLabel: '負債の部', top: 16.52, left: 51.41, width: 41.42, height: 61.94 },
  { kind: 'cell', semanticRole: 'group', ariaLabel: '評価差額に対する法人税額等相当額の計算', top: 78.46, left: 6.77, width: 44.32, height: 13.39 },
  { kind: 'cell', semanticRole: 'group', ariaLabel: '1株当たりの純資産価額の計算', top: 78.46, left: 51.41, width: 41.42, height: 13.39 },
  // ── 1. 資産及び負債の金額（タイトル帯） ──
  { kind: 'label', text: '１．資産及び負債の金額（課税時期現在）', top: 14.93, left: 6.77, width: 86.06, height: 1.59, align: 'left', fontSize: 8.5, bold: true },
  // ── 資産の部 ──
  { kind: 'label', text: '資　産　の　部', semanticRole: 'columnheader', ariaLabel: '資産の部', top: 16.52, left: 6.77, width: 44.32, height: 1.6 },
  { kind: 'label', text: '科　　目', semanticRole: 'columnheader', ariaLabel: '科目', top: 18.12, left: 6.77, width: 16.11, height: 4.27 },
  { kind: 'label', text: '相 続 税 評 価 額\n（千円）', semanticRole: 'columnheader', ariaLabel: '相続税評価額（千円）', fontSize: 7.5, top: 18.12, left: 22.88, width: 11.29, height: 4.27 },
  { kind: 'label', text: '帳　簿　価　額\n（千円）', semanticRole: 'columnheader', ariaLabel: '帳簿価額（千円）', fontSize: 7.5, top: 18.12, left: 34.17, width: 11.44, height: 4.27 },
  { kind: 'label', text: '備　考', semanticRole: 'columnheader', ariaLabel: '備考', top: 18.12, left: 45.61, width: 5.48, height: 4.27 },
  ...dataRows('a', ASSET_COLS, startRow, showCodes, MAIN_ROWS, ROW_TOP, PITCH, 30),
  // ── 資産 合計・㋑㋺㋩㊁㋭ ──（丸番号＝上帯、G/Eコード＝独立セル）
  { kind: 'label', text: '合　　計', top: 63.02, left: 6.77, width: 16.11, height: 3.59 },
  ...totalItem('①', 'G61', '①', 63.02, 0.85, 66.61, 22.88, 24.74, 34.17),
  ...totalItem('②', 'G62', '②', 63.02, 0.85, 66.61, 34.17, 36.1, 45.61),
  { kind: 'cell', codeLabel: 'E61', top: 63.02, left: 45.61, width: 1.85, height: 3.59 },
  { field: 'a_total_bikou', kind: 'input', top: 63.02, left: 47.46, width: 3.63, height: 3.59 },
  // 株式等/土地等/現物出資の行の左端は 8.54 起点（6.77-8.54 は空き列）
  { kind: 'cell', text: '', top: 66.61, left: 6.77, width: 1.77, height: 11.85 },
  { kind: 'label', text: '株式等の価額の合計額', top: 66.61, left: 8.54, width: 14.34, height: 3.59, fontSize: 7.5 },
  ...totalItem('㋑', 'G65', 'イ', 66.61, 0.91, 70.2, 22.88, 24.74, 34.17),
  ...totalItem('㋺', 'G66', 'ロ', 66.61, 0.91, 70.2, 34.17, 36.1, 45.61),
  { kind: 'cell', codeLabel: 'E63', top: 66.61, left: 45.61, width: 1.85, height: 3.59 },
  { field: 'a_kabu_bikou', kind: 'input', top: 66.61, left: 47.46, width: 3.63, height: 3.59 },
  { kind: 'label', text: '土地等の価額の合計額', top: 70.2, left: 8.54, width: 14.34, height: 3.59, fontSize: 7.5 },
  ...totalItem('㋩', 'G67', 'ハ', 70.2, 0.91, 73.79, 22.88, 24.74, 34.17),
  { kind: 'cell', diagonal: 'tlbr', top: 70.2, left: 34.17, width: 11.44, height: 3.59 },
  { kind: 'cell', codeLabel: 'E64', top: 70.2, left: 45.61, width: 1.85, height: 3.59 },
  { field: 'a_tochi_bikou', kind: 'input', top: 70.2, left: 47.46, width: 3.63, height: 3.59 },
  { kind: 'label', text: '現物出資等受入れ資産\nの価額の合計額', top: 73.79, left: 8.54, width: 14.34, height: 4.67, fontSize: 7.5 },
  ...totalItem('㊁', 'G68', 'ニ', 73.79, 0.91, 78.46, 22.88, 24.74, 34.17),
  ...totalItem('㋭', 'G69', 'ホ', 73.79, 0.91, 78.46, 34.17, 36.1, 45.61),
  { kind: 'cell', codeLabel: 'E65', top: 73.79, left: 45.61, width: 1.85, height: 4.67 },
  { field: 'a_genbutsu_bikou', kind: 'input', top: 73.79, left: 47.46, width: 3.63, height: 4.67 },
  // ── 負債の部 ──
  { kind: 'label', text: '負　債　の　部', semanticRole: 'columnheader', ariaLabel: '負債の部', top: 16.52, left: 51.41, width: 41.42, height: 1.6 },
  { kind: 'label', text: '科　　目', semanticRole: 'columnheader', ariaLabel: '科目', top: 18.12, left: 51.41, width: 13.13, height: 4.27 },
  { kind: 'label', text: '相 続 税 評 価 額\n（千円）', semanticRole: 'columnheader', ariaLabel: '相続税評価額（千円）', fontSize: 7.5, top: 18.12, left: 64.54, width: 11.33, height: 4.27 },
  { kind: 'label', text: '帳　簿　価　額\n（千円）', semanticRole: 'columnheader', ariaLabel: '帳簿価額（千円）', fontSize: 7.5, top: 18.12, left: 75.87, width: 11.4, height: 4.27 },
  { kind: 'label', text: '備　考', semanticRole: 'columnheader', ariaLabel: '備考', top: 18.12, left: 87.27, width: 5.56, height: 4.27 },
  ...dataRows('l', LIAB_COLS, startRow, showCodes, MAIN_ROWS, ROW_TOP, PITCH, 30),
  // ── 負債 合計 ──
  { kind: 'label', text: '合　　計', top: 63.02, left: 51.41, width: 13.13, height: 3.59 },
  ...totalItem('③', 'G63', '③', 63.02, 0.85, 66.61, 64.54, 66.4, 75.87),
  ...totalItem('④', 'G64', '④', 63.02, 0.85, 66.61, 75.87, 77.76, 87.27),
  { kind: 'cell', codeLabel: 'E62', top: 63.02, left: 87.27, width: 1.85, height: 3.59 },
  { field: 'l_total_bikou', kind: 'input', top: 63.02, left: 89.12, width: 3.71, height: 3.59 },
  // 負債側・合計下の未使用領域（資産側の株式等/土地等/現物出資に対応）に黒斜線
  { kind: 'cell', diagonal: 'bltr', top: 66.61, left: 51.41, width: 41.42, height: 11.85 },
  // ── 2. 評価差額に対する法人税額等相当額の計算 ──
  { kind: 'label', text: '２．評価差額に対する法人税額等相当額の計算', semanticRole: 'columnheader', ariaLabel: '評価差額に対する法人税額等相当額の計算', top: 78.46, left: 6.77, width: 44.32, height: 1.77, align: 'left', fontSize: 8.5, bold: true },
  ...calcRow('⑤ 相続税評価額による純資産価額\n　（①－③）', '⑤ 相続税評価額による純資産価額', 'G70', '⑤', '千円', 80.23, 82.85, CALC2_X),
  ...calcRow('⑥ 帳簿価額による純資産価額\n　【{②＋(ニ－ホ)－④}、マイナスの場合は０】', '⑥ 帳簿価額による純資産価額', 'G71', '⑥', '千円', 82.85, 85.47, CALC2_X),
  ...calcRow('⑦ 評価差額に相当する金額\n　（⑤－⑥、マイナスの場合は０）', '⑦ 評価差額に相当する金額', 'G72', '⑦', '千円', 85.47, 88.09, CALC2_X),
  ...calcRow('⑧ 評価差額に対する法人税額等相当額\n　（⑦×38％）', '⑧ 評価差額に対する法人税額等相当額', 'G73', '⑧', '千円', 88.09, 91.85, CALC2_X),
  // ── 3. 1株当たりの純資産価額の計算 ──
  { kind: 'label', text: '３．１株当たりの純資産価額の計算', semanticRole: 'columnheader', ariaLabel: '1株当たりの純資産価額の計算', top: 78.46, left: 51.41, width: 41.42, height: 1.77, align: 'left', fontSize: 8.5, bold: true },
  ...calcRow('⑨ 課税時期現在の純資産価額\n　（相続税評価額）（⑤－⑧）', '⑨ 課税時期現在の純資産価額', 'G74', '⑨', '千円', 80.23, 82.85, CALC3_X),
  ...calcRow('⑩ 課税時期現在の発行済株式数\n　（第１表の１⑤）－自己株式数', '⑩ 課税時期現在の発行済株式数', 'G75', '⑩', '株', 82.85, 85.47, CALC3_X,
    { jumpTo: { tab: 'table1_1', field: '⑤', hint: 'クリックで入力元（第１表の１・⑤発行済株式数）へ移動します。自己株式数は第１表の１の自己株式欄で入力します' } }),
  ...calcRow('⑪ 課税時期現在の１株当たりの\n　純資産価額（相続税評価額）（⑨÷⑩）', '⑪ 課税時期現在の1株当たりの純資産価額', 'G76', '⑪', '円', 85.47, 88.09, CALC3_X),
  ...calcRow('⑫ 同族株主等の議決権割合（第１表の１\n　の②の割合）が50％以下の場合（⑪×80％）', '⑫ 同族株主等の議決権割合が50％以下の場合', 'G77', '⑫', '円', 88.09, 91.85, CALC3_X),
  ];
}

// 本表（1ページ目）：計算値欄を読み取り専用に
const mainPageCells: GridCell[] = pageCells(0).map((cell) => (
  cell.field && COMPUTED_FIELDS.has(cell.field)
    ? { ...cell, readOnly: true, commaInteger: true }
    : cell
));

// 続紙（2ページ目以降）＝令和8年様式 第5表続：合計欄なしで23行のデータ行のみ（識別コード E01-E92/G01-G92）。
// 座標は r08-09 の罫線実測値。
const CONT_ASSET_COLS: Col[] = [
  { code: [7.7, 9.63], input: [9.63, 21.11] },
  { code: [21.11, 23.01], input: [23.01, 32.59] },
  { code: [32.59, 34.49], input: [34.49, 44.08] },
  { code: [44.08, 45.97], input: [45.97, 49.64] },
];
const CONT_LIAB_COLS: Col[] = [
  { code: [49.96, 51.73], input: [51.73, 63.22] },
  { code: [63.22, 65.11], input: [65.11, 74.7] },
  { code: [74.7, 76.59], input: [76.59, 86.18] },
  { code: [86.18, 88.07], input: [88.07, 91.9] },
];
function continuationPageCells(pageIndex: number): GridCell[] {
  const startRow = pageStartRow(pageIndex);
  return [
    { kind: 'cell', top: 14.99, left: 7.7, width: 84.2, height: 78.71 },
    { kind: 'label', text: '１．資産及び負債の金額（課税時期現在）（続）', top: 14.99, left: 7.7, width: 84.2, height: 1.65, align: 'left', fontSize: 8.5, bold: true },
    // 資産の部 ヘッダー
    { kind: 'cell', semanticRole: 'group', ariaLabel: '資産の部（続）', top: 16.64, left: 7.7, width: 41.94, height: 77.06 },
    { kind: 'label', text: '資　産　の　部', semanticRole: 'columnheader', ariaLabel: '資産の部', top: 16.64, left: 7.7, width: 41.94, height: 1.65 },
    { kind: 'label', text: '科　　目', semanticRole: 'columnheader', ariaLabel: '科目', top: 18.29, left: 7.7, width: 13.41, height: 4.3 },
    { kind: 'label', text: '相 続 税 評 価 額\n（千円）', semanticRole: 'columnheader', ariaLabel: '相続税評価額（千円）', fontSize: 7.5, top: 18.29, left: 21.11, width: 11.48, height: 4.3 },
    { kind: 'label', text: '帳　簿　価　額\n（千円）', semanticRole: 'columnheader', ariaLabel: '帳簿価額（千円）', fontSize: 7.5, top: 18.29, left: 32.59, width: 11.49, height: 4.3 },
    { kind: 'label', text: '備　考', semanticRole: 'columnheader', ariaLabel: '備考', top: 18.29, left: 44.08, width: 5.56, height: 4.3 },
    ...dataRows('a', CONT_ASSET_COLS, startRow, true, CONT_ROWS, CONT_ROW_TOP, CONT_PITCH, 46),
    // 負債の部 ヘッダー
    { kind: 'cell', semanticRole: 'group', ariaLabel: '負債の部（続）', top: 16.64, left: 49.96, width: 41.94, height: 77.06 },
    { kind: 'label', text: '負　債　の　部', semanticRole: 'columnheader', ariaLabel: '負債の部', top: 16.64, left: 49.96, width: 41.94, height: 1.65 },
    { kind: 'label', text: '科　　目', semanticRole: 'columnheader', ariaLabel: '科目', top: 18.29, left: 49.96, width: 13.26, height: 4.3 },
    { kind: 'label', text: '相 続 税 評 価 額\n（千円）', semanticRole: 'columnheader', ariaLabel: '相続税評価額（千円）', fontSize: 7.5, top: 18.29, left: 63.22, width: 11.48, height: 4.3 },
    { kind: 'label', text: '帳　簿　価　額\n（千円）', semanticRole: 'columnheader', ariaLabel: '帳簿価額（千円）', fontSize: 7.5, top: 18.29, left: 74.7, width: 11.48, height: 4.3 },
    { kind: 'label', text: '備　考', semanticRole: 'columnheader', ariaLabel: '備考', top: 18.29, left: 86.18, width: 5.72, height: 4.3 },
    ...dataRows('l', CONT_LIAB_COLS, startRow, true, CONT_ROWS, CONT_ROW_TOP, CONT_PITCH, 46),
  ];
}

/** 第5表の自動計算（第3表の②③などからも参照する） */
export function calcTable5(getField: TableProps['getField']) {
  const totalRows = totalRowsOf(pageCountOf(getField));
  let assetEval = 0;
  let assetBook = 0;
  let stockEval = 0;
  let stockBook = 0;
  let landEval = 0;
  let liabilityEval = 0;
  let liabilityBook = 0;
  let hasAssetInput = false;
  let hasLiabilityInput = false;

  for (let row = 1; row <= totalRows; row++) {
    const assetName = getField(T, `a_${row}_1`);
    const assetEvalRaw = getField(T, `a_${row}_2`);
    const assetBookRaw = getField(T, `a_${row}_3`);
    const assetNote = getField(T, `a_${row}_4`);
    const rowAssetEval = parseNum(assetEvalRaw);
    const rowAssetBook = parseNum(assetBookRaw);
    hasAssetInput ||= Boolean(assetName || assetEvalRaw || assetBookRaw || assetNote);
    assetEval += rowAssetEval;
    assetBook += rowAssetBook;
    // 備考欄で選択された区分だけを、イ・ロ・ハへ集計する。
    if (assetNote === '株式等') {
      stockEval += rowAssetEval;
      stockBook += rowAssetBook;
    }
    if (assetNote === '土地等') landEval += rowAssetEval;

    const liabilityName = getField(T, `l_${row}_1`);
    const liabilityEvalRaw = getField(T, `l_${row}_2`);
    const liabilityBookRaw = getField(T, `l_${row}_3`);
    const liabilityNote = getField(T, `l_${row}_4`);
    hasLiabilityInput ||= Boolean(liabilityName || liabilityEvalRaw || liabilityBookRaw || liabilityNote);
    // 評価通達186により、引当金及び準備金は純資産価額計算上の負債に含めない。
    if (!isExcludedLiability(liabilityName)) {
      liabilityEval += parseNum(liabilityEvalRaw);
      liabilityBook += parseNum(liabilityBookRaw);
    }
  }

  const hasCalculationInput = hasAssetInput || hasLiabilityInput;
  const inKindEval = parseNum(getField(T, 'ニ'));
  const inKindBook = parseNum(getField(T, 'ホ'));
  const inKindRatio = assetEval > 0 ? (inKindEval / assetEval) * 100 : 0;
  // 評価通達186-2注3により、現物出資等受入れ資産が総資産の20％以下なら差額を加算しない。
  const applicableInKindDifference = inKindRatio > 20 ? inKindEval - inKindBook : 0;
  const netEval = Math.max(0, assetEval - liabilityEval);
  const netBook = Math.max(0, assetBook + applicableInKindDifference - liabilityBook);
  const evaluationDifference = Math.max(0, netEval - netBook);
  const corporateTaxEquivalent = Math.floor(evaluationDifference * CORPORATE_TAX_RATE);
  const currentNet = netEval - corporateTaxEquivalent;

  const issuedShares = parseNum(
    getField('table1_1', '⑤') || getField('table1_1', 'total_shares_sum'),
  );
  const treasuryShares = parseNum(
    getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares'),
  );
  const currentShares = Math.max(0, issuedShares - treasuryShares);
  const netPerShare = currentShares > 0
    ? Math.floor((currentNet * 1000) / currentShares)
    : null;

  let groupVotes = 0;
  for (let row = 1; row <= 10; row++) {
    groupVotes += parseNum(getField('table1_1', `sh_${row}_5`));
  }
  const totalVotes = parseNum(getField('table1_1', '⑥'));
  const votingRatio = totalVotes > 0 ? (groupVotes / totalVotes) * 100 : null;
  const netPerShare80 = votingRatio !== null && votingRatio <= 50 && netPerShare !== null
    ? Math.floor(netPerShare * 0.8)
    : null;

  const calculated: Record<string, number | null> = {
    '①': hasAssetInput ? assetEval : null,
    '②': hasAssetInput ? assetBook : null,
    'イ': hasAssetInput ? stockEval : null,
    'ロ': hasAssetInput ? stockBook : null,
    'ハ': hasAssetInput ? landEval : null,
    '③': hasLiabilityInput ? liabilityEval : null,
    '④': hasLiabilityInput ? liabilityBook : null,
    '⑤': hasCalculationInput ? netEval : null,
    '⑥': hasCalculationInput ? netBook : null,
    '⑦': hasCalculationInput ? evaluationDifference : null,
    '⑧': hasCalculationInput ? corporateTaxEquivalent : null,
    '⑨': hasCalculationInput ? currentNet : null,
    '⑩': currentShares > 0 ? currentShares : null,
    '⑪': netPerShare,
    '⑫': netPerShare80,
  };
  return calculated;
}

/** 第5表（CSSグリッド方式・続紙対応・行の選択／上下移動／挿入／削除） */
export function Table5Grid({ getField, updateField, onJump }: TableProps) {
  const pageCount = pageCountOf(getField);
  const totalRows = totalRowsOf(pageCount);
  const calculated = calcTable5(getField);

  const g = (f: string) => {
    if (COMPUTED_FIELDS.has(f)) {
      const value = calculated[f];
      return value === null || value === undefined ? '' : String(value);
    }
    return getField(T, f);
  };
  const u = (f: string, v: string) => updateField(T, f, v);
  const jump = onJump && ((t: { tab: string; field: string }) => onJump({ tab: t.tab as TableId, field: t.field }));

  // リスト1件分（4列）の値を読み出すヘルパー
  const readRows = (prefix: 'a' | 'l', count: number) =>
    Array.from({ length: count }, (_, i) => [1, 2, 3, 4].map((c) => getField(T, `${prefix}_${i + 1}_${c}`)));
  const writeRows = (prefix: 'a' | 'l', rows: string[][]) =>
    rows.forEach((vals, i) => [1, 2, 3, 4].forEach((c, ci) => updateField(T, `${prefix}_${i + 1}_${c}`, vals[ci] ?? '')));

  const canAddPage = pageCount < MAX_PAGES;
  const canRemovePage = pageCount > 1;
  const addPage = () => { if (canAddPage) u('_pages', String(pageCount + 1)); };
  const removePage = () => {
    if (!canRemovePage) return;
    const start = pageStartRow(pageCount - 1);
    const end = totalRows;
    let hasData = false;
    for (let row = start; row <= end && !hasData; row++) {
      for (const p of ['a', 'l'] as const) {
        for (let c = 1; c <= 4; c++) if (getField(T, `${p}_${row}_${c}`).trim() !== '') hasData = true;
      }
    }
    // 誤操作防止のため削除は常に確認する。入力済みのときはより強く警告。
    const message = hasData
      ? '続紙を削除します。\n入力済みの明細もすべて削除され、元に戻せません。\n本当に削除してよろしいですか？'
      : '続紙を削除します。よろしいですか？';
    if (!window.confirm(message)) return;
    for (let row = start; row <= end; row++) {
      for (const p of ['a', 'l'] as const) for (let c = 1; c <= 4; c++) updateField(T, `${p}_${row}_${c}`, '');
    }
    u('_pages', String(pageCount - 1));
  };

  // pos の位置に空行を挿入し以降を1行下へ。末尾が埋まっている場合は自動で1ページ追加。
  // 続紙が上限に達していて末尾行にデータがあるときは、押し出される行が消えるため挿入しない。
  const insertRow = (prefix: 'a' | 'l', pos: number) => {
    let total = totalRows;
    let rows = readRows(prefix, total);
    if (rows[total - 1]?.some((v) => v.trim() !== '')) {
      if (!canAddPage) {
        window.alert('続紙は1枚までです。最終行にデータがあるため、これ以上行を追加できません。');
        return;
      }
      u('_pages', String(pageCount + 1));
      total += CONT_ROWS;
      rows = rows.concat(Array.from({ length: CONT_ROWS }, () => ['', '', '', '']));
    }
    rows.splice(pos - 1, 0, ['', '', '', '']);
    writeRows(prefix, rows.slice(0, total));
    u('_sel', `${prefix}:${pos}`);
  };

  // pos の行を削除し以降を1行上へ。最終ページが資産・負債とも空になれば自動で1ページ削減。
  const deleteRow = (prefix: 'a' | 'l', pos: number) => {
    const total = totalRows;
    const rows = readRows(prefix, total);
    // データのある行は確認してから削除（空行は確認なし）
    if (rows[pos - 1]?.some((v) => v.trim() !== '') && !window.confirm(`${prefix === 'a' ? '資産' : '負債'}${pos}行目を削除します。よろしいですか？`)) return;
    rows.splice(pos - 1, 1);
    rows.push(['', '', '', '']);
    writeRows(prefix, rows);
    if (pageCount > 1) {
      const other = prefix === 'a' ? 'l' : 'a';
      const startIdx = pageStartRow(pageCount - 1) - 1; // 0-index
      let empty = true;
      for (let i = startIdx; i < total && empty; i++) {
        if (rows[i]?.some((v) => v.trim() !== '')) empty = false;
        for (let c = 1; c <= 4 && empty; c++) if (getField(T, `${other}_${i + 1}_${c}`).trim() !== '') empty = false;
      }
      if (empty) u('_pages', String(pageCount - 1));
    }
    u('_sel', '');
  };

  // 選択行を1つ上/下のリスト位置と入れ替え（ページ跨ぎも可）
  const moveRow = (prefix: 'a' | 'l', from: number, to: number) => {
    if (to < 1 || to > totalRows) return;
    const rows = readRows(prefix, totalRows);
    const a = rows[from - 1];
    const b = rows[to - 1];
    if (!a || !b) return;
    rows[from - 1] = b;
    rows[to - 1] = a;
    writeRows(prefix, rows);
    u('_sel', `${prefix}:${to}`);
  };

  const sel = getField(T, '_sel');
  const [selP, selRStr] = sel.split(':');
  const selR = Number(selRStr);
  const selValid = (selP === 'a' || selP === 'l') && Number.isInteger(selR) && selR >= 1 && selR <= totalRows;
  const selList = selP === 'a' ? 'a' : 'l';

  const btnStyle = (enabled: boolean) => ({
    fontSize: 11, lineHeight: 1.4, padding: '0 6px', border: '1px solid #888', borderRadius: 3,
    background: '#fff', cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? '#111' : '#aaa', borderColor: enabled ? '#888' : '#ddd',
  } as const);
  // 帯オーバーレイ用の小さめボタン（枠線は様式の罫線と同じ 0.5px）
  const opBtnStyle = { fontSize: 9, padding: '0 3px', cursor: 'pointer', border: '0.5px solid #000', borderRadius: 0, background: '#fff', lineHeight: 1.3, boxSizing: 'border-box' } as const;
  // 続紙の追加/削除はタイトルバーに表示（続紙は1枚まで）
  const pageToolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap' }}>
      <span>続紙</span>
      <button type="button" onClick={addPage} disabled={!canAddPage} title={canAddPage ? `続紙を追加（明細${CONT_ROWS}行分）` : '続紙は1枚までです'} style={btnStyle(canAddPage)}>追加</button>
      <button type="button" onClick={removePage} disabled={!canRemovePage} title={canRemovePage ? '続紙を削除' : '続紙はありません'} style={btnStyle(canRemovePage)}>削除</button>
    </span>
  );
  // 行操作は「１．資産及び負債の金額」の帯の上に重ねて表示
  const rowOpsOverlay = (
    <div className="no-print" style={{ position: 'absolute', top: 0, right: '0.6%', height: '2.05%', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, whiteSpace: 'nowrap', background: 'transparent', padding: '0 3px' }}>
      {selValid ? (
        <>
          <b>選択: {selList === 'a' ? '資産' : '負債'}{selR}行目</b>
          <button type="button" onClick={() => moveRow(selList, selR, selR - 1)} disabled={selR <= 1} style={opBtnStyle}>↑上に移動</button>
          <button type="button" onClick={() => moveRow(selList, selR, selR + 1)} disabled={selR >= totalRows} style={opBtnStyle}>↓下に移動</button>
          <button type="button" onClick={() => insertRow(selList, selR)} style={opBtnStyle}>＋上に挿入</button>
          <button type="button" onClick={() => insertRow(selList, selR + 1)} style={opBtnStyle}>＋下に挿入</button>
          <button type="button" onClick={() => deleteRow(selList, selR)} style={{ ...opBtnStyle, color: '#b91c1c', borderColor: '#b91c1c' }}>×削除</button>
          <button type="button" onClick={() => u('_sel', '')} style={opBtnStyle}>〇確定</button>
        </>
      ) : (
        <span style={{ color: '#888' }}>行頭の ⠿ をクリックで行を選択 → 上下移動／挿入／削除</span>
      )}
    </div>
  );

  return (
    <>
      {Array.from({ length: pageCount }).map((_, p) => (
        <div className="gov-page" key={p} style={p < pageCount - 1 ? { marginBottom: '8mm' } : undefined}>
          {p === 0 ? (
            <GridForm
              cells={mainPageCells}
              g={g}
              u={u}
              formId={T}
              width="100%"
              title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書"
              formCode="NTA0VNA220010010"
              headerExtra={companyFloatBox(g, u, T, { widthPct: 40, aspect: 8.9, labelFrac: 0.33 })}
              toolbar={pageToolbar}
              overlay={rowOpsOverlay}
              onJump={jump}
            />
          ) : (
            <GridForm
              cells={continuationPageCells(p)}
              g={g}
              u={u}
              formId={T}
              width="100%"
              title={`第５表（続）　１株当たりの純資産価額（相続税評価額）の計算明細書（${p + 1}／${pageCount}ページ）`}
              formCode="NTA0VNA220020010"
              headerExtra={companyFloatBox(g, u, T, { widthPct: 40, aspect: 8.9, labelFrac: 0.33 })}
              overlay={rowOpsOverlay}
            />
          )}
        </div>
      ))}
    </>
  );
}
