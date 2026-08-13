/**
 * 相続税の申告書 第5表「配偶者に対する相続税額の軽減額の計算書」。
 *
 * 上段「1 一般の場合」と下段「2 配偶者以外の人が農業相続人である場合」は、
 * 転記元（第1表 か 第3表）と丸番号が違うだけで**列の位置も算式も完全に同じ**なので、
 * 1つのセクションビルダー（`section`）に諸元を渡して2回呼ぶ。
 * 唯一の例外は限度額行で、下段だけ「−」の位置が22px左にずれている（`lim`）。
 *
 * この様式は配偶者1人分なので枚数は常に1枚。入力は
 * 「法定相続分の分子・分母」と、下段の第3表からの転記2欄（第3表は未実装）だけで、
 * 残りは第1表・第11表2からの自動転記か算式による自動計算になる。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 219px（被相続人欄の上辺）〜下端 1642px（下段の（注）の下辺）、
 * 左端 59.5px 〜 右端 1178.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE5_FORM_CODE = 'NTA0KSE050010020';
export const TABLE5_TITLE = '相続税の申告書　第5表';
export const TABLE5_SUBTITLE = '配偶者に対する相続税額の軽減額の計算書';
export const TABLE5_EDITION = '（令和6年1月分以降用）（R8.7）';

const TOP = 219;
const BOTTOM = 1642;
const LEFT = 59.5;
const RIGHT = 1178.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE5_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 「課税価格の合計額のうち配偶者の法定相続分相当額」の行の縦罫線 */
const FX = {
  LBL: 274.5,   // 左の見出しの右端
  CODE: 296.5,  // 課税価格の合計額のコード枠の右端
  A: 511.5,     // 同 入力の右端（「，000」印字あり）
  MUL: 532.5,   // 「×」の右端
  FCODE: 554.5, // 分子・分母のコード枠の右端
  FRAC: 683.5,  // 同 入力の右端
  EQ: 704.5,    // 「＝」の右端
  PCODE: 726.5, // 積のコード枠の右端
  PROD: 898.5,  // 同 入力の右端
  BRK: 910.5,   // 括弧（｝）の右端
  ARROW: 941.5, // 「⇒」の右端
  MARK: 962.5,  // ㋑（㋥）の右端
  MCODE: 984.5, // 同 コード枠の右端
} as const;

/** ①〜⑥（⑪〜⑯）の行の縦罫線 */
const SX = {
  BAND: 145.5, C1: 167.5, V1: 317.5, C2: 339.5, V2: 489.5, C3: 511.5,
  V3: 661.5, C4: 683.5, V4: 833.5, C5: 855.5, V5: 1005.5, C6: 1027.5,
} as const;

/** ⑦〜⑩（⑰〜⑳）の行の縦罫線 */
const QX = { C1: 81.5, V1: 339.5, C2: 360.5, V2: 618.5, C3: 640.5, V3: 898.5, C4: 919.5 } as const;

/** 「配偶者の税額軽減額」の行の縦罫線（限度額行と共通の右3列） */
const RX = { LBL: 339.5, MARK: 898.5, CODE: 919.5, VAL: 941.5 } as const;

/** 被相続人欄の縦罫線 */
const DX = { L: 726.5, CODE: 876.5, INPUT: 898.5 } as const;

/** 16,000万円の下限を告げる行（法定相続分相当額の枠の中） */
const C16_TEXT = '上記の金額が16,000万円に満たない場合には、16,000万円';

/** 配偶者の法定相続分相当額の下限（円） */
export const TABLE5_FLOOR = 160000000;

const DECL = '私は、相続税法第19条の2第1項の規定による配偶者の税額軽減の適用を受けます。';

const HEAD1 = '1　一般の場合';
const LEAD1 = '（この表は、①被相続人から相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人のうちに農業'
  + '相続人がいない場合又は②配偶者が農業相続人である場合に記入します。）';
const HEAD2 = '2　配偶者以外の人が農業相続人である場合';
const LEAD2 = '（この表は、被相続人から相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人の'
  + 'うちに農業相続人がいる場合で、かつ、その農業相続人が配偶者以外の場合に記入します。）';

/** 様式の枠外に印字されている※注記 */
export const TABLE5_NOTES = '※　相続税法第19条の2第5項（（隠蔽又は仮装があった場合の配偶者の相続税額の軽減の不適用））'
  + 'の規定の適用があるときには、「課税価格の合計額のうち配偶者の法定相続分相当額」の（第1表のⒶの金額）、⑥、⑦、⑨、'
  + '「課税価格の合計額のうち配偶者の法定相続分相当額」の（第3表のⒶの金額）、⑯、⑰及び⑲の各欄は、'
  + '第5表の付表で計算した金額を転記します。';

