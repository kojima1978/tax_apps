/**
 * 相続税の申告書 第6表「未成年者控除額・障害者控除額の計算書」。
 *
 * 「1 未成年者控除」と「2 障害者控除」は、控除額の算式（18歳／85歳、10万円／20万円）と
 * ③⑤が第8の8表1を引くかどうかが違うだけで**列の割付は完全に同じ**なので、
 * 1つのブロックビルダー（`block`）に諸元を渡して2回呼ぶ。
 * 違いは障害者側にだけある「一般障害者／特別障害者」の区分見出し行（`groups`）と、
 * 行の高さ（③が69対91、⑤が69対92）で、高さは比例しないので y は段ごとに実測値で持つ。
 *
 * 1枚に 未成年者3人・その扶養義務者3人・障害者3人（一般2＋特別1）・その扶養義務者3人。
 * 用紙に繰越欄が無く計Ⓐが複数枚にまたがると定義できないため、枚数は常に1枚。
 *
 * 氏名欄は第9表・第13表と同じ選択式（項番→氏名）。見た目の都合ではなく、
 * ③⑤の相続税額を第1表から自動転記するために「誰か」を確定する必要があるため。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 184.5px（被相続人欄の上辺）〜下端 1654.5px（下段の（注）の下辺）、
 * 左端 106px 〜 右端 1182.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE6_FORM_CODE = 'NTA0KSE060010030';
export const TABLE6_TITLE = '相続税の申告書　第6表';
export const TABLE6_SUBTITLE = '未成年者控除額・障害者控除額の計算書';
export const TABLE6_EDITION = '（令和5年1月分以降用）（R8.7）';

/** 1枚に記入できる人数（未成年者・障害者・扶養義務者とも3人） */
export const TABLE6_COLS = 3;

/** 未成年者控除の基準年齢と、1年あたりの控除額（万円） */
export const TABLE6_MINOR_AGE = 18;
export const TABLE6_MINOR_RATE = 10;
/** 障害者控除の基準年齢と、1年あたりの控除額（万円。一般障害者／特別障害者） */
export const TABLE6_DISABLED_AGE = 85;
export const TABLE6_DISABLED_RATE = 10;
export const TABLE6_SPECIAL_RATE = 20;

const TOP = 184.5;
const BOTTOM = 1654.5;
const LEFT = 106;
const RIGHT = 1182.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE6_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 行見出しと丸番号の列 */
const HX = {
  LBL: 268,   // 丸番号のある行の見出しの右端
  NUM: 288.5, // 丸番号の右端 ＝ 氏名行の見出しの右端
} as const;

/** 人の列（3列）の縦罫線。②欄だけ「10万円×(18歳−□歳)」を1マスに詰め込むので分割が多い。 */
interface Column {
  /** コード枠の左端 */
  code: number;
  /** コード枠の右端 ＝ 入力の左端 */
  left: number;
  /** 列の右端 */
  right: number;
  /** 「歳」ラベルの左端（①の年齢・②の年齢） */
  unit: number;
  /** ②上段「10万円×(18歳−」の右端 ＝ コード枠の左端 */
  fCode: number;
  /** 同 コード枠の右端 ＝ 年齢の左端 */
  fVal: number;
  /** ②下段「＝」の右端 ＝ コード枠の左端 */
  eq: number;
  /** 同 コード枠の右端 ＝ 控除額の左端 */
  eCode: number;
}

const COLS: readonly Column[] = [
  { code: 288.5, left: 329, right: 511, unit: 491, fCode: 410, fVal: 450.5, eq: 308.5, eCode: 349 },
  { code: 511, left: 551.5, right: 734, unit: 713.5, fCode: 632.5, fVal: 673, eq: 531.5, eCode: 572 },
  { code: 734, left: 774.5, right: 956.5, unit: 936.5, fCode: 855.5, fVal: 896, eq: 754, eCode: 794.5 },
];

/** 「計」の列。④だけⒶの枠が入る分だけ内訳が違う。 */
const TX = {
  CODE: 956.5,  // コード枠の左端
  LEFT: 997,    // コード枠の右端 ＝ 入力の左端
  MARK: 977,    // ④「計Ⓐ」の枠の右端
  ACODE: 1017.5,// ④のコード枠の右端 ＝ 入力の左端
} as const;

/** 被相続人欄（右上）の縦罫線 */
const DX = { L: 734, CODE: 855.5, INPUT: 896 } as const;

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

