/**
 * 第11表の付表1〜4「相続税がかかる財産の明細書」に共通の骨格。
 *
 * 4様式は財産の種類（土地・家屋等／有価証券／現金・預貯金等／その他）が違うだけで、
 * 用紙の骨格は完全に一致する:
 *   1枚 = 8組、1組 = 3行。左端が項番、右端が「分割が確定した財産」（番号＋価額を3人分）、
 *   その間の「財産の明細」だけが様式ごとに違う。
 * そのため、共通部分をこのファイルが組み立て、様式ごとのファイルは
 * 中央部分の割付（`DetailSpec`）だけを与える。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。上端 158.5px（被相続人の氏名欄の上辺）〜
 * 下端 1668.5px（表の下辺）、左端 77px 〜 右端 1114px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

/** 1枚に載る財産の数（＝組の数） */
export const DETAIL_GROUPS = 8;

const TOP = 158.5;
const BOTTOM = 1668.5;
const LEFT = 77;
const RIGHT = 1114;

/** 実測px → ％ */
const row = (a: number, b: number): [number, number] => [((a - TOP) / (BOTTOM - TOP)) * 100, ((b - TOP) / (BOTTOM - TOP)) * 100];
const col = (a: number, b: number): [number, number] => [((a - LEFT) / (RIGHT - LEFT)) * 100, ((b - LEFT) / (RIGHT - LEFT)) * 100];

/** 全様式共通の縦罫線（実測px） */
const X = {
  L: LEFT,
  NO_CODE: 103,   // 項番のコード枠の右端
  NO_R: 134,      // 項番の右端 ＝ 「財産の明細」の左端
  MID_R: 837,     // 「財産の明細」の右端
  SPLIT_R: 841,   // 二重線の右端 ＝ 「分割が確定した財産」の左端
  WHO_CODE: 865,  // 「財産を取得した人の番号」のコード枠の右端
  WHO_R: 926,     // 同上の右端
  AMT_CODE: 952,  // 「取得財産の価額」のコード枠の右端
  R: RIGHT,
  // 被相続人の氏名欄（用紙の上部・右寄せ）
  NAME_L: 553,
  NAME_CODE_L: 654,
  NAME_CODE_R: 680,
  NAME_R: 951.5,
} as const;

/** 全様式共通の横罫線（実測px） */
const Y = {
  NAME: [158.5, 203.5],
  LEAD: [211.5, 248.5],
  BAND: [248.5, 285],
  /** 小見出しの3段 */
  HEAD: [285, 314, 343, 370],
} as const;

/** 組の上辺（実測px）。末尾は表の下辺。 */
const GROUP_TOPS = [373.5, 534, 696, 858, 1020, 1182, 1344, 1506, 1668.5] as const;

/** 組 g の 3行分の上下位置（％）。1組目だけ最初の行がわずかに低い。 */
function groupRows(g: number): [number, number][] {
  const top = GROUP_TOPS[g]!;
  const end = GROUP_TOPS[g + 1]!;
  const lines = [top, end - 108, end - 54, end];
  return [row(lines[0]!, lines[1]!), row(lines[1]!, lines[2]!), row(lines[2]!, lines[3]!)];
}

/**
 * 様式の識別コード。接頭字（G/E/C）＋その組の起点からの位置で書く。
 * 例: 付表1の1組目は G が G01 から始まるので `'G7'` は G08 になる。
 */
export type DetailCode = string;

/** 明細欄1つ。`x` は [コード枠の左端, コード枠の右端, 欄の右端]（コード枠が無い欄は2要素）。 */
export interface DetailField {
  x: readonly [number, number, number] | readonly [number, number];
  /** 識別コード（`'G7'` = その組のG起点+7） */
  code?: DetailCode;
  /** 入力欄のフィールド名。省略すると罫線だけの欄になる */
  field?: string;
  /** 入力欄ではなく固定文字を置く欄（持分割合の「／」など） */
  text?: string;
  /** 入力欄の呼び名（アクセシブル名に使う） */
  name?: string;
  /** 入力欄の種類（桁数・カンマ区切りなど） */
  cell?: Partial<GridCell>;
}

