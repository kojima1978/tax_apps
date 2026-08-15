/**
 * 相続税の申告書 第15表（相続財産の種類別価額表）と第15表（続）。
 *
 * 罫線・行の並び・識別コードは2様式で完全に一致し、違うのは左列の見出しだけ
 * （第15表は「各人の合計」、（続）は財産を取得した人の氏名）。そのため
 * 1つの `buildTable15` に列の指定を渡す形にしてある。
 *
 * 座標は様式PNG（150dpi）の実測px。上端 195px（被相続人欄の上辺）〜下端 1629px（表の下辺）、
 * 左端 78.5px 〜 右端 1156.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE15_FORM_CODE = 'NTA0KSE150010030';
export const TABLE15CONT_FORM_CODE = 'NTA0KSE151010030';
export const TABLE15_TITLE = '相続税の申告書　第15表';
export const TABLE15CONT_TITLE = '相続税の申告書　第15表（続）';
export const TABLE15_SUBTITLE = '相続財産の種類別価額表';
export const TABLE15CONT_SUBTITLE = '相続財産の種類別価額表（続）';
export const TABLE15_EDITION = '（令和6年1月分以降用）（R8.7）';
export const TABLE15_ASPECT = '1078 / 1434';

/** （続）1枚に載る人数 */
export const TABLE15CONT_PERSONS = 2;

const TOP = 195;
const BOTTOM = 1629;
const LEFT = 78.5;
const RIGHT = 1156.5;

/** 実測px → ％（縦） */
const row = (a: number, b: number): [number, number] => [
  ((a - TOP) / (BOTTOM - TOP)) * 100,
  ((b - TOP) / (BOTTOM - TOP)) * 100,
];
/** 実測px → ％（横） */
const col = (a: number, b: number): [number, number] => [
  ((a - LEFT) / (RIGHT - LEFT)) * 100,
  ((b - LEFT) / (RIGHT - LEFT)) * 100,
];

/** 縦罫線の実測px */
const X = {
  L: LEFT,        // 表の左端
  KIND: 103.5,    // 「種類」帯の右端
  SUB_A: 152.5,   // ⑧⑨の小見出し「⑥のうち特例農地等」の右端
  SUB_B: 176.5,   // ⑰⑱の小見出し「特定同族会社の株式及び出資」の右端
  NO: 299.5,      // 「細目」列の右端 ＝ 丸番号列の左端
  CODE_L: 323.5,  // 丸番号列の右端 ＝ 左列コード枠の左端 ＝「被相続人」欄の左端
  AMT_L: 348.5,   // 左列コード枠の右端
  NAME_L: 421.5,  // （続）左列「氏名」ラベルの右端
  NAME_LC: 446.5, // （続）左列 氏名コード枠の右端 ＝「被相続人」ラベルの右端
  DEC_C: 470.5,   // 被相続人 E01 コード枠の右端
  MID: 740.5,     // 左列の右端 ＝ 右列コード枠の左端 ＝「被相続人」入力の右端
  CODE_R: 764.5,  // 右列コード枠の右端
  NAME_R: 838.5,  // 右列「氏名」ラベルの右端
  NAME_RC: 862.5, // 右列 氏名コード枠の右端
  R: RIGHT,       // 表の右端
} as const;

/** 表頭（233px）と38行分の横罫線の実測px */
const HEAD_TOP = 233;
const ROW_Y = [
  289.5, 325, 360, 395.5, 430.5, 466, 501, 536.5, 571.5, 607, 642, 677.5, 712.5,
  748, 783, 818.5, 853.5, 889, 924, 959.5, 994.5, 1030, 1065, 1100.5, 1135.5,
  1171, 1206, 1241.5, 1276.5, 1312, 1347, 1382.5, 1417.5, 1453, 1488, 1523.5,
  1558.5, 1594, 1629,
] as const;

interface Table15Row {
  /** 丸番号（付表のコード表が転記先をこの記号で持っている） */
  no: string;
  /** 「細目」欄の印字 */
  label: string;
  /** この行から下 `rows` 行分の「種類」帯 */
  band?: {
    text?: string;
    rows: number;
    /**
     * 「家屋等」だけは帯に文字を入れず、帯と「細目」の間に罫線を引かずに
     * 左端から広げて印字されている。帯は空のマスにして、文字は枠なしで重ねる。
     */
    spread?: boolean;
  };
  /** 「細目」欄が「種類」帯の位置まで広がっている行（帯を持たない行） */
  wide?: boolean;
  /** 「細目」欄の中の小見出し（この行から下 `rows` 行分） */
  sub?: { text: string; rows: number };
  /** 小見出しを持つ組の行（印字はその右側から始まる） */
  subX?: number;
  /** 様式に算式が印字されている自動計算行 */
  auto?: boolean;
  /** 末尾にあらかじめ「000」が印字されている欄（千円単位で保持する） */
  zeros?: boolean;
}