const HEAD1 = '1　未成年者控除';
const LEAD1 = '（この表は、相続、遺贈や相続時精算課税に係る贈与によって財産を取得した法定相続人のうちに、'
  + '満18歳にならない人がいる場合に記入します。）';
const HEAD2 = '2　障害者控除';
const LEAD2 = '（この表は、相続、遺贈や相続時精算課税に係る贈与によって財産を取得した法定相続人のうちに、'
  + '一般障害者又は特別障害者がいる場合に記入します。）';

/** ③・⑤の見出し（第1表の算式部分は両段で共通） */
const BALANCE = '（⑨＋⑪−⑫−⑬）\n又は（⑩＋⑪−⑫−⑬）';
const BALANCE2 = '（⑨＋⑪−⑫−⑬）−第8の8表1の①\n又は（⑩＋⑪−⑫−⑬）−第8の8表1の①';

const NOTES1 = '（注）　1　過去に未成年者控除の適用を受けた人は、控除額が制限されることがありますので、'
  + '「相続税の申告のしかた」をご覧ください。\n'
  + '　　　　2　②欄の金額と③欄の金額のいずれか少ない方の金額を、第8の8表1のその未成年者の'
  + '「未成年者控除額①」欄に転記します。\n'
  + '　　　　3　②欄の金額が③欄の金額を超える人は、その超える金額（②−③の金額）を次の④欄に記入します。';
const NOTES2 = '（注）　1　過去に障害者控除の適用を受けた人の控除額は、②欄により計算した金額とは異なりますので、'
  + '税務署にお尋ねください。\n'
  + '　　　　2　②欄の金額と③欄の金額のいずれか少ない方の金額を、第8の8表1のその障害者の'
  + '「障害者控除額②」欄に転記します。\n'
  + '　　　　3　②欄の金額が③欄の金額を超える人は、その超える金額（②−③の金額）を次の④欄に記入します。';

/** 全角空白1つ（テンプレートリテラルに直接書くと no-irregular-whitespace に引っかかる） */
const INDENT = '　';

/** 様式の枠外に印字されている注記（第6表は枠外注記が無い） */
export const TABLE6_NOTES = '';

/** 段ごとの行位置（実測px）。上下段で比例しないので実測値をそのまま持つ。 */
interface BlockY {
  /** 章見出し＋説明文 */
  head: [number, number];
  /** 区分見出し（一般障害者／特別障害者／計）。障害者の段だけ */
  groups?: [number, number];
  /** 未成年者（障害者）の氏名 */
  name: [number, number];
  /** ① 年齢 */
  age: [number, number];
  /** ② 控除額（上段・下段の境・下端） */
  calc: [number, number, number];
  /** ③ 第1表の相続税額 */
  tax: [number, number];
  /** ③の下の（注）1〜3 */
  notes: [number, number];
  /** ④ 控除しきれない金額 */
  left: [number, number];
  /** （扶養義務者の相続税額から控除する〜）の説明 */
  share: [number, number];
  /** 扶養義務者の氏名 */
  sname: [number, number];
  /** ⑤ 扶養義務者の第1表の相続税額 */
  tax5: [number, number];
  /** ⑥ 控除額 */
  ded: [number, number];
  /** ⑥の下の（注） */
  note6: [number, number];
}

/** 上段（未成年者控除）・下段（障害者控除）の諸元 */
interface Block {
  /** Eコード（氏名欄）の起点 */
  eBase: number;
  /** Gコード（計算欄）の起点 */
  gBase: number;
  head: string;
  lead: string;
  /** 章見出しと説明文の境目のx */
  headSplit: number;
  /** 「未成年者」「障害者」— 見出しとアクセシブル名に使う */
  who: string;
  /** ②上段に印字されている算式（列ごと。障害者は3列目だけ20万円） */
  formulas: readonly [string, string, string];
  /** ③の算式（第8の8表1を引くかどうか） */
  balance: string;
  notes: string;
  /** ⑥の下の（注） */
  note6: string;
  /** 区分見出し行を出すか（障害者だけ） */
  groups: boolean;
  /** フィールドキーの識別子（'m'＝未成年者／'d'＝障害者） */
  k: string;
  y: BlockY;
}

