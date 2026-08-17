/**
 * 相続税の申告書 第11表の付表2「相続税がかかる財産の明細書（有価証券用）」。
 *
 * 組み立て方は `detail.ts`。ここが与えるのは罫線の位置と「財産の明細」部分の割付。
 * 座標はいずれも様式PNG（150dpi）の実測px。
 */

import {
  BRANCH_CODE_OPTIONS, BRANCH_CODE_SUFFIX, BROKER_CODE_OPTIONS, BROKER_CODE_SUFFIX,
  FOREIGN_OPTIONS, TABLE11F2_KINDS, TABLE11F2_SPECIAL_OPTIONS, codeNames, codeOptions,
} from '../data/detailCodes';
import type { DetailFrame, DetailShareCodes, DetailSpec } from './detail';

export const TABLE11F2_FORM_CODE = 'NTA0KSE162010020';
export const TABLE11F2_TITLE = '相続税の申告書　第11表の付表2';
export const TABLE11F2_SUBTITLE = '相続税がかかる財産の明細書\n（有価証券用）';

/** 罫線の位置。付表1より表が横に広い（1105px 対 1037px）。 */
const FRAME: DetailFrame = {
  left: 76.5,
  right: 1181.5,
  name: [95.5, 144],
  nameX: [598.5, 718.5, 740.5, 1006.5],
  lead: [153, 199],
  band: [199, 238],
  head: [238, 272, 306.5, 335.5],
  groupTops: [339.5, 511.5, 685.5, 859.5, 1033.5, 1207.5, 1381.5, 1555.5, 1730],
  rowLines: [116, 58],
  noCode: 98.5,
  noR: 141.5,
  midR: 890.5,
  splitR: 894.5,
  whoCode: 919.5,
  whoR: 985.5,
  amtCode: 1006.5,
};

/**
 * 識別コードの起点。1組あたり G が12個・E が8個・C が2個進む。
 * E01 は被相続人の氏名に使われているため、明細のEは E02 から始まる。
 */
const CODES = {
  G: { base: 1, step: 12 },
  E: { base: 2, step: 8 },
  C: { base: 1, step: 2 },
} as const;

/** 「分割が確定した財産」欄の識別コード（1組目 G07〜G12） */
export const TABLE11F2_SHARE: DetailShareCodes = {
  no: ['G6', 'G8', 'G10'],
  amount: ['G7', 'G9', 'G11'],
};

const LEAD = 'この明細書は、相続税がかかる財産（相続時精算課税適用財産を除きます。）のうち、'
  + '有価証券の明細を記入します。';

/** 小見出し（縦位置は `frame.head` = 238 / 272 / 306.5 / 335.5px の添字で指定する） */
const HEAD: DetailSpec['head'] = [
  { x: [141.5, 207.5], r: [0, 1], text: '細目コード', cell: { fontSize: 6 } },
  { x: [207.5, 337.5], r: [0, 1], text: '細目' },
  { x: [141.5, 272.5], r: [1, 2], text: '銘柄' },
  { x: [272.5, 337.5], r: [1, 2], text: '国外' },
  { x: [141.5, 207.5], r: [2, 3], text: '特例' },
  { x: [207.5, 337.5], r: [2, 3], text: '備考' },
  // 「所在場所等」だけは1つの枠に見出しと記入方法の注記が同居する
  { x: [337.5, 620.5], r: [0, 3], text: '' },
  { x: [337.5, 620.5], r: [0, 1], text: '所在場所等', cell: { noBorder: true } },
  {
    x: [337.5, 620.5], r: [1, 3],
    text: '上段：金融商品取引業者等コード・名称\n中段：支店等コード・名称\n下段：その他（発行法人の所在地等）',
    cell: { noBorder: true, align: 'left', fontSize: 6.5 },
  },
  { x: [620.5, 762.5], r: [0, 1], text: '数量（株・口・円）', cell: { fontSize: 6.5 } },
  { x: [762.5, 890.5], r: [0, 1], text: '為替（円）' },
  { x: [620.5, 890.5], r: [1, 2], text: '単価' },
  { x: [620.5, 890.5], r: [2, 3], text: '価額（円）' },
];

