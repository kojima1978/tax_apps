/**
 * 相続税の申告書 第14表
 * 「純資産価額に加算される暦年課税分の贈与財産価額及び特定贈与財産価額、
 * 出資持分の定めのない法人などに遺贈した財産、
 * 特定の公益法人などに寄附した相続財産・特定公益信託などのために支出した相続財産の明細書」。
 *
 * 1枚に 1の明細4行＋④の合計4人分、2の明細2行、3の明細2行 が載る。
 * 枚数は表全体で1つ（共通欄 `t14Pages`）。件数からは導出しない。
 * 1の④の各人の合計・2の合計・3の合計は全枚数を通した合計なので、**最終ページにだけ値を出す**
 * （第9表・第13表と同じ扱い）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 251.5px（被相続人欄の上辺）〜下端 1682.5px（下部の（注）の下辺）、
 * 左端 39px 〜 右端 1199px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { code, label, mk } from './geometry';

export const TABLE14_FORM_CODE = 'NTA0KSE141010040';
export const TABLE14_TITLE = '相続税の申告書　第14表';
export const TABLE14_SUBTITLE = '純資産価額に加算される暦年課税分の贈与財産価額及び特定贈与財産価額、'
  + '出資持分の定めのない法人などに遺贈した財産、'
  + '特定の公益法人などに寄附した相続財産・特定公益信託などのために支出した相続財産の明細書';
export const TABLE14_EDITION = '（令和7年1月分以降用）（R8.7）';

/** 様式1枚に記入できる「1 暦年課税分の贈与財産」の件数 */
export const TABLE14_GIFT_ROWS = 4;
/** 様式1枚に載る「贈与を受けた人ごとの③欄の合計額」の人数 */
export const TABLE14_PERSONS = 4;
/** 様式1枚に記入できる「2 出資持分の定めのない法人などに遺贈した財産」の件数 */
export const TABLE14_BEQUEST_ROWS = 2;
/** 様式1枚に記入できる「3 特定の公益法人などに寄附した相続財産」の件数 */
export const TABLE14_DONATION_ROWS = 2;

const TOP = 251.5;
const BOTTOM = 1682.5;
const LEFT = 39;
const RIGHT = 1199;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE14_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

// ---------------------------------------------------------------- 共通の部品

/** 「1 …」などの章見出し（太字1行） */
function heading(top: number, bottom: number, text: string): GridCell {
  return label(row(top, bottom), col(LEFT, RIGHT), text, { noBorder: true, align: 'left', bold: true, fontSize: 9 });
}

/** 章見出しの下に続く説明文 */
function lead(top: number, bottom: number, text: string, fontSize = 7.5): GridCell {
  return label(row(top, bottom), col(LEFT, RIGHT), text, { noBorder: true, align: 'left', fontSize });
}

/** 元号・年・月・日の見出し（明細1行目の上に載る細い帯）と入力1組で共有する縦割り */
type DateX = readonly [number, number, number, number, number, number];

/** 元号・年・月・日の見出し */
function dateHead(y: [number, number], xs: DateX): GridCell[] {
  return [
    mk(y, col(xs[0], xs[1]), {}),
    label(y, col(xs[1], xs[2]), '元号', { fontSize: 6 }),
    label(y, col(xs[2], xs[3]), '年', { fontSize: 6 }),
    label(y, col(xs[3], xs[4]), '月', { fontSize: 6 }),
    label(y, col(xs[4], xs[5]), '日', { fontSize: 6 }),
  ];
}

/** 元号・年・月・日の入力1組 */
function dateRow(y: [number, number], xs: DateX, codeName: string, field: string, who: string): GridCell[] {
  return [
    code(y, col(xs[0], xs[1]), codeName),
    mk(y, col(xs[1], xs[2]), { kind: 'input', field: `${field}Era`, ariaLabel: `${who}の元号`, options: ERA_OPTIONS, compactSelectedOption: true }),
    mk(y, col(xs[2], xs[3]), { kind: 'input', field: `${field}Y`, ariaLabel: `${who}（年）`, integerDigits: 2, align: 'center' }),
    mk(y, col(xs[3], xs[4]), { kind: 'input', field: `${field}M`, ariaLabel: `${who}（月）`, integerDigits: 2, align: 'center' }),
    mk(y, col(xs[4], xs[5]), { kind: 'input', field: `${field}D`, ariaLabel: `${who}（日）`, integerDigits: 2, align: 'center' }),
  ];
}

