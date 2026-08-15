/**
 * 相続税の申告書 第11・11の2表の付表1（別表1）
 * 「小規模宅地等についての課税価格の計算明細書（別表1）」
 *
 * 一の宅地等（一棟の建物又は構築物の敷地）が、2人以上で取得されている場合か、
 * 貸家建付地で賃貸割合が1でない場合に、その一の宅地等ごとに1枚作成する。
 * 1枚に取得者2人分のブロックがあり、2つのブロックは罫線の並びが完全に同じで
 * 上端と識別コードの起点だけが違う（`BLOCKS`）。
 *
 * 罫線の位置は様式PDF（150dpi）の実測px。
 * 上端 182px 〜 下端 1696.5px、左端 16.5px 〜 右端 1222.5px。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE1112F1B_FORM_CODE = 'NTA0KSE114010030';
export const TABLE1112F1B_TITLE = '相続税の申告書　第11・11の2表の付表1（別表1）';
export const TABLE1112F1B_SUBTITLE = '小規模宅地等についての課税価格の計算明細書（別表1）';

/** 1枚に記入できる取得者の人数 */
export const TABLE1112F1B_OWNERS = 2;
/** 宅地等の利用区分（A〜F）の行数 */
export const TABLE1112F1B_ROWS = 6;
/** 「2 左記の宅地等のうち選択特例対象宅地等」の欄数（A・B上・B下・C・E） */
export const TABLE1112F1B_SLOTS = 5;

/** A〜Fの行 → その行が持つ「2 選択特例対象宅地等」欄の番号（D・Fは欄が無い） */
export const SLOTS_BY_ROW: readonly (readonly number[])[] = [[0], [1, 2], [3], [], [4], []];

/**
 * 小規模宅地等の種類 → 別表1のどの「2 選択特例対象宅地等」欄から③④を拾うか。
 * 1 特定居住用＝E行、2 特定事業用＝A行、3 特定同族会社事業用＝B行上段、
 * 4 貸付事業用＝B行下段＋C行（様式の注記どおり合計する）。
 */
export const SLOTS_BY_KIND: Record<string, readonly number[]> = { 1: [4], 2: [0], 3: [1], 4: [2, 3] };

const LEFT = 16.5;
const RIGHT = 1222.5;
const TOP = 182;
const BOTTOM = 1696.5;

export const TABLE1112F1B_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

const row = (a: number, b: number): [number, number] => [
  ((a - TOP) / (BOTTOM - TOP)) * 100,
  ((b - TOP) / (BOTTOM - TOP)) * 100,
];
const col = (a: number, b: number): [number, number] => [
  ((a - LEFT) / (RIGHT - LEFT)) * 100,
  ((b - LEFT) / (RIGHT - LEFT)) * 100,
];

const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮'] as const;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const INTRO = 'この計算明細書は、特例の対象として小規模宅地等を選択する一の宅地等（注1）が、'
  + '次のいずれかに該当する場合に一の宅地等ごとに作成します（注2）。\n'
  + '1　相続又は遺贈により一の宅地等を2人以上の相続人又は受遺者が取得している場合\n'
  + '2　一の宅地等の全部又は一部が、貸家建付地である場合において、貸家建付地の評価額の計算上'
  + '「賃貸割合」が「1」でない場合\n'
  + '（注）1　一の宅地等とは、一棟の建物又は構築物の敷地をいいます。ただし、マンションなどの'
  + '区分所有建物の場合には、区分所有された建物の部分に係る敷地をいいます。\n'
  + '　　　2　一の宅地等が、配偶者居住権に基づく敷地利用権又は配偶者居住権の目的となっている'
  + '建物の敷地の用に供される宅地等である場合には、この計算明細書によらず、'
  + '第11・11の2表の付表1（別表1の2）を使用してください。';

const SEC1_HEAD = '1　一の宅地等の所在地、面積及び評価額';
const SEC1_BODY = '一の宅地等について、宅地等の「所在地」、「面積」及び相続開始の直前における'
  + '宅地等の利用区分に応じて「面積」及び「評価額」を記入します。\n'
  + '⑴　「①宅地等の面積」欄は、一の宅地等が持分である場合には、持分に応ずる面積を記入してください。\n'
  + '⑵　上記2に該当する場合には、⑪欄については、⑤欄の面積を基に自用地として評価した金額を記入してください。';

