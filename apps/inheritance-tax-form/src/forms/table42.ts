/**
 * 相続税の申告書 第4表の2「暦年課税分の贈与税額控除額の計算書」。
 *
 * 相続開始の年の前年・前々年・前々々年に被相続人から暦年課税に係る贈与を受けていて、
 * その分の贈与税を納めている場合、二重課税を避けるためその贈与税額を相続税額から控除する。
 * 控除額㉕を人ごとに求め、第1表⑫へ転記する。
 *
 * 1枚に3人分。3つの年分（ブロック）はどれも同じ形で、
 * 特例贈与財産（措法70条の2の5第1項の適用を受ける財産）の4行と一般贈与財産の4行からなる。
 * ブロックごとに行の高さが違うだけなので、罫線は `BLOCK_Y` の12点だけを持ち、
 * 帯・見出し・各行の位置はそこから導く。
 *
 * 手入力は各ブロックの①②③・⑤⑥⑦（＝贈与税の申告書を見て書き写す欄）と提出先・年分。
 * 自動は④⑧（贈与税額を按分した控除額）と㉕（その合計）。
 * 氏名は第4表・第6表・第7表と同じ選択式（項番→氏名）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 183.5px（被相続人欄の上辺）〜下端 1690px（（注）の下辺）、
 * 左端 29.5px 〜 右端 1180.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { TAX_OFFICES, TAX_OFFICE_PREFS } from '../data/taxOffices';
import { code, label, mk } from './geometry';

export const TABLE42_FORM_CODE = 'NTA0KSE041010010';
export const TABLE42_TITLE = '相続税の申告書　第4表の2';
export const TABLE42_SUBTITLE = '暦年課税分の贈与税額控除額の計算書';
export const TABLE42_EDITION = '（平成31年1月分以降用）（R8.7）';

/** 様式の枠外に印字されている注記（第4表の2は（注）が枠内にあるので無し） */
export const TABLE42_NOTES = '';

/** 1枚に記入できる控除を受ける人の数 */
export const TABLE42_PERSONS = 3;

/** 年分（ブロック）の数。相続開始の年の前年・前々年・前々々年 */
export const TABLE42_BLOCKS = 3;

/** 1ブロックの行数（特例贈与財産4行＋一般贈与財産4行） */
export const TABLE42_ROWS = 8;

/**
 * 控除額を求める行（④⑧）の ［転記先, 贈与税額, 基礎となった価額, 合計額］。
 * ④＝③×②÷①、⑧＝⑦×⑥÷⑤ で、どちらもブロック内の相対位置は同じ。
 */
export const TABLE42_CREDIT_ROWS: readonly (readonly [number, number, number, number])[] = [
  [3, 2, 1, 0],
  [7, 6, 5, 4],
];

const TOP = 183.5;
const BOTTOM = 1690;
const LEFT = 29.5;
const RIGHT = 1180.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE42_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 縦罫線（実測px） */
const X = {
  /** 年分の帯の右端 */
  BAND: 139.5,
  /** 帯の中のLコード枠の右端 */
  LCODE: 65.5,
  /** 帯の中の元号欄の右端 */
  ERA: 102.5,
  /** 行ラベルの右端 */
  LBL: 521.5,
  /** 丸番号の右端 */
  NUM: 542.5,
  /** 被相続人欄（右上）の縦罫線 */
  DEC_L: 735, DEC_C: 862, DEC_I: 905,
} as const;

/** 人の列（3人分）の［コード枠の左端, コード枠の右端＝入力の左端, 入力の右端, 提出先の「署」の左端］ */
const P: readonly (readonly [number, number, number, number])[] = [
  [542.5, 585.5, 755.5, 712.5],
  [755.5, 797.5, 967.5, 925.5],
  [967.5, 1010.5, RIGHT, 1137.5],
];

/** 全体の行（実測px） */
const Y = {
  decedent: [TOP, 209.5],
  desc: [209.5, 247],
  name: [247, 275],
  v25: [1628, 1664.5],
  notes: [1664.5, BOTTOM],
} as const;