/** 上段・下段の行位置（実測px） */
interface SectionY {
  /** 章見出し */
  head: [number, number];
  /** 法定相続分相当額の枠（〔配偶者の法定相続分〕の注記帯・分子・分母・16,000万円の行） */
  frac: [number, number, number, number, number, number, number];
  /** ①〜⑥ の見出し（上下2段）と入力 */
  six: [number, number, number, number];
  /** ⑦〜⑩ の見出しと入力 */
  quad: [number, number, number];
  /** 限度額行（見出し・入力）と軽減額行・（注） */
  bottom: [number, number, number, number, number];
}

/** 上段・下段の諸元（違うのはコード・丸番号・転記元・限度額行の「−」の位置だけ） */
interface Section {
  /** Gコードの起点（上段は G01、下段は G20 から） */
  base: number;
  /** ①〜⑩（⑪〜⑳）の丸番号 */
  nums: readonly string[];
  /** ㋑㋺㋩（㋥㋭㋬） */
  marks: readonly [string, string, string];
  head: string;
  lead: string;
  /** 丸番号の付かない欄のアクセシブル名に付ける、どちらの段かを表す語 */
  who: string;
  /** 章見出しと説明文の境目のx */
  headSplit: number;
  /** 課税価格の合計額の欄（上段は第1表Ⓐの自動転記、下段は第3表Ⓐの手入力） */
  aField: string;
  aReadOnly: boolean;
  aRef: string;
  /** 相続税の総額の欄（上段は第1表⑦の自動転記、下段は第3表⑦の手入力） */
  taxField: string;
  taxReadOnly: boolean;
  taxRef: string;
  /** 法定相続分の分子・分母 */
  numField: string;
  denField: string;
  /** 限度額行の1つ目の見出し */
  limHead: string;
  /** 限度額行の「−」の左右とコード枠の右端（下段だけ22px左にずれる） */
  lim: readonly [number, number, number];
  /** 限度額行の見出しの区切り（＝「−」の右端） */
  limSplit: number;
  /** 自動計算欄のキー接頭辞（'t.t5s1'） */
  p: string;
  y: SectionY;
}

/** 様式のコード（G01・G20 のように2桁で振られる） */
const cd = (n: number): string => `G${String(n).padStart(2, '0')}`;

/** 章見出しの行（見出しと説明文が1つの枠に入っている） */
function headRow(s: Section): GridCell[] {
  const y = row(s.y.head[0], s.y.head[1]);
  return [
    mk(y, col(LEFT, RIGHT), {}),
    label(y, col(LEFT, s.headSplit), s.head, { noBorder: true, bold: true, fontSize: 9 }),
    label(y, col(s.headSplit, RIGHT), s.lead, { noBorder: true, align: 'left', fontSize: 7 }),
  ];
}

/** 課税価格の合計額のうち配偶者の法定相続分相当額の枠（分数の計算と16,000万円の下限） */
function fracRows(s: Section): GridCell[] {
  const [top, noteB, numT, numB, denT, denB, bottom] = s.y.frac;
  const all = row(top, bottom);
  const note = row(top, noteB);
  const box = row(noteB, denB);
  const numY = row(numT, numB);
  const denY = row(denT, denB);
  const c16 = row(denB, bottom);
  return [
    label(all, col(LEFT, FX.LBL), '課税価格の合計額のうち配偶者の法定相続分相当額（円）', { align: 'left' }),
    label(note, col(FX.CODE, FX.A), '（' + s.aRef + '）', { noBorder: true, align: 'left', fontSize: 7 }),
    label(note, col(FX.FCODE, FX.PROD), '〔配偶者の法定相続分〕', { noBorder: true, align: 'left', fontSize: 7 }),

    code(box, col(FX.LBL, FX.CODE), cd(s.base)),
    mk(box, col(FX.CODE, FX.A), {
      kind: 'input', field: s.aField, ariaLabel: `${s.who} 課税価格の合計額`, commaInteger: true, rightLabel: '，000', readOnly: s.aReadOnly,
    }),
    label(box, col(FX.A, FX.MUL), '×', { noBorder: true }),

    // 法定相続分（分子・分母）— 法定相続人の構成で決まるので手入力
    code(numY, col(FX.MUL, FX.FCODE), cd(s.base + 1)),
    mk(numY, col(FX.FCODE, FX.FRAC), { kind: 'input', field: s.numField, ariaLabel: `${s.who} 配偶者の法定相続分の分子`, integerDigits: 3, align: 'center' }),
    code(denY, col(FX.MUL, FX.FCODE), cd(s.base + 2)),
    mk(denY, col(FX.FCODE, FX.FRAC), { kind: 'input', field: s.denField, ariaLabel: `${s.who} 配偶者の法定相続分の分母`, integerDigits: 3, align: 'center' }),

    label(box, col(FX.FRAC, FX.EQ), '＝', { noBorder: true }),
    code(box, col(FX.EQ, FX.PCODE), cd(s.base + 3)),
    mk(box, col(FX.PCODE, FX.PROD), {
      kind: 'input', field: `${s.p}mul`, ariaLabel: `${s.who} 課税価格の合計額に法定相続分を乗じた金額`, commaInteger: true, readOnly: true,
    }),

    // 16,000万円の下限（様式では分数の枠の下に1行で印字されている）
    label(c16, col(FX.LBL, FX.BRK), C16_TEXT),

    // 分数の枠と㋑（㋥）をつなぐ括弧・矢印
    mk(all, col(FX.PROD, FX.BRK), {}),
    label(all, col(FX.BRK, FX.ARROW), '⇒', { noBorder: true }),
    label(all, col(FX.ARROW, FX.MARK), s.marks[0] + '\n※', { fontSize: 8 }),
    code(all, col(FX.MARK, FX.MCODE), cd(s.base + 4)),
    mk(all, col(FX.MCODE, RIGHT), {
      kind: 'input', field: `${s.p}i`, ariaLabel: s.marks[0] + ' 配偶者の法定相続分相当額', commaInteger: true, readOnly: true,
    }),
  ];
}

