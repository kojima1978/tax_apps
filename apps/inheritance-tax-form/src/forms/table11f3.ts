/**
 * 相続税の申告書 第11表の付表3「相続税がかかる財産の明細書（現金・預貯金等用）」。
 *
 * 組み立て方は `detail.ts`。ここが与えるのは罫線の位置と「財産の明細」部分の割付。
 * 座標はいずれも様式PNG（150dpi）の実測px。
 */

import {
  BANK_CODE_OPTIONS, BANK_CODE_SUFFIX, BRANCH_CODE_OPTIONS, BRANCH_CODE_SUFFIX,
  FOREIGN_OPTIONS, TABLE11F3_KINDS, codeNames, codeOptions,
} from '../data/detailCodes';
import type { DetailFrame, DetailShareCodes, DetailSpec } from './detail';

export const TABLE11F3_FORM_CODE = 'NTA0KSE163010020';
export const TABLE11F3_TITLE = '相続税の申告書　第11表の付表3';
export const TABLE11F3_SUBTITLE = '相続税がかかる財産の明細書\n（現金・預貯金等用）';

/**
 * 罫線の位置。右側の「数量・単価」と「価額」を分ける罫線が左側の3行と揃っていないため、
 * `rowLines` が3本（組の下辺から 117 / 88 / 58.5px）ある。
 * 3行はそのうち0→1・1→3・3→4を使い、数量欄だけが0→2・2→4を使う。
 */
const FRAME: DetailFrame = {
  left: 76.5,
  right: 1215,
  name: [76, 125],
  nameX: [625.5, 740.5, 762.5, 1038.5],
  lead: [134, 174.5],
  band: [174.5, 214],
  head: [214, 252, 283.5, 313],
  groupTops: [317, 490.5, 666, 841.5, 1017, 1192.5, 1368, 1543.5, 1719],
  rowLines: [117, 88, 58.5],
  bands: [[0, 1], [1, 3], [3, 4]],
  noCode: 102.5,
  noR: 146.5,
  midR: 918.5,
  splitR: 922.5,
  whoCode: 946.5,
  whoR: 1012.5,
  amtCode: 1038.5,
};

/**
 * 識別コードの起点。1組あたり G が12個・E が7個・C が1個進む。
 * E01 は被相続人の氏名に使われているため、明細のEは E02 から始まる。
 */
const CODES = {
  G: { base: 1, step: 12 },
  E: { base: 2, step: 7 },
  C: { base: 1, step: 1 },
} as const;

/** 「分割が確定した財産」欄の識別コード（1組目 G07〜G12） */
export const TABLE11F3_SHARE: DetailShareCodes = {
  no: ['G6', 'G8', 'G10'],
  amount: ['G7', 'G9', 'G11'],
};

const LEAD = 'この明細書は、相続税がかかる財産（相続時精算課税適用財産を除きます。）のうち、'
  + '現金又は預貯金等の明細を記入します。';

/** 小見出し（縦位置は `frame.head` = 214 / 252 / 283.5 / 313px の添字で指定する） */
const HEAD: DetailSpec['head'] = [
  { x: [146.5, 217.5], r: [0, 1], text: '口座種別等\nコード', cell: { fontSize: 6 } },
  { x: [217.5, 357.5], r: [0, 1], text: '口座種別等' },
  { x: [146.5, 287.5], r: [1, 2], text: '口座番号' },
  { x: [287.5, 357.5], r: [1, 2], text: '国外' },
  { x: [146.5, 357.5], r: [2, 3], text: '備考' },
  // 「所在場所等」だけは1つの枠に見出しと記入方法の注記が同居する
  { x: [357.5, 647.5], r: [0, 3], text: '' },
  { x: [357.5, 647.5], r: [0, 1], text: '所在場所等', cell: { noBorder: true } },
  {
    x: [357.5, 647.5], r: [1, 3],
    text: '上段：金融機関等コード・名称\n中段：支店等コード・名称\n下段：その他（所在地等）',
    cell: { noBorder: true, align: 'left', fontSize: 6.5 },
  },
  // 右側の3欄だけ罫線が3段のグリッドから外れる（実測pxで指定する）
  { x: [647.5, 784.5], r: [0, 1], y: [214, 267.5], text: '数量' },
  { x: [784.5, 918.5], r: [0, 1], y: [214, 267.5], text: '単価（円）' },
  { x: [647.5, 918.5], r: [1, 3], y: [267.5, 313], text: '価額（円）' },
];

