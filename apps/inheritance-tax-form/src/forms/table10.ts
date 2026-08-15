/**
 * 相続税の申告書 第10表「退職手当金などの明細書」。
 *
 * 構造は第9表とほぼ同型で、1枚に 1退職手当金などの明細5件・2課税される金額の計算5人分 が載る。
 * どちらも「様式全体の一覧」で人ごとの欄ではないので共通欄（'c.' スコープ）に持ち、
 * 枚数も共通欄 `t10Pages` で決める。
 * Ⓐ（非課税限度額）とⒷ（①の合計）は全枚数を通した値なので、Ⓑ・②③の合計は
 * **最終ページにだけ値を出す**（第9表・第13表と同じ扱い）。
 *
 * 第9表との違いは、1の明細に「退職手当金などの名称」列がある（列が6つになる）ことと、
 * 1の（注）が2項目（相続時精算課税の項が無い）ことの2点だけ。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 196px（被相続人欄の上辺）〜下端 1659.5px（下部の（注）枠の下辺）、
 * 左端 94.5px 〜 右端 1212.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { code, label, mk } from './geometry';

export const TABLE10_FORM_CODE = 'NTA0KSE100010020';
export const TABLE10_TITLE = '相続税の申告書　第10表';
export const TABLE10_SUBTITLE = '退職手当金などの明細書';
export const TABLE10_EDITION = '（令和6年1月分以降用）（R8.7）';

/** 様式1枚に記入できる件数（1の明細・2の相続人とも5行） */
export const TABLE10_ROWS = 5;

const TOP = 196;
const BOTTOM = 1659.5;
const LEFT = 94.5;
const RIGHT = 1212.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE10_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 1 退職手当金などの明細の縦罫線の実測px */
const X = {
  L: 94.5,      // 表の左端 ＝ 2の氏名のコード枠の左端
  C1: 117.5,    // 1の所在地・2の氏名のコード枠の右端
  ADDR: 304.5,  // 1の所在地の右端
  C2: 328.5,    // 1の名称のコード枠の右端 ＝ 限度額行のラベルの右端
  NAME: 482.5,  // 1の名称の右端 ＝ 受取年月日の左端
  D_C: 506.5,   // 1の受取年月日のコード枠の右端
  ERA: 589.5,   // 1「元号」の右端
  Y: 651.5,     // 1「年」の右端 ＝ 2の①の右端
  M: 716.5,     // 1「月」の右端
  DATE_R: 779.5, // 1「日」の右端 ＝ 退職手当金などの名称の左端
  TTL_C: 802.5, // 1の退職手当金などの名称のコード枠の右端
  TTL_R: 885.5, // 同 右端 ＝ 受取金額の左端
  AMT_C: 909.5, // 1の受取金額のコード枠の右端
  AMT_R: 1063.5, // 1の受取金額の右端 ＝ 受取人の氏名の左端
  WHO_C: 1087.5, // 1の受取人の氏名のコード枠の右端
  R: 1212.5,    // 表の右端
} as const;

/** 2 課税される金額の計算の縦罫線（①②③の列） */
const P = {
  NAME_R: 349.5, // 氏名の右端
  C1: 372.5,     // ①のコード枠の右端
  V1_R: 651.5,   // ①の右端（＝ X.Y）
  C2: 675.5,     // ②のコード枠の右端
  V2_R: 933.5,   // ②の右端 ＝ ③の太枠の左端
  V3_C: 957.5,   // ③のコード枠の右端 ＝ 限度額行のⒶ枠の左端
  B_CODE: 396.5, // 合計行のⒷのコード枠（G23）の右端
} as const;

/** 退職手当金などの非課税限度額の行（1029.5〜1128）の縦割り */
const LIM = {
  A_MARK: 977.5,  // Ⓐ の枠の右端
  A_CODE: 1001.5, // G07 コード枠の右端
  BOX_L: 458.5,   // 法定相続人の数の小枠の左端
  BOX_C: 482.5,   // 同 コード枠の右端
  BOX_R: 547.5,   // 同 右端
} as const;

/** 被相続人欄（右上）の縦割り */
const DEC = { L: 758.5, CODE: 909.5, INPUT: 933.5 } as const;