/** ①〜⑥（⑪〜⑯）— 配偶者の税額軽減額を計算する場合の課税価格 */
function sixRows(s: Section): GridCell[] {
  const [top, mid, headB, bottom] = s.y.six;
  const n = s.nums;
  const all = row(top, headB);
  const upper = row(top, mid);
  const lower = row(mid, headB);
  const input = row(headB, bottom);
  /** ①〜⑥の入力欄（②〜⑤は他の様式からの転記、④⑥は算式による自動計算） */
  const cell = (i: number, x: [number, number], cx: [number, number], name: string, zeros?: string): GridCell[] => [
    code(input, col(cx[0], cx[1]), cd(s.base + 5 + i)),
    mk(input, col(cx[1], x[1]), {
      kind: 'input',
      field: `${s.p}v${i + 1}`,
      ariaLabel: n[i] + ' ' + name,
      commaInteger: true,
      readOnly: true,
      ...(zeros === undefined ? {} : { rightLabel: zeros }),
    }),
  ];
  return [
    label(row(top, bottom), col(LEFT, SX.BAND), '配偶者の税額軽減額を計算する場合の課税価格（円）', { forceHorizontal: true, fontSize: 7.5 }),

    label(all, col(SX.BAND, SX.V1), n[0] + '　分割財産の価額\n\n（第11表2の配偶者の①の金額）'),
    label(upper, col(SX.V1, SX.V4), '分割財産の価額から控除する債務及び葬式費用の金額'),
    label(lower, col(SX.V1, SX.V2), n[1] + '　債務及び葬式費用の金額\n（第1表の配偶者の③の金額）', { fontSize: 7.5 }),
    label(lower, col(SX.V2, SX.V3), n[2] + '　未分割財産の価額\n（第11表2の配偶者の②の金額）', { fontSize: 7.5 }),
    label(lower, col(SX.V3, SX.V4), n[3] + '　（' + n[1] + '−' + n[2] + '）の金額\n（' + n[2] + 'の金額が' + n[1] + 'の金額より大きいときは0）', { fontSize: 7.5 }),
    label(all, col(SX.V4, SX.V5), n[4] + '　純資産価額に加算される暦年課税分の贈与財産価額\n\n（第1表の配偶者の⑤の金額）', { fontSize: 7.5 }),
    label(all, col(SX.V5, RIGHT), n[5] + '　（' + n[0] + '−' + n[3] + '＋' + n[4] + '）の金額\n（' + n[4] + 'の金額より小さいときは' + n[4] + 'の金額）\n（1,000円未満切捨て）※', { fontSize: 7.5 }),

    ...cell(0, [SX.BAND, SX.V1], [SX.BAND, SX.C1], '分割財産の価額'),
    ...cell(1, [SX.V1, SX.V2], [SX.V1, SX.C2], '債務及び葬式費用の金額'),
    ...cell(2, [SX.V2, SX.V3], [SX.V2, SX.C3], '未分割財産の価額'),
    ...cell(3, [SX.V3, SX.V4], [SX.V3, SX.C4], '債務及び葬式費用の金額から未分割財産の価額を控除した金額'),
    ...cell(4, [SX.V4, SX.V5], [SX.V4, SX.C5], '純資産価額に加算される暦年課税分の贈与財産価額'),
    ...cell(5, [SX.V5, RIGHT], [SX.V5, SX.C6], '配偶者の税額軽減額を計算する場合の課税価格', '，000'),
  ];
}

