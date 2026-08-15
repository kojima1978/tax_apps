/**
 * 相続税の申告書 第7表「相次相続控除額の計算書」。
 *
 * 上半分「1 相次相続控除額の総額の計算」で前の相続の情報から総額Ⓐを求め、
 * 下半分「2 各相続人の相次相続控除額の計算」でⒶを各人の純資産価額の割合で按分する。
 *
 * 2 の (1)一般の場合 と (2)農業相続人がいる場合 は罫線が完全に同一なので、
 * 諸元（丸番号・コード系列・転記元・Ⓑ／Ⓒ）だけを差し替えて `section` を2回呼ぶ。
 * (2) は第3表が未実装のため⑮が手入力になる点だけが実質的な違い。
 *
 * 用紙に繰越欄が無く総額Ⓐが複数枚にまたがると定義できないため、枚数は常に1枚（各段5人）。
 *
 * 氏名欄は第6表・第9表と同じ選択式（項番→氏名）。⑩を第1表から自動転記するために
 * 「誰か」を確定する必要があるため。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 202.5px（被相続人欄の上辺）〜下端 1632.5px（（注）の下辺）、
 * 左端 58.5px 〜 右端 1177.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { DAY_OPTIONS, ERA_OPTIONS, ERA_YEAR_OPTIONS, MONTH_OPTIONS } from '../data/codes';
import { TAX_OFFICES, TAX_OFFICE_PREFS } from '../data/taxOffices';
import { code, label, mk } from './geometry';

export const TABLE7_FORM_CODE = 'NTA0KSE070010030';
export const TABLE7_TITLE = '相続税の申告書　第7表';
export const TABLE7_SUBTITLE = '相次相続控除額の計算書';
export const TABLE7_EDITION = '（令和6年1月分以降用）（R8.7）';

/** 様式の枠外に印字されている注記（第7表は（注）が枠内にあるので無し） */
export const TABLE7_NOTES = '';

/** 1枚に記入できる相続人の数（(1)(2) とも5人） */
export const TABLE7_ROWS = 5;

/** 相次相続控除の算式で使う年数の上限（10年−③の年数、⑩年分の10） */
export const TABLE7_SPAN = 10;

const TOP = 202.5;
const BOTTOM = 1632.5;
const LEFT = 58.5;
const RIGHT = 1177.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE7_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 全角空白1つ（テンプレートリテラルに直接書くと no-irregular-whitespace に引っかかる） */
const SP = '　';

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 「1」の各行の上下位置（実測px） */
const Y = {
  decedent: [TOP, 254.5],
  lead: [254.5, 283],
  chapter1: [283, 312.5],
  prevHead: [312.5, 349.5],
  prevVal: [349.5, 397.5],
  dateHead: [397.5, 445.5],
  dateBand: [445.5, 468],
  dateVal: [468, 520],
  /** ③④は元号帯と値の行が縦につながっている */
  span: [445.5, 520],
  amountHead: [520, 588],
  amountVal: [588, 643.5],
  formulaHead: [643.5, 670],
  /** 計算式の行（分数の上段・二重線・下段） */
  formula: [670, 726.5, 739.5, 796],
  notes: [1576, BOTTOM],
} as const;

/** 「1」の縦罫線（実測px） */
const X = {
  /** 先頭コード枠の右端（この様式のコード枠は21〜22px幅） */
  C1: 80.5,
  /** 前の相続に係る被相続人（氏名／続柄／提出先）の境と、各コード枠の右端 */
  NAME_R: 445.5, REL_C: 467.5, REL_R: 811.5, OFFICE_C: 832.5, OFFICE_R: 1090.5,
  /** ①②③④ の境と、②③④のコード枠の右端 */
  D1: 338.5, D1C: 359.5, D2: 617.5, D2C: 639.5, D3: 897.5, D3C: 918.5,
  /** ① 元号・年・月・日の右端 */
  ERA1: 144.5, YEAR1: 209.5, MONTH1: 273.5,
  /** ② 同上 */
  ERA2: 424.5, YEAR2: 488.5, MONTH2: 553.5,
  /** ③④ 「年」ラベルの左端 */
  YR3: 875.5, YR4: 1155.5,
  /** 計算式の行: ⑥の相続税額の右端／「×」の右端／分数枠の見出し・コード枠 */
  MUL: 295.5, FRAC: 316.5, FRAC_C: 402.5, FRAC_V: 424.5,
  /** 同 割合の注記の右端（＝2つ目の「×」の左端）／年数枠の左端・コード枠・入力の右端 */
  RATIO_R: 740, BOX_L: 768.5, BOX_C: 789.5, BOX_R: 854.5,
  /** 同 Ⓐの枠の右端／G11 の右端 */
  A_MARK: 918.5, A_CODE: 940.5,
  /** 被相続人欄（右上）の縦罫線 */
  DEC_L: 725.5, DEC_C: 875.5, DEC_I: 897.5,
} as const;