/**
 * ブロックごとの罫線（実測px）。並びは
 * ［提出先, 特例の見出し, ①, ②, ③, ④, 一般の見出し, ⑤, ⑥, ⑦, ⑧, 下端］の各上端。
 * ブロックによって行の高さが違うので、％への変換以外の加工はしない。
 */
const BLOCK_Y: readonly (readonly number[])[] = [
  [275, 303, 336, 372.5, 428.5, 466.5, 504, 533.5, 587, 646, 685, 720],
  [720, 753.5, 781.5, 816.5, 875.5, 916, 951, 975, 1031, 1084, 1120.5, 1157],
  [1157, 1185, 1218, 1260, 1323, 1362, 1401, 1426.5, 1475.5, 1547, 1587.5, 1628],
];

/** ブロック内の行番号（0〜7）→ 罫線の索引。特例4行は2〜5、一般4行は7〜10から始まる。 */
const rowAt = (b: number, r: number): [number, number] => {
  const y = BLOCK_Y[b]!;
  const i = r < 4 ? 2 + r : 3 + r;
  return row(y[i]!, y[i + 1]!);
};

/** ①〜㉔の丸番号（ブロック b・行 r → MARKS[b * 8 + r]） */
const MARKS = [
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧',
  '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯',
  '⑰', '⑱', '⑲', '⑳', '㉑', '㉒', '㉓', '㉔',
] as const;

/** ブロックの年分 */
const YEARS = ['前年', '前々年', '前々々年'] as const;

/** 年分の帯のLコード */
const L_CODES = ['L01', 'L02', 'L03'] as const;

/** 控除を受ける人の氏名のコード（人ごと） */
const NAME_CODES = ['E02', 'E04', 'E06'] as const;

/** ㉕のコード（人ごと） */
const V25_CODES = ['G73', 'G74', 'G75'] as const;

/** 贈与税の申告書の提出先のコード（ブロック × 人）。系列が連続していないので実測どおりに持つ */
const SUBMIT_CODES: readonly (readonly string[])[] = [
  ['E03', 'E05', 'E07'],
  ['E08', 'E09', 'E10'],
  ['E11', 'E12', 'E13'],
];

/** 全国の税務署を都道府県ごとにまとめた提出先候補。 */
const TAX_OFFICE_GROUPS: NonNullable<GridCell['optionGroups']> = TAX_OFFICE_PREFS.map((pref) => ({
  label: pref,
  options: TAX_OFFICES
    .filter((office) => office.pref === pref)
    .map((office) => ({ value: office.name, label: office.name })),
}));

const DESC = '　この表は、第14表の「1　純資産価額に加算される暦年課税分の贈与財産価額及び特定贈与財産価額の明細」欄に'
  + '記入した財産のうち相続税の課税価格に加算されるものについて、贈与税が課税されている場合に記入します。';

const NOTES = '（注）　各人の㉕欄の金額を第1表のその人の「暦年課税分の贈与税額控除額⑫」欄に転記します。';

const CAP_SPECIAL = '被相続人から暦年課税に係る贈与によって租税特別措置法第70条の2の5第1項の規定の適用を受ける財産'
  + '(特例贈与財産)を取得した場合';
const CAP_GENERAL = '被相続人から暦年課税に係る贈与によって租税特別措置法第70条の2の5第1項の規定の適用を受けない財産'
  + '(一般贈与財産)を取得した場合';

const V25_LABEL = '暦年課税分の贈与税額控除額計(円)\n（④＋⑧＋⑫＋⑯＋⑳＋㉔）';

/** ブロック内の1行の諸元 */
interface RowDef {
  label: string;
  /** 自動計算の行（④⑧） */
  auto: boolean;
}

/**
 * ブロック b の8行の諸元。ラベルはブロックの丸番号と年分で決まる。
 * 前々々年分（ブロック3）の②⑥に当たる行だけ、相続開始の日から遡って3年前の日以後に
 * 受けた贈与に限る旨の但し書きが入る（令和5年度改正で加算期間が7年に延びたことによる）。
 */
