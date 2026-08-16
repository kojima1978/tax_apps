/**
 * 相続税の申告書 第11の2表
 * 「相続時精算課税適用財産の明細書・相続時精算課税分の贈与税額控除額の計算書」。
 *
 * この様式は**贈与を受けた人ごと**に1枚書く。1枚に年分6行・財産の明細6行しか無いので、
 * 精算課税の贈与が7年分以上ある人は同じ人で複数枚になる（`page` が0始まりの枚数）。
 * ⑧⑨⑩の合計欄はその人の全枚数を通した合計なので、**最終ページにだけ値を出す**。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 202.5px（被相続人の氏名欄の上辺）〜下端 1622.5px（下部の（注）枠の下辺）、
 * 左端 35.5px 〜 右端 1203px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { TAX_OFFICE_GROUPS } from '../data/taxOffices';
import { code, dateSelect, label, mk } from './geometry';

export const TABLE112_FORM_CODE = 'NTA0KSE111010040';
export const TABLE112_TITLE = '相続税の申告書　第11の2表';
export const TABLE112_SUBTITLE = '相続時精算課税適用財産の明細書\n相続時精算課税分の贈与税額控除額の計算書';

/** 様式1枚に記入できる行数（1の年分・2の財産の明細とも6行） */
export const TABLE112_ROWS = 6;

const TOP = 202.5;
const BOTTOM = 1622.5;
const LEFT = 35.5;
const RIGHT = 1203;

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

/** 縦罫線の実測px（1と2で共有する線が多いので1つの表にまとめる） */
const X = {
  L: 35.5,        // 表の左端
  NO2_C: 60.5,    // 2 番号のコード枠の右端
  NO_R: 82,       // 1 番号列の右端
  E1_C: 106.5,    // 1 ①のコード枠の右端 ／ 2 番号列の右端
  N_C: 130.5,     // 2 贈与年月日のコード枠の右端
  ERA_R: 195.5,   // 2 元号の右端
  YEAR_R: 238.5,  // 1 ①年分入力の右端 ／ 2 年の右端
  C1_R: 282,      // 1 ①の右端（「年分」ラベルの右端）／ 2 月の右端
  E2_C: 305.5,    // 1 ②のコード枠の右端
  D_R: 327.5,     // 2 日の右端
  K_C: 351.5,     // 2 種類のコード枠の右端
  OFF_R: 437.5,   // 1 ②税務署名入力の右端 ／ 2 種類の右端 ／ 見出し「氏名」の右端
  C2_R: 463,      // 1 ②の右端（「署」ラベルの右端）／ 2 細目のコード枠の右端
  G3_C: 486.5,    // 1 ③のコード枠の右端
  S_R: 551.5,     // 2 細目の右端
  U_C: 575.5,     // 2 利用区分、銘柄等のコード枠の右端
  C3_R: 619,      // 1 ③の右端
  G4_C: 643.5,    // 1 ④のコード枠の右端
  U_R: 686.5,     // 2 利用区分、銘柄等の右端
  P_C: 710.5,     // 2 所在場所等のコード枠の右端
  DEC_L: 733,     // 「被相続人」ラベルの左端
  C4_R: 754,      // 1 ④の右端 ／ ⑧欄の左端
  G5_C: 778.5,    // 1 ⑤のコード枠の右端
  P_R: 867.5,     // 2 所在場所等の右端
  HEAD_R: 843,    // 見出し「初めて贈与を受けた年分」の右端 ／ E61 の左端
  YEAR_L: 800,    // 「年分」ラベルの左端
  C5_R: 892,      // 1 ⑤の右端 ／ 2 数量のコード枠の左端 ／ E01 の左端
  G6_C: 916.5,    // 1 ⑥のコード枠の右端 ／ 2 数量のコード枠の右端 ／ 被相続人の氏名入力の左端
  OFF2_R: 1159,   // 提出税務署名入力の右端（「署」ラベルの左端）
  Q_R: 980.5,     // 2 数量の右端
  UNIT_C: 1005.5, // 2 （単位）のコード枠の右端
  C6_R: 1049,     // 1 ⑥の右端 ／ 2 （単位）の右端
  G7_C: 1072.5,   // 1 ⑦のコード枠の右端 ／ 2 価額のコード枠の右端
  R: 1203,        // 表の右端
} as const;

