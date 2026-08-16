/**
 * 第11表の付表1〜4「相続税がかかる財産の明細書」に共通の骨格。
 *
 * 4様式は財産の種類（土地・家屋等／有価証券／現金・預貯金等／その他）が違うだけで、
 * 用紙の組み立て方は完全に一致する:
 *   1枚 = 8組、1組 = 3行。左端が項番、右端が「分割が確定した財産」（番号＋価額を3人分）、
 *   その間の「財産の明細」だけが様式ごとに違う。
 * そのため、共通部分をこのファイルが組み立て、様式ごとのファイルは
 * 罫線の位置（`DetailFrame`）と中央部分の割付（`DetailSpec`）だけを与える。
 *
 * **骨格は同じでも px は様式ごとに違う**。4様式は別々に版が起こされていて、
 * 表の幅も高さも組の間隔も一致しない（例: 表の幅は付表1が 1037px、付表2が 1105px）。
 * そのため罫線の実測値を共通化せず、様式ごとに `DetailFrame` として持たせている。
 * 値はいずれも様式PNG（150dpi）の実測px。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

/** 1枚に載る財産の数（＝組の数） */
export const DETAIL_GROUPS = 8;

/** 様式ごとの罫線の位置（実測px） */
export interface DetailFrame {
  /** 表の左端・右端 */
  left: number;
  right: number;
  /** 被相続人の氏名欄の上辺・下辺（＝用紙の上端の基準） */
  name: readonly [number, number];
  /** 氏名欄の縦罫線（左端・コード枠の左右・右端） */
  nameX: readonly [number, number, number, number];
  /** 「この明細書は、〜を記入します。」の帯 */
  lead: readonly [number, number];
  /** 「財産の明細」「分割が確定した財産」の帯 */
  band: readonly [number, number];
  /** 小見出しの3段を区切る4本 */
  head: readonly [number, number, number, number];
  /** 組の上辺。末尾は表の下辺（＝用紙の下端の基準）。 */
  groupTops: readonly number[];
  /**
   * 組の中の横罫線を「組の下辺からの距離」で並べたもの（上から順）。
   * 組の下辺からの距離にするのは、組の高さが1組目だけわずかに違うため。
   * 付表3・付表4は右側の数量欄だけ別の位置に罫線があるので3本になる。
   */
  rowLines: readonly number[];
  /** 3行それぞれが `rowLines` の何番目から何番目までか（0 ＝ 組の上辺） */
  bands?: readonly (readonly [number, number])[];
  /** 項番のコード枠の右端 */
  noCode: number;
  /** 項番の右端 ＝ 「財産の明細」の左端 */
  noR: number;
  /** 「財産の明細」の右端 */
  midR: number;
  /** 二重線の右端 ＝ 「分割が確定した財産」の左端 */
  splitR: number;
  /** 「財産を取得した人の番号」のコード枠の右端 */
  whoCode: number;
  /** 同上の右端 */
  whoR: number;
  /** 「取得財産の価額」のコード枠の右端 */
  amtCode: number;
}

/** 3行を上から順に割り当てる既定の区切り方（罫線が2本のとき） */
const DEFAULT_BANDS = [[0, 1], [1, 2], [2, 3]] as const;

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
  /** 縦に複数行をまたぐ欄。`rowLines` の添字で指定する（省略時はその行の範囲） */
  r?: readonly [number, number];
  /**
   * コードを選ぶと連動して書き換える欄（細目コード → 細目の名称）。
   * `field` は接頭辞の付かない欄名で書く（組み立て時に組ごとの接頭辞を付ける）。
   */
  autoFill?: { field: string; byValue: Record<string, string> };
  /** 入力欄の種類（桁数・カンマ区切りなど） */
  cell?: Partial<GridCell>;
}

/** 小見出しのセル。`r` は `frame.head` の添字（0〜3）。 */
export interface DetailHead {
  x: readonly [number, number];
  r: readonly [number, number];
  text: string;
  /** 小見出しの罫線が3段のグリッドから外れる欄（付表3の「価額」など）は実測pxで指定する */
  y?: readonly [number, number];
  cell?: Partial<GridCell>;
}

/** 様式ごとに違う「財産の明細」部分の定義 */
export interface DetailSpec {
  formCode: string;
  title: string;
  subtitle: string;
  /** 表の上にある「この明細書は、〜を記入します。」 */
  lead: string;
  /** 罫線の位置（実測px） */
  frame: DetailFrame;
  /** 識別コードの起点。1組目の値と、1組ごとの増分。 */
  codes: Record<string, { base: number; step: number }>;
  /** 小見出し（x は `frame.noR` 〜 `frame.midR` の範囲） */
  head: DetailHead[];
  /** 1組3行分の明細欄（x は `frame.noR` 〜 `frame.midR` の範囲） */
  rows: [DetailField[], DetailField[], DetailField[]];
}