function blockRows(b: number): RowDef[] {
  const m = (r: number): string => MARKS[b * TABLE42_ROWS + r]!;
  const year = YEARS[b]!;
  const back3 = b === TABLE42_BLOCKS - 1;
  /** 特例／一般で同じ形の4行を作る（kind ＝ '特例' または '一般'） */
  const quad = (kind: string, base: number, extra: string): RowDef[] => [
    {
      label: '相続開始の年の' + year + '中に暦年課税に係る贈与によって取得した' + kind + '贈与財産の価額の合計額(円)' + extra,
      auto: false,
    },
    {
      label: back3
        ? m(base) + 'のうち相続開始の日から遡って3年前の日以後に被相続人から暦年課税に係る贈与によって取得した'
          + kind + '贈与財産の価額の合計額（円）\n'
          + '（贈与税額の計算の基礎となった価額）'
        : m(base) + 'のうち被相続人から暦年課税に係る贈与によって取得した' + kind + '贈与財産の価額の合計額（円）\n'
          + '　（贈与税額の計算の基礎となった価額）',
      auto: false,
    },
    { label: 'その年分の暦年課税分の贈与税額(円)', auto: false },
    {
      label: '控除を受ける贈与税額（円）　（' + kind + '贈与財産分）\n'
        + '　（' + m(base + 2) + '×' + m(base + 1) + '÷' + m(base) + '）',
      auto: true,
    },
  ];
  return [
    ...quad('特例', 0, ''),
    ...quad('一般', 4, '\n　（贈与税の配偶者控除後の金額）'),
  ];
}

/** 年分の帯（縦書きの見出し＋元号・年の入力＋「分）」） */
function bandCells(b: number, page: number, totals: string): GridCell[] {
  const y = BLOCK_Y[b]!;
  const p = `${totals}t42y${page}b${b}`;
  const year = YEARS[b]!;
  return [
    label(row(y[0]!, y[7]!), col(LEFT, X.BAND), '相続開始の年の' + year + '分（', { forceVertical: true, fontSize: 10 }),
    label(row(y[7]!, y[8]!), col(LEFT, X.ERA), '元号'),
    label(row(y[7]!, y[8]!), col(X.ERA, X.BAND), '年'),
    code(row(y[8]!, y[9]!), col(LEFT, X.LCODE), L_CODES[b]!),
    mk(row(y[8]!, y[9]!), col(X.LCODE, X.ERA), {
      kind: 'input', field: `${p}Era`, ariaLabel: `${year}分の元号`, options: ERA_OPTIONS,
      compactSelectedOption: true, stackedSelectedOption: true, readOnly: true, fontSize: 6.5,
    }),
    mk(row(y[8]!, y[9]!), col(X.ERA, X.BAND), {
      kind: 'input', field: `${p}Y`, ariaLabel: `${year}分の年`, align: 'center', readOnly: true,
    }),
    label(row(y[9]!, y[11]!), col(LEFT, X.BAND), '分）', { forceVertical: true, fontSize: 10 }),
  ];
}