/** 明細行の高さ（実測px）。1・2どちらの表も同じ。 */
const ROW_H = 56.5;
/** 1「…明細」の1行目の上端px */
const SUM_TOP = 487;
/** 2「相続時精算課税適用財産の明細」の1行目の上端px */
const DETAIL_TOP = 1189;

const LEAD = '　この表は、被相続人から相続時精算課税に係る贈与によって取得した財産'
  + '（相続時精算課税適用財産）がある場合に贈与を受けた人ごとに記入します。';

/** 1「…贈与税額の明細」の（注） */
const SUM_NOTES: NonNullable<GridCell['numberedNotes']> = [
  {
    number: '1',
    body: '租税特別措置法第70条の6の9（（個人の事業用資産の贈与者が死亡した場合の相続税の課税の特例））、'
      + '第70条の7の3（（非上場株式等の贈与者が死亡した場合の相続税の課税の特例））又は第70条の7の7'
      + '（（非上場株式等の特例贈与者が死亡した場合の相続税の課税の特例））の規定の適用により相続又は遺贈により'
      + '取得したものとみなされる財産は、その財産の種類に応じて第11表の付表1、付表2又は付表4に記入します'
      + '（この表には記入しません。）。',
  },
  { number: '2', body: '③欄の金額は、下記2の②の「価額」欄の金額に基づき記入します。' },
  {
    number: '3',
    body: '④欄は、被相続人である特定贈与者に係る贈与税の申告書第2表の「相続時精算課税に係る基礎控除額」欄の'
      + '金額を記入します。なお、「① 贈与を受けた年分」欄が令和5年分以前の場合は、「0」と記入します。',
  },
  {
    number: '4',
    body: '⑧欄の金額を第1表のその人の「相続時精算課税適用財産の価額②」欄及び第15表のその人の㉛欄に'
      + 'それぞれ転記します。',
  },
  { number: '5', body: '⑨欄の金額を第1表のその人の「相続時精算課税分の贈与税額控除額⑰」欄に転記します。' },
];

/** 2「相続時精算課税適用財産の明細」の（注） */
const DETAIL_NOTES: NonNullable<GridCell['numberedNotes']> = [
  {
    number: '1',
    body: 'この明細は、被相続人である特定贈与者に係る贈与税の申告書第2表に基づき記入します。'
      + 'なお、被相続人である特定贈与者が贈与をした年中に死亡し贈与税の申告が不要である場合は、'
      + '「相続税の申告のしかた」の記載例を参照してください。',
  },
  {
    number: '2',
    body: '②の「価額」欄には、被相続人である特定贈与者に係る贈与税の申告書第2表の「財産の価額」欄の'
      + '金額を記入します。ただし、特定事業用資産の特例の適用を受ける場合には、第11・11の2表の付表3の⑦欄の金額と'
      + '⑦欄の金額に係る第11・11の2表の付表3の2の⑲欄の金額の合計額を、特定計画山林の特例の適用を受ける場合には、'
      + '第11・11の2表の付表4の「2　特定受贈森林経営計画対象山林である選択特定計画山林の明細」の⑤欄の金額を'
      + '記入します。また、租税特別措置法第70条の3の3（（相続時精算課税に係る土地又は建物の価額の特例））の'
      + '承認を受けている場合には、その承認に係る財産の価額から同条の規定による災害により被害を受けた部分に'
      + '対応する金額を控除した金額を記入します。',
  },
];

/** 記載例63ページ。様式にも記載要領にも書かれていない条件なので入力欄の注記として添える */
const BASE_HINT = '被相続人である特定贈与者が死亡した年分については110万円と記入します。\n'
  + '同一年中に2人以上の特定贈与者から贈与を受けた場合は、110万円をそれぞれの特定贈与者の'
  + '贈与税の課税価格であん分した金額になります。\n'
  + '「①贈与を受けた年分」が令和5年分以前の場合は「0」と記入します。';
const TAX_HINT = '利子税、延滞税及び加算税の額は含まれません';
const FOREIGN_HINT = '下記2に記載した財産について、贈与税の外国税額控除の適用を受けている場合に記入します';