/** 1 退職手当金などの明細の行位置（上端・下端）。各行の上に「元号・年・月・日」の見出し帯を持つ。 */
const DETAIL_Y = [378.5, 476, 573, 670.5, 767.5, 865] as const;
/** 明細行の上端から見出し帯の下端までの高さ */
const DATE_HEAD_H = 33.5;
/** 2 課税される金額の計算の行位置（5人＋合計行の下端） */
const PERSON_Y = [1181.5, 1251, 1320.5, 1390, 1459.5, 1529, 1598.5] as const;

const HEAD1 = '1　相続や遺贈によって取得したものとみなされる退職手当金など';
const LEAD1 = '　この表は、相続人やその他の人が被相続人から相続や遺贈によって取得したものとみなされる退職手当金、'
  + '功労金、退職給付金などを受け取った場合に、その受取金額などを記入します。';
const NOTES1 = '（注）　1　相続人（相続の放棄をした人を除きます。以下同じです。）が受け取った退職手当金などのうち'
  + '一定の金額は非課税となりますので、その人は、次の2の該当欄に非課税となる金額と課税される金額とを記入します。\n'
  + '　　　　2　相続人以外の人が受け取った退職手当金などについては、非課税となる金額はありませんので、その人は、'
  + 'その受け取った金額そのままを第11表の付表4の「財産の明細」の「価額」欄に転記します。';
const HEAD2 = '2　課税される金額の計算';
const LEAD2 = '　この表は、被相続人の死亡によって相続人が退職手当金などを受け取った場合に、記入します。';
const NOTES2 = '（注）　1　Ⓑの金額がⒶの金額より少ないときは、各相続人の①欄の金額がそのまま②欄の非課税金額と'
  + 'なりますので、③欄の課税金額は0となります。\n'
  + '　　　　2　③欄の金額を第11表の付表4の「財産の明細」の「価額」欄に転記します。';
/** 1の明細の「受取人の氏名」に添える案内（③は自動転記しないので注記で補う） */
const TRANSFER_HINT = '相続人以外の人が受け取った退職手当金などは、その金額をそのまま第11表の付表4の「価額」欄に転記します。';

/** 「1 …」「2 …」の章見出し（太字の見出しと、その下に続く説明文） */
function sectionHead(top: number, mid: number, bottom: number, heading: string, lead: string): GridCell[] {
  return [
    label(row(top, mid), col(X.L, X.R), heading, { align: 'left', bold: true, fontSize: 9 }),
    label(row(mid, bottom), col(X.L, X.R), lead, { align: 'left', fontSize: 7.5 }),
  ];
}

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 1 退職手当金などの明細（5件） */
function detailRows(common: string, page: number, whoOptions: GridCell['options']): GridCell[] {
  const cols = row(328, DETAIL_Y[0]);
  return [
    label(cols, col(X.L, X.ADDR), '勤務先会社等の所在地'),
    label(cols, col(X.ADDR, X.NAME), '勤務先会社等の名称'),
    label(cols, col(X.NAME, X.DATE_R), '受取年月日'),
    label(cols, col(X.DATE_R, X.TTL_R), '退職手当金\nなどの名称', { fontSize: 7.5 }),
    label(cols, col(X.TTL_R, X.AMT_R), '受取金額(円)'),
    label(cols, col(X.AMT_R, X.R), '受取人の氏名'),

    ...Array.from({ length: TABLE10_ROWS }, (_unused, r): GridCell[] => {
      const top = DETAIL_Y[r]!;
      const bottom = DETAIL_Y[r + 1]!;
      const i = page * TABLE10_ROWS + r;
      const who = `退職手当金${i + 1}`;
      const f = `${common}t10d${i}`;
      const body = row(top, bottom);
      const head = row(top, top + DATE_HEAD_H);
      const date = row(top + DATE_HEAD_H, bottom);
      // 1行につきEコードを4つ（所在地・名称・退職手当金などの名称・受取人）使う
      const e = 2 + r * 4;
      return [
        code(body, col(X.L, X.C1), cd('E', e)),
        mk(body, col(X.C1, X.ADDR), { kind: 'input', field: `${f}Addr`, ariaLabel: `${who}の勤務先会社等の所在地`, align: 'left' }),
        code(body, col(X.ADDR, X.C2), cd('E', e + 1)),
        mk(body, col(X.C2, X.NAME), { kind: 'input', field: `${f}Name`, ariaLabel: `${who}の勤務先会社等の名称`, align: 'left' }),

        // 「元号・年・月・日」の見出し帯は明細行ごとに繰り返される（第9表と同じ）
        mk(head, col(X.NAME, X.D_C), {}),
        label(head, col(X.D_C, X.ERA), '元号', { fontSize: 6 }),
        label(head, col(X.ERA, X.Y), '年', { fontSize: 6 }),
        label(head, col(X.Y, X.M), '月', { fontSize: 6 }),
        label(head, col(X.M, X.DATE_R), '日', { fontSize: 6 }),
        code(date, col(X.NAME, X.D_C), cd('N', r + 1)),
        mk(date, col(X.D_C, X.ERA), { kind: 'input', field: `${f}RecvEra`, ariaLabel: `${who}の受取年月日の元号`, options: ERA_OPTIONS, compactSelectedOption: true }),
        mk(date, col(X.ERA, X.Y), { kind: 'input', field: `${f}RecvY`, ariaLabel: `${who}の受取年月日（年）`, integerDigits: 2, align: 'center' }),
        mk(date, col(X.Y, X.M), { kind: 'input', field: `${f}RecvM`, ariaLabel: `${who}の受取年月日（月）`, integerDigits: 2, align: 'center' }),
        mk(date, col(X.M, X.DATE_R), { kind: 'input', field: `${f}RecvD`, ariaLabel: `${who}の受取年月日（日）`, integerDigits: 2, align: 'center' }),

        code(body, col(X.DATE_R, X.TTL_C), cd('E', e + 2)),
        mk(body, col(X.TTL_C, X.TTL_R), { kind: 'input', field: `${f}Title`, ariaLabel: `${who}の退職手当金などの名称`, align: 'left', fontSize: 8 }),
        code(body, col(X.TTL_R, X.AMT_C), cd('G', r + 1)),
        mk(body, col(X.AMT_C, X.AMT_R), { kind: 'input', field: `${f}Amt`, ariaLabel: `${who}の受取金額`, commaInteger: true }),
        code(body, col(X.AMT_R, X.WHO_C), cd('E', e + 3)),
        mk(body, col(X.WHO_C, X.R), { kind: 'input', field: `${f}Who`, ariaLabel: `${who}の受取人の氏名`, options: whoOptions, align: 'left', hint: TRANSFER_HINT }),
      ];
    }).flat(),
  ];
}