/** 種類・細目・所在場所等・数量・単位・価額の縦割り（コード枠の左端と欄の右端の並び） */
type PropX = readonly number[];

/** 財産の明細（種類〜価額）の見出し。2と3で列幅だけが違う。 */
function propHead(y: [number, number], xs: PropX): GridCell[] {
  return [
    label(y, col(xs[0], xs[1]), '種　類'),
    label(y, col(xs[1], xs[2]), '細　目'),
    label(y, col(xs[2], xs[3]), '所　在　場　所　等'),
    label(y, col(xs[3], xs[4]), '数　量'),
    label(y, col(xs[4], xs[5]), '(単位)', { fontSize: 6 }),
    label(y, col(xs[5], xs[6]), '価　額(円)'),
  ];
}

/** 財産の明細（種類〜価額）の入力1組。コードは種類・細目・所在場所等・数量・単位・価額の6つ。 */
function propRow(
  y: [number, number], xs: PropX, field: string, who: string, codes: readonly string[],
): GridCell[] {
  const CW = 22; // コード枠の幅（実測px。どの欄も共通）
  const defs = [
    { label: '種類', key: 'Kind', align: 'left' as const },
    { label: '細目', key: 'Item', align: 'left' as const },
    { label: '所在場所等', key: 'Place', align: 'left' as const },
    { label: '数量', key: 'Qty', align: 'right' as const },
    { label: '単位', key: 'Unit', align: 'center' as const },
  ];
  return [
    ...defs.flatMap((def, n): GridCell[] => [
      code(y, col(xs[n]!, xs[n]! + CW), codes[n]!),
      mk(y, col(xs[n]! + CW, xs[n + 1]!), { kind: 'input', field: `${field}${def.key}`, ariaLabel: `${who}の${def.label}`, align: def.align }),
    ]),
    code(y, col(xs[5]!, xs[5]! + CW), codes[5]!),
    mk(y, col(xs[5]! + CW, xs[6]!), { kind: 'input', field: `${field}Amt`, ariaLabel: `${who}の価額`, commaInteger: true }),
  ];
}

// ---------------------------------------------------------------- 1 暦年課税分の贈与財産

/** 1の縦罫線の実測px */
const X1 = {
  NO: 59.5,     // 番号欄の右端 ＝ 氏名のコード枠の左端
  NAME: 167.5,  // 贈与を受けた人の氏名の右端
  DATE: 360.5,  // 贈与年月日の右端 ＝ 種類のコード枠の左端
  KIND: 446.5,
  ITEM: 532.5,
  PLACE: 704.5,
  QTY: 769.5,
  UNIT: 812.5,
  V1: 941.5,    // ①価額の右端 ＝ ②のコード枠の左端
  V2: 1070.5,   // ②の右端 ＝ ③のコード枠の左端
} as const;

/** 1の贈与年月日 */
const GIFT_DATE_X: DateX = [X1.NAME, 188.5, 231.5, 274.5, 317.5, X1.DATE];
/** 1の種類〜①価額 */
const GIFT_PROP_X: PropX = [X1.DATE, X1.KIND, X1.ITEM, X1.PLACE, X1.QTY, X1.UNIT, X1.V1];

/** 1の明細行の上端（4行分）と最終行の下端 */
const GIFT_Y = [453.5, 510, 566.5, 623, 678] as const;

/** ④の人物列（コード枠の左端・右端・列の右端） */
const P4_X: readonly (readonly [number, number, number])[] = [
  [468.5, 489.5, 661.5],
  [661.5, 683.5, 855.5],
  [855.5, 876.5, 1027.5],
  [1027.5, 1048.5, RIGHT],
];