export const TABLE11F3_SPEC: DetailSpec = {
  formCode: TABLE11F3_FORM_CODE,
  title: TABLE11F3_TITLE,
  subtitle: TABLE11F3_SUBTITLE,
  lead: LEAD,
  frame: FRAME,
  codes: CODES,
  head: HEAD,
  rows: [
    [
      {
        x: [146.5, 173.5, 217.5], code: 'G1', field: 'kindCode', name: '口座種別等コード',
        // コードを選ぶと右隣の「口座種別等」に名称が入る（そのあと手で書き換えられる）
        autoFill: { field: 'kind', byValue: codeNames(TABLE11F3_KINDS) },
        cell: { options: codeOptions(TABLE11F3_KINDS), compactSelectedOption: true },
      },
      { x: [217.5, 243.5, 357.5], code: 'E0', field: 'kind', name: '口座種別等', cell: { align: 'left' } },
      {
        x: [357.5, 379.5, 423.5], code: 'G3', field: 'bankCode', name: '金融機関等コード',
        cell: { options: BANK_CODE_OPTIONS, compactSelectedOption: true },
      },
      {
        x: [423.5, 449.5, 647.5], code: 'E3', field: 'bank', name: '金融機関等の名称',
        // 入力は「みずほ」のまま。用紙にはコードに合わせて「みずほ銀行」と出す
        suffixByCode: { field: 'bankCode', ...BANK_CODE_SUFFIX },
        cell: { align: 'left' },
      },
      // 数量と単価は上2行分をまたぐ
      { x: [647.5, 674.5, 784.5], code: 'E6', field: 'quantity', name: '数量', r: [0, 2], cell: { align: 'right' } },
      { x: [784.5, 810.5, 918.5], code: 'C0', field: 'unitPrice', name: '単価', r: [0, 2], cell: { align: 'right' } },
    ],
    [
      { x: [146.5, 173.5, 287.5], code: 'E1', field: 'account', name: '口座番号', cell: { align: 'left' } },
      {
        x: [287.5, 313.5, 357.5], code: 'G2', field: 'foreign', name: '国外',
        cell: {
          options: FOREIGN_OPTIONS, compactSelectedOption: true,
          // 記載例58ページ。判定するのは財産の所在ではなく「預入れをしていた営業所」の所在
          hint: '預貯金等の預入れをしていた営業所又は事業所の所在場所が国外である場合に「1」を記入します',
        },
      },
      {
        x: [357.5, 379.5, 423.5], code: 'G4', field: 'branchCode', name: '支店等コード',
        cell: { options: BRANCH_CODE_OPTIONS, compactSelectedOption: true },
      },
      {
        x: [423.5, 449.5, 647.5], code: 'E4', field: 'branch', name: '支店等の名称',
        suffixByCode: { field: 'branchCode', ...BRANCH_CODE_SUFFIX },
        cell: { align: 'left' },
      },
      // 価額は下2行分をまたぐ
      { x: [647.5, 674.5, 918.5], code: 'G5', field: 'value', name: '価額', r: [2, 4], cell: { commaInteger: true, align: 'right' } },
    ],
    [
      {
        x: [146.5, 173.5, 357.5], code: 'E2', field: 'note', name: '備考',
        cell: { align: 'left', hint: '家族名義の財産を記入する場合は、その財産の名義を記入します（記載例58ページ）' },
      },
      { x: [357.5, 379.5, 647.5], code: 'E5', field: 'other', name: 'その他（所在地等）', cell: { align: 'left' } },
    ],
  ],
};