/** 氏名の行（未成年者・障害者・扶養義務者で共通）。`total` は「計」の見出しを出すか。 */
function nameRow(
  y: [number, number], eBase: number, field: (i: number) => string,
  heading: string, who: string, options: GridCell['options'], total: boolean,
): GridCell[] {
  return [
    label(y, col(LEFT, HX.NUM), heading),
    ...COLS.flatMap((c, i): GridCell[] => [
      code(y, col(c.code, c.left), cd('E', eBase + i)),
      mk(y, col(c.left, c.right), {
        kind: 'input', field: field(i), ariaLabel: `${who}${i + 1}の氏名`, options, align: 'left',
      }),
    ]),
    ...(total ? [label(y, col(TX.CODE, RIGHT), '計')] : []),
  ];
}

/** 金額の行（③④⑤⑥）。「計」は自動計算で、④だけⒶの枠が入る。 */
interface ValueRowOptions {
  y: [number, number];
  /** 丸番号 */
  no: string;
  /** 行見出し */
  heading: string;
  /** 見出しの文字サイズ（③⑤は行数が多いので小さくする） */
  fontSize?: number;
  gBase: number;
  /** 列ごとのフィールド */
  field: (i: number) => string;
  /** 計のフィールド */
  totalField: string;
  /** アクセシブル名（「未成年者1の②未成年者控除額」のように組み立てる） */
  who: string;
  name: string;
  /** 手入力の欄か（⑥だけ扶養義務者間で協議して配分するので手入力） */
  editable?: boolean;
  /** ④の「計Ⓐ」 */
  markA?: boolean;
}

function valueRow({
  y, no, heading, fontSize, gBase, field, totalField, who, name, editable, markA,
}: ValueRowOptions): GridCell[] {
  const totalLeft = markA === true ? TX.ACODE : TX.LEFT;
  return [
    label(y, col(LEFT, HX.LBL), heading, fontSize === undefined ? {} : { fontSize }),
    label(y, col(HX.LBL, HX.NUM), no, { fontSize: 10, semanticRole: 'rowheader' }),
    ...COLS.flatMap((c, i): GridCell[] => [
      code(y, col(c.code, c.left), cd('G', gBase + i)),
      mk(y, col(c.left, c.right), {
        kind: 'input', field: field(i), ariaLabel: `${who}${i + 1}の${no}${name}`, commaInteger: true, readOnly: editable !== true,
      }),
    ]),
    ...(markA === true ? [label(y, col(TX.CODE, TX.MARK), '計\nⒶ', { fontSize: 8 })] : []),
    code(y, col(markA === true ? TX.MARK : TX.CODE, totalLeft), cd('G', gBase + 3)),
    mk(y, col(totalLeft, RIGHT), {
      kind: 'input', field: totalField, ariaLabel: `${who}の${no}${name}の計`, commaInteger: true, readOnly: true,
    }),
  ];
}

/** ① 年齢 と ② 控除額（上段の算式・下段の＝）。計の欄は①が斜線、②が自動計算。 */
function creditRows(b: Block, common: string, totals: string): GridCell[] {
  const age = row(b.y.age[0], b.y.age[1]);
  const [cTop, cMid, cBottom] = b.y.calc;
  const upper = row(cTop, cMid);
  const lower = row(cMid, cBottom);
  const all = row(cTop, cBottom);
  const p = (i: number) => `${common}t6${b.k}${i}`;
  return [
    // ① 年齢（1年未満切捨て）— 生年月日を持っていないので手入力
    label(age, col(LEFT, HX.LBL), '年齢（1年未満切捨て）'),
    label(age, col(HX.LBL, HX.NUM), '①', { fontSize: 10, semanticRole: 'rowheader' }),
    ...COLS.flatMap((c, i): GridCell[] => [
      code(age, col(c.code, c.left), cd('G', b.gBase + i)),
      mk(age, col(c.left, c.unit), {
        kind: 'input', field: `${p(i)}age`, ariaLabel: `${b.who}${i + 1}の年齢`, integerDigits: 3, align: 'center',
      }),
      label(age, col(c.unit, c.right), '歳'),
    ]),
    mk(age, col(TX.CODE, RIGHT), { diagonal: 'bltr' }),

    // ② 控除額 — 上段に算式、下段に「＝」と金額（末尾の「0,000」は様式に印字済み）
    label(all, col(LEFT, HX.LBL), `${b.who}控除額(円)`),
    label(all, col(HX.LBL, HX.NUM), '②', { fontSize: 10, semanticRole: 'rowheader' }),
    ...COLS.flatMap((c, i): GridCell[] => [
      label(upper, col(c.code, c.fCode), b.formulas[i] ?? '', { align: 'right', fontSize: 7.5 }),
      code(upper, col(c.fCode, c.fVal), cd('G', b.gBase + 3 + i)),
      mk(upper, col(c.fVal, c.unit), {
        kind: 'input', field: `${p(i)}age`, ariaLabel: `${b.who}${i + 1}の控除額の計算に使う年齢`, integerDigits: 3, align: 'center', readOnly: true,
      }),
      label(upper, col(c.unit, c.right), '歳)', { fontSize: 7.5 }),
      label(lower, col(c.code, c.eq), '＝', { noBorder: true }),
      code(lower, col(c.eq, c.eCode), cd('G', b.gBase + 6 + i)),
      mk(lower, col(c.eCode, c.right), {
        kind: 'input', field: `${totals}t6${b.k}${i}v2`, ariaLabel: `${b.who}${i + 1}の②控除額`, commaInteger: true, readOnly: true, rightLabel: '0,000',
      }),
    ]),
    code(all, col(TX.CODE, TX.LEFT), cd('G', b.gBase + 9)),
    mk(all, col(TX.LEFT, RIGHT), {
      kind: 'input', field: `${totals}t6${b.k}T2`, ariaLabel: `${b.who}の②控除額の計`, commaInteger: true, readOnly: true, rightLabel: '0,000',
    }),
  ];
}

