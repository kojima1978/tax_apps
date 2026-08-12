/**
 * 相続税の申告書 第11表の付表1「相続税がかかる財産の明細書（土地・家屋等用）」。
 *
 * 骨格（項番・分割が確定した財産・組の繰り返し）は `detail.ts` が持つ。
 * ここが与えるのは中央の「財産の明細」部分の割付だけ。x は様式PNG（150dpi）の実測px。
 */

import type { DetailShareCodes, DetailSpec } from './detail';

export const TABLE11F1_FORM_CODE = 'NTA0KSE161010020';
export const TABLE11F1_TITLE = '相続税の申告書　第11表の付表1';
export const TABLE11F1_SUBTITLE = '相続税がかかる財産の明細書\n（土地・家屋等用）';

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
  codes: CODES,
  head: HEAD,
  rows: [
    [
      { x: [134, 160, 195], code: 'G1', field: 'kindCode', name: '細目コード', cell: { integerDigits: 2, align: 'center' } },
      { x: [195, 221, 308], code: 'E0', field: 'kind', name: '細目' },
      { x: [308, 334, 426], code: 'E4', field: 'pref', name: '所在場所（都道府県）' },
      { x: [426, 452, 577], code: 'E5', field: 'city', name: '所在場所（市区町村）' },
      { x: [577, 603, 705], code: 'C0', field: 'area', name: '面積', cell: { align: 'right' } },
      { x: [705, 731, 837], code: 'C1', field: 'unitPrice', name: '単価又は倍数', cell: { align: 'right' } },
    ],
    [
      { x: [134, 160, 251.5], code: 'E1', field: 'usage', name: '利用区分' },
      { x: [251.5, 277.5, 308], code: 'G2', field: 'foreign', name: '国外', cell: { integerDigits: 1, align: 'center' } },
      { x: [308, 334, 577], code: 'E6', field: 'town', name: '所在場所（大字・丁目）' },
      { x: [577, 603, 705], code: 'G3', field: 'fixedValue', name: '固定資産税評価額', cell: { commaInteger: true, align: 'right' } },
      { x: [705, 731, 762], code: 'G4', field: 'shareN', name: '持分割合の分子', cell: { align: 'center' } },
      { x: [762, 782], text: '／' },
      { x: [782, 808, 837], code: 'G5', field: 'shareD', name: '持分割合の分母', cell: { align: 'center' } },
    ],
    [
      { x: [134, 160, 195], code: 'E2', field: 'special', name: '特例' },
      { x: [195, 221, 308], code: 'E3', field: 'note', name: '備考' },
      { x: [308, 334, 577], code: 'E7', field: 'lot', name: '所在場所（地番又は家屋番号）' },
      { x: [577, 603, 837], code: 'G6', field: 'value', name: '価額', cell: { commaInteger: true, align: 'right' } },
    ],
  ],
};