/** 「分割が確定した財産」の3行分の識別コード（様式ごとに違うため spec から受け取る） */
export interface DetailShareCodes {
  no: [DetailCode, DetailCode, DetailCode];
  amount: [DetailCode, DetailCode, DetailCode];
}

/** 用紙の縦横比（`aspect-ratio` にそのまま渡す）。様式ごとに版の大きさが違う。 */
export function detailAspect(spec: DetailSpec): string {
  const f = spec.frame;
  const bottom = f.groupTops[f.groupTops.length - 1]!;
  return `${f.right - f.left} / ${bottom - f.name[0]}`;
}

/** 実測px → ％ の変換をまとめたもの（様式ごとに基準が違うため spec から作る） */
interface Scale {
  row: (a: number, b: number) => [number, number];
  col: (a: number, b: number) => [number, number];
}

function scaleOf(frame: DetailFrame): Scale {
  const top = frame.name[0];
  const bottom = frame.groupTops[frame.groupTops.length - 1]!;
  return {
    row: (a, b) => [((a - top) / (bottom - top)) * 100, ((b - top) / (bottom - top)) * 100],
    col: (a, b) => [((a - frame.left) / (frame.right - frame.left)) * 100, ((b - frame.left) / (frame.right - frame.left)) * 100],
  };
}

