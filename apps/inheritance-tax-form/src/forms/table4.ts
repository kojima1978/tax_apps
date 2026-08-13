/**
 * 相続税の申告書 第4表「相続税額の加算金額の計算書」。
 *
 * 被相続人の一親等の血族及び配偶者以外の人（孫・兄弟姉妹・受遺者など）は
 * 相続税額が2割増しになる。その加算金額⑥を人ごとに求め、第1表⑪へ転記する。
 *
 * 1枚に4人分。人数からの自動決定はせず、用紙下の −／＋ で増減する
 * （加算の対象になるかどうかは続柄だけでは決まらないため）。
 *
 * 手入力は②（一親等の血族であった期間内の相続時精算課税適用財産）と
 * ⑤（第4表の付表Ⓐ）だけ。第4表の付表は実装対象24帳票に含まれないので⑤は手入力のままにする。
 * ①③④⑥は第1表からの転記と算式で決まる。氏名は第6表・第7表・第9表と同じ選択式（項番→氏名）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 209px（被相続人欄の上辺）〜下端 1563px（（注）の下辺）、
 * 左端 58.5px 〜 右端 1177.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE4_FORM_CODE = 'NTA0KSE040010040';
export const TABLE4_TITLE = '相続税の申告書　第4表';
export const TABLE4_SUBTITLE = '相続税額の加算金額の計算書';
export const TABLE4_EDITION = '（令和6年1月分以降用）（R8.7）';

/** 様式の枠外に印字されている注記（第4表は（注）が枠内にあるので無し） */
export const TABLE4_NOTES = '';

/** 1枚に記入できる加算の対象となる人の数 */
export const TABLE4_PERSONS = 4;

/** ⑥ 相続税額の加算金額の割増率（2割加算） */
export const TABLE4_RATE = 0.2;

const TOP = 209;
const BOTTOM = 1563;
const LEFT = 58.5;
const RIGHT = 1177.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE4_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 各行の上下位置（実測px） */
const Y = {
  decedent: [TOP, 247],
  lead: [247, 353.5],
  name: [353.5, 448],
  v1: [448, 542.5],
  v2: [542.5, 654.5],
  v3: [654.5, 816],
  v4: [816, 919],
  v5: [919, 1026.5],
  v6: [1026.5, 1139.5],
  notes: [1139.5, BOTTOM],
} as const;

/** 縦罫線（実測px） */
const X = {
  /** ②③④の左にある縦書き帯の右端（この帯は②③④の行にだけある） */
  BAND: 144.5,
  /** 行ラベルの右端／丸番号の右端 */
  LBL: 381.5, NUM: 402.5,
  /** 被相続人欄（右上）の縦罫線 */
  DEC_L: 725.5, DEC_C: 875.5, DEC_I: 897.5,
} as const;

/**
 * 人の列（4人分）の［コード枠の左端, コード枠の右端＝入力の左端, 入力の右端］。
 * 列のピッチは193pxだが、1人目のコード枠だけ22px（他は21px）なので実測値をそのまま持つ。
 */
const P: readonly (readonly [number, number, number])[] = [
  [402.5, 424.5, 596.5],
  [596.5, 617.5, 789.5],
  [789.5, 811.5, 983.5],
  [983.5, 1004.5, RIGHT],
];

/** 人ごとのGコードの増分（① G01・G08・G15・G22 のように7ずつ増える。G05系列は欠番） */
const G_STEP = 7;

const LEAD = '　この表は、相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人のうちに、'
  + '被相続人の一親等の血族（代襲して相続人となった直系卑属を含みます。）及び配偶者以外の人がいる場合に記入します。\n\n'
  + '（注）　一親等の血族であっても相続税額の加算の対象となる場合があります。'
  + '詳しくは「相続税の申告のしかた」をご覧ください。';

/** ②③④の左の縦書き帯（様式では左から右へ列が進む） */
const BAND = '相続時精算課税に係る贈与を受けている人で、かつ、相続開始の時までに'
  + '被相続人との続柄に変更（養子縁組の解消等）があった場合に記入します。';

/**
 * 枠内の（注）1〜3。
 * 注2の算式は様式では大かっこで括った分数の図になっているが、
 * 罫線表の中に図は置けないので 〔…〕×〔…〕÷〔…〕 のテキストで表す。
 */
const NOTES = '（注）　1　相続時精算課税適用者である孫が相続開始の時までに被相続人の養子となった場合は、'
  + '「相続時精算課税に係る贈与を受けている人で、かつ、相続開始の時までに被相続人との続柄に変更があった場合」'
  + 'には含まれませんので②欄から④欄までの記入は不要です。\n'
  + '　　　　2　②欄には、次に掲げる場合の区分に応じ、それぞれ次の金額の合計額を記入します。\n'
  + '　　　　　⑴　令和5年12月31日以前に被相続人からの贈与により取得した財産の場合\n'
  + '　　　　　　　被相続人の一親等の血族であった期間内にその被相続人から相続時精算課税に係る贈与によって取得した財産の価額\n'
  + '　　　　　⑵　令和6年1月1日以後に被相続人からの贈与により取得した財産の場合\n'
  + '　　　　　　　被相続人から贈与を受けた年分ごとに次の算式により算出した金額の合計額\n'
  + '　　　　　　　（算式）〔被相続人の一親等の血族であった期間内にその被相続人から相続時精算課税に係る贈与によって取得した財産の価額〕'
  + '−〔その期間内の被相続人に係る各年分の贈与税の相続時精算課税に係る基礎控除額（※）〕\n'
  + '　　　　　　　※　同一年中に被相続人の一親等の血族であった期間と一親等の血族に該当しない期間のいずれの期間内にも'
  + 'その被相続人から相続時精算課税に係る贈与を受けた年分については、次の算式により算出した金額となります。\n'
  + '　　　　　　　（算式）〔その年分において被相続人からの贈与により取得した財産の価額から控除した相続時精算課税に係る基礎控除額〕'
  + '×〔その年分の被相続人の一親等の血族であった期間内にその被相続人から相続時精算課税に係る贈与によって取得した財産の価額〕'
  + '÷〔その年分の被相続人から相続時精算課税に係る贈与によって取得した財産の価額〕\n'
  + '　　　　3　各人の⑥欄の金額を第1表のその人の「相続税額の2割加算が行われる場合の加算金額⑪」欄に転記します。';

