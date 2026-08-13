/**
 * 相続税の申告書 第9表「生命保険金などの明細書」。
 *
 * 1枚に 1保険金などの明細5件・2課税される金額の計算5人分 が載る。
 * どちらも「様式全体の一覧」で人ごとの欄ではないので、第13表と同じく共通欄
 * （'c.' スコープ）に持ち、枚数も共通欄 `t9Pages` で決める。
 * Ⓐ（非課税限度額）とⒷ（①の合計）は全枚数を通した値なので、Ⓑ・②③の合計は
 * **最終ページにだけ値を出す**（第13表と同じ扱い）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 207.5px（被相続人欄の上辺）〜下端 1682px（下部の（注）枠の下辺）、
 * 左端 12px 〜 右端 1227px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { code, label, mk } from './geometry';

export const TABLE9_FORM_CODE = 'NTA0KSE090010020';
export const TABLE9_TITLE = '相続税の申告書　第9表';
export const TABLE9_SUBTITLE = '生命保険金などの明細書';
export const TABLE9_EDITION = '（令和6年1月分以降用）（R8.7）';

/** 様式1枚に記入できる件数（1の明細・2の相続人とも5行） */
export const TABLE9_ROWS = 5;

const TOP = 207.5;
const BOTTOM = 1682;
const LEFT = 12;
const RIGHT = 1227;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE9_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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

/** 縦罫線の実測px（1と2で共有している線があるのでまとめて持つ） */
const X = {
  L: 12,        // 表の左端
  C1: 42.5,     // 1の所在地・2の氏名のコード枠の右端
  ADDR: 279,    // 1の所在地の右端 ＝ 2の氏名の右端
  C2: 309,      // 1の名称・2の①のコード枠の右端
  NAME: 520,    // 1の名称の右端 ＝ 受取年月日の左端
  D_C: 551,     // 1の受取年月日のコード枠の右端
  ERA: 645,     // 1「元号」の右端 ＝ 2の②のコード枠の右端
  Y: 710,       // 1「年」の右端
  M: 774,       // 1「月」の右端
  DATE_R: 839,  // 1「日」の右端 ＝ 受取金額の左端
  AMT_C: 869,   // 1の受取金額のコード枠の右端
  AMT_R: 1046,  // 1の受取金額の右端 ＝ 受取人の氏名の左端
  WHO_C: 1076,  // 1の受取人の氏名のコード枠の右端
  R: 1227,      // 表の右端
} as const;

/** 2 課税される金額の計算の縦罫線（①②③の列。①のコード枠は X.C2、②は X.ERA と同じ線） */
const P = {
  V1_R: 615,   // ①の右端
  V2_R: 921,   // ②の右端 ＝ ③の太枠の左端
  V3_C: 951,   // ③のコード枠の右端 ＝ 限度額行のⒶ枠の左端
} as const;

/** 保険金の非課税限度額の行（1061〜1162.5）の縦割り */
const LIM = {
  LBL: 258,    // 「保険金の非課税限度額（円）」ラベルの右端
  A_MARK: 973, // Ⓐ の枠の右端
  A_CODE: 1003,// G07 コード枠の右端
  BOX_L: 404,  // 法定相続人の数の小枠の左端
  BOX_C: 434,  // 同 コード枠の右端
  BOX_R: 499,  // 同 右端
} as const;

/** 被相続人欄（右上）の縦割り */
const DEC = { L: 731, CODE: 891, INPUT: 921 } as const;

/** 1 保険金などの明細の行位置（上端・下端）。各行の上に「元号・年・月・日」の見出し帯を持つ。 */
const DETAIL_Y = [381, 483, 585, 687, 789, 891] as const;
/** 明細行の上端から見出し帯の下端までの高さ */
const DATE_HEAD_H = 30;
/** 2 課税される金額の計算の行位置（5人＋合計行の下端） */
const PERSON_Y = [1218, 1287.5, 1357.5, 1427, 1497, 1566.5, 1636.5] as const;

const HEAD1 = '1　相続や遺贈によって取得したものとみなされる保険金など';
const LEAD1 = '　この表は、相続人やその他の人が被相続人から相続や遺贈によって取得したものとみなされる生命保険金、'
  + '損害保険契約の死亡保険金及び特定の生命共済金などを受け取った場合に、その受取金額などを記入します。';
const NOTES1 = '（注）　1　相続人（相続の放棄をした人を除きます。以下同じです。）が受け取った保険金などのうち一定の金額は'
  + '非課税となりますので、その人は、次の2の該当欄に非課税となる金額と課税される金額とを記入します。\n'
  + '　　　　2　相続人以外の人が受け取った保険金などについては、非課税となる金額はありませんので、その人は、'
  + 'その受け取った金額そのままを第11表の付表4の「財産の明細」の「価額」欄に転記します。\n'
  + '　　　　3　相続時精算課税適用財産は含まれません。';