export const TABLE11F2_SPEC: DetailSpec = {
  formCode: TABLE11F2_FORM_CODE,
  title: TABLE11F2_TITLE,
  subtitle: TABLE11F2_SUBTITLE,
  lead: LEAD,
  frame: FRAME,
  codes: CODES,
  head: HEAD,
  rows: [
    [
      {
        x: [141.5, 163.5, 207.5], code: 'G1', field: 'kindCode', name: '細目コード',
        // コードを選ぶと右隣の「細目」に名称が入る（そのあと手で書き換えられる）
        autoFill: { field: 'kind', byValue: codeNames(TABLE11F2_KINDS) },
        cell: { options: codeOptions(TABLE11F2_KINDS), compactSelectedOption: true },
      },
      { x: [207.5, 228.5, 337.5], code: 'E0', field: 'kind', name: '細目', cell: { align: 'left' } },
      {
        x: [337.5, 359.5, 402.5], code: 'G3', field: 'brokerCode', name: '金融商品取引業者等コード',
        cell: { options: BROKER_CODE_OPTIONS, compactSelectedOption: true },
      },
      {
        x: [402.5, 424.5, 620.5], code: 'E4', field: 'broker', name: '金融商品取引業者等の名称',
        // 入力は「みずほ」のまま。用紙にはコードに合わせて「みずほ銀行」と出す
        suffixByCode: { field: 'brokerCode', ...BROKER_CODE_SUFFIX },
        cell: { align: 'left' },
      },
      {
        x: [620.5, 642.5, 762.5], code: 'C0', field: 'quantity', name: '数量',
        cell: { align: 'right', decimalPlaces: 2, commaInteger: true },
      },
      {
        x: [762.5, 784.5, 890.5], code: 'C1', field: 'fx', name: '為替',
        // 外貨建てのときだけ入れる欄。空欄は 1.0（邦貨建て）として価額を計算する
        cell: {
          align: 'right', decimalPlaces: 10, commaInteger: true,
          hint: '外貨建ての有価証券のとき、単価に掛ける邦貨換算の為替相場を記入します（空欄なら掛けません）',
        },
      },
    ],
    [
      // 銘柄は長くなりがちなので枠内で折り返す
      { x: [141.5, 163.5, 272.5], code: 'E1', field: 'issue', name: '銘柄', cell: { align: 'left', multiline: true } },
      {
        x: [272.5, 294.5, 337.5], code: 'G2', field: 'foreign', name: '国外',
        cell: {
          options: FOREIGN_OPTIONS, compactSelectedOption: true,
          // 記載例56ページ。「国内の口座で管理されていたものは記入不要」は様式にも記載要領にも無い
          hint: '有価証券の所在場所が国外である場合に「1」を記入します。\nただし国内にある金融商品取引業者等の営業所等の口座で管理されていたものは記入不要です',
        },
      },
      {
        x: [337.5, 359.5, 402.5], code: 'G4', field: 'branchCode', name: '支店等コード',
        cell: { options: BRANCH_CODE_OPTIONS, compactSelectedOption: true },
      },
      {
        x: [402.5, 424.5, 620.5], code: 'E5', field: 'branch', name: '支店等の名称',
        suffixByCode: { field: 'branchCode', ...BRANCH_CODE_SUFFIX },
        cell: { align: 'left' },
      },
      {
        x: [620.5, 642.5, 890.5], code: 'E7', field: 'unitPrice', name: '単価',
        cell: { align: 'right', decimalPlaces: 2, commaInteger: true },
      },
    ],
    [
      {
        x: [141.5, 163.5, 207.5], code: 'E2', field: 'special', name: '特例',
        cell: { options: TABLE11F2_SPECIAL_OPTIONS, compactSelectedOption: true },
      },
      { x: [207.5, 228.5, 337.5], code: 'E3', field: 'note', name: '備考', cell: { align: 'left' } },
      { x: [337.5, 359.5, 620.5], code: 'E6', field: 'other', name: 'その他（発行法人の所在地等）', cell: { align: 'left' } },
      { x: [620.5, 642.5, 890.5], code: 'G5', field: 'value', name: '価額', cell: { commaInteger: true, align: 'right' } },
    ],
  ],
  panel: [
    ['kindCode', 'kind'],
    ['brokerCode', 'broker', 'branchCode', 'branch', 'other', 'issue'],
    ['quantity', 'unitPrice', 'fx', 'value'],
    ['foreign', 'special', 'note'],
  ],
};