/** ①〜㊳の行定義（添字＋1が行番号＝識別コードの番号） */
const ROWS: Table15Row[] = [
  { no: '①', label: '田', band: { text: '土地（土地の上に存する権利を含みます。）', rows: 9 } },
  { no: '②', label: '畑' },
  { no: '③', label: '宅地' },
  { no: '④', label: '山林' },
  { no: '⑤', label: 'その他の土地' },
  { no: '⑥', label: '計', auto: true },
  { no: '⑦', label: '③のうち配偶者居住権に基づく敷地利用権' },
  { no: '⑧', label: '通常価額', sub: { text: '⑥のうち特例農地等', rows: 2 }, subX: X.SUB_A },
  { no: '⑨', label: '農業投資価格による価額', subX: X.SUB_A },
  { no: '⑩', label: '家屋等', band: { rows: 2, spread: true } },
  { no: '⑪', label: '⑩のうち配偶者居住権' },
  { no: '⑫', label: '機械、器具、農耕具、その他の減価償却資産', band: { text: '事業（農業）用財産', rows: 5 } },
  { no: '⑬', label: '商品、製品、半製品、原材料、農産物等' },
  { no: '⑭', label: '売掛金' },
  { no: '⑮', label: 'その他の財産' },
  { no: '⑯', label: '計', auto: true },
  { no: '⑰', label: '配当還元方式によったもの', band: { text: '有価証券', rows: 6 }, sub: { text: '特定同族会社の株式及び出資', rows: 2 }, subX: X.SUB_B },
  { no: '⑱', label: 'その他の方式によったもの', subX: X.SUB_B },
  { no: '⑲', label: '⑰及び⑱以外の株式及び出資' },
  { no: '⑳', label: '公債及び社債' },
  { no: '㉑', label: '証券投資信託、貸付信託の受益証券' },
  { no: '㉒', label: '計', auto: true },
  { no: '㉓', label: '現金、預貯金等', wide: true },
  { no: '㉔', label: '家庭用財産', wide: true },
  { no: '㉕', label: '生命保険金等', band: { text: 'その他の財産', rows: 5 } },
  { no: '㉖', label: '退職手当金等' },
  { no: '㉗', label: '立木' },
  { no: '㉘', label: 'その他' },
  { no: '㉙', label: '計', auto: true },
  { no: '㉚', label: '合計（⑥＋⑩＋⑯＋㉒＋㉓＋㉔＋㉙）', wide: true, auto: true },
  { no: '㉛', label: '相続時精算課税適用財産の価額', wide: true },
  { no: '㉜', label: '不動産等の価額（⑥＋⑩＋⑫＋⑰＋⑱＋㉗）', wide: true, auto: true },
  { no: '㉝', label: '債務', band: { text: '債務等', rows: 3 } },
  { no: '㉞', label: '葬式費用' },
  { no: '㉟', label: '合計（㉝＋㉞）', auto: true },
  { no: '㊱', label: '差引純資産価額（㉚＋㉛−㉟）\n（赤字のときは0）', wide: true, auto: true },
  { no: '㊲', label: '純資産価額に加算される\n暦年課税分の贈与財産価額', wide: true },
  { no: '㊳', label: '課税価格（㊱＋㊲）\n（1,000円未満切捨て）', wide: true, auto: true, zeros: true },
];

/** 行番号（1始まり）→ フィールドキー */
export const table15Key = (n: number): string => `t15v${n}`;

/** 「各人の合計」列に横計で集計する欄 */
export const TABLE15_KEYS: string[] = ROWS.map((_, i) => table15Key(i + 1));

/**
 * 丸番号 → フィールドキー。付表のコード表（`detailCodes.ts`）が転記先を
 * 丸番号で持っているため、転記はこの表を通して行キーに直す。
 */
export const TABLE15_KEY_BY_MARK: Record<string, string> = Object.fromEntries(
  ROWS.map((r, i) => [r.no, table15Key(i + 1)]),
);

/** 様式1枚の1列（値の入る列） */
export interface Table15Column {
  /** 値のフィールド接頭辞（'t.' ＝ 各人の合計、'h1.' ＝ 財産を取得した人） */
  prefix: string;
  /** アクセシブル名の主語（「各人の合計」「2人目」など） */
  label: string;
  /** 人の列の氏名欄の識別コード（「各人の合計」列は見出しだけなので省略する） */
  nameCode?: string;
}