/** 組 g の横罫線（実測px）。先頭が組の上辺、末尾が組の下辺。 */
function groupLines(frame: DetailFrame, g: number): number[] {
  const top = frame.groupTops[g]!;
  const end = frame.groupTops[g + 1]!;
  return [top, ...frame.rowLines.map((d) => end - d), end];
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
function fieldCells(
  spec: DetailSpec, s: Scale, f: DetailField, y: [number, number], g: number, prefix: string, who: string,
  action: string,
): GridCell[] {
  const cells: GridCell[] = [];
  const valueLeft = f.x.length === 3 ? f.x[1] : f.x[0];
  if (f.code !== undefined) cells.push(code(y, s.col(f.x[0], valueLeft), resolve(spec, f.code, g)));
  else if (f.x.length === 3) cells.push(mk(y, s.col(f.x[0], valueLeft), {}));
  const right = f.x[f.x.length - 1]!;
  if (f.field !== undefined) {
    cells.push(mk(y, s.col(valueLeft, right), {
      kind: 'input', field: `${prefix}${f.field}`, ariaLabel: `${who}の${f.name ?? f.field}`, ...f.cell,
      ...(f.autoFill ? { autoFill: { ...f.autoFill, field: `${prefix}${f.autoFill.field}` } } : {}),
      // 入力は明細ごとの別画面に一本化してあるので、用紙の上は結果の表示だけ。
      // クリックするとその明細の入力画面が開く
      readOnly: true, action,
    }));
  } else if (f.text !== undefined) {
    cells.push(label(y, s.col(valueLeft, right), f.text, f.cell));
  } else {
    cells.push(mk(y, s.col(valueLeft, right), f.cell ?? {}));
  }
  return cells;
}

/** 「分割が確定した財産」欄の行数（1つの組で3人まで） */
const SHARE_ROWS = [0, 1, 2] as const;

/**
 * 組1つ分（3行）。左端の項番と右端の分割確定欄は全様式で共通。
 *
 * 1つの組＝1つの財産とは限らない。4人以上で共有した財産は記載例59ページのQ&Aのとおり
 * 次の組に続きを書くので、`item.base` が 3 以上の組は同じ財産の続きになる。
 * 続きの組は※のとおり「項番」「取得した人の番号」「取得財産の価額」以外は記入しないため、
 * 明細欄は識別コードと罫線だけを置いて入力欄を作らない。
 */
function groupCells(spec: DetailSpec, share: DetailShareCodes, s: Scale, g: number, item: DetailItem): GridCell[] {
  const f = spec.frame;
  const { prefix, label: who, base, first, index } = item;
  const action = String(index);
  const lines = groupLines(f, g);
  const at = (r: readonly [number, number]): [number, number] => s.row(lines[r[0]]!, lines[r[1]]!);
  const bands = f.bands ?? DEFAULT_BANDS;
  const all = at([0, lines.length - 1]);
  return [
    // 項番（3行をまたぐ）。並び順から決まるので入力できない。
    // 入力欄を持たないので、この組ぜんたいの入力画面を開くボタンにしてある
    code(all, s.col(f.left, f.noCode), resolve(spec, 'G0', g)),
    mk(all, s.col(f.noCode, f.noR), {
      textField: `${prefix}no${base}`, ariaLabel: `${who}を入力`, align: 'center', action,
    }),
    // 財産の明細（様式ごと）
    ...spec.rows.flatMap((fields, i) => fields.flatMap(
      (field) => fieldCells(spec, s, first ? field : { x: field.x, code: field.code }, at(field.r ?? bands[i]!), g, prefix, who, action),
    )),
    // 分割が確定した財産（1組3人分）
    ...SHARE_ROWS.flatMap((i): GridCell[] => {
      const y = at(bands[i]!);
      const n = base + i;
      return [
        code(y, s.col(f.splitR, f.whoCode), resolve(spec, share.no[i], g)),
        mk(y, s.col(f.whoCode, f.whoR), {
          kind: 'input', field: `${prefix}who${n}`, ariaLabel: `${who}の取得者${n + 1}の番号`, integerDigits: 2, align: 'center',
          readOnly: true, action,
        }),
        code(y, s.col(f.whoR, f.amtCode), resolve(spec, share.amount[i], g)),
        mk(y, s.col(f.amtCode, f.right), {
          // 代償財産は支払う人が負数・受け取る人が正数（記載例62ページ）。△を打てるようにしておく
          kind: 'input', field: `${prefix}amount${n}`, ariaLabel: `${who}の取得者${n + 1}の取得財産の価額`,
          signedCommaInteger: true, align: 'right', readOnly: true, action,
        }),
      ];
    }),
  ];
}

/** 表の見出し（「財産の明細」「分割が確定した財産」と小見出しの3段） */
function headCells(spec: DetailSpec, s: Scale): GridCell[] {
  const f = spec.frame;
  const head = (i: number, j: number): [number, number] => s.row(f.head[i]!, f.head[j]!);
  const band = s.row(f.band[0], f.band[1]);
  const full = head(0, 3);
  return [
    label(band, s.col(f.left, f.midR), '財　産　の　明　細', { semanticRole: 'columnheader' }),
    label(band, s.col(f.splitR, f.right), '分割が確定した財産', { semanticRole: 'columnheader' }),
    label(full, s.col(f.left, f.noR), '項番'),
    ...spec.head.map((h) => label(
      h.y ? s.row(h.y[0], h.y[1]) : head(h.r[0], h.r[1]),
      s.col(h.x[0], h.x[1]), h.text, { fontSize: 8, ...h.cell },
    )),
    label(full, s.col(f.splitR, f.whoR), '財産を取得\nした人の番号', { fontSize: 7 }),
    label(full, s.col(f.whoR, f.right), '取得財産の価額（円）', { fontSize: 8 }),
  ];
}

/** 組1つ分の割り付け */
export interface DetailItem {
  /** その組が載せる明細の通し番号（クリックでこの明細の入力画面を開く） */
  index: number;
  /** その組が載せる明細のフィールド接頭辞 */
  prefix: string;
  /** アクセシブル名に使う呼び名 */
  label: string;
  /** この組に載せる取得者の先頭の添字（0・3・6…） */
  base: number;
  /** その明細の最初の組か（続きの組は明細欄を書かない） */
  first: boolean;
}

/**
 * 付表1〜4のセルを組み立てる。
 * @param spec 様式ごとの罫線と「財産の明細」部分の定義
 * @param share 「分割が確定した財産」の識別コード
 * @param common 共通欄（被相続人）のフィールド接頭辞
 * @param items 8組分の割り付け
 */
export function buildDetail(
  spec: DetailSpec,
  share: DetailShareCodes,
  common: string,
  items: readonly DetailItem[],
): GridCell[] {
  const f = spec.frame;
  const s = scaleOf(f);
  const nameY = s.row(f.name[0], f.name[1]);
  const [nameL, codeL, codeR, nameR] = f.nameX;
  return [
    // 被相続人の氏名（表の外・右寄せ）
    mk(nameY, s.col(f.left, nameL), { noBorder: true }),
    label(nameY, s.col(nameL, codeL), '被相続人の氏名', { fontSize: 7 }),
    code(nameY, s.col(codeL, codeR), 'E01'),
    mk(nameY, s.col(codeR, nameR), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left',
      readOnly: true, navigateToForm: 'table1',
    }),
    mk(nameY, s.col(nameR, f.right), { noBorder: true }),
    mk(s.row(f.name[1], f.lead[0]), s.col(f.left, f.right), { noBorder: true }),

    label(s.row(f.lead[0], f.lead[1]), s.col(f.left, f.right), spec.lead, { fontSize: 7.5, align: 'left' }),
    mk(s.row(f.lead[1], f.band[0]), s.col(f.left, f.right), { noBorder: true }),

    ...headCells(spec, s),
    // 見出しと1組目の間の空白帯（様式に罫線が無い）
    mk(s.row(f.head[3], f.groupTops[0]!), s.col(f.left, f.right), { noBorder: true }),
    // 「財産の明細」と「分割が確定した財産」を分ける二重線
    mk(s.row(f.band[0], f.groupTops[DETAIL_GROUPS]!), s.col(f.midR, f.splitR), {}),

    ...items.flatMap((item, g) => groupCells(spec, share, s, g, item)),
  ];
}
