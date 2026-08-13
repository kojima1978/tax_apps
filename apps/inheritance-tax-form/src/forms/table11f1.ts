/**
 * 相続税の申告書 第11表の付表1「相続税がかかる財産の明細書（土地・家屋等用）」。
 *
 * 組み立て方（項番・分割が確定した財産・組の繰り返し）は `detail.ts` が持つ。
 * ここが与えるのは罫線の位置と、中央の「財産の明細」部分の割付。
 * 座標はいずれも様式PNG（150dpi）の実測px。
 */

import {
  FOREIGN_OPTIONS, TABLE11F1_KINDS, TABLE11F1_SPECIAL_OPTIONS, codeNames, codeOptions,
} from '../data/detailCodes';
import type { DetailFrame, DetailShareCodes, DetailSpec } from './detail';

export const TABLE11F1_FORM_CODE = 'NTA0KSE161010020';
export const TABLE11F1_TITLE = '相続税の申告書　第11表の付表1';
export const TABLE11F1_SUBTITLE = '相続税がかかる財産の明細書\n（土地・家屋等用）';

/** 罫線の位置（様式PNG 150dpi の実測px） */
const FRAME: DetailFrame = {
  left: 76.5,
  right: 1113.5,
  name: [158.5, 203.5],
  nameX: [552.5, 653.5, 679.5, 951],
  lead: [211.5, 248.5],
  band: [248.5, 285],
  head: [285, 314, 343, 370],
  groupTops: [373.5, 534, 696, 858, 1020, 1182, 1344, 1506, 1668.5],
  rowLines: [108, 54],
  noCode: 103,
  noR: 134,
  midR: 837,
  splitR: 841,
  whoCode: 865,
  whoR: 926,
  amtCode: 952,
};

/**
 * 識別コードの起点。1組あたり G が13個・E が8個・C が2個進む。
 * E01 は被相続人の氏名に使われているため、明細のEは E02 から始まる。
 */
const CODES = {
  G: { base: 1, step: 13 },
  E: { base: 2, step: 8 },
  C: { base: 1, step: 2 },
} as const;

/** 「分割が確定した財産」欄の識別コード（1組目 G08〜G13） */
export const TABLE11F1_SHARE: DetailShareCodes = {
  no: ['G7', 'G9', 'G11'],
  amount: ['G8', 'G10', 'G12'],
};

/** 記載例54ページ。様式にも記載要領にも書かれていない条件なので入力欄の注記として添える */
const SHARE_HINT = '被相続人が有していた持分割合を記入します（単独で所有していた財産は記入不要）';
const NOTE_HINT = '区分所有財産は敷地利用権（敷地権）の割合を、家族名義の財産はその名義を記入します';

const LEAD = 'この明細書は、相続税がかかる財産（相続時精算課税適用財産を除きます。）のうち、'
  + '土地（土地の上に存する権利を含みます。）又は家屋等の明細を記入します。';

/** 小見出し（縦位置は `Y.HEAD` = 285 / 314 / 343 / 370px の添字で指定する） */
const HEAD: DetailSpec['head'] = [
  { x: [134, 195], r: [0, 1], text: '細目コード', cell: { fontSize: 6 } },
  { x: [195, 308], r: [0, 1], text: '細目' },
  { x: [134, 251.5], r: [1, 2], text: '利用区分' },
  { x: [251.5, 308], r: [1, 2], text: '国外' },
  { x: [134, 195], r: [2, 3], text: '特例' },
  { x: [195, 308], r: [2, 3], text: '備考' },
  // 「所在場所」だけは1つの枠に見出しと記入方法の注記が同居する
  { x: [308, 577], r: [0, 3], text: '' },
  { x: [308, 577], r: [0, 1], text: '所在場所', cell: { noBorder: true } },
  {
    x: [308, 577], r: [1, 3],
    text: '上段：（左）都道府県、（右）市区町村\n中段：大字・丁目\n下段：地番又は家屋番号',
    cell: { noBorder: true, align: 'left', fontSize: 6.5 },
  },
  { x: [577, 705], r: [0, 1], text: '面積（㎡）' },
  { x: [705, 837], r: [0, 1], text: '単価（円）又は倍数' },
  { x: [577, 705], r: [1, 2], text: '固定資産税評価額（円）', cell: { fontSize: 6.5 } },
  { x: [705, 837], r: [1, 2], text: '持分割合' },
  { x: [577, 837], r: [2, 3], text: '価額（円）' },
];

export const TABLE11F1_SPEC: DetailSpec = {
  formCode: TABLE11F1_FORM_CODE,
  title: TABLE11F1_TITLE,
  subtitle: TABLE11F1_SUBTITLE,
  lead: LEAD,
  frame: FRAME,
  codes: CODES,
  head: HEAD,
  rows: [
    [
      {
        x: [134, 160, 195], code: 'G1', field: 'kindCode', name: '細目コード',
        // コードを選ぶと右隣の「細目」に名称が入る（そのあと手で書き換えられる）
        autoFill: { field: 'kind', byValue: codeNames(TABLE11F1_KINDS) },
        cell: { options: codeOptions(TABLE11F1_KINDS), compactSelectedOption: true },
      },
      { x: [195, 221, 308], code: 'E0', field: 'kind', name: '細目' },
      { x: [308, 334, 426], code: 'E4', field: 'pref', name: '所在場所（都道府県）' },
      { x: [426, 452, 577], code: 'E5', field: 'city', name: '所在場所（市区町村）' },
      { x: [577, 603, 705], code: 'C0', field: 'area', name: '面積', cell: { align: 'right' } },
      { x: [705, 731, 837], code: 'C1', field: 'unitPrice', name: '単価又は倍数', cell: { align: 'right' } },
    ],
    [
      {
        x: [134, 160, 251.5], code: 'E1', field: 'usage', name: '利用区分',
        cell: { hint: '自用地（事業用・居住用・その他）、貸宅地、貸家建付地、借地権、自用家屋、貸家などの別を記入します。\n「配偶者居住権に基づく敷地利用権」は第15表③のほか⑦へ、「配偶者居住権」は⑩のほか⑪へも転記します' },
      },
      {
        x: [251.5, 277.5, 308], code: 'G2', field: 'foreign', name: '国外',
        cell: { options: FOREIGN_OPTIONS, compactSelectedOption: true, hint: '取得した土地又は家屋等の所在場所が国外である場合に「1」を記入します' },
      },
      { x: [308, 334, 577], code: 'E6', field: 'town', name: '所在場所（大字・丁目）' },
      { x: [577, 603, 705], code: 'G3', field: 'fixedValue', name: '固定資産税評価額', cell: { commaInteger: true, align: 'right' } },
      { x: [705, 731, 762], code: 'G4', field: 'shareN', name: '持分割合の分子', cell: { align: 'center', hint: SHARE_HINT } },
      { x: [762, 782], text: '／' },
      { x: [782, 808, 837], code: 'G5', field: 'shareD', name: '持分割合の分母', cell: { align: 'center', hint: SHARE_HINT } },
    ],
    [
      { x: [134, 160, 195], code: 'E2', field: 'special', name: '特例', cell: { options: TABLE11F1_SPECIAL_OPTIONS, compactSelectedOption: true } },
      { x: [195, 221, 308], code: 'E3', field: 'note', name: '備考', cell: { hint: NOTE_HINT } },
      { x: [308, 334, 577], code: 'E7', field: 'lot', name: '所在場所（地番又は家屋番号）' },
      { x: [577, 603, 837], code: 'G6', field: 'value', name: '価額', cell: { commaInteger: true, align: 'right' } },
    ],
  ],
};