/** 見出し・（注）などの説明文セル */
const notes = (y: [number, number], text: string): GridCell => (
  label(y, col(X.L, X.R), text, { align: 'left', fontSize: 6.5 })
);

/** 番号付きの（注）。番号を縦にそろえ、本文はぶら下げインデントにする */
const numberedNotes = (y: [number, number], items: NonNullable<GridCell['numberedNotes']>): GridCell => (
  mk(y, col(X.L, X.R), { kind: 'label', numberedNotes: items, align: 'left', fontSize: 6.5 })
);

/** 「1 …」「2 …」の章見出し（太字の見出し行と、その下の細い説明文） */
function sectionHead(top: number, bottom: number, heading: string, lead?: string): GridCell[] {
  const split = lead === undefined ? bottom : (top + bottom) / 2;
  return [
    mk(row(top, bottom), col(X.L, X.R), {}),
    label(row(top, split), col(X.L, X.R), heading, { noBorder: true, align: 'left', bold: true, fontSize: 8.5 }),
    ...(lead === undefined ? [] : [
      label(row(split, bottom), col(X.L, X.R), '　' + lead, { noBorder: true, align: 'left', fontSize: 7.5 }),
    ]),
  ];
}

/** 上部（被相続人・贈与を受けた人の氏名・初めて贈与を受けた年分・選択届出書の提出先） */
function headRows(common: string, p: string, who: string, yearOptions: GridCell['options']): GridCell[] {
  const head = row(278.5, 316);
  const entry = row(316, 363);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(202.5, 240.5), col(X.DEC_L, X.C5_R), '被相続人'),
    code(row(202.5, 240.5), col(X.C5_R, X.G6_C), 'E01'),
    mk(row(202.5, 240.5), col(X.G6_C, X.R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    notes(row(240.5, 278.5), LEAD),

    label(head, col(X.L, X.OFF_R), '贈与を受けた人の氏名'),
    label(head, col(X.OFF_R, X.HEAD_R), '被相続人から初めて相続時精算課税に係る贈与を受けた年分\n（相続時精算課税選択届出書の提出に係る年分）'),
    label(head, col(X.HEAD_R, X.R), '相続時精算課税選択届出書を提出した税務署名'),

    // 氏名は第1表からの転記（この様式は「その人の1枚」なので手入力させない）
    code(entry, col(X.L, X.NO2_C), 'E02'),
    mk(entry, col(X.NO2_C, X.OFF_R), { kind: 'input', field: `${p}name`, ariaLabel: `${who}の氏名`, align: 'left', fontSize: 10, readOnly: true }),
    code(entry, col(X.OFF_R, X.C2_R), 'E60'),
    mk(entry, col(X.C2_R, X.YEAR_L), {
      kind: 'input', field: `${p}t112FirstYear`, ariaLabel: `${who}が初めて相続時精算課税に係る贈与を受けた年分`,
      options: yearOptions, align: 'center',
    }),
    label(entry, col(X.YEAR_L, X.HEAD_R), '年分'),
    code(entry, col(X.HEAD_R, X.G6_C), 'E61'),
    mk(entry, col(X.G6_C, X.OFF2_R), {
      kind: 'input', field: `${p}t112Office`, ariaLabel: `${who}が相続時精算課税選択届出書を提出した税務署名`,
      optionGroups: TAX_OFFICE_GROUPS, align: 'left',
    }),
    label(entry, col(X.OFF2_R, X.R), '署'),
  ];
}