const HEAD2 = '2　課税される金額の計算';
const LEAD2 = '　この表は、被相続人の死亡によって相続人が生命保険金などを受け取った場合に、記入します。';
const NOTES2 = '（注）　1　Ⓑの金額がⒶの金額より少ないときは、各相続人の①欄の金額がそのまま②欄の非課税金額と'
  + 'なりますので、③欄の課税金額は0となります。\n'
  + '　　　　2　③欄の金額を第11表の付表4の「財産の明細」の「価額」欄に転記します。';
/** 1の明細の「受取人の氏名」に添える案内（③は自動転記しないので注記で補う） */
const TRANSFER_HINT = '相続人以外の人が受け取った保険金などは、その金額をそのまま第11表の付表4の「価額」欄に転記します。';

/** 「1 …」「2 …」の章見出し（太字の見出しと、その下に続く説明文） */
function sectionHead(top: number, mid: number, bottom: number, heading: string, lead: string): GridCell[] {
  return [
    label(row(top, mid), col(X.L, X.R), heading, { align: 'left', bold: true, fontSize: 9 }),
    label(row(mid, bottom), col(X.L, X.R), lead, { align: 'left', fontSize: 7.5 }),
  ];
}

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 1 保険金などの明細（5件） */
function detailRows(common: string, page: number, whoOptions: GridCell['options']): GridCell[] {
  const cols = row(343.5, 381);
  return [
    label(cols, col(X.L, X.ADDR), '保険会社等の所在地'),
    label(cols, col(X.ADDR, X.NAME), '保険会社等の名称'),
    label(cols, col(X.NAME, X.DATE_R), '受取年月日'),
    label(cols, col(X.DATE_R, X.AMT_R), '受取金額(円)'),
    label(cols, col(X.AMT_R, X.R), '受取人の氏名'),

    ...Array.from({ length: TABLE9_ROWS }, (_unused, r): GridCell[] => {
      const top = DETAIL_Y[r]!;
      const bottom = DETAIL_Y[r + 1]!;
      const i = page * TABLE9_ROWS + r;
      const who = `保険金${i + 1}`;
      const f = `${common}t9d${i}`;
      const body = row(top, bottom);
      const head = row(top, top + DATE_HEAD_H);
      const date = row(top + DATE_HEAD_H, bottom);
      const e = 2 + r * 3;
      return [
        code(body, col(X.L, X.C1), cd('E', e)),
        mk(body, col(X.C1, X.ADDR), { kind: 'input', field: `${f}Addr`, ariaLabel: `${who}の保険会社等の所在地`, align: 'left' }),
        code(body, col(X.ADDR, X.C2), cd('E', e + 1)),
        mk(body, col(X.C2, X.NAME), { kind: 'input', field: `${f}Name`, ariaLabel: `${who}の保険会社等の名称`, align: 'left' }),

        // 「元号・年・月・日」の見出し帯は明細行ごとに繰り返される（第13表は1行目だけ）
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

        code(body, col(X.DATE_R, X.AMT_C), cd('G', r + 1)),
        mk(body, col(X.AMT_C, X.AMT_R), { kind: 'input', field: `${f}Amt`, ariaLabel: `${who}の受取金額`, commaInteger: true }),
        code(body, col(X.AMT_R, X.WHO_C), cd('E', e + 2)),
        mk(body, col(X.WHO_C, X.R), { kind: 'input', field: `${f}Who`, ariaLabel: `${who}の受取人の氏名`, options: whoOptions, align: 'left', hint: TRANSFER_HINT }),
      ];
    }).flat(),
  ];
}

