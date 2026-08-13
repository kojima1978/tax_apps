/**
 * 相続税の申告書 第11表の付表4
 * 「相続税がかかる財産の明細書（事業（農業）用財産・家庭用財産・その他の財産用）」。
 *
 * 組み立て方は `detail.ts`。ここが与えるのは罫線の位置と「財産の明細」部分の割付。
 * 座標はいずれも様式PNG（150dpi）の実測px。
 */

import {
  FOREIGN_OPTIONS, TABLE11F4_KINDS, TABLE11F4_SPECIAL_OPTIONS, codeNames, codeOptions,
} from '../data/detailCodes';
import type { DetailFrame, DetailShareCodes, DetailSpec } from './detail';

export const TABLE11F4_FORM_CODE = 'NTA0KSE164010020';
export const TABLE11F4_TITLE = '相続税の申告書　第11表の付表4';
export const TABLE11F4_SUBTITLE = '相続税がかかる財産の明細書\n（事業（農業）用財産・家庭用財産・その他の財産用）';

/**
 * 罫線の位置。中央の「財産の名称等／所在場所等」を分ける罫線が左右の3行と揃っていないため、
 * `rowLines` が3本（組の下辺から 115 / 86.5 / 57.5px）ある。
 * 3行はそのうち0→1・1→3・3→4を使い、中央の2欄だけが0→2・2→4を使う。
 */
const FRAME: DetailFrame = {
  left: 76.5,
  right: 1157.5,
  name: [82.5, 131],
  nameX: [611.5, 717.5, 745.5, 994.5],
  lead: [135, 174.5],
  band: [174.5, 215],
  head: [215, 246, 277, 306],
  groupTops: [310, 480.5, 653, 825.5, 998, 1170.5, 1343, 1515.5, 1688],
  rowLines: [115, 86.5, 57.5],
  bands: [[0, 1], [1, 3], [3, 4]],
  noCode: 104.5,
  noR: 138.5,
  midR: 881.5,
  splitR: 885.5,
  whoCode: 911.5,
  whoR: 966.5,
  amtCode: 994.5,
};

/**
 * 識別コードの起点。1組あたり G が10個・E が6個・C が2個進む。
 * E01 は被相続人の氏名に使われているため、明細のEは E02 から始まる。
 */
const CODES = {
  G: { base: 1, step: 10 },
  E: { base: 2, step: 6 },
  C: { base: 1, step: 2 },
} as const;

/** 「分割が確定した財産」欄の識別コード（1組目 G05〜G10） */
export const TABLE11F4_SHARE: DetailShareCodes = {
  no: ['G4', 'G6', 'G8'],
  amount: ['G5', 'G7', 'G9'],
};

const LEAD = 'この明細書は、相続税がかかる財産（相続時精算課税適用財産を除きます。）のうち、'
  + '事業（農業）用財産、家庭用財産又はその他の財産の明細を記入します。';

/** 小見出し（縦位置は `frame.head` = 215 / 246 / 277 / 306px の添字で指定する） */
const HEAD: DetailSpec['head'] = [
  { x: [138.5, 199.5], r: [0, 1], text: '細目コード', cell: { fontSize: 6 } },
  { x: [199.5, 322.5], r: [0, 1], text: '細目' },
  { x: [138.5, 261.5], r: [1, 2], text: '特例' },
  { x: [261.5, 322.5], r: [1, 2], text: '国外' },
  { x: [138.5, 322.5], r: [2, 3], text: '備考' },
  // 中央の2欄だけ罫線が3段のグリッドから外れる（実測pxで指定する）
  { x: [322.5, 634.5], r: [0, 1], y: [215, 261.5], text: '財産の名称等' },
  { x: [322.5, 634.5], r: [1, 3], y: [261.5, 306], text: '財産の所在場所等' },
  { x: [634.5, 757.5], r: [0, 1], text: '数量' },
  { x: [757.5, 881.5], r: [0, 1], text: '倍数' },
  { x: [634.5, 881.5], r: [1, 2], text: '単価（円）' },
  { x: [634.5, 881.5], r: [2, 3], text: '価額（円）' },
];

export const TABLE11F4_SPEC: DetailSpec = {
  formCode: TABLE11F4_FORM_CODE,
  title: TABLE11F4_TITLE,
  subtitle: TABLE11F4_SUBTITLE,
  lead: LEAD,
  frame: FRAME,
  codes: CODES,
  head: HEAD,
  rows: [
    [
      {
        x: [138.5, 165.5, 199.5], code: 'G1', field: 'kindCode', name: '細目コード',
        // コードを選ぶと右隣の「細目」に名称が入る（そのあと手で書き換えられる）
        autoFill: { field: 'kind', byValue: codeNames(TABLE11F4_KINDS) },
        cell: { options: codeOptions(TABLE11F4_KINDS), compactSelectedOption: true },
      },
      { x: [199.5, 227.5, 322.5], code: 'E0', field: 'kind', name: '細目' },
      // 財産の名称等・所在場所等は上下2行分ずつをまたぐ
      { x: [322.5, 350.5, 634.5], code: 'E3', field: 'assetName', name: '財産の名称等', r: [0, 2] },
      { x: [322.5, 350.5, 634.5], code: 'E4', field: 'place', name: '財産の所在場所等', r: [2, 4] },
      { x: [634.5, 662.5, 757.5], code: 'E5', field: 'quantity', name: '数量', cell: { align: 'right' } },
      {
        x: [757.5, 785.5, 881.5], code: 'C0', field: 'multiple', name: '倍数',
        cell: { align: 'right', hint: '相続人及び包括受遺者が取得した立木は時価の85％で評価するため「0.85」と記入します（記載例60ページ）' },
      },
    ],
    [
      {
        x: [138.5, 165.5, 261.5], code: 'E1', field: 'special', name: '特例',
        cell: { options: TABLE11F4_SPECIAL_OPTIONS, compactSelectedOption: true },
      },
      { x: [261.5, 288.5, 322.5], code: 'G2', field: 'foreign', name: '国外', cell: { options: FOREIGN_OPTIONS, compactSelectedOption: true } },
      { x: [634.5, 662.5, 881.5], code: 'C1', field: 'unitPrice', name: '単価', cell: { align: 'right' } },
    ],
    [
      { x: [138.5, 165.5, 322.5], code: 'E2', field: 'note', name: '備考' },
      {
        x: [634.5, 662.5, 881.5], code: 'G3', field: 'value', name: '価額',
        // 記載例62ページ。代償財産だけは価額を0とし、授受の額は「取得財産の価額」欄に正負で書く
        cell: { commaInteger: true, align: 'right', hint: '代償財産（細目コード75）はこの欄に「0」と記入し、授受する金額は右の「取得財産の価額」欄に記入します' },
      },
    ],
  ],
};