/** 1の表頭（丸番号は金額欄の見出しと同じマスの左端に印字されている） */
function sumHead(): GridCell[] {
  const head = row(406.5, 487);
  const upper = row(406.5, 460.5);
  const lower = row(460.5, 487);
  /** ②〜⑦の見出し（丸番号＋説明文を1マスに収める） */
  const headCell = (from: number, to: number, no: string, text: string): GridCell[] => [
    mk(head, col(from, to), {}),
    label(head, col(from, to), no + '　' + text, { noBorder: true, align: 'left', fontSize: 6.5 }),
  ];
  return [
    label(head, col(X.L, X.NO_R), '番号'),
    // ①だけは下段に記入例が刷られている
    mk(head, col(X.NO_R, X.C1_R), {}),
    label(upper, col(X.NO_R, X.C1_R), '①　　贈与を受けた年分', { noBorder: true, align: 'left', fontSize: 6.5 }),
    label(lower, col(X.NO_R, X.C1_R), '（例）　令和元年分', { noBorder: true, fontSize: 6.5 }),
    ...headCell(X.C1_R, X.C2_R, '②', '贈与税の申告書を提出した税務署名'),
    ...headCell(X.C2_R, X.C3_R, '③', '①の年分に被相続人から相続時精算課税に係る贈与を受けた財産の価額の合計額（円）'),
    ...headCell(X.C3_R, X.C4_R, '④', '③から控除する相続時精算課税に係る基礎控除額（円）'),
    ...headCell(X.C4_R, X.C5_R, '⑤', '相続時精算課税適用財産の価額（円）（③−④）（赤字のときは0）'),
    ...headCell(X.C5_R, X.C6_R, '⑥', '③の財産に係る贈与税額（円）（贈与税の外国税額控除前の金額）'),
    ...headCell(X.C6_R, X.R, '⑦', '⑥のうち贈与税額に係る外国税額控除額（円）'),
  ];
}

/** 1の明細6行（年分ごとの計算） */
function sumRows(p: string, who: string, page: number, yearOptions: GridCell['options']): GridCell[] {
  return Array.from({ length: TABLE112_ROWS }, (_, r): GridCell[] => {
    const top = SUM_TOP + r * ROW_H;
    const y = row(top, top + ROW_H);
    // 通し番号は「その人の何行目か」。様式の「番号」欄は1枚ごとに1〜6が刷られている。
    const i = page * TABLE112_ROWS + r;
    const e = (n: number) => `E${String(n).padStart(2, '0')}`;
    const g = (n: number) => `G${String(n).padStart(2, '0')}`;
    return [
      label(y, col(X.L, X.NO_R), String(r + 1)),
      code(y, col(X.NO_R, X.E1_C), e(3 + r * 3)),
      mk(y, col(X.E1_C, X.YEAR_R), {
        kind: 'input', field: `${p}t112y${i}`, ariaLabel: `${who}の${i + 1}行目の贈与を受けた年分`,
        options: yearOptions, align: 'center',
      }),
      label(y, col(X.YEAR_R, X.C1_R), '年分'),
      code(y, col(X.C1_R, X.E2_C), e(4 + r * 3)),
      mk(y, col(X.E2_C, X.OFF_R), {
        kind: 'input', field: `${p}t112o${i}`, ariaLabel: `${who}の${i + 1}行目の贈与税の申告書を提出した税務署名`,
        optionGroups: TAX_OFFICE_GROUPS, align: 'left', fontSize: 7,
      }),
      label(y, col(X.OFF_R, X.C2_R), '署'),
      code(y, col(X.C2_R, X.G3_C), g(1 + r * 3)),
      mk(y, col(X.G3_C, X.C3_R), { kind: 'input', field: `${p}t112a${i}`, ariaLabel: `${who}の${i + 1}行目 ③贈与を受けた財産の価額の合計額`, commaInteger: true, align: 'right' }),
      code(y, col(X.C3_R, X.G4_C), g(46 + r * 2)),
      mk(y, col(X.G4_C, X.C4_R), { kind: 'input', field: `${p}t112b${i}`, ariaLabel: `${who}の${i + 1}行目 ④相続時精算課税に係る基礎控除額`, commaInteger: true, align: 'right', hint: BASE_HINT }),
      code(y, col(X.C4_R, X.G5_C), g(47 + r * 2)),
      mk(y, col(X.G5_C, X.C5_R), { kind: 'input', field: `${p}t112c${i}`, ariaLabel: `${who}の${i + 1}行目 ⑤相続時精算課税適用財産の価額`, commaInteger: true, align: 'right', readOnly: true }),
      code(y, col(X.C5_R, X.G6_C), g(2 + r * 3)),
      mk(y, col(X.G6_C, X.C6_R), { kind: 'input', field: `${p}t112d${i}`, ariaLabel: `${who}の${i + 1}行目 ⑥③の財産に係る贈与税額`, commaInteger: true, align: 'right', hint: TAX_HINT }),
      code(y, col(X.C6_R, X.G7_C), g(3 + r * 3)),
      mk(y, col(X.G7_C, X.R), { kind: 'input', field: `${p}t112e${i}`, ariaLabel: `${who}の${i + 1}行目 ⑦外国税額控除額`, commaInteger: true, align: 'right', hint: FOREIGN_HINT }),
    ];
  }).flat();
}