const S1_HEADING = '1　純資産価額に加算される暦年課税分の贈与財産価額及び特定贈与財産価額の明細';
const S1_LEAD = 'この表は、相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人（注）が、'
  + 'その相続開始前3年以内に被相続人から暦年課税に係る贈与によって取得した財産がある場合に記入します。';
const S1_NOTE = '（注）　被相続人から租税特別措置法第70条の2の2第12項第1号'
  + '((直系尊属から教育資金の一括贈与を受けた場合の贈与税の非課税))に規定する管理残額及び'
  + '同法第70条の2の3第12項第2号((直系尊属から結婚・子育て資金の一括贈与を受けた場合の贈与税の非課税))'
  + 'に規定する管理残額以外の財産を取得しなかった人'
  + '（その人が被相続人から相続時精算課税に係る贈与によって財産を取得している場合を除きます。）は除きます。';

/** 特定贈与財産の確認欄（枠の内側に印字されている説明文と本文） */
const CONFIRM_LEAD = '上記「②」欄において、相続開始の年に被相続人から贈与によって取得した居住用不動産や金銭の'
  + '全部又は一部を特定贈与財産としている場合には、次の事項について、'
  + '「（受贈配偶者）」及び「（受贈財産の番号）」の欄に所定の記入をすることにより確認します。';
const CONFIRM_TAIL = 'の特定贈与財産の価額については贈与税の課税価格に算入します。';
const CONFIRM_LINE2 = 'なお、私は、相続開始の年の前年以前に被相続人からの贈与について'
  + '相続税法第21条の6第1項の規定の適用を受けていません。';
const S1_FOOT = '（注）　④欄の金額を第1表のその人の「純資産価額に加算される暦年課税分の贈与財産価額⑤」欄'
  + '及び第15表の㊲欄にそれぞれ転記します。';