/** 退職手当金などの非課税限度額の行（500万円×法定相続人の数 ＝ Ⓐ。どちらも自動計算） */
function limitRow(totals: string): GridCell[] {
  const y = row(1029.5, 1128);
  const upper = row(1033, 1066.5);
  const box = row(1066.5, 1121.5);
  return [
    label(y, col(X.L, X.C2), '退職手当金などの\n非課税限度額(円)'),
    mk(y, col(X.C2, P.V3_C), {}),
    label(upper, col(380, P.V3_C), '〔第2表のⒶの法定相続人の数〕', { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(box, col(X.C2, LIM.BOX_L), '（500万円×', { noBorder: true, align: 'right', fontSize: 7.5 }),
    code(box, col(LIM.BOX_L, LIM.BOX_C), 'G06'),
    mk(box, col(LIM.BOX_C, LIM.BOX_R), {
      kind: 'input', field: `${totals}heirCount`, ariaLabel: '法定相続人の数', align: 'center', readOnly: true,
    }),
    label(box, col(LIM.BOX_R, P.V3_C), '人により計算した金額を右のⒶに記入します。）', { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(y, col(P.V3_C, LIM.A_MARK), 'Ⓐ', { fontSize: 8 }),
    code(y, col(LIM.A_MARK, LIM.A_CODE), 'G07'),
    mk(y, col(LIM.A_CODE, X.R), {
      kind: 'input', field: `${totals}t10A`, ariaLabel: '退職手当金などの非課税限度額Ⓐ', commaInteger: true, readOnly: true, rightLabel: ',000,000',
    }),
  ];
}

/** 2 課税される金額の計算（5人＋合計行） */
function personRows(common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options']): GridCell[] {
  const cols = row(1128, PERSON_Y[0]);
  const total = row(PERSON_Y[5], PERSON_Y[6]);
  return [
    label(cols, col(X.L, P.NAME_R), '退職手当金などを\n受け取った相続人の氏名'),
    label(cols, col(P.NAME_R, P.V1_R), '①　受け取った退職手当金などの金額(円)'),
    label(cols, col(P.V1_R, P.V2_R), '②　非課税金額(円)　(Ⓐ×各人の①／Ⓑ)'),
    label(cols, col(P.V2_R, X.R), '③　課税金額(円)\n（①−②）'),

    ...Array.from({ length: TABLE10_ROWS }, (_unused, r): GridCell[] => {
      const y = row(PERSON_Y[r]!, PERSON_Y[r + 1]!);
      const i = page * TABLE10_ROWS + r;
      const who = `相続人${i + 1}`;
      const g = 8 + r * 3;
      return [
        code(y, col(X.L, X.C1), cd('E', 22 + r)),
        mk(y, col(X.C1, P.NAME_R), { kind: 'input', field: `${common}t10p${i}Name`, ariaLabel: `${who}の氏名`, options: whoOptions, align: 'left' }),
        code(y, col(P.NAME_R, P.C1), cd('G', g)),
        mk(y, col(P.C1, P.V1_R), { kind: 'input', field: `${common}t10p${i}v1`, ariaLabel: `${who}が受け取った退職手当金などの金額`, commaInteger: true }),
        code(y, col(P.V1_R, P.C2), cd('G', g + 1)),
        mk(y, col(P.C2, P.V2_R), { kind: 'input', field: `${totals}t10r${i}v2`, ariaLabel: `${who}の非課税金額`, commaInteger: true, readOnly: true }),
        code(y, col(P.V2_R, P.V3_C), cd('G', g + 2)),
        mk(y, col(P.V3_C, X.R), { kind: 'input', field: `${totals}t10r${i}v3`, ariaLabel: `${who}の課税金額`, commaInteger: true, readOnly: true }),
      ];
    }).flat(),

    // 合計行。Ⓑ・②③の合計は全枚数を通した値なので最終ページにだけ出す
    label(total, col(X.L, P.NAME_R), '合　計'),
    label(total, col(P.NAME_R, P.C1), 'Ⓑ', { fontSize: 8 }),
    code(total, col(P.C1, P.B_CODE), 'G23'),
    code(total, col(P.V1_R, P.C2), 'G24'),
    code(total, col(P.V2_R, P.V3_C), 'G25'),
    ...(last
      ? [
        mk(total, col(P.B_CODE, P.V1_R), { kind: 'input' as const, field: `${totals}t10B`, ariaLabel: '受け取った退職手当金などの金額の合計Ⓑ', commaInteger: true, readOnly: true }),
        mk(total, col(P.C2, P.V2_R), { kind: 'input' as const, field: `${totals}t10v2Total`, ariaLabel: '非課税金額の合計', commaInteger: true, readOnly: true }),
        mk(total, col(P.V3_C, X.R), { kind: 'input' as const, field: `${totals}t10v3Total`, ariaLabel: '課税金額の合計', commaInteger: true, readOnly: true }),
      ]
      : [
        mk(total, col(P.B_CODE, P.V1_R), {}),
        mk(total, col(P.C2, P.V2_R), {}),
        mk(total, col(P.V3_C, X.R), {}),
      ]),

    // ③（課税金額）の列は列見出しから合計行まで太枠で囲まれている
    mk(row(1128, PERSON_Y[6]), col(P.V2_R, X.R), { outline: true }),
  ];
}

/**
 * 第10表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 1・2とも人ではなく様式全体の一覧
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— Ⓐ・Ⓑ・②③
 * @param page 0始まりの枚数
 * @param last 最終ページか（Ⓑと②③の合計はここにだけ出す）
 * @param whoOptions 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable10(
  common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options'],
): GridCell[] {
  const decY = row(TOP, 244);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(decY, col(DEC.L, DEC.CODE), '被相続人'),
    code(decY, col(DEC.CODE, DEC.INPUT), 'E01'),
    mk(decY, col(DEC.INPUT, X.R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    ...sectionHead(244, 268, 328, HEAD1, LEAD1),
    ...detailRows(common, page, whoOptions),
    label(row(865, 965), col(X.L, X.R), NOTES1, { align: 'left', fontSize: 7 }),

    ...sectionHead(965, 989, 1029.5, HEAD2, LEAD2),
    ...limitRow(totals),
    ...personRows(common, totals, page, last, whoOptions),

    label(row(PERSON_Y[6], BOTTOM), col(X.L, X.R), NOTES2, { align: 'left', fontSize: 7 }),
  ];
}