/** 1つの段（未成年者控除／障害者控除）を組み立てる */
function block(b: Block, common: string, totals: string, options: GridCell['options']): GridCell[] {
  const y = b.y;
  const p = (i: number) => `${common}t6${b.k}${i}`;
  const fp = (i: number) => `${common}t6${b.k}f${i}`;
  return [
    // 章見出し＋説明文
    label(row(y.head[0], y.head[1]), col(LEFT, b.headSplit), b.head, { bold: true, fontSize: 9 }),
    label(row(y.head[0], y.head[1]), col(b.headSplit, RIGHT), b.lead, { align: 'left', fontSize: 7 }),

    // 一般障害者（2列）／特別障害者（1列）の区分見出し。「計」は氏名行まで縦につながる
    ...(b.groups && y.groups !== undefined
      ? [
        mk(row(y.groups[0], y.groups[1]), col(LEFT, HX.NUM), { diagonal: 'tlbr' }),
        label(row(y.groups[0], y.groups[1]), col(COLS[0]!.code, COLS[2]!.code), '一般障害者'),
        label(row(y.groups[0], y.groups[1]), col(COLS[2]!.code, TX.CODE), '特別障害者'),
        label(row(y.groups[0], y.name[1]), col(TX.CODE, RIGHT), '計'),
      ]
      : []),

    ...nameRow(row(y.name[0], y.name[1]), b.eBase, (i) => `${p(i)}no`, `${b.who}の氏名`, b.who, options, !b.groups),
    ...creditRows(b, common, totals),

    ...valueRow({
      y: row(y.tax[0], y.tax[1]),
      no: '③',
      heading: `${b.who}の第1表の\n${b.balance}\nの相続税額(円)`,
      fontSize: 7.5,
      gBase: b.gBase + 10,
      field: (i) => `${totals}t6${b.k}${i}v3`,
      totalField: `${totals}t6${b.k}T3`,
      who: b.who,
      name: '第1表の相続税額',
    }),
    label(row(y.notes[0], y.notes[1]), col(LEFT, RIGHT), b.notes, { align: 'left', fontSize: 7 }),

    ...valueRow({
      y: row(y.left[0], y.left[1]),
      no: '④',
      heading: '控除しきれない金額\n（円）（②−③）',
      gBase: b.gBase + 14,
      field: (i) => `${totals}t6${b.k}${i}v4`,
      totalField: `${totals}t6${b.k}A`,
      who: b.who,
      name: '控除しきれない金額',
      markA: true,
    }),

    label(row(y.share[0], y.share[1]), col(LEFT, RIGHT), `（扶養義務者の相続税額から控除する${b.who}控除額）\n`
      + INDENT + 'Ⓐ欄の金額は、' + b.who + 'の扶養義務者の相続税額から控除することができますから、'
      + 'その金額を扶養義務者間で協議の上、適宜配分し、次の⑥欄に記入します。', { align: 'left', fontSize: 7 }),

    ...nameRow(row(y.sname[0], y.sname[1]), b.eBase + 3, (i) => `${fp(i)}no`, '扶養義務者の氏名', `${b.who}の扶養義務者`, options, true),
    ...valueRow({
      y: row(y.tax5[0], y.tax5[1]),
      no: '⑤',
      heading: `扶養義務者の第1表の\n${b.balance}\nの相続税額(円)`,
      fontSize: 7.5,
      gBase: b.gBase + 18,
      field: (i) => `${totals}t6${b.k}f${i}v5`,
      totalField: `${totals}t6${b.k}fT5`,
      who: `${b.who}の扶養義務者`,
      name: '第1表の相続税額',
    }),
    // ⑥ だけは扶養義務者間で協議して配分するので手入力
    ...valueRow({
      y: row(y.ded[0], y.ded[1]),
      no: '⑥',
      heading: `${b.who}控除額(円)`,
      gBase: b.gBase + 22,
      field: (i) => `${fp(i)}v6`,
      totalField: `${totals}t6${b.k}fT6`,
      who: `${b.who}の扶養義務者`,
      name: '控除額',
      editable: true,
    }),
    label(row(y.note6[0], y.note6[1]), col(LEFT, RIGHT), b.note6, { align: 'left', fontSize: 7 }),
  ];
}