const SEC2_HEAD = '2　一の宅地等の取得者ごとの面積及び評価額';
const SEC2_BODY = '上記のAからFまでの宅地等の「面積」及び「評価額」を、宅地等の取得者ごとに記入します。\n'
  + '⑴　「持分割合」欄は、宅地等の取得者が相続又は遺贈により取得した持分割合を記入します。'
  + '一の宅地等を1人で取得した場合には、「1／1」と記入します。\n'
  + '⑵　「1　持分に応じた宅地等」は、上記のAからFまでに記入した一の宅地等の「面積」及び「評価額」を'
  + '「持分割合」を用いてあん分して計算した「面積」及び「評価額」を記入します。\n'
  + '⑶　「2　左記の宅地等のうち選択特例対象宅地等」は、「1　持分に応じた宅地等」に記入した'
  + '「面積」及び「評価額」のうち、特例の対象として選択する部分を記入します。なお、Bの宅地等の場合は、'
  + '上段に「特定同族会社事業用宅地等」として選択する部分の、下段に「貸付事業用宅地等」として'
  + '選択する部分の「面積」及び「評価額」をそれぞれ記入します。\n'
  + '　「2　左記の宅地等のうち選択特例対象宅地等」に記入した宅地等の「面積」及び「評価額」は、'
  + '「申告書第11・11の2表の付表1」の「2　小規模宅地等の明細」の「③取得者の持分に応ずる宅地等の面積」欄'
  + '及び「④取得者の持分に応ずる宅地等の価額」欄に転記します。\n'
  + '⑷　「3　特例の対象とならない宅地等（1−2）」には、「1　持分に応じた宅地等」のうち'
  + '「2　左記の宅地等のうち選択特例対象宅地等」欄に記入した以外の宅地等について記入します。'
  + 'この欄に記入した「面積」及び「評価額」は、申告書第11表の付表1に転記します。';

/** 相続開始の直前における宅地等の利用区分（A〜F） */
const USE_ROWS = [
  '①のうち被相続人等の事業の用に供されていた宅地等\n（B、C及びDに該当するものを除きます。）',
  '①のうち特定同族会社の事業（貸付事業を除きます。）の用に供されていた宅地等',
  '①のうち被相続人等の貸付事業の用に供されていた宅地等\n（相続開始の時において継続的に貸付事業の用に供されていると認められる部分の敷地）',
  '①のうち被相続人等の貸付事業の用に供されていた宅地等\n（Cに該当する部分以外の部分の敷地）',
  '①のうち被相続人等の居住の用に供されていた宅地等',
  '①のうちAからEまでの宅地等に該当しない宅地等',
] as const;

/** 1の各行の横罫線（A〜Fの上端＋末尾） */
const SEC1_ROWS = [431.5, 465.5, 491, 525, 559, 584.5, 610] as const;

/** 取得者ブロック1つ分の横罫線 */
interface F1bBlock {
  /** 取得者氏名行の上端 */
  top: number;
  /** 持分割合の分数バー（上端・下端） */
  bar: readonly [number, number];
  /** 「1／2／3」の見出し行の上端 */
  head: number;
  /** 「面積（㎡）／評価額（円）」の見出し行の上端 */
  sub: number;
  /** A〜Fの上端＋末尾 */
  rows: readonly number[];
  /** 各行の「算式の印字」と「入力」の境 */
  splits: readonly number[];
  /** B行の2欄を上段・下段に分ける位置 */
  bMid: number;
}

const BLOCKS: readonly F1bBlock[] = [
  {
    top: 786, bar: [808.5, 821.5], head: 844, sub: 872.5,
    rows: [900.5, 955.5, 1022, 1077, 1132, 1187, 1240],
    splits: [920.5, 975.5, 1041.5, 1096.5, 1151.5, 1206.5], bMid: 986.5,
  },
  {
    top: 1244, bar: [1264.5, 1277.5], head: 1300, sub: 1328,
    rows: [1356.5, 1411.5, 1476, 1531, 1586, 1641, 1696.5],
    splits: [1376, 1431, 1496, 1551, 1606, 1661], bMid: 1441,
  },
];