/** 「2」の (1)(2) 共通の縦罫線（実測px） */
const S = {
  /** 氏名のコード枠の右端／氏名の右端 */
  NAME_C: 80.5, NAME_R: 252.5,
  /** ⑨（⑭）のコード枠の右端／右端。2〜5行目が縦につながる */
  T_C: 273.5, T_R: 424.5,
  /** ⑩（⑮）のコード枠の右端／右端 */
  V_C: 445.5, V_R: 617.5,
  /** ⑪（⑯）のⒷ枠の右端／コード枠の右端／右端。5行が縦につながる */
  B_MARK: 639.5, B_C: 660.5, B_R: 811.5,
  /** ⑫（⑰）のコード枠の右端／右端 */
  R_C: 832.5, R_R: 983.5,
  /** ⑬（⑱）のコード枠の右端 */
  D_C: 1004.5,
} as const;

/** 「2」の1行の高さ（実測px） */
const ROW_H = 56.5;

const LEAD = 'この表は、被相続人が今回の相続の開始前10年以内に開始した前の相続について、'
  + '相続税を課税されている場合に記入します。';

const HEAD5 = '⑤　被相続人が前の相続の時に取得した純資産価額（円）'
  + '（相続時精算課税適用財産の価額を含みます。）';
const HEAD6 = '⑥　前の相続の際の被相続人の相続税額(円)';
const HEAD7 = '⑦　（⑤−⑥）の金額(円)';
const HEAD8 = '⑧　今回の相続、遺贈や相続時精算課税に係る贈与によって財産を取得した'
  + '全ての人の純資産価額の合計額（円）（第1表の④の合計金額）';

const LEAD1 = '（この表は、被相続人から相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人のうちに'
  + '農業相続人がいない場合に、財産を取得した相続人の全ての人が記入します。）';
const LEAD2 = '（この表は、被相続人から相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人のうちに'
  + '農業相続人がいる場合に、財産を取得した相続人の全ての人が記入します。）';

const NOTES: NonNullable<GridCell['numberedNotes']> = [
  {
    number: '1',
    body: '⑤欄の相続時精算課税適用財産の価額は、令和6年1月1日以後の贈与により取得した財産の場合、'
      + 'その贈与により取得した年分ごとに、その財産の価額から相続時精算課税に係る基礎控除額を控除した残額となります。',
  },
  {
    number: '2',
    body: '⑥欄の相続税額は、相続時精算課税分の贈与税額控除後の金額をいい、'
      + 'その被相続人が納税猶予の適用を受けていた場合の免除された相続税額並びに延滞税、利子税及び加算税の額は含まれません。',
  },
  {
    number: '3',
    body: '各人の⑬又は⑱欄の金額を第8の8表1のその人の「相次相続控除額③」欄に転記します。',
  },
];

/** 第4表の2と同じ、都道府県ごとにまとめた全国の税務署候補。 */
const TAX_OFFICE_GROUPS: NonNullable<GridCell['optionGroups']> = TAX_OFFICE_PREFS.map((pref) => ({
  label: pref,
  options: TAX_OFFICES
    .filter((office) => office.pref === pref)
    .map((office) => ({ value: office.name, label: office.name })),
}));

const ERA_START_YEARS: Readonly<Record<string, number>> = {
  '1': 1868,
  '2': 1912,
  '3': 1926,
  '4': 1989,
  '5': 2019,
};

interface EraDateParts {
  era: string;
  year: string;
  month: string;
  day: string;
}