/** 小見出しのセル。`r` は `Y.HEAD` の添字（0〜3）。 */
export interface DetailHead {
  x: readonly [number, number];
  r: readonly [number, number];
  text: string;
  cell?: Partial<GridCell>;
}

/** 様式ごとに違う「財産の明細」部分の定義 */
export interface DetailSpec {
  formCode: string;
  title: string;
  subtitle: string;
  /** 表の上にある「この明細書は、〜を記入します。」 */
  lead: string;
  /** 識別コードの起点。1組目の値と、1組ごとの増分。 */
  codes: Record<string, { base: number; step: number }>;
  /** 小見出し（x は 134〜837 の範囲） */
  head: DetailHead[];
  /** 1組3行分の明細欄（x は 134〜837 の範囲） */
  rows: [DetailField[], DetailField[], DetailField[]];
}

/** 「分割が確定した財産」の3行分の識別コード（様式ごとに違うため spec から受け取る） */
export interface DetailShareCodes {
  no: [DetailCode, DetailCode, DetailCode];
  amount: [DetailCode, DetailCode, DetailCode];
}

/** `'G7'` を実際のコード文字列（`G08` 等）に直す */
function resolve(spec: DetailSpec, ref: DetailCode, g: number): string {
  const prefix = ref.slice(0, 1);
  const seq = spec.codes[prefix];
  if (seq === undefined) throw new Error(`未定義のコード接頭字: ${ref}`);
  const n = seq.base + seq.step * g + Number(ref.slice(1));
  return `${prefix}${String(n).padStart(2, '0')}`;
}

/** 明細欄1つ（コード枠＋入力欄） */
function fieldCells(spec: DetailSpec, f: DetailField, y: [number, number], g: number, prefix: string, who: string): GridCell[] {
  const cells: GridCell[] = [];
  const valueLeft = f.x.length === 3 ? f.x[1] : f.x[0];
  if (f.code !== undefined) cells.push(code(y, col(f.x[0], valueLeft), resolve(spec, f.code, g)));
  else if (f.x.length === 3) cells.push(mk(y, col(f.x[0], valueLeft), {}));
  const right = f.x[f.x.length - 1]!;
  if (f.field !== undefined) {
    cells.push(mk(y, col(valueLeft, right), {
      kind: 'input', field: `${prefix}${f.field}`, ariaLabel: `${who}の${f.name ?? f.field}`, ...f.cell,
    }));
  } else if (f.text !== undefined) {
    cells.push(label(y, col(valueLeft, right), f.text, f.cell));
  } else {
    cells.push(mk(y, col(valueLeft, right), f.cell ?? {}));
  }
  return cells;
}

/** 「分割が確定した財産」欄の欄名（1つの財産を最大3人で分けられる） */
const SHARE_ROWS = [0, 1, 2] as const;

/** 組1つ分（3行）。左端の項番と右端の分割確定欄は全様式で共通。 */
function groupCells(spec: DetailSpec, share: DetailShareCodes, g: number, prefix: string, who: string): GridCell[] {
  const ys = groupRows(g);
  const all: [number, number] = [ys[0]![0], ys[2]![1]];
  return [
    // 項番（3行をまたぐ）
    code(all, col(X.L, X.NO_CODE), resolve(spec, 'G0', g)),
    mk(all, col(X.NO_CODE, X.NO_R), {
      kind: 'input', field: `${prefix}no`, ariaLabel: `${who}の項番`, integerDigits: 3, align: 'center',
    }),
    // 財産の明細（様式ごと）
    ...spec.rows.flatMap((fields, i) => fields.flatMap((f) => fieldCells(spec, f, ys[i]!, g, prefix, who))),
    // 分割が確定した財産（3人分）
    ...SHARE_ROWS.flatMap((i): GridCell[] => [
      code(ys[i]!, col(X.SPLIT_R, X.WHO_CODE), resolve(spec, share.no[i], g)),
      mk(ys[i]!, col(X.WHO_CODE, X.WHO_R), {
        kind: 'input', field: `${prefix}who${i}`, ariaLabel: `${who}の取得者${i + 1}の番号`, integerDigits: 2, align: 'center',
      }),
      code(ys[i]!, col(X.WHO_R, X.AMT_CODE), resolve(spec, share.amount[i], g)),
      mk(ys[i]!, col(X.AMT_CODE, X.R), {
        kind: 'input', field: `${prefix}amount${i}`, ariaLabel: `${who}の取得者${i + 1}の取得財産の価額`, commaInteger: true, align: 'right',
      }),
    ]),
  ];
}

