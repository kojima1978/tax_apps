/**
 * 相続税の申告書 第1表（続）。財産を取得した人を1枚あたり2人分記載する続紙。
 *
 * 縦罫線・人物ブロック・計算行の構造は第1表と完全に同じで、違うのは
 * 「被相続人／各人の合計」列が2人目の記載欄に置き換わる点と、Ⓑ・⑦欄が斜線で潰れる点。
 */

import type { GridCell } from '../components/ui/GridForm';
import {
  CALC_ORDER, GENERIC_ROWS, V, calcBands, calcRowRanges, calcRows, code,
  flag, label, mk, personColumn, personLabelColumn, type PersonCodes, type PersonY,
} from './geometry';
import { COMMON } from './table1';

export const TABLE1CONT_FORM_CODE = 'NTA0KSE011010030';
export const TABLE1CONT_TITLE = '相続税の申告書　第1表（続）';

const TOP = 197.5;
const BOTTOM = 1561.5;
/** 実測px → 様式高さに対する％ */
const y = (px: number): number => ((px - TOP) / (BOTTOM - TOP)) * 100;

/** 上部の帯だけで使う縦罫線（％）。※申告期限延長日は左右のブロックに1つずつ入る。 */
const EXT_L = [43.50, 82.62] as const;

/** 人物ブロックの行位置 */
const PY: PersonY = {
  head: [y(258.5), y(281)],
  furigana: [y(281), y(303.5)],
  name: [y(303.5), y(340.5)],
  myNumber: [y(340.5), y(374.5)],
  birthHead: [y(374.5), y(397)],
  birth: [y(397), y(436.5)],
  zip: [y(436.5), y(470.5)],
  address: [y(470.5), y(531)],
  tel: [y(531), y(565)],
  relation: [y(565), y(604.5)],
  cause: [y(604.5), y(636.5)],
  calcHead: [y(636.5), y(659)],
};

/** 左ブロック（この用紙の1人目）の識別コード */
const CODES_A: PersonCodes = {
  furigana: 'E01', name: 'E02', ref: 'G74', myNumber: 'G02', birth: 'N01', age: 'G03',
  zip: 'P01', address: 'E03', tel: 'T01', relation: 'G04', job: 'E04',
  cause: ['G05', 'G06', 'G07'],
};

/** 右ブロック（この用紙の2人目）の識別コード */
const CODES_B: PersonCodes = {
  furigana: 'E05', name: 'E06', ref: 'G75', myNumber: 'G33', birth: 'N02', age: 'G34',
  zip: 'P02', address: 'E07', tel: 'T02', relation: 'G35', job: 'E08',
  cause: ['G36', 'G37', 'G38'],
};

/** 計算行の識別コード（①〜⑥と⑧は個別、⑨以降は連番） */
function calcCodes(base: number, sixth: string[], eighth: string): Record<string, string> {
  return {
    ...Object.fromEntries(sixth.map((c, i): [string, string] => [CALC_ORDER[i]!, c])),
    v8: eighth,
    ...Object.fromEntries(
      CALC_ORDER.slice(CALC_ORDER.indexOf('v9')).map((key, i): [string, string] => [key, `G${base + i}`]),
    ),
  };
}

const CODES_CALC_A = calcCodes(14, ['G08', 'G09', 'G10', 'G11', 'G12', 'G13'], 'C01');
const CODES_CALC_B = calcCodes(45, ['G39', 'G40', 'G41', 'G42', 'G43', 'G44'], 'C02');

/** 計算欄の行位置（①の上端＝659px） */
const RY = calcRowRanges(659, y);