/**
 * 第4表の2 1枚分のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 氏名の項番・提出先・年分・①②③⑤⑥⑦
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ④⑧㉕
 * @param page 何枚目か（0起点）。人の通し番号は `page * TABLE42_PERSONS + 列番号`
 * @param options 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable42(
  common: string, totals: string, page: number, options: GridCell['options'],
): GridCell[] {
  /** この用紙に載る人の通し番号 */
  const at = (j: number): number => page * TABLE42_PERSONS + j;

  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）。左側は罫線の無い余白
    mk(row(Y.decedent[0], Y.decedent[1]), col(LEFT, X.DEC_L), { noBorder: true }),
    label(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_L, X.DEC_C), '被相続人'),
    code(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_C, X.DEC_I), 'E01'),
    mk(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_I, RIGHT), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    label(row(Y.desc[0], Y.desc[1]), col(LEFT, RIGHT), DESC, { align: 'left', fontSize: 7.5 }),

    // 控除を受ける人の氏名（項番→氏名の選択式）。この行は帯・丸番号の列が無い
    label(row(Y.name[0], Y.name[1]), col(LEFT, X.NUM), '控除を受ける人の氏名'),
    ...P.flatMap(([codeL, codeR, valueR], j): GridCell[] => [
      code(row(Y.name[0], Y.name[1]), col(codeL, codeR), NAME_CODES[j]!),
      mk(row(Y.name[0], Y.name[1]), col(codeR, valueR), {
        kind: 'input', field: `${common}t42${at(j)}no`, ariaLabel: `${at(j) + 1}人目の控除を受ける人の氏名`, options, align: 'left',
      }),
    ]),

    ...Array.from({ length: TABLE42_BLOCKS }, (_unused, b) => b).flatMap((b): GridCell[] => {
      const y = BLOCK_Y[b]!;
      const year = YEARS[b]!;
      return [
        ...bandCells(b, page, totals),

        // 贈与税の申告書の提出先（署名を書く欄なので右端に「署」が印字されている）
        label(row(y[0]!, y[1]!), col(X.BAND, X.NUM), '贈与税の申告書の提出先'),
        ...P.flatMap(([codeL, codeR, valueR, signL], j): GridCell[] => [
          code(row(y[0]!, y[1]!), col(codeL, codeR), SUBMIT_CODES[b]![j]!),
          mk(row(y[0]!, y[1]!), col(codeR, signL), {
            kind: 'input', field: `${common}t42${at(j)}b${b}sub`, ariaLabel: `${at(j) + 1}人目の${year}分の贈与税の申告書の提出先`,
            optionGroups: TAX_OFFICE_GROUPS, align: 'left', fontSize: 7,
          }),
          label(row(y[0]!, y[1]!), col(signL, valueR), '署'),
        ]),

        label(row(y[1]!, y[2]!), col(X.BAND, RIGHT), CAP_SPECIAL, { align: 'left', fontSize: 7.5 }),
        label(row(y[6]!, y[7]!), col(X.BAND, RIGHT), CAP_GENERAL, { align: 'left', fontSize: 7.5 }),

        ...blockRows(b).flatMap((def, r): GridCell[] => {
          const ry = rowAt(b, r);
          const no = MARKS[b * TABLE42_ROWS + r]!;
          const name = `${no}${def.label.split('\n')[0]}`;
          return [
            label(ry, col(X.BAND, X.LBL), def.label, { align: 'left', alignItems: 'flex-start', fontSize: 7.5 }),
            label(ry, col(X.LBL, X.NUM), no, { fontSize: 10, semanticRole: 'rowheader' }),
            ...P.flatMap(([codeL, codeR, valueR], j): GridCell[] => [
              code(ry, col(codeL, codeR), `G${String(b * 24 + j * TABLE42_ROWS + r + 1).padStart(2, '0')}`),
              mk(ry, col(codeR, valueR), {
                kind: 'input',
                field: `${def.auto ? totals : common}t42${at(j)}b${b}r${r}`,
                ariaLabel: `${at(j) + 1}人目の${year}分の${name}`,
                commaInteger: true,
                readOnly: def.auto,
              }),
            ]),
          ];
        }),
      ];
    }),

    // ㉕ 暦年課税分の贈与税額控除額計（この行は帯が無く、ラベルが左端まで伸びる）
    label(row(Y.v25[0], Y.v25[1]), col(LEFT, X.LBL), V25_LABEL, { fontSize: 8 }),
    label(row(Y.v25[0], Y.v25[1]), col(X.LBL, X.NUM), '㉕', { fontSize: 10, semanticRole: 'rowheader' }),
    ...P.flatMap(([codeL, codeR, valueR], j): GridCell[] => [
      code(row(Y.v25[0], Y.v25[1]), col(codeL, codeR), V25_CODES[j]!),
      mk(row(Y.v25[0], Y.v25[1]), col(codeR, valueR), {
        kind: 'input', field: `${totals}t42${at(j)}v25`, ariaLabel: `${at(j) + 1}人目の㉕暦年課税分の贈与税額控除額計`, commaInteger: true, readOnly: true,
      }),
    ]),

    label(row(Y.notes[0], Y.notes[1]), col(LEFT, RIGHT), NOTES, { align: 'left', fontSize: 7 }),
  ];
}