/** ⑦〜⑩（⑰〜⑳）— 相続税の総額と配偶者の税額軽減の基となる金額 */
function quadRows(s: Section): GridCell[] {
  const [top, mid, bottom] = s.y.quad;
  const n = s.nums;
  const head = row(top, mid);
  const input = row(mid, bottom);
  return [
    label(head, col(LEFT, QX.V1), n[6] + '　相続税の総額（円）\n（' + s.taxRef + '）'),
    label(head, col(QX.V1, QX.V2), n[7] + '　' + s.marks[0] + 'の金額と' + n[5] + 'の金額のうちいずれか少ない方の金額（円）', { align: 'left', fontSize: 7.5 }),
    label(head, col(QX.V2, QX.V3), n[8] + '　課税価格の合計額（円）\n（' + s.aRef + '）'),
    label(head, col(QX.V3, RIGHT), n[9] + '　配偶者の税額軽減の基となる金額（円）\n（' + n[6] + '×' + n[7] + '÷' + n[8] + '）', { fontSize: 7.5 }),

    code(input, col(LEFT, QX.C1), cd(s.base + 11)),
    mk(input, col(QX.C1, QX.V1), {
      kind: 'input', field: s.taxField, ariaLabel: n[6] + ' 相続税の総額', commaInteger: true, rightLabel: '00', readOnly: s.taxReadOnly,
    }),
    code(input, col(QX.V1, QX.C2), cd(s.base + 12)),
    mk(input, col(QX.C2, QX.V2), {
      kind: 'input', field: `${s.p}v8`, ariaLabel: n[7] + ' 配偶者の税額軽減額の計算の基礎となる課税価格', commaInteger: true, readOnly: true,
    }),
    code(input, col(QX.V2, QX.C3), cd(s.base + 13)),
    mk(input, col(QX.C3, QX.V3), {
      kind: 'input', field: s.aField, ariaLabel: n[8] + ' 課税価格の合計額', commaInteger: true, rightLabel: '，000', readOnly: s.aReadOnly,
    }),
    code(input, col(QX.V3, QX.C4), cd(s.base + 14)),
    mk(input, col(QX.C4, RIGHT), {
      kind: 'input', field: `${s.p}v10`, ariaLabel: n[9] + ' 配偶者の税額軽減の基となる金額', commaInteger: true, readOnly: true,
    }),
  ];
}

/** 限度額行・軽減額行・（注） */
function bottomRows(s: Section): GridCell[] {
  const [top, mid, redT, redB, noteB] = s.y.bottom;
  const [minusL, minusR, code2] = s.lim;
  const n = s.nums;
  const all = row(top, redT);
  const head = row(top, mid);
  const input = row(mid, redT);
  const red = row(redT, redB);
  const note = row(redB, noteB);
  return [
    label(all, col(LEFT, RX.LBL), '配偶者の税額軽減の限度額（円）'),
    label(head, col(RX.LBL, s.limSplit), '（' + s.limHead + '）', { fontSize: 7.5 }),
    label(head, col(s.limSplit, RX.MARK), '（第1表の配偶者の⑫の金額）', { fontSize: 7.5 }),

    label(input, col(RX.LBL, 360.5), '（', { noBorder: true }),
    code(input, col(360.5, 382.5), cd(s.base + 15)),
    mk(input, col(382.5, minusL), {
      kind: 'input', field: `${s.p}g1`, ariaLabel: `${s.who} 第1表の配偶者の算出税額`, commaInteger: true, readOnly: true,
    }),
    label(input, col(minusL, minusR), '−', { noBorder: true }),
    code(input, col(minusR, code2), cd(s.base + 16)),
    mk(input, col(code2, 876.5), {
      kind: 'input', field: `${s.p}g2`, ariaLabel: `${s.who} 第1表の配偶者の⑫の金額`, commaInteger: true, readOnly: true,
    }),
    label(input, col(876.5, RX.MARK), '）', { noBorder: true }),

    label(all, col(RX.MARK, RX.CODE), s.marks[1], { fontSize: 8 }),
    code(all, col(RX.CODE, RX.VAL), cd(s.base + 17)),
    mk(all, col(RX.VAL, RIGHT), {
      kind: 'input', field: `${s.p}ro`, ariaLabel: s.marks[1] + ' 配偶者の税額軽減の限度額', commaInteger: true, readOnly: true,
    }),

    label(red, col(LEFT, RX.LBL), '配偶者の税額軽減額（円）'),
    label(red, col(RX.LBL, RX.MARK), '（' + n[9] + 'の金額と' + s.marks[1] + 'の金額のうちいずれか少ない方の金額）'),
    label(red, col(RX.MARK, RX.CODE), s.marks[2], { fontSize: 8 }),
    code(red, col(RX.CODE, RX.VAL), cd(s.base + 18)),
    mk(red, col(RX.VAL, RIGHT), {
      kind: 'input', field: `${s.p}ha`, ariaLabel: s.marks[2] + ' 配偶者の税額軽減額', commaInteger: true, readOnly: true,
    }),

    label(note, col(LEFT, RIGHT), '（注）　' + s.marks[2] + 'の金額を第1表の配偶者の「配偶者の税額軽減額⑬」欄に転記します。', { align: 'left', fontSize: 7 }),
  ];
}