/** 上部の帯（修正申告の「1」と※申告期限延長日） */
function topRows(): GridCell[] {
  const r1: [number, number] = [y(197.5), y(217)];
  const r2: [number, number] = [y(217), y(249)];
  const r12: [number, number] = [y(197.5), y(249)];
  return [
    label(r12, [V.L, V.LBL_C], '修正申告の場合、右欄に\n「1」と記入します。'),
    code(r12, [V.LBL_C, V.CODE_C], 'G01'),
    mk(r12, [V.CODE_C, V.NUM], flag(`${COMMON}amend`, '修正申告の場合は1')),
    mk(r12, [V.NUM, EXT_L[0]], { noBorder: true }),
    ...EXT_L.flatMap((left, i): GridCell[] => {
      const right = i === 0 ? V.MID : V.R;
      return [
        label(r1, [left, right], '※申告期限延長日'),
        label(r2, [left, right], '年　　月　　日'),
      ];
    }),
    mk(r12, [V.MID, EXT_L[1]], { noBorder: true }),

    // 見出し帯の上の空白帯（様式に罫線が無い）
    mk([y(249), y(258.5)], [V.L, V.R], { noBorder: true }),
  ];
}

/**
 * Ⓑ欄・⑦欄。続紙では記入欄が斜線で潰され、2行分がひとつのマスになる。
 * 左のラベル列だけが第1表と同じ位置に残る（罫線 876px は 2.44〜23.98％ にしか無い）。
 */
function markedOutRows(): GridCell[] {
  const both: [number, number] = [RY.vB![0], RY.v7![1]];
  return [
    label(RY.vB!, [V.BAND1, V.LBL_A], '法定相続人の数\n（人）'),
    label(RY.vB!, [V.LBL_A, V.LBL], '遺産に係る\n基礎控除額'),
    mk(RY.vB!, [V.LBL, V.NUM], {}),
    label(RY.v7!, [V.BAND1, V.LBL], '相続税の総額'),
    label(RY.v7!, [V.LBL, V.NUM], '⑦', { fontSize: 10 }),
    mk(both, [V.NUM, V.MID], { diagonal: 'bltr' }),
    mk(both, [V.MID, V.R], { diagonal: 'bltr' }),
  ];
}

/**
 * 第1表（続）のセルを組み立てる。
 * @param pA 左ブロックのフィールド接頭辞 / @param whoA そのアクセシブル名
 * @param pB 右ブロックのフィールド接頭辞 / @param whoB そのアクセシブル名
 */
export function buildTable1Cont(pA: string, whoA: string, pB: string, whoB: string): GridCell[] {
  return [
    ...topRows(),
    ...personLabelColumn(PY),
    ...personColumn(V.LBL, PY, CODES_A, pA, whoA),
    ...personColumn(V.MID, PY, CODES_B, pB, whoB),
    ...calcBands(RY),
    ...calcRows({
      ry: RY, keys: [...GENERIC_ROWS], codes1: CODES_CALC_A, codes2: CODES_CALC_B,
      p1: pA, p2: pB, who1: whoA, who2: whoB,
    }),
    ...markedOutRows(),
  ];
}

/** 罫線表の下（枠外）に並ぶ「※確認」欄。left/width は様式幅に対する％。 */
export interface FooterBox {
  left: number;
  width: number;
  text?: string;
  code?: string;
}

export const TABLE1CONT_CONFIRM_BOXES: FooterBox[] = [
  { left: 52.22, width: 4.34, text: '※確認' },
  { left: 56.56, width: 2.17, code: 'G72' },
  { left: 58.73, width: 2.17 },
  { left: 91.31, width: 4.35, text: '※確認' },
  { left: 95.66, width: 2.17, code: 'G73' },
  { left: 97.83, width: 2.17 },
];

/** 様式の枠外に印字されている注記（第1表の注1・注2と同文） */
export const TABLE1CONT_NOTES = [
  '（注）1 この申告書で提出しない人である場合（参考として記載している場合）、その人の分は申告書とは取り扱いません。',
  '2 ⑲欄の金額が赤字となる場合は、⑲欄の頭に△を付してください。なお、この場合で、⑲欄の金額のうちに贈与税の外国税額控除額（第11の２表１⑩）があるときの㉒欄の金額については、「相続税の申告のしかた」を参照してください。',
].join('\n');