/** ①〜⑥の行の諸元 */
interface RowDef {
  /** フィールドキー（共通欄・自動計算欄とも `t4{通し番号}{key}`） */
  key: string;
  no: string;
  /** 1人目のGコードの番号（人ごとに G_STEP ずつ増える） */
  g: number;
  y: readonly [number, number];
  label: string;
  /** 左に縦書き帯がある行（②③④） */
  band?: boolean;
  /** 手入力の行（②⑤） */
  editable?: boolean;
}

const ROWS: readonly RowDef[] = [
  {
    key: 'v1', no: '①', g: 1, y: Y.v1,
    label: '各人の税額控除前の相続税額(円)\n（第1表⑨又は第1表⑩の金額）',
  },
  {
    key: 'v2', no: '②', g: 2, y: Y.v2, band: true, editable: true,
    label: '被相続人の一親等の血族であった期間内にその被相続人から相続時精算課税に係る贈与によって取得した財産の価額の合計額(円)',
  },
  {
    key: 'v3', no: '③', g: 3, y: Y.v3, band: true,
    label: '被相続人から相続、遺贈や相続時精算課税に係る贈与によって取得した財産などで相続税の課税価格に算入された財産の価額(円)\n（第1表①＋第1表②＋第1表⑤）',
  },
  {
    key: 'v4', no: '④', g: 4, y: Y.v4, band: true,
    label: '加算の対象とならない相続税額(円)　（①×②÷③）',
  },
  {
    key: 'v5', no: '⑤', g: 6, y: Y.v5, editable: true,
    label: '管理残額がある場合の加算の対象とならない相続税額(円)\n　（第4表の付表Ⓐ）',
  },
  {
    key: 'v6', no: '⑥', g: 7, y: Y.v6,
    label: '相続税額の加算金額(円)　（①×0.2）\nただし、上記④又は⑤の金額がある場合には、（（①−④−⑤）×0.2）となります。',
  },
];

/**
 * 第4表1枚分のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 被相続人の氏名・氏名の項番・②⑤
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ①③④⑥
 * @param page 何枚目か（0起点）。人の通し番号は `page * TABLE4_PERSONS + 列番号`
 * @param options 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable4(
  common: string, totals: string, page: number, options: GridCell['options'],
): GridCell[] {
  /** この用紙に載る人の通し番号 */
  const at = (j: number): number => page * TABLE4_PERSONS + j;

  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）。左側は罫線の無い余白
    mk(row(Y.decedent[0], Y.decedent[1]), col(LEFT, X.DEC_L), { noBorder: true }),
    label(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_L, X.DEC_C), '被相続人'),
    code(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_C, X.DEC_I), 'E01'),
    mk(row(Y.decedent[0], Y.decedent[1]), col(X.DEC_I, RIGHT), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
    }),

    label(row(Y.lead[0], Y.lead[1]), col(LEFT, RIGHT), LEAD, { align: 'left', fontSize: 7.5 }),

    // 加算の対象となる人の氏名（項番→氏名の選択式）。この行だけ丸番号の列が無い
    label(row(Y.name[0], Y.name[1]), col(LEFT, X.NUM), '加算の対象となる人の氏名'),
    ...P.flatMap(([codeL, codeR, valueR], j): GridCell[] => [
      code(row(Y.name[0], Y.name[1]), col(codeL, codeR), cd('E', 2 + j)),
      mk(row(Y.name[0], Y.name[1]), col(codeR, valueR), {
        kind: 'input', field: `${common}t4${at(j)}no`, ariaLabel: `${at(j) + 1}人目の加算の対象となる人の氏名`, options, align: 'left',
      }),
    ]),

    // ②③④の左の縦書き帯（様式では列が左から右へ進む）
    label(row(Y.v2[0], Y.v4[1]), col(LEFT, X.BAND), BAND, { verticalLr: true, align: 'left', fontSize: 7 }),

    // ①〜⑥
    ...ROWS.flatMap((def): GridCell[] => {
      const y = row(def.y[0], def.y[1]);
      const name = `${def.no}${def.label.split('\n')[0]}`;
      return [
        label(y, col(def.band === true ? X.BAND : LEFT, X.LBL), def.label, { fontSize: 8 }),
        label(y, col(X.LBL, X.NUM), def.no, { fontSize: 10, semanticRole: 'rowheader' }),
        ...P.flatMap(([codeL, codeR, valueR], j): GridCell[] => [
          code(y, col(codeL, codeR), cd('G', def.g + G_STEP * j)),
          mk(y, col(codeR, valueR), {
            kind: 'input',
            field: `${def.editable === true ? common : totals}t4${at(j)}${def.key}`,
            ariaLabel: `${at(j) + 1}人目の${name}`,
            commaInteger: true,
            readOnly: def.editable !== true,
          }),
        ]),
      ];
    }),

    label(row(Y.notes[0], Y.notes[1]), col(LEFT, RIGHT), NOTES, { align: 'left', fontSize: 6.5 }),
  ];
}