/** 章見出し（太字の見出し行と、その下の説明文） */
function sectionHead(span: readonly [number, number], ratio: number, heading: string, body: string): GridCell[] {
  const split = span[0] + (span[1] - span[0]) * ratio;
  return [
    mk(row(span[0], span[1]), col(LEFT, RIGHT), {}),
    label(row(span[0], split), col(LEFT, RIGHT), heading, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    label(row(split, span[1]), col(LEFT, RIGHT), body, { noBorder: true, align: 'left', fontSize: 6.5 }),
  ];
}

/** 1 一の宅地等の所在地、面積及び評価額 */
function section1(prefix: string): GridCell[] {
  return [
    ...sectionHead([310, 379.5], 0.2, SEC1_HEAD, SEC1_BODY),

    // 所在地と①面積
    label(row(379.5, 407.5), col(LEFT, 197), '宅地等の所在地'),
    code(row(379.5, 407.5), col(197, 228), 'E02'),
    mk(row(379.5, 407.5), col(228, 822), {
      kind: 'input', field: `${prefix}place`, ariaLabel: '一の宅地等の所在地', align: 'left',
    }),
    label(row(379.5, 407.5), col(822, 998), '①宅地等の面積\n（㎡）', { fontSize: 7 }),
    code(row(379.5, 407.5), col(998, 1029), 'C01'),
    mk(row(379.5, 407.5), col(1029, RIGHT), {
      kind: 'input', field: `${prefix}area`, ariaLabel: '一の宅地等の面積', decimalPlaces: 2,
    }),

    // 見出し
    label(row(407.5, 431.5), col(LEFT, 611), '相続開始の直前における宅地等の利用区分'),
    label(row(407.5, 431.5), col(611, 852), '面積（㎡）'),
    label(row(407.5, 431.5), col(852, RIGHT), '評価額（円）'),

    // A〜F
    ...USE_ROWS.flatMap((text, r): GridCell[] => {
      const y = row(SEC1_ROWS[r]!, SEC1_ROWS[r + 1]!);
      return [
        label(y, col(LEFT, 38), LETTERS[r]!),
        label(y, col(38, 611), text, { align: 'left', fontSize: 6.5 }),
        label(y, col(611, 632), CIRCLED[1 + r]!),
        code(y, col(632, 662), cd('C', 2 + r)),
        mk(y, col(662, 852), {
          kind: 'input', field: `${prefix}r${r}a`, ariaLabel: `${LETTERS[r]!}の面積`, decimalPlaces: 2,
        }),
        label(y, col(852, 873), CIRCLED[7 + r]!),
        code(y, col(873, 904), cd('G', 1 + r)),
        mk(y, col(904, RIGHT), {
          kind: 'input', field: `${prefix}r${r}v`, ariaLabel: `${LETTERS[r]!}の評価額`, commaInteger: true,
        }),
      ];
    }),
  ];
}

/** 取得者ブロック1つ分（氏名・持分割合と、A〜Fの1／2／3欄） */
function ownerBlock(
  totals: string, prefix: string, sheet: number, b: number, whoOptions: GridCell['options'],
): GridCell[] {
  const blk = BLOCKS[b]!;
  const nameY = row(blk.top, blk.head);
  const share = CIRCLED[13 + b]!;
  const cBase = 8 + 17 * b;
  const gBase = 7 + 19 * b;
  let k = 0;
  const who = `取得者${b + 1}`;
  const cells: GridCell[] = [
    // 取得者氏名と持分割合
    label(nameY, col(LEFT, 197), '宅地等の取得者氏名'),
    code(nameY, col(197, 228), cd('E', 3 + b)),
    mk(nameY, col(228, 537), {
      kind: 'input', field: `${prefix}p${b}who`, ariaLabel: `${who}の氏名`, options: whoOptions, align: 'left',
    }),
    label(nameY, col(537, 684), `${share}持分割合`),
    // 分子・分数バー・分母の3段
    code(row(blk.top, blk.bar[0]), col(684, 714), cd('G', gBase)),
    mk(row(blk.top, blk.bar[0]), col(714, 822), {
      kind: 'input', field: `${prefix}p${b}num`, ariaLabel: `${who}の持分割合の分子`,
    }),
    mk(row(blk.bar[0], blk.bar[1]), col(684, 822), {}),
    code(row(blk.bar[1], blk.head), col(684, 714), cd('G', gBase + 1)),
    mk(row(blk.bar[1], blk.head), col(714, 822), {
      kind: 'input', field: `${prefix}p${b}den`, ariaLabel: `${who}の持分割合の分母`,
    }),
    mk(nameY, col(822, RIGHT), { diagonal: 'bltr' }),

    // 1／2／3 の見出しと、面積・評価額の見出し
    mk(row(blk.head, blk.rows[0]!), col(LEFT, 38), {}),
    label(row(blk.head, blk.sub), col(38, 421), '1　持分に応じた宅地等', { fontSize: 7 }),
    label(row(blk.head, blk.sub), col(421, 822), '2　左記の宅地等のうち選択特例対象宅地等', { fontSize: 7 }),
    label(row(blk.head, blk.sub), col(822, RIGHT), '3　特例の対象とならない宅地等（1−2）', { fontSize: 7 }),
    ...([[38, 197], [197, 421], [421, 580], [580, 822], [822, 998], [998, RIGHT]] as const)
      .map(([x0, x1], i) => label(row(blk.sub, blk.rows[0]!), col(x0, x1), i % 2 === 0 ? '面積（㎡）' : '評価額（円）', { fontSize: 7 })),
  ];

  USE_ROWS.forEach((_, r) => {
    const y0 = blk.rows[r]!;
    const y1 = blk.rows[r + 1]!;
    const full = row(y0, y1);
    const head = row(y0, blk.splits[r]!);
    const body = row(blk.splits[r]!, y1);
    const t = `${totals}f1b${sheet}p${b}`;

    // 左端のA〜Fと、1欄（持分に応じた宅地等・自動計算）
    cells.push(
      label(full, col(LEFT, 38), LETTERS[r]!),
      label(head, col(38, 197), `${CIRCLED[1 + r]!}×${share}`, { fontSize: 7 }),
      label(head, col(197, 421), `${CIRCLED[7 + r]!}×${share}`, { fontSize: 7 }),
      code(body, col(38, 68), cd('C', cBase + k)),
      mk(body, col(68, 197), {
        kind: 'input', field: `${t}o${r}a`, ariaLabel: `${who} ${LETTERS[r]!}の持分に応じた面積`,
        decimalPlaces: 2, readOnly: true,
      }),
      code(body, col(197, 228), cd('G', gBase + 2 + k)),
      mk(body, col(228, 421), {
        kind: 'input', field: `${t}o${r}v`, ariaLabel: `${who} ${LETTERS[r]!}の持分に応じた評価額`,
        commaInteger: true, readOnly: true,
      }),
    );
    k += 1;

    // 2欄（選択特例対象宅地等・手入力）。B行だけ上段・下段に分かれ、D・F行には欄が無い
    const slots = SLOTS_BY_ROW[r]!;
    if (slots.length === 0) {
      cells.push(mk(full, col(421, 580), { diagonal: 'bltr' }), mk(full, col(580, 822), { diagonal: 'bltr' }));
    } else {
      const bounds = slots.length === 2 ? [[y0, blk.bMid], [blk.bMid, y1]] : [[y0, y1]];
      slots.forEach((slot, si) => {
        const sy = row(bounds[si]![0]!, bounds[si]![1]!);
        cells.push(
          code(sy, col(421, 451), cd('C', cBase + k)),
          mk(sy, col(451, 580), {
            kind: 'input', field: `${prefix}p${b}s${slot}a`, ariaLabel: `${who} ${LETTERS[r]!}の選択特例対象宅地等の面積${slots.length === 2 ? si + 1 : ''}`,
            decimalPlaces: 2,
          }),
          code(sy, col(580, 611), cd('G', gBase + 2 + k)),
          mk(sy, col(611, 822), {
            kind: 'input', field: `${prefix}p${b}s${slot}v`, ariaLabel: `${who} ${LETTERS[r]!}の選択特例対象宅地等の評価額${slots.length === 2 ? si + 1 : ''}`,
            commaInteger: true,
          }),
        );
        k += 1;
      });
    }

    // 3欄（1−2・自動計算）
    cells.push(
      code(full, col(822, 852), cd('C', cBase + k)),
      mk(full, col(852, 998), {
        kind: 'input', field: `${t}n${r}a`, ariaLabel: `${who} ${LETTERS[r]!}の特例の対象とならない面積`,
        decimalPlaces: 2, readOnly: true,
      }),
      code(full, col(998, 1029), cd('G', gBase + 2 + k)),
      mk(full, col(1029, RIGHT), {
        kind: 'input', field: `${t}n${r}v`, ariaLabel: `${who} ${LETTERS[r]!}の特例の対象とならない評価額`,
        commaInteger: true, readOnly: true,
      }),
    );
    k += 1;
  });

  return cells;
}

/**
 * 第11・11の2表の付表1（別表1）のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 被相続人の氏名
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— 1欄・3欄
 * @param prefix この用紙（一の宅地等1件）のフィールド接頭辞
 * @param sheet 何枚目か（自動計算欄のキーに使う）
 * @param whoOptions 取得者氏名の選択肢（値は第11表の項番）
 */
export function buildTable1112f1b(
  common: string, totals: string, prefix: string, sheet: number, whoOptions: GridCell['options'],
): GridCell[] {
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    mk(row(182, 210.5), col(LEFT, 736), { noBorder: true }),
    label(row(182, 210.5), col(736, 925), '被相続人'),
    code(row(182, 210.5), col(925, 955), 'E01'),
    mk(row(182, 210.5), col(955, RIGHT), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    label(row(210.5, 304.5), col(LEFT, RIGHT), INTRO, { align: 'left', fontSize: 6.5 }),
    mk(row(304.5, 310), col(LEFT, RIGHT), { noBorder: true }),
    ...section1(prefix),
    mk(row(610, 615.5), col(LEFT, RIGHT), { noBorder: true }),
    ...sectionHead([615.5, 786], 0.13, SEC2_HEAD, SEC2_BODY),
    ...ownerBlock(totals, prefix, sheet, 0, whoOptions),
    mk(row(1240, 1244), col(LEFT, RIGHT), { noBorder: true }),
    ...ownerBlock(totals, prefix, sheet, 1, whoOptions),
  ];
}