/** 表の見出し（「財産の明細」「分割が確定した財産」と小見出しの3段） */
function headCells(spec: DetailSpec): GridCell[] {
  const head = (i: number, j: number): [number, number] => row(Y.HEAD[i]!, Y.HEAD[j]!);
  const band: [number, number] = row(Y.BAND[0], Y.BAND[1]);
  const full: [number, number] = [head(0, 3)[0], head(0, 3)[1]];
  return [
    label(band, col(X.L, X.MID_R), '財　産　の　明　細', { semanticRole: 'columnheader' }),
    label(band, col(X.SPLIT_R, X.R), '分割が確定した財産', { semanticRole: 'columnheader' }),
    label(full, col(X.L, X.NO_R), '項番'),
    ...spec.head.map((h) => label(head(h.r[0], h.r[1]), col(h.x[0], h.x[1]), h.text, { fontSize: 8, ...h.cell })),
    label(full, col(X.SPLIT_R, X.WHO_R), '財産を取得\nした人の番号', { fontSize: 7 }),
    label(full, col(X.WHO_R, X.R), '取得財産の価額（円）', { fontSize: 8 }),
  ];
}

/**
 * 付表1〜4のセルを組み立てる。
 * @param spec 様式ごとの「財産の明細」部分の定義
 * @param share 「分割が確定した財産」の識別コード
 * @param common 共通欄（被相続人）のフィールド接頭辞
 * @param items 8組分の [フィールド接頭辞, 呼び名]
 */
export function buildDetail(
  spec: DetailSpec,
  share: DetailShareCodes,
  common: string,
  items: readonly { prefix: string; label: string }[],
): GridCell[] {
  return [
    // 被相続人の氏名（表の外・右寄せ）
    mk(row(Y.NAME[0], Y.NAME[1]), col(X.L, X.NAME_L), { noBorder: true }),
    label(row(Y.NAME[0], Y.NAME[1]), col(X.NAME_L, X.NAME_CODE_L), '被相続人の氏名', { fontSize: 7 }),
    code(row(Y.NAME[0], Y.NAME[1]), col(X.NAME_CODE_L, X.NAME_CODE_R), 'E01'),
    mk(row(Y.NAME[0], Y.NAME[1]), col(X.NAME_CODE_R, X.NAME_R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left',
    }),
    mk(row(Y.NAME[0], Y.NAME[1]), col(X.NAME_R, X.R), { noBorder: true }),
    mk(row(Y.NAME[1], Y.LEAD[0]), col(X.L, X.R), { noBorder: true }),

    label(row(Y.LEAD[0], Y.LEAD[1]), col(X.L, X.R), spec.lead, { fontSize: 7.5, align: 'left' }),
    mk(row(Y.LEAD[1], Y.BAND[0]), col(X.L, X.R), { noBorder: true }),

    ...headCells(spec),
    // 見出しと1組目の間の空白帯（様式に罫線が無い）
    mk(row(Y.HEAD[3]!, GROUP_TOPS[0]), col(X.L, X.R), { noBorder: true }),
    // 「財産の明細」と「分割が確定した財産」を分ける二重線
    mk(row(Y.BAND[0], GROUP_TOPS[DETAIL_GROUPS]), col(X.MID_R, X.SPLIT_R), {}),

    ...items.flatMap((item, g) => groupCells(spec, share, g, item.prefix, item.label)),
  ];
}