/** 1 純資産価額に加算される暦年課税分の贈与財産価額及び特定贈与財産価額の明細 */
function giftSection(
  common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options'],
): GridCell[] {
  const t1 = row(397, 424);
  const t2 = row(424, 453.5);
  const full = row(397, 453.5);
  const nameY = row(678, 736);
  const v4Y = row(736, 792.5);
  return [
    heading(290, 324, S1_HEADING),
    lead(324, 352, S1_LEAD),
    lead(352, 397, S1_NOTE, 6.5),

    // 見出し（2段。番号・氏名・②・③は2段にまたがる）
    label(full, col(LEFT, X1.NO), '番号', { forceVertical: true, fontSize: 7 }),
    label(full, col(X1.NO, X1.NAME), '贈与を受けた\n人の氏名'),
    label(t1, col(X1.NAME, X1.DATE), '贈与年月日'),
    label(t1, col(X1.DATE, X1.V1), '相続開始前3年以内に暦年課税に係る贈与を受けた財産の明細'),
    label(full, col(X1.V1, X1.V2), '②　①の価額のうち\n特定贈与財産の価\n額(円)', { align: 'left', fontSize: 7 }),
    label(full, col(X1.V2, RIGHT), '③　相続税の課税価\n格に加算される価\n額(円)(①−②)', { align: 'left', fontSize: 7 }),
    ...dateHead(t2, GIFT_DATE_X),
    ...propHead(t2, GIFT_PROP_X),

    // 明細4行
    ...GIFT_Y.slice(0, TABLE14_GIFT_ROWS).flatMap((top, r): GridCell[] => {
      const y = row(top, GIFT_Y[r + 1]!);
      const i = page * TABLE14_GIFT_ROWS + r;
      const f = `${common}t14g${i}`;
      const who = `1の${r + 1}行目`;
      const e = 2 + r * 5;
      const g = 1 + r * 3;
      return [
        label(y, col(LEFT, X1.NO), String(r + 1)),
        code(y, col(X1.NO, X1.NO + 22), cd('E', e)),
        mk(y, col(X1.NO + 22, X1.NAME), { kind: 'input', field: `${f}Who`, ariaLabel: `${who}の贈与を受けた人の氏名`, options: whoOptions, align: 'left' }),
        ...dateRow(y, GIFT_DATE_X, cd('N', 1 + r), `${f}D`, `${who}の贈与年月日`),
        ...propRow(y, GIFT_PROP_X, f, who, [
          cd('E', e + 1), cd('E', e + 2), cd('E', e + 3), cd('C', 1 + r), cd('E', e + 4), cd('G', g),
        ]),
        code(y, col(X1.V1, X1.V1 + 21), cd('G', g + 1)),
        mk(y, col(X1.V1 + 21, X1.V2), { kind: 'input', field: `${f}V2`, ariaLabel: `${who}の②特定贈与財産の価額`, commaInteger: true }),
        code(y, col(X1.V2, X1.V2 + 21), cd('G', g + 2)),
        mk(y, col(X1.V2 + 21, RIGHT), { kind: 'input', field: `${totals}t14g${i}v3`, ariaLabel: `${who}の③課税価格に加算される価額`, commaInteger: true, readOnly: true }),
      ];
    }),

    // ④ 贈与を受けた人ごとの③欄の合計額
    label(row(678, 792.5), col(LEFT, X1.NAME), '贈与を受けた人ごと\nの③欄の合計額', { fontSize: 7 }),
    label(nameY, col(X1.NAME, 296.5), '氏名'),
    label(nameY, col(296.5, P4_X[0]![0]), '（各人の合計）'),
    label(v4Y, col(X1.NAME, 296.5), '④　金額(円)', { fontSize: 8 }),
    code(v4Y, col(296.5, 317.5), 'G13'),
    last
      ? mk(v4Y, col(317.5, P4_X[0]![0]), { kind: 'input', field: `${totals}t14v4Total`, ariaLabel: '④の各人の合計', commaInteger: true, readOnly: true })
      : mk(v4Y, col(317.5, P4_X[0]![0]), {}),
    ...P4_X.flatMap(([c0, c1, c2], slot): GridCell[] => {
      const j = page * TABLE14_PERSONS + slot;
      const who = `④の${j + 1}人目`;
      return [
        code(nameY, col(c0, c1), cd('E', 22 + slot)),
        mk(nameY, col(c1, c2), { kind: 'input', field: `${common}t14p${j}Who`, ariaLabel: `${who}の氏名`, options: whoOptions, align: 'left', fontSize: 9 }),
        code(v4Y, col(c0, c1), cd('G', 14 + slot)),
        mk(v4Y, col(c1, c2), { kind: 'input', field: `${totals}t14p${j}v4`, ariaLabel: `${who}の④金額`, commaInteger: true, readOnly: true }),
      ];
    }),

    // 特定贈与財産の確認欄（角丸の枠。中の説明文と本文は罫線の内側なので再現する）
    mk(row(792.5, 984.5), col(LEFT, RIGHT), {}),
    mk(row(792.5, 956.5), col(51.5, 1194.5), {}),
    label(row(792.5, 849), col(59.5, 1186.5), CONFIRM_LEAD, { noBorder: true, align: 'left', fontSize: 7 }),
    mk(row(849, 956.5), col(59.5, 1178), {}),
    label(row(849, 871.5), col(59.5, 232.5), '（受贈配偶者）', { noBorder: true, fontSize: 7 }),
    label(row(849, 871.5), col(489.5, 726.5), '（受贈財産の番号）', { noBorder: true, fontSize: 7 }),
    label(row(871.5, 928), col(59.5, 81.5), '私', { noBorder: true, fontSize: 8 }),
    code(row(871.5, 928), col(81.5, 102.5), 'E26'),
    mk(row(871.5, 928), col(102.5, 210.5), { kind: 'input', field: `${common}t14c${page}Spouse`, ariaLabel: '受贈配偶者の氏名', align: 'left' }),
    label(row(871.5, 928), col(210.5, 575.5), 'は、相続開始の年に被相続人から贈与によって取得した上記', { noBorder: true, align: 'left', fontSize: 7.5 }),
    code(row(871.5, 928), col(575.5, 597.5), 'G18'),
    mk(row(871.5, 928), col(597.5, 640.5), { kind: 'input', field: `${common}t14c${page}No`, ariaLabel: '受贈財産の番号', integerDigits: 1, align: 'center' }),
    label(row(871.5, 928), col(640.5, 1178), CONFIRM_TAIL, { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(row(928, 956.5), col(59.5, 1178), CONFIRM_LINE2, { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(row(956.5, 984.5), col(LEFT, RIGHT), S1_FOOT, { noBorder: true, align: 'left', fontSize: 7 }),
  ];
}

// ---------------------------------------------------------------- 2 出資持分の定めのない法人などに遺贈した財産

/** 2の種類〜価額 */
const BEQUEST_PROP_X: PropX = [LEFT, 145.5, 253.5, 489.5, 575.5, 618.5, 833.5];
/** 2の「出資持分の定めのない法人などの所在地、名称」欄の左端 */
const B_CORP = 833.5;
/** 2の明細行の上端（2行分）と最終行の下端 */
const BEQUEST_Y = [1102, 1158.5, 1215] as const;

const S2_HEADING = '2　出資持分の定めのない法人などに遺贈した財産の明細';
const S2_LEAD = 'この表は、被相続人が人格のない社団又は財団や学校法人、社会福祉法人、宗教法人などの'
  + '出資持分の定めのない法人に遺贈した財産のうち、相続税がかからないものの明細を記入します。';

/** 2 出資持分の定めのない法人などに遺贈した財産の明細 */
function bequestSection(common: string, totals: string, page: number, last: boolean): GridCell[] {
  const t1 = row(1045.5, 1074);
  const t2 = row(1074, 1102);
  const full = row(1045.5, 1102);
  const totalY = row(BEQUEST_Y[2], 1271.5);
  return [
    heading(992, 1020, S2_HEADING),
    lead(1020, 1045.5, S2_LEAD),

    label(t1, col(LEFT, B_CORP), '遺　贈　し　た　財　産　の　明　細'),
    label(full, col(B_CORP, RIGHT), '出資持分の定めのない法人\nなどの所在地、名称'),
    ...propHead(t2, BEQUEST_PROP_X),

    ...BEQUEST_Y.slice(0, TABLE14_BEQUEST_ROWS).flatMap((top, r): GridCell[] => {
      const y = row(top, BEQUEST_Y[r + 1]!);
      const i = page * TABLE14_BEQUEST_ROWS + r;
      const f = `${common}t14b${i}`;
      const who = `2の${r + 1}行目`;
      const e = 27 + r * 5;
      return [
        ...propRow(y, BEQUEST_PROP_X, f, who, [
          cd('E', e), cd('E', e + 1), cd('E', e + 2), cd('C', 5 + r), cd('E', e + 3), cd('G', 19 + r),
        ]),
        code(y, col(B_CORP, B_CORP + 22), cd('E', e + 4)),
        mk(y, col(B_CORP + 22, RIGHT), { kind: 'input', field: `${f}Corp`, ariaLabel: `${who}の法人などの所在地、名称`, align: 'left' }),
      ];
    }),

    // 合計（最終ページにだけ値を出す）
    mk(totalY, col(LEFT, 145.5), { diagonal: 'bltr' }),
    mk(totalY, col(145.5, 253.5), { diagonal: 'bltr' }),
    label(totalY, col(253.5, 489.5), '合　計'),
    mk(totalY, col(489.5, 618.5), { diagonal: 'bltr' }),
    code(totalY, col(618.5, 640.5), 'G21'),
    last
      ? mk(totalY, col(640.5, B_CORP), { kind: 'input', field: `${totals}t14bTotal`, ariaLabel: '2の合計', commaInteger: true, readOnly: true })
      : mk(totalY, col(640.5, B_CORP), {}),
    mk(totalY, col(B_CORP, RIGHT), { diagonal: 'bltr' }),
  ];
}

// ---------------------------------------------------------------- 3 特定の公益法人などに寄附した相続財産

/** 3の寄附（支出）年月日 */
const DONATION_DATE_X: DateX = [LEFT, 59.5, 102.5, 145.5, 188.5, 231.5];
/** 3の種類〜価額 */
const DONATION_PROP_X: PropX = [231.5, 317.5, 403.5, 554.5, 640.5, 683.5, 833.5];
/** 3の「公益法人等の所在地・名称」欄の左端 */
const D_CORP = 833.5;
/** 3の「寄附（支出）をした相続人等の氏名」欄の左端 */
const D_PERSON = 1091.5;
/** 3の明細行の上端（2行分）と最終行の下端 */
const DONATION_Y = [1488.5, 1545, 1601.5] as const;

const S3_HEADING = '3　特定の公益法人などに寄附した相続財産又は特定公益信託などのために支出した相続財産の明細';
const S3_LEAD = '私は、下記に掲げる相続財産を、相続税の申告期限までに、';
/** 3の(1)〜(3) 適用を受ける特例（枠の上端・下端と本文） */
const S3_CASES: readonly (readonly [number, number, string])[] = [
  [1328.5, 1359.5, '(1)　国、地方公共団体又は租税特別措置法施行令第40条の3に規定する法人に対して寄附をしましたので、'
    + '租税特別措置法第70条第1項の規定の適用を受けます。'],
  [1359.5, 1390.5, '(2)　租税特別措置法第70条第3項に規定する特定公益信託'
    + '（所得税法等の一部を改正する法律(令和6年法律第8号)附則第54条第2項に規定する特定公益信託を含みます。）'
    + '又は公益信託に関する法律第2条第1項第1号に規定する公益信託の信託財産とするために支出しましたので、'
    + '租税特別措置法第70条第3項の規定の適用を受けます。'],
  [1390.5, 1421.5, '(3)　特定非営利活動促進法第2条第3項に規定する認定特定非営利活動法人に対して寄附をしましたので、'
    + '租税特別措置法第70条第10項の規定の適用を受けます。'],
];
const S3_ARROW = '↑適用を受ける特例の欄に「1」を記入してください。';
const S3_FOOT = '（注）　この特例の適用を受ける場合には、期限内申告書に一定の受領書、証明書類等の添付が必要です。';

/** 3 特定の公益法人などに寄附した相続財産又は特定公益信託などのために支出した相続財産の明細 */
function donationSection(common: string, totals: string, page: number, last: boolean): GridCell[] {
  const t1 = row(1440, 1464.5);
  const t2 = row(1464.5, 1488.5);
  const full = row(1440, 1488.5);
  const totalY = row(DONATION_Y[2], 1658.5);
  return [
    heading(1279, 1305, S3_HEADING),
    lead(1305, 1328.5, S3_LEAD),

    // 適用を受ける特例（「1」を記入する欄）
    ...S3_CASES.flatMap(([top, bottom, text], n): GridCell[] => {
      const y = row(top, bottom);
      return [
        code(y, col(59.5, 81.5), cd('G', 22 + n)),
        mk(y, col(81.5, 124.5), { kind: 'input', field: `${common}t14x${page}${n + 1}`, ariaLabel: `3の(${n + 1})の適用`, integerDigits: 1, align: 'center' }),
        label(y, col(124.5, RIGHT), text, { noBorder: true, align: 'left', fontSize: 7 }),
      ];
    }),
    label(row(1421.5, 1440), col(59.5, RIGHT), S3_ARROW, { noBorder: true, align: 'left', fontSize: 7 }),

    label(t1, col(LEFT, 231.5), '寄附（支出）年月日'),
    label(t1, col(231.5, D_CORP), '寄附（支出）し　た　財　産　の　明　細'),
    label(full, col(D_CORP, D_PERSON), '公益法人等の所在地・名称\n（公益信託の受託者及び名称）', { fontSize: 7 }),
    label(full, col(D_PERSON, RIGHT), '寄附（支出）をした\n相続人等の氏名', { fontSize: 7 }),
    ...dateHead(t2, DONATION_DATE_X),
    ...propHead(t2, DONATION_PROP_X),

    ...DONATION_Y.slice(0, TABLE14_DONATION_ROWS).flatMap((top, r): GridCell[] => {
      const y = row(top, DONATION_Y[r + 1]!);
      const i = page * TABLE14_DONATION_ROWS + r;
      const f = `${common}t14d${i}`;
      const who = `3の${r + 1}行目`;
      const e = 37 + r * 6;
      return [
        ...dateRow(y, DONATION_DATE_X, cd('N', 5 + r), `${f}D`, `${who}の寄附（支出）年月日`),
        ...propRow(y, DONATION_PROP_X, f, who, [
          cd('E', e), cd('E', e + 1), cd('E', e + 2), cd('C', 7 + r), cd('E', e + 3), cd('G', 25 + r),
        ]),
        code(y, col(D_CORP, D_CORP + 22), cd('E', e + 4)),
        mk(y, col(D_CORP + 22, D_PERSON), { kind: 'input', field: `${f}Corp`, ariaLabel: `${who}の公益法人等の所在地・名称`, align: 'left' }),
        code(y, col(D_PERSON, D_PERSON + 22), cd('E', e + 5)),
        mk(y, col(D_PERSON + 22, RIGHT), { kind: 'input', field: `${f}Person`, ariaLabel: `${who}の寄附（支出）をした相続人等の氏名`, align: 'left' }),
      ];
    }),

    // 合計（最終ページにだけ値を出す）
    mk(totalY, col(LEFT, 231.5), { diagonal: 'bltr' }),
    mk(totalY, col(231.5, 317.5), { diagonal: 'bltr' }),
    mk(totalY, col(317.5, 403.5), { diagonal: 'bltr' }),
    label(totalY, col(403.5, 554.5), '合　計'),
    mk(totalY, col(554.5, 683.5), { diagonal: 'bltr' }),
    code(totalY, col(683.5, 704.5), 'G27'),
    last
      ? mk(totalY, col(704.5, D_CORP), { kind: 'input', field: `${totals}t14dTotal`, ariaLabel: '3の合計', commaInteger: true, readOnly: true })
      : mk(totalY, col(704.5, D_CORP), {}),
    mk(totalY, col(D_CORP, D_PERSON), { diagonal: 'bltr' }),
    mk(totalY, col(D_PERSON, RIGHT), { diagonal: 'bltr' }),
    label(row(1658.5, BOTTOM), col(LEFT, RIGHT), S3_FOOT, { noBorder: true, align: 'left', fontSize: 7 }),
  ];
}

/**
 * 第14表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 明細は人ではなく様式全体の一覧
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ③・④・2と3の合計
 * @param page 0始まりの枚数
 * @param last 最終ページか（④の各人の合計・2の合計・3の合計は全枚数の通算なのでここにだけ出す）
 * @param whoOptions 「贈与を受けた人の氏名」の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable14(
  common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options'],
): GridCell[] {
  const decY = row(TOP, 290);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(decY, col(726.5, 898.5), '被相続人'),
    code(decY, col(898.5, 919.5), 'E01'),
    mk(decY, col(919.5, RIGHT), { kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10 }),

    // 1の枠（290〜985）
    mk(row(290, 397), col(LEFT, RIGHT), {}),
    ...giftSection(common, totals, page, last, whoOptions),

    // 2の枠（992〜1271.5）
    mk(row(992, 1045.5), col(LEFT, RIGHT), {}),
    ...bequestSection(common, totals, page, last),

    // 3の枠（1279〜1682.5）
    mk(row(1279, 1440), col(LEFT, RIGHT), {}),
    ...donationSection(common, totals, page, last),
  ];
}