/**
 * 1の合計行（⑧⑤の合計・⑨⑥の合計・⑩⑦の合計）。③④に合計欄は無く斜線が引かれている。
 * @param last その人の最終ページ（合計はページをまたいだ合計なので最終ページにだけ出す）
 */
function sumTotals(p: string, who: string, last: boolean): GridCell[] {
  const all = row(828, 902.5);
  const mark = row(828, 846);
  const value = row(846, 902.5);
  const total = (from: number, markX: number, to: number, no: string, codeName: string, field: string, name: string): GridCell[] => [
    label(mark, col(from, to), no, { align: 'left', fontSize: 8 }),
    code(value, col(from, markX), codeName),
    // 合計はページをまたいだ合計なので、最終ページ以外は空欄のままにする
    last
      ? mk(value, col(markX, to), {
        kind: 'input', field, ariaLabel: `${who}の${name}`, commaInteger: true, align: 'right', readOnly: true,
      })
      : mk(value, col(markX, to), {}),
  ];
  return [
    label(all, col(X.L, X.C2_R), '合　　　　計'),
    mk(all, col(X.C2_R, X.C3_R), { diagonal: 'bltr' }),
    mk(all, col(X.C3_R, X.C4_R), { diagonal: 'bltr' }),
    ...total(X.C4_R, X.G5_C, X.C5_R, '⑧', 'G58', `${p}t112v8`, '⑧相続時精算課税適用財産の価額の合計'),
    ...total(X.C5_R, X.G6_C, X.C6_R, '⑨', 'G59', `${p}t112v9`, '⑨贈与税額の合計'),
    ...total(X.C6_R, X.G7_C, X.R, '⑩', 'G60', `${p}t112v10`, '⑩外国税額控除額の合計'),
  ];
}

/** 2の表頭（贈与年月日・財産の明細） */
function detailHead(): GridCell[] {
  const upper = row(1107, 1161);
  const lower = row(1161, 1189);
  const both = row(1107, 1189);
  return [
    label(both, col(X.L, X.E1_C), '番号'),
    mk(both, col(X.E1_C, X.N_C), {}),
    label(upper, col(X.N_C, X.D_R), '①　　贈与年月日', { noBorder: true, align: 'left' }),
    label(upper, col(X.D_R, X.R), '②　　相続時精算課税適用財産の明細'),
    label(lower, col(X.N_C, X.ERA_R), '元号'),
    label(lower, col(X.ERA_R, X.YEAR_R), '年'),
    label(lower, col(X.YEAR_R, X.C1_R), '月'),
    label(lower, col(X.C1_R, X.D_R), '日'),
    label(lower, col(X.D_R, X.OFF_R), '種類'),
    label(lower, col(X.OFF_R, X.S_R), '細目'),
    label(lower, col(X.S_R, X.U_R), '利用区分、銘柄等'),
    label(lower, col(X.U_R, X.P_R), '所在場所等'),
    label(lower, col(X.P_R, X.Q_R), '数量'),
    label(lower, col(X.Q_R, X.C6_R), '（単位）'),
    label(lower, col(X.C6_R, X.R), '価額（円）'),
  ];
}