/**
 * 第6表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 氏名の項番・年齢・⑥の配分
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ②③④⑤と各計
 * @param options 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable6(common: string, totals: string, options: GridCell['options']): GridCell[] {
  const minor: Block = {
    eBase: 2,
    gBase: 1,
    head: HEAD1,
    lead: LEAD1,
    headSplit: 405,
    who: '未成年者',
    formulas: [
      `${TABLE6_MINOR_RATE}万円×(${TABLE6_MINOR_AGE}歳−`,
      `${TABLE6_MINOR_RATE}万円×(${TABLE6_MINOR_AGE}歳−`,
      `${TABLE6_MINOR_RATE}万円×(${TABLE6_MINOR_AGE}歳−`,
    ],
    balance: BALANCE,
    notes: NOTES1,
    note6: '（注）　各人の⑥欄の金額を未成年者控除を受ける扶養義務者の第8の8表1の'
      + '「未成年者控除額①」欄に転記します。',
    groups: false,
    k: 'm',
    y: {
      head: [234.5, 276],
      name: [276, 326],
      age: [326, 377],
      calc: [377, 427, 477],
      tax: [477, 546],
      notes: [546, 607],
      left: [607, 657],
      share: [657, 708],
      sname: [708, 758],
      tax5: [758, 827],
      ded: [827, 878],
      note6: [878, 903.5],
    },
  };
  const disabled: Block = {
    eBase: 8,
    gBase: 27,
    head: HEAD2,
    lead: LEAD2,
    headSplit: 405,
    who: '障害者',
    formulas: [
      `${TABLE6_DISABLED_RATE}万円×(${TABLE6_DISABLED_AGE}歳−`,
      `${TABLE6_DISABLED_RATE}万円×(${TABLE6_DISABLED_AGE}歳−`,
      `${TABLE6_SPECIAL_RATE}万円×(${TABLE6_DISABLED_AGE}歳−`,
    ],
    balance: BALANCE2,
    notes: NOTES2,
    note6: '（注）　各人の⑥欄の金額を障害者控除を受ける扶養義務者の第8の8表1の'
      + '「障害者控除額②」欄に転記します。',
    groups: true,
    k: 'd',
    y: {
      head: [909, 951],
      groups: [951, 992],
      name: [992, 1043],
      age: [1043, 1093],
      calc: [1093, 1143, 1193],
      tax: [1193, 1284],
      notes: [1284, 1341],
      left: [1341, 1391],
      share: [1391, 1436],
      sname: [1436, 1486],
      tax5: [1486, 1578],
      ded: [1578, 1629],
      note6: [1629, 1654.5],
    },
  };
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）。左側は罫線の無い余白。
    mk(row(TOP, 234.5), col(LEFT, DX.L), { noBorder: true }),
    label(row(TOP, 234.5), col(DX.L, DX.CODE), '被相続人'),
    code(row(TOP, 234.5), col(DX.CODE, DX.INPUT), 'E01'),
    mk(row(TOP, 234.5), col(DX.INPUT, RIGHT), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
    }),

    ...block(minor, common, totals, options),
    // 段と段の境の二重罫線の間（罫線の無い帯）
    mk(row(903.5, 909), col(LEFT, RIGHT), { noBorder: true }),
    ...block(disabled, common, totals, options),
  ];
}