/** 行1本分の上下（％） */
const rowY = (n: number): [number, number] => row(ROW_Y[n - 1]!, ROW_Y[n]!);
/** 行 n から `rows` 行分の上下（％） */
const spanY = (n: number, rows: number): [number, number] => row(ROW_Y[n - 1]!, ROW_Y[n - 1 + rows]!);

/** 「種類」帯と「細目」欄 */
function labelCells(r: Table15Row, n: number): GridCell[] {
  const y = rowY(n);
  const cells: GridCell[] = [];
  if (r.band) {
    const band = spanY(n, r.band.rows);
    cells.push(r.band.spread
      ? mk(band, col(X.L, X.KIND), {})
      : label(band, col(X.L, X.KIND), r.band.text ?? ''));
  }
  if (r.band?.spread) {
    cells.push(mk(y, col(X.KIND, X.NO), {}), label(y, col(X.L, X.NO), r.label, { noBorder: true }));
  } else if (r.wide) {
    cells.push(label(y, col(X.L, X.NO), r.label));
  } else {
    if (r.sub) cells.push(label(spanY(n, r.sub.rows), col(X.KIND, r.subX!), r.sub.text));
    cells.push(label(y, col(r.subX ?? X.KIND, X.NO), r.label));
  }
  return cells;
}

/** 金額欄（代償財産で負数になり得るので △ を表示できる形式にする） */
function valueCell(column: Table15Column, r: Table15Row, n: number, readOnly: boolean): Partial<GridCell> {
  return {
    kind: 'input',
    field: `${column.prefix}${table15Key(n)}`,
    ariaLabel: `${column.label} ${r.no}${r.label.split('\n')[0]}`,
    signedCommaInteger: true,
    readOnly,
    ...(r.zeros ? { rightLabel: '000' } : {}),
  };
}

/** 表頭の氏名欄（（続）の左列・両様式の右列） */
function nameCells(
  column: Table15Column, xs: readonly [number, number, number, number],
): GridCell[] {
  const y = row(HEAD_TOP, ROW_Y[0]!);
  return [
    label(y, col(xs[0], xs[1]), '氏名'),
    code(y, col(xs[1], xs[2]), column.nameCode ?? ''),
    mk(y, col(xs[2], xs[3]), {
      kind: 'input', field: `${column.prefix}name`, ariaLabel: `${column.label}の氏名`,
      align: 'left', fontSize: 10, readOnly: true,
    }),
  ];
}

/**
 * 第15表・第15表（続）のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）
 * @param columns 左列・右列。第15表の左列は「各人の合計」、（続）は2人分の人の列。
 * @param transferred 他の様式からの転記になっている欄（丸番号）。読み取り専用にする。
 */
export function buildTable15(
  common: string,
  columns: readonly [Table15Column, Table15Column],
  transferred: ReadonlySet<string>,
): GridCell[] {
  const [left, right] = columns;
  const headY = row(HEAD_TOP, ROW_Y[0]!);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(TOP, HEAD_TOP), col(X.L, X.CODE_L), '（単位：円）', { noBorder: true, align: 'left' }),
    label(row(TOP, HEAD_TOP), col(X.CODE_L, X.NAME_LC), '被相続人'),
    code(row(TOP, HEAD_TOP), col(X.NAME_LC, X.DEC_C), 'E01'),
    mk(row(TOP, HEAD_TOP), col(X.DEC_C, X.MID), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    // 表頭
    label(headY, col(X.L, X.KIND), '種類'),
    label(headY, col(X.KIND, X.NO), '細目'),
    label(headY, col(X.NO, X.CODE_L), '番号'),
    ...(left.nameCode === undefined
      ? [label(headY, col(X.CODE_L, X.MID), left.label)]
      : nameCells(left, [X.CODE_L, X.NAME_L, X.NAME_LC, X.MID])),
    ...nameCells(right, [X.MID, X.NAME_R, X.NAME_RC, X.R]),

    // ①〜㊳
    ...ROWS.flatMap((r, i): GridCell[] => {
      const n = i + 1;
      const y = rowY(n);
      const readOnly = r.auto === true || transferred.has(r.no);
      const g = (offset: number) => `G${String(n + offset).padStart(2, '0')}`;
      return [
        ...labelCells(r, n),
        label(y, col(X.NO, X.CODE_L), r.no, { fontSize: 9, semanticRole: 'rowheader' }),
        code(y, col(X.CODE_L, X.AMT_L), g(0)),
        mk(y, col(X.AMT_L, X.MID), valueCell(left, r, n, readOnly)),
        code(y, col(X.MID, X.CODE_R), g(ROWS.length)),
        mk(y, col(X.CODE_R, X.R), valueCell(right, r, n, readOnly)),
      ];
    }),
  ];
}