/** 2の明細6行（財産1件＝1行） */
function detailRows(p: string, who: string, page: number): GridCell[] {
  return Array.from({ length: TABLE112_ROWS }, (_, r): GridCell[] => {
    const top = DETAIL_TOP + r * ROW_H;
    const y = row(top, top + ROW_H);
    const i = page * TABLE112_ROWS + r;
    const e = (n: number) => `E${String(n).padStart(2, '0')}`;
    // 呼び名はその人を通した通し番号にする（枚数が増えても重複しない）
    const item = `${who}の明細${i + 1}`;
    return [
      code(y, col(X.L, X.NO2_C), `G${34 + r * 2}`),
      mk(y, col(X.NO2_C, X.E1_C), { kind: 'input', field: `${p}t112n${i}`, ariaLabel: `${item}の番号`, integerDigits: 1, align: 'center' }),
      code(y, col(X.E1_C, X.N_C), `N${String(1 + r).padStart(2, '0')}`),
      mk(y, col(X.N_C, X.ERA_R), { kind: 'input', field: `${p}t112g${i}Era`, ariaLabel: `${item}の贈与年月日の元号`, options: ERA_OPTIONS, compactSelectedOption: true }),
      mk(y, col(X.ERA_R, X.YEAR_R), dateSelect('y', `${p}t112g${i}Y`, `${item}の贈与年月日（年）`)),
      mk(y, col(X.YEAR_R, X.C1_R), dateSelect('m', `${p}t112g${i}M`, `${item}の贈与年月日（月）`)),
      mk(y, col(X.C1_R, X.D_R), dateSelect('d', `${p}t112g${i}D`, `${item}の贈与年月日（日）`)),
      code(y, col(X.D_R, X.K_C), e(25 + r * 6)),
      mk(y, col(X.K_C, X.OFF_R), { kind: 'input', field: `${p}t112k${i}`, ariaLabel: `${item}の種類` }),
      code(y, col(X.OFF_R, X.C2_R), e(26 + r * 6)),
      mk(y, col(X.C2_R, X.S_R), { kind: 'input', field: `${p}t112s${i}`, ariaLabel: `${item}の細目` }),
      code(y, col(X.S_R, X.U_C), e(27 + r * 6)),
      mk(y, col(X.U_C, X.U_R), { kind: 'input', field: `${p}t112u${i}`, ariaLabel: `${item}の利用区分、銘柄等` }),
      code(y, col(X.U_R, X.P_C), e(28 + r * 6)),
      mk(y, col(X.P_C, X.P_R), { kind: 'input', field: `${p}t112p${i}`, ariaLabel: `${item}の所在場所等`, align: 'left' }),
      code(y, col(X.P_R, X.G6_C), `C${String(1 + r).padStart(2, '0')}`),
      mk(y, col(X.G6_C, X.Q_R), { kind: 'input', field: `${p}t112q${i}`, ariaLabel: `${item}の数量`, align: 'right' }),
      code(y, col(X.Q_R, X.UNIT_C), e(29 + r * 6)),
      mk(y, col(X.UNIT_C, X.C6_R), { kind: 'input', field: `${p}t112t${i}`, ariaLabel: `${item}の単位`, align: 'center' }),
      code(y, col(X.C6_R, X.G7_C), `G${35 + r * 2}`),
      mk(y, col(X.G7_C, X.R), { kind: 'input', field: `${p}t112w${i}`, ariaLabel: `${item}の価額`, commaInteger: true, align: 'right' }),
    ];
  }).flat();
}

/**
 * 第11の2表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）
 * @param prefix 贈与を受けた人（＝財産を取得した人）のフィールド接頭辞
 * @param who アクセシブル名の主語（「1人目」など）
 * @param page その人の何枚目か（0始まり）
 * @param last その人の最終ページ（⑧⑨⑩の合計はここにだけ出す）
 * @param yearOptions 「贈与を受けた年分」の候補（giftYearOptions で作る）
 */
export function buildTable112(
  common: string, prefix: string, who: string, page: number, last: boolean, yearOptions: GridCell['options'],
): GridCell[] {
  return [
    ...headRows(common, prefix, who, yearOptions),

    ...sectionHead(363, 406.5, '1　相続税の課税価格に加算する相続時精算課税適用財産の価額及び納付すべき相続税額から控除すべき贈与税額の明細'),
    ...sumHead(),
    ...sumRows(prefix, who, page, yearOptions),
    ...sumTotals(prefix, who, last),
    numberedNotes(row(902.5, 1025), SUM_NOTES),

    ...sectionHead(1032.5, 1107, '2　相続時精算課税適用財産（1の③）の明細', '（上記1の「番号」欄の番号に合わせて記入します。）'),
    ...detailHead(),
    ...detailRows(prefix, who, page),
    numberedNotes(row(1528, 1622.5), DETAIL_NOTES),
  ];
}