/** 罫線の無い帯（章と章の間など）。GridForm の行分割に合わせて空セルで埋める。 */
const gap = (a: number, b: number): GridCell => mk(row(a, b), col(LEFT, RIGHT), { noBorder: true });

function section(s: Section): GridCell[] {
  return [...headRow(s), ...fracRows(s), ...sixRows(s), ...quadRows(s), ...bottomRows(s)];
}

/**
 * 第5表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 被相続人の氏名・法定相続分・第3表からの転記
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— 第1表・第11表2からの転記と算式による欄
 */
export function buildTable5(common: string, totals: string): GridCell[] {
  const upper: Section = {
    base: 1,
    nums: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
    marks: ['㋑', '㋺', '㋩'],
    head: HEAD1,
    lead: LEAD1,
    who: '一般の場合',
    headSplit: 274.5,
    aField: `${totals}v6`,
    aReadOnly: true,
    aRef: '第1表のⒶの金額',
    taxField: `${totals}t7`,
    taxReadOnly: true,
    taxRef: '第1表の⑦の金額',
    numField: `${common}t5num`,
    denField: `${common}t5den`,
    limHead: '第1表の配偶者の⑨又は⑩の金額',
    lim: [618.5, 640.5, 661.5],
    limSplit: 640.5,
    p: `${totals}t5s1`,
    y: {
      head: [322.5, 384.5],
      frac: [384.5, 417.5, 417.5, 450, 465, 497.5, 538.5],
      six: [538.5, 574, 648.5, 689],
      quad: [693, 733.5, 774],
      bottom: [778, 815.5, 859, 938.5, 972.5],
    },
  };
  const lower: Section = {
    base: 20,
    nums: ['⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'],
    marks: ['㋥', '㋭', '㋬'],
    head: HEAD2,
    lead: LEAD2,
    who: '配偶者以外の人が農業相続人である場合',
    headSplit: 445,
    aField: `${common}t5a3`,
    aReadOnly: false,
    aRef: '第3表のⒶの金額',
    taxField: `${common}t5v17`,
    taxReadOnly: false,
    taxRef: '第3表の⑦の金額',
    numField: `${common}t5num2`,
    denField: `${common}t5den2`,
    limHead: '第1表の配偶者の⑩の金額',
    lim: [597.5, 618.5, 640.5],
    limSplit: 618.5,
    p: `${totals}t5s2`,
    y: {
      head: [979.5, 1046.5],
      frac: [1046.5, 1079, 1079, 1126, 1141.5, 1188.5, 1237.5],
      six: [1237.5, 1292.5, 1373.5, 1409.5],
      quad: [1413.5, 1451, 1487.5],
      bottom: [1491.5, 1530.5, 1573, 1615.5, 1642],
    },
  };
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(TOP, 271.5), col(DX.L, DX.CODE), '被相続人'),
    code(row(TOP, 271.5), col(DX.CODE, DX.INPUT), 'E01'),
    mk(row(TOP, 271.5), col(DX.INPUT, RIGHT), { kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10 }),

    label(row(271.5, 315), col(LEFT, RIGHT), DECL, { align: 'left' }),
    gap(315, 322.5),

    ...section(upper),
    gap(689, 693),
    gap(774, 778),
    gap(972.5, 979.5),

    ...section(lower),
    gap(1409.5, 1413.5),
    gap(1487.5, 1491.5),
  ];
}