/** 保険金の非課税限度額の行（500万円×法定相続人の数 ＝ Ⓐ。どちらも自動計算） */
function limitRow(totals: string): GridCell[] {
  const y = row(1061, 1162.5);
  const upper = row(1065, 1098);
  const box = row(1098, 1155.5);
  return [
    label(y, col(X.L, LIM.LBL), '保険金の非課税限度額\n（円）'),
    mk(y, col(LIM.LBL, P.V3_C), {}),
    label(upper, col(320, P.V3_C), '〔第2表のⒶの法定相続人の数〕', { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(box, col(LIM.LBL, LIM.BOX_L), '（500万円×', { noBorder: true, align: 'right', fontSize: 7.5 }),
    code(box, col(LIM.BOX_L, LIM.BOX_C), 'G06'),
    mk(box, col(LIM.BOX_C, LIM.BOX_R), {
      kind: 'input', field: `${totals}heirCount`, ariaLabel: '法定相続人の数', align: 'center', readOnly: true,
    }),
    label(box, col(LIM.BOX_R, P.V3_C), '人により計算した金額を右のⒶに記入します。）', { noBorder: true, align: 'left', fontSize: 7.5 }),
    label(y, col(P.V3_C, LIM.A_MARK), 'Ⓐ', { fontSize: 8 }),
    code(y, col(LIM.A_MARK, LIM.A_CODE), 'G07'),
    mk(y, col(LIM.A_CODE, X.R), {
      kind: 'input', field: `${totals}t9A`, ariaLabel: '保険金の非課税限度額Ⓐ', commaInteger: true, readOnly: true, rightLabel: ',000,000',
    }),
  ];
}

/** 2 課税される金額の計算（5人＋合計行） */
function personRows(common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options']): GridCell[] {
  const cols = row(1162.5, PERSON_Y[0]);
  const total = row(PERSON_Y[5], PERSON_Y[6]);
  return [
    label(cols, col(X.L, X.ADDR), '保険金などを\n受け取った相続人の氏名'),
    label(cols, col(X.ADDR, P.V1_R), '①　受け取った保険金などの金額(円)'),
    label(cols, col(P.V1_R, P.V2_R), '②　非課税金額(円)　(Ⓐ×各人の①／Ⓑ)'),
    label(cols, col(P.V2_R, X.R), '③　課税金額(円)\n（①−②）'),

    ...Array.from({ length: TABLE9_ROWS }, (_unused, r): GridCell[] => {
      const y = row(PERSON_Y[r]!, PERSON_Y[r + 1]!);
      const i = page * TABLE9_ROWS + r;
      const who = `相続人${i + 1}`;
      const g = 8 + r * 3;
      return [
        code(y, col(X.L, X.C1), cd('E', 17 + r)),
        mk(y, col(X.C1, X.ADDR), { kind: 'input', field: `${common}t9p${i}Name`, ariaLabel: `${who}の氏名`, options: whoOptions, align: 'left' }),
        code(y, col(X.ADDR, X.C2), cd('G', g)),
        mk(y, col(X.C2, P.V1_R), { kind: 'input', field: `${common}t9p${i}v1`, ariaLabel: `${who}が受け取った保険金などの金額`, commaInteger: true }),
        code(y, col(P.V1_R, X.ERA), cd('G', g + 1)),
        mk(y, col(X.ERA, P.V2_R), { kind: 'input', field: `${totals}t9r${i}v2`, ariaLabel: `${who}の非課税金額`, commaInteger: true, readOnly: true }),
        code(y, col(P.V2_R, P.V3_C), cd('G', g + 2)),
        mk(y, col(P.V3_C, X.R), { kind: 'input', field: `${totals}t9r${i}v3`, ariaLabel: `${who}の課税金額`, commaInteger: true, readOnly: true }),
      ];
    }).flat(),

    // 合計行。Ⓑ・②③の合計は全枚数を通した値なので最終ページにだけ出す
    label(total, col(X.L, X.ADDR), '合　計'),
    label(total, col(X.ADDR, X.C2), 'Ⓑ', { fontSize: 8 }),
    code(total, col(X.C2, 340), 'G23'),
    code(total, col(P.V1_R, X.ERA), 'G24'),
    code(total, col(P.V2_R, P.V3_C), 'G25'),
    ...(last
      ? [
        mk(total, col(340, P.V1_R), { kind: 'input' as const, field: `${totals}t9B`, ariaLabel: '受け取った保険金などの金額の合計Ⓑ', commaInteger: true, readOnly: true }),
        mk(total, col(X.ERA, P.V2_R), { kind: 'input' as const, field: `${totals}t9v2Total`, ariaLabel: '非課税金額の合計', commaInteger: true, readOnly: true }),
        mk(total, col(P.V3_C, X.R), { kind: 'input' as const, field: `${totals}t9v3Total`, ariaLabel: '課税金額の合計', commaInteger: true, readOnly: true }),
      ]
      : [
        mk(total, col(340, P.V1_R), {}),
        mk(total, col(X.ERA, P.V2_R), {}),
        mk(total, col(P.V3_C, X.R), {}),
      ]),

    // ③（課税金額）の列は列見出しから合計行まで太枠で囲まれている
    mk(row(1162.5, PERSON_Y[6]), col(P.V2_R, X.R), { outline: true }),
  ];
}

/**
 * 第9表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 1・2とも人ではなく様式全体の一覧
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— Ⓐ・Ⓑ・②③
 * @param page 0始まりの枚数
 * @param last 最終ページか（Ⓑと②③の合計はここにだけ出す）
 * @param whoOptions 氏名の選択肢（値は第11表の項番＝入力順の通し番号）
 */
export function buildTable9(
  common: string, totals: string, page: number, last: boolean, whoOptions: GridCell['options'],
): GridCell[] {
  const decY = row(TOP, 257);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(decY, col(DEC.L, DEC.CODE), '被相続人'),
    code(decY, col(DEC.CODE, DEC.INPUT), 'E01'),
    mk(decY, col(DEC.INPUT, X.R), { kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10 }),

    ...sectionHead(257, 280, 343.5, HEAD1, LEAD1),
    ...detailRows(common, page, whoOptions),
    label(row(891, 994.5), col(X.L, X.R), NOTES1, { align: 'left', fontSize: 7 }),

    ...sectionHead(994.5, 1016, 1061, HEAD2, LEAD2),
    ...limitRow(totals),
    ...personRows(common, totals, page, last, whoOptions),

    label(row(1636.5, BOTTOM), col(X.L, X.R), NOTES2, { align: 'left', fontSize: 7 }),
  ];
}