/** 元号付き年月日を比較し、current が previous より前なら true。未入力・不正日は比較しない。 */
export function isCurrentInheritanceBeforePrevious(current: EraDateParts, previous: EraDateParts): boolean {
  const toOrdinal = ({ era, year, month, day }: EraDateParts): number | undefined => {
    const eraStart = ERA_START_YEARS[era];
    const eraYear = Number(year);
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    if (eraStart === undefined || !Number.isInteger(eraYear) || eraYear < 1
      || !Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return undefined;

    const gregorianYear = eraStart + eraYear - 1;
    const date = new Date(Date.UTC(gregorianYear, monthNumber - 1, dayNumber));
    if (date.getUTCFullYear() !== gregorianYear
      || date.getUTCMonth() !== monthNumber - 1
      || date.getUTCDate() !== dayNumber) return undefined;
    return gregorianYear * 10000 + monthNumber * 100 + dayNumber;
  };

  const currentOrdinal = toOrdinal(current);
  const previousOrdinal = toOrdinal(previous);
  return currentOrdinal !== undefined && previousOrdinal !== undefined && currentOrdinal < previousOrdinal;
}

function dateComparisonError(g: (field: string) => string, common: string): boolean {
  return isCurrentInheritanceBeforePrevious(
    {
      era: g(`${common}startEra`),
      year: g(`${common}startY`),
      month: g(`${common}startM`),
      day: g(`${common}startD`),
    },
    {
      era: g(`${common}t7pEra`),
      year: g(`${common}t7pY`),
      month: g(`${common}t7pM`),
      day: g(`${common}t7pD`),
    },
  );
}

/** 元号・年・月・日の帯（①②で割付が同じ） */
function dateBand(x: readonly [number, number, number, number, number]): GridCell[] {
  return [
    label(row(Y.dateBand[0], Y.dateBand[1]), col(x[0], x[1]), '元号'),
    label(row(Y.dateBand[0], Y.dateBand[1]), col(x[1], x[2]), '年'),
    label(row(Y.dateBand[0], Y.dateBand[1]), col(x[2], x[3]), '月'),
    label(row(Y.dateBand[0], Y.dateBand[1]), col(x[3], x[4]), '日'),
  ];
}

/**
 * 元号・年・月・日の入力（①②で割付が同じ）。
 * ②は第1表の相続開始年月日からの転記なので、元号も選択式にせず読み取り専用の表示にする。
 */
function dateValues(
  x: readonly [number, number, number, number, number, number],
  p: string, who: string, readOnly: boolean,
  validation?: Pick<GridCell, 'invalidWhen' | 'invalidMessage'>,
): GridCell[] {
  const y = row(Y.dateVal[0], Y.dateVal[1]);
  const era: Partial<GridCell> = readOnly
    ? {
        options: ERA_OPTIONS,
        compactSelectedOption: true,
        stackedSelectedOption: true,
        readOnly: true,
        align: 'center',
        fontSize: 6.5,
      }
    : { options: ERA_OPTIONS, compactSelectedOption: true };
  const year: Partial<GridCell> = readOnly
    ? { integerDigits: 2, readOnly: true }
    : { options: ERA_YEAR_OPTIONS };
  const month: Partial<GridCell> = readOnly
    ? { integerDigits: 2, readOnly: true }
    : { options: MONTH_OPTIONS };
  const day: Partial<GridCell> = readOnly
    ? { integerDigits: 2, readOnly: true }
    : { options: DAY_OPTIONS };
  return [
    mk(y, col(x[1], x[2]), { kind: 'input', field: `${p}Era`, ariaLabel: `${who}（元号）`, ...era }),
    mk(y, col(x[2], x[3]), {
      kind: 'input', field: `${p}Y`, ariaLabel: `${who}（年）`, align: 'center', ...year, ...validation,
    }),
    mk(y, col(x[3], x[4]), { kind: 'input', field: `${p}M`, ariaLabel: `${who}（月）`, align: 'center', ...month }),
    mk(y, col(x[4], x[5]), { kind: 'input', field: `${p}D`, ariaLabel: `${who}（日）`, align: 'center', ...day }),
  ];
}

/** ③④の年数欄（見出し帯と値の行が縦につながっている） */
function yearCell(left: number, codeR: number, unit: number, right: number, gCode: string, field: string, who: string): GridCell[] {
  const y = row(Y.span[0], Y.span[1]);
  return [
    code(y, col(left, codeR), gCode),
    mk(y, col(codeR, unit), { kind: 'input', field, ariaLabel: who, integerDigits: 2, align: 'center', readOnly: true }),
    label(y, col(unit, right), '年', { align: 'center' }),
  ];
}

/** ⑤⑥⑦⑧の見出しと入力（4列とも割付が同じ） */
function amountColumn(
  left: number, codeR: number, right: number, gCode: string,
  heading: string, field: string, who: string, editable: boolean,
): GridCell[] {
  return [
    label(row(Y.amountHead[0], Y.amountHead[1]), col(left, right), heading, { align: 'left', fontSize: 7.5 }),
    code(row(Y.amountVal[0], Y.amountVal[1]), col(left, codeR), gCode),
    mk(row(Y.amountVal[0], Y.amountVal[1]), col(codeR, right), {
      kind: 'input', field, ariaLabel: who, commaInteger: true, readOnly: !editable,
    }),
  ];
}

/** 相次相続控除額の総額Ⓐを求める計算式の行 */
function formulaRows(common: string, totals: string): GridCell[] {
  const [top, mid1, mid2, bottom] = Y.formula;
  const head = row(Y.formulaHead[0], Y.formulaHead[1]);
  const all = row(top, bottom);
  const upper = row(top, mid1);
  const lower = row(mid2, bottom);
  return [
    // 見出し帯。「（④の年数）」は年数枠の真上に来るので、罫線の無いラベルを重ねる
    label(head, col(LEFT, X.MUL), '（⑥の相続税額）（円）'),
    label(head, col(X.MUL, X.D3), '', { noBorderBottom: true }),
    label(head, col(X.DEC_L, X.D3), '（④の年数）', { noBorder: true }),
    label(head, col(X.D3, RIGHT), '相次相続控除額の総額(円)'),

    // ⑥の相続税額（⑥からの転記）
    code(all, col(LEFT, X.C1), 'G07'),
    mk(all, col(X.C1, X.MUL), {
      kind: 'input', field: `${common}t7v6`, ariaLabel: '⑥の相続税額', commaInteger: true, readOnly: true,
      borderRightWidth: 1,
    }),
    label(all, col(X.MUL, X.FRAC), '×', { noBorderTop: true, noBorderRight: true, borderLeftWidth: 1, forceHorizontal: true, align: 'center' }),

    // ⑧／⑦ の分数。上下の枠の間の帯が様式の二重線になる
    label(upper, col(X.FRAC, X.FRAC_C), '（⑧の金額）\n（円）', { fontSize: 7 }),
    code(upper, col(X.FRAC_C, X.FRAC_V), 'G08'),
    mk(upper, col(X.FRAC_V, X.D2), {
      kind: 'input', field: `${totals}v4`, ariaLabel: '⑧の金額', commaInteger: true, readOnly: true,
    }),
    mk(row(mid1, mid2), col(X.FRAC, X.D2), { noBorder: true }),
    label(lower, col(X.FRAC, X.FRAC_C), '（⑦の金額）\n（円）', { fontSize: 7 }),
    code(lower, col(X.FRAC_C, X.FRAC_V), 'G09'),
    mk(lower, col(X.FRAC_V, X.D2), {
      kind: 'input', field: `${totals}t7v7`, ariaLabel: '⑦の金額', commaInteger: true, readOnly: true,
    }),

    // 割合の注記 ＋ ④の年数／10年
    label(all, col(X.D2, X.RATIO_R), '（この割合が1を超\nえるときは1としま\nす。）', { noBorderTop: true, noBorderRight: true, noBorderLeft: true, fontSize: 7 }),
    label(all, col(X.RATIO_R, X.BOX_L), '×', { noBorderTop: true, noBorderRight: true, noBorderLeft: true, forceHorizontal: true, align: 'center' }),
    code(upper, col(X.BOX_L, X.BOX_C), 'G10'),
    mk(upper, col(X.BOX_C, X.BOX_R), {
      kind: 'input', field: `${totals}t7v4`, ariaLabel: '④の年数', integerDigits: 2, align: 'center', readOnly: true,
    }),
    label(upper, col(X.BOX_R, X.D3), '年', { noBorderTop: true, noBorderBottom: true, noBorderLeft: true, borderRightWidth: 1, align: 'center' }),
    label(row(mid1, mid2), col(X.BOX_L, X.BOX_R), '', { noBorder: true }),
    label(row(mid1, mid2), col(X.BOX_R, X.D3), '＝', { noBorderTop: true, noBorderBottom: true, noBorderLeft: true, borderRightWidth: 1 }),
    label(lower, col(X.BOX_L, X.BOX_R), String(TABLE7_SPAN), { noBorderTop: true, noBorderRight: true, noBorderLeft: true, borderBottomWidth: 1 }),
    label(lower, col(X.BOX_R, X.D3), '年', { noBorderTop: true, noBorderLeft: true, borderRightWidth: 1, borderBottomWidth: 1, align: 'center' }),

    // Ⓐ 相次相続控除額の総額
    label(all, col(X.D3, X.A_MARK), 'Ⓐ', { borderLeftWidth: 1, fontSize: 8, align: 'center' }),
    code(all, col(X.A_MARK, X.A_CODE), 'G11'),
    mk(all, col(X.A_CODE, RIGHT), {
      kind: 'input', field: `${totals}t7A`, ariaLabel: '相次相続控除額の総額', commaInteger: true, readOnly: true,
    }),
  ];
}

/** 「2」の1段分（(1)一般の場合／(2)農業相続人がいる場合）の諸元 */
interface Section {
  /** フィールドキーの識別子（'a'＝一般／'b'＝農業相続人） */
  k: string;
  /** 段見出しの帯 */
  head: [number, number];
  /** 列見出しの帯 */
  colHead: [number, number];
  /** 1行目の上端px */
  rowTop: number;
  /** 「2 各相続人の…」の章見出し（(1)の帯にだけ入る） */
  chapter?: string;
  title: string;
  /** 段見出しと説明文の境目のx */
  titleSplit: number;
  lead: string;
  /** Eコード（氏名欄）の起点 */
  eBase: number;
  /** Gコード（金額欄）の起点 */
  gBase: number;
  /** Cコード（割合欄）の起点 */
  cBase: number;
  /** 丸番号（総額・純資産価額・合計額・割合・控除額） */
  nos: readonly [string, string, string, string, string];
  /** 合計額の欄に印字されている記号 */
  mark: string;
  /** 純資産価額の転記元（第1表／第3表） */
  src: string;
  /** 純資産価額が手入力か（第3表が未実装の(2)だけ true） */
  editable: boolean;
  /** 未対応の氏名欄は既存フィールドを維持したまま入力不可にする */
  readOnlyName?: boolean;
  /** 未対応の純資産価額欄は既存フィールドを維持したまま入力不可にする */
  readOnlyValue?: boolean;
  /** 純資産価額のフィールドキー（(1)は自動転記の⑩、(2)は手入力の⑮。割合と控除額は両段とも v12・v13） */
  valueKey: string;
  /** 合計額（Ⓑ／Ⓒ）のフィールド */
  totalField: string;
}

/** 「2」の1段を組み立てる */
function section(s: Section, common: string, totals: string, options: GridCell['options']): GridCell[] {
  const head = row(s.head[0], s.head[1]);
  const colHead = row(s.colHead[0], s.colHead[1]);
  const [no9, no10, no11, no12, no13] = s.nos;
  const p = (i: number) => `${common}t7${s.k}${i}`;
  const t = (i: number) => `${totals}t7${s.k}${i}`;
  const rowY = (i: number): [number, number] => row(s.rowTop + ROW_H * i, s.rowTop + ROW_H * (i + 1));
  const allRows = row(s.rowTop, s.rowTop + ROW_H * TABLE7_ROWS);
  const restRows = row(s.rowTop + ROW_H, s.rowTop + ROW_H * TABLE7_ROWS);

  return [
    // 段見出し（章見出しがある(1)は上下2段に分けるが、様式に区切りの罫線は無い）
    mk(head, col(LEFT, RIGHT), {}),
    ...(s.chapter === undefined ? [] : [
      label(row(s.head[0], s.head[0] + 28), col(LEFT, RIGHT), s.chapter, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    ]),
    label(row(s.chapter === undefined ? s.head[0] : s.head[0] + 28, s.head[1]), col(LEFT, s.titleSplit), s.title, { noBorder: true, bold: true, fontSize: 8.5 }),
    label(row(s.chapter === undefined ? s.head[0] : s.head[0] + 28, s.head[1]), col(s.titleSplit, RIGHT), s.lead, { noBorder: true, align: 'left', fontSize: 7 }),

    // 列見出し
    label(colHead, col(LEFT, S.NAME_R), '今回の相続の被相続人から財産を\n取得した相続人の氏名', { align: 'left', fontSize: 7.5 }),
    label(colHead, col(S.NAME_R, S.T_R), no9 + SP + '相次相続控除額の総額\n' + SP + SP + '（円）', { align: 'left', fontSize: 7.5 }),
    label(colHead, col(S.T_R, S.V_R), no10 + SP + '各相続人の純資産価額(円)\n' + SP + SP + '（' + s.src + 'の各人の④の金額）', { align: 'left', fontSize: 7.5 }),
    label(colHead, col(S.V_R, S.B_R), no11 + SP + '相続人以外の人も含めた純資産\n' + SP + SP + '価額の合計額（円）（' + s.src + 'の\n' + SP + SP + '④の各人の合計）', { align: 'left', fontSize: 7.5 }),
    label(colHead, col(S.B_R, S.R_R), SP.repeat(2) + '各人の' + no10 + '\n' + SP + SP + '――――――' + SP + 'の割合\n' + SP.repeat(4) + s.mark, { align: 'left', fontSize: 7.5, centeredPrefix: no12 }),
    label(colHead, col(S.R_R, RIGHT), no13 + SP + '各人の相次相続控除額(円)\n' + SP + SP + '（' + no9 + '×各人の' + no12 + 'の割合）', { align: 'left', fontSize: 7.5 }),

    // 相続人の氏名（項番→氏名の選択式）
    ...Array.from({ length: TABLE7_ROWS }, (_, i): GridCell[] => [
      code(rowY(i), col(LEFT, S.NAME_C), cd('E', s.eBase + i)),
      mk(rowY(i), col(S.NAME_C, S.NAME_R), {
        kind: 'input', field: `${p(i)}no`, ariaLabel: `${s.title}${i + 1}行目の相続人の氏名`, options, align: 'left',
        readOnly: s.readOnlyName,
      }),
    ]).flat(),

    // 総額（Ⓐからの転記）。1行目は「（上記Ⓐの金額）」の注記で、記入欄は2〜5行目の縦結合
    label(rowY(0), col(S.NAME_R, S.T_R), '（上記Ⓐの金額）', { fontSize: 7.5 }),
    code(restRows, col(S.NAME_R, S.T_C), cd('G', s.gBase)),
    mk(restRows, col(S.T_C, S.T_R), {
      kind: 'input', field: `${totals}t7A`, ariaLabel: `${no9}相次相続控除額の総額`, commaInteger: true, readOnly: true,
    }),

    // 各相続人の純資産価額
    ...Array.from({ length: TABLE7_ROWS }, (_, i): GridCell[] => [
      code(rowY(i), col(S.T_R, S.V_C), cd('G', i === 0 ? s.gBase + 1 : s.gBase + 2 + 2 * i)),
      mk(rowY(i), col(S.V_C, S.V_R), {
        kind: 'input',
        field: (s.editable ? p(i) : t(i)) + s.valueKey,
        ariaLabel: `${s.title}${i + 1}行目の${no10}各相続人の純資産価額`,
        commaInteger: true,
        readOnly: s.readOnlyValue ?? !s.editable,
      }),
    ]).flat(),

    // 純資産価額の合計額（5行の縦結合）
    label(allRows, col(S.V_R, S.B_MARK), s.mark, { fontSize: 8, align: 'center' }),
    code(allRows, col(S.B_MARK, S.B_C), cd('G', s.gBase + 2)),
    mk(allRows, col(S.B_C, S.B_R), {
      kind: 'input', field: s.totalField, ariaLabel: `${no11}純資産価額の合計額`, commaInteger: true, readOnly: true,
    }),

    // 割合・各人の相次相続控除額
    ...Array.from({ length: TABLE7_ROWS }, (_, i): GridCell[] => [
      code(rowY(i), col(S.B_R, S.R_C), cd('C', s.cBase + i)),
      mk(rowY(i), col(S.R_C, S.R_R), {
        kind: 'input', field: `${t(i)}v12`, ariaLabel: `${s.title}${i + 1}行目の${no12}割合`, decimalPlaces: 2, align: 'center', readOnly: true,
      }),
      code(rowY(i), col(S.R_R, S.D_C), cd('G', s.gBase + 3 + 2 * i)),
      mk(rowY(i), col(S.D_C, RIGHT), {
        kind: 'input', field: `${t(i)}v13`, ariaLabel: `${s.title}${i + 1}行目の${no13}相次相続控除額`, commaInteger: true, readOnly: true,
      }),
    ]).flat(),
  ];
}

/**
 * 第7表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 前の相続の情報・⑤⑥・氏名の項番・(2)の⑮
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ③④⑦Ⓐと各人の⑩⑫⑬
 * @param options 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable7(common: string, totals: string, options: GridCell['options']): GridCell[] {
  const general: Section = {
    k: 'a',
    head: [796, 856.5],
    colHead: [856.5, 912],
    rowTop: 912,
    chapter: '2　各相続人の相次相続控除額の計算',
    title: '(1)　一般の場合',
    titleSplit: S.NAME_R,
    lead: LEAD1,
    eBase: 5,
    gBase: 12,
    cBase: 1,
    nos: ['⑨', '⑩', '⑪', '⑫', '⑬'],
    mark: 'Ⓑ',
    src: '第1表',
    editable: false,
    valueKey: 'v10',
    totalField: `${totals}v4`,
  };
  const farm: Section = {
    k: 'b',
    head: [1194.5, 1242.5],
    colHead: [1242.5, 1293.5],
    rowTop: 1293.5,
    title: '(2)　相続人のうちに農業相続人がいる場合',
    titleSplit: S.T_R,
    lead: LEAD2,
    eBase: 10,
    gBase: 24,
    cBase: 6,
    nos: ['⑭', '⑮', '⑯', '⑰', '⑱'],
    mark: 'Ⓒ',
    src: '第3表',
    editable: true,
    readOnlyName: true,
    readOnlyValue: true,
    valueKey: 'v15',
    totalField: `${totals}t7C`,
  };
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）。左側は罫線の無い余白
    mk(row(Y.decedent[0], Y.decedent[1]), col(LEFT, X.DEC_L), { noBorder: true }),
    label(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_L, X.DEC_C), '被相続人'),
    code(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_C, X.DEC_I), 'E01'),
    mk(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_I, RIGHT), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    label(row(Y.lead[0], Y.lead[1]), col(LEFT, RIGHT), LEAD, { align: 'left', fontSize: 7.5 }),
    label(row(Y.chapter1[0], Y.chapter1[1]), col(LEFT, RIGHT), '1　相次相続控除額の総額の計算', { align: 'left', bold: true, fontSize: 9 }),

    // 前の相続に係る被相続人の氏名・続柄・申告書の提出先
    label(row(Y.prevHead[0], Y.prevHead[1]), col(LEFT, X.NAME_R), '前の相続に係る被相続人の氏名'),
    label(row(Y.prevHead[0], Y.prevHead[1]), col(X.NAME_R, X.REL_R), '前の相続に係る被相続人と今回の相続に係る被相続人との続柄', { noWrap: true }),
    label(row(Y.prevHead[0], Y.prevHead[1]), col(X.REL_R, RIGHT), '前の相続に係る相続税の申告書の提出先'),
    code(row(Y.prevVal[0], Y.prevVal[1]), col(LEFT, X.C1), 'E02'),
    mk(row(Y.prevVal[0], Y.prevVal[1]), col(X.C1, X.NAME_R), {
      kind: 'input', field: `${common}t7pName`, ariaLabel: '前の相続に係る被相続人の氏名', align: 'left',
    }),
    code(row(Y.prevVal[0], Y.prevVal[1]), col(X.NAME_R, X.REL_C), 'E03'),
    mk(row(Y.prevVal[0], Y.prevVal[1]), col(X.REL_C, X.REL_R), {
      kind: 'input', field: `${common}t7pRelation`, ariaLabel: '前の相続に係る被相続人と今回の相続に係る被相続人との続柄', align: 'left',
    }),
    code(row(Y.prevVal[0], Y.prevVal[1]), col(X.REL_R, X.OFFICE_C), 'E04'),
    mk(row(Y.prevVal[0], Y.prevVal[1]), col(X.OFFICE_C, X.OFFICE_R), {
      kind: 'input', field: `${common}t7pOffice`, ariaLabel: '前の相続に係る相続税の申告書の提出先',
      optionGroups: TAX_OFFICE_GROUPS, align: 'left', fontSize: 7,
    }),
    label(row(Y.prevVal[0], Y.prevVal[1]), col(X.OFFICE_R, RIGHT), '署'),

    // ①②③④ の見出し
    label(row(Y.dateHead[0], Y.dateHead[1]), col(LEFT, X.D1), '①　前の相続の年月日', { align: 'left' }),
    label(row(Y.dateHead[0], Y.dateHead[1]), col(X.D1, X.D2), '②　今回の相続の年月日', { align: 'left' }),
    label(row(Y.dateHead[0], Y.dateHead[1]), col(X.D2, X.D3), '③　前の相続から今回の相続までの期間\n　　（1年未満切捨て）', { align: 'left' }),
    label(row(Y.dateHead[0], Y.dateHead[1]), col(X.D3, RIGHT), '④' + SP + TABLE7_SPAN + '年−③の年数', { align: 'left' }),

    // ① 前の相続の年月日（手入力）
    ...dateBand([LEFT, X.ERA1, X.YEAR1, X.MONTH1, X.D1]),
    code(row(Y.dateVal[0], Y.dateVal[1]), col(LEFT, X.C1), 'N01'),
    ...dateValues(
      [LEFT, X.C1, X.ERA1, X.YEAR1, X.MONTH1, X.D1],
      `${common}t7p`,
      '前の相続の年月日',
      false,
      {
        invalidWhen: (g) => dateComparisonError(g, common),
        invalidMessage: '②今回の相続の年月日が①前の相続の年月日より前になっています。',
      },
    ),

    // ② 今回の相続の年月日（第1表の相続開始年月日からの転記）
    ...dateBand([X.D1, X.ERA2, X.YEAR2, X.MONTH2, X.D2]),
    code(row(Y.dateVal[0], Y.dateVal[1]), col(X.D1, X.D1C), 'N02', { fontSize: 5 }),
    ...dateValues([X.D1, X.D1C, X.ERA2, X.YEAR2, X.MONTH2, X.D2], `${common}start`, '今回の相続の年月日', true),

    // ③④ の年数（自動計算）
    ...yearCell(X.D2, X.D2C, X.YR3, X.D3, 'G01', `${totals}t7v3`, '③前の相続から今回の相続までの期間'),
    ...yearCell(X.D3, X.D3C, X.YR4, RIGHT, 'G02', `${totals}t7v4`, `④${TABLE7_SPAN}年−③の年数`),

    // ⑤⑥⑦⑧
    ...amountColumn(LEFT, X.C1, X.D1, 'G03', HEAD5, `${common}t7v5`, '⑤被相続人が前の相続の時に取得した純資産価額', true),
    ...amountColumn(X.D1, X.D1C, X.D2, 'G04', HEAD6, `${common}t7v6`, '⑥前の相続の際の被相続人の相続税額', true),
    ...amountColumn(X.D2, X.D2C, X.D3, 'G05', HEAD7, `${totals}t7v7`, '⑦（⑤−⑥）の金額', false),
    ...amountColumn(X.D3, X.D3C, RIGHT, 'G06', HEAD8, `${totals}v4`, '⑧財産を取得した全ての人の純資産価額の合計額', false),

    ...formulaRows(common, totals),

    ...section(general, common, totals, options),
    ...section(farm, common, totals, options),

    mk(row(Y.notes[0], Y.notes[1]), col(LEFT, RIGHT), {
      kind: 'label',
      align: 'left',
      fontSize: 6.5,
      numberedNotes: NOTES,
    }),
  ];
}
