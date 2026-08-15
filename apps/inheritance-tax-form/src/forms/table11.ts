/**
 * 相続税の申告書 第11表（相続税がかかる財産の明細書＝取得財産の価額の合計表）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 110px（被相続人の氏名欄の上辺）〜下端 1689px（下部の（注）枠の下辺）、
 * 左端 83px 〜 右端 1156px を 0〜100％ に写す。
 * 人物ブロックも計算欄も持たないため、geometry.ts からはセル生成の最小
 * ユーティリティ（mk/code/label）だけを借りる。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { code, dateSelect, label, mk } from './geometry';

export const TABLE11_FORM_CODE = 'NTA0KSE160010010';
export const TABLE11_TITLE = '相続税の申告書　第11表';
export const TABLE11_SUBTITLE = '相続税がかかる財産の合計表\n（相続時精算課税適用財産を除きます。）';

/** 様式1枚に記入できる人数（これを超える場合は様式では合計表を追加する） */
export const TABLE11_ROWS = 10;

/** 「遺産の分割状況」欄に記入する番号 */
const DIVISION_OPTIONS = [
  { value: '', label: '' },
  { value: '1', label: '1 全部分割' },
  { value: '2', label: '2 一部分割' },
  { value: '3', label: '3 全部未分割' },
];

/** 表頭の説明文 */
const TABLE11_LEAD = '　この表は、遺産の分割状況及び各人の取得財産の価額の合計額等を記入します。\n'
  + '　なお、相続税がかかる財産（相続時精算課税適用財産を除きます。以下同じです。）の明細については、'
  + '財産の種類に応じて第11表の付表1から付表4に記入してください。\n'
  + '　（注）　財産を取得した人が10名を超える場合には、この合計表を追加して記入してください。';

/** 1「遺産の分割状況及び財産取得者の一覧」の（注） */
const TABLE11_LIST_NOTES: NonNullable<GridCell['numberedNotes']> = [
  { number: '1', body: '「遺産の分割状況」欄は、遺産の分割状況に応じた番号を記入します。' },
  {
    number: '2',
    body: '「分割の日」欄は、遺産の全部又は一部について分割がされている場合には、その分割の日を記入します。',
  },
];

/** 2「取得財産の価額の合計表」の（注） */
const TABLE11_SUM_NOTES: NonNullable<GridCell['numberedNotes']> = [
  { number: '1', body: '「財産を取得した人の番号」欄は、上記1の「項番」欄に記入した番号を記入します。' },
  {
    number: '2',
    body: '「①分割財産の価額」欄は、第11表の付表1から付表4の「分割が確定した財産」の「取得財産の価額」欄に'
      + '記入した価額について、財産を取得した人ごとに合計した金額を記入します。',
  },
  {
    number: '3',
    body: '「②未分割財産の価額」欄は、第11表の付表1から付表4の「財産の明細」に記入した財産のうち、'
      + '未分割である財産の価額の合計額を各相続人が相続分（寄与分を除きます。）に応じて取得するとした場合に計算される金額を記入します。',
  },
  { number: '4', body: '「③取得財産の価額」欄の金額を第1表のその人の「取得財産の価額①」欄に転記します。' },
];

const TOP = 110;
const BOTTOM = 1689;
const LEFT = 83;
const RIGHT = 1156;

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

/** 縦罫線の実測px */
const X = {
  L: 83,        // 表の左端
  G_L: 131,     // 左側 項番のコード枠の右端
  NO_L: 221,    // 左側 項番入力の右端（＝見出し「項番」の右端）
  E_L: 242,     // 左側 氏名のコード枠の右端
  DIV_R: 380,   // 「遺産の分割状況」入力の右端
  SUM2_L: 553,  // ②のコード枠の左端
  SUM2_C: 574,  // ②のコード枠の右端 ／ 「全部分割」ブロックの左端
  N1_C: 595,    // N01 コード枠の右端
  DEC_L: 649,   // 「被相続人の氏名」ラベルの左端
  G_R: 669,     // 右側 項番のコード枠の左端
  G_RC: 690,    // 右側 項番のコード枠の右端 ／ 全部分割「元号」の右端
  ALL_Y: 749,   // 全部分割「年」の右端 ／ 「被相続人の氏名」ラベルの右端
  E_R: 769,     // 右側 氏名のコード枠の左端 ／ E01 コード枠の左端
  E_RC: 790,    // 右側 氏名のコード枠の右端
  ALL_M: 809,   // 全部分割「月」の右端
  ALL_D: 869,   // 全部分割「日」の右端 ＝ 「一部分割」ブロックの左端 ＝ ③のコード枠の左端
  SUM3_C: 890,  // ③のコード枠の右端 ／ 一部分割「元号」の左端
  PART_E: 969,  // 一部分割「元号」の右端
  DEC_R: 1008,  // 「被相続人の氏名」入力の右端
  PART_Y: 1028, // 一部分割「年」の右端
  PART_M: 1087, // 一部分割「月」の右端
  R: 1156,      // 表の右端
} as const;

/** 明細行の高さ（実測px）。1・2どちらの表も同じ。 */
const ROW_H = 55.5;
/** 1「財産取得者の一覧」の1行目の上端px（左右2人ずつ・5行） */
const LIST_TOP = 582;
/** 2「取得財産の価額の合計表」の1行目の上端px */
const SUM_TOP = 1009.5;

/** 様式1枚に載る人 */
export interface Table11Person {
  /** フィールド接頭辞（'h0.' など） */
  prefix: string;
  /** アクセシブル名の主語（「1人目」など） */
  label: string;
}

/** 見出し・（注）などの説明文セル。番号付きの（注）は番号を同じ列に揃えて出す */
const notes = (y: [number, number], text: string | NonNullable<GridCell['numberedNotes']>): GridCell => (
  typeof text === 'string'
    ? label(y, col(X.L, X.R), text, { align: 'left', fontSize: 7 })
    : mk(y, col(X.L, X.R), { kind: 'label', numberedNotes: text, align: 'left', fontSize: 7 })
);

/** 「1 …」「2 …」の章見出し（太字の見出し行と、その下の細い説明文） */
function sectionHead(top: number, bottom: number, heading: string, lead?: string): GridCell[] {
  const split = lead === undefined ? bottom : (top + bottom) / 2;
  return [
    mk(row(top, bottom), col(X.L, X.R), {}),
    label(row(top, split), col(X.L, X.R), heading, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    ...(lead === undefined ? [] : [
      label(row(split, bottom), col(X.L, X.R), '　' + lead, { noBorder: true, align: 'left', fontSize: 7.5 }),
    ]),
  ];
}

/** 分割の日（元号・年・月・日）1組。全部分割・一部分割で割付は同じ。 */
function divisionDate(
  codeName: string, field: string, who: string, xs: readonly [number, number, number, number, number, number],
): GridCell[] {
  const r = row(441.5, 509);
  const [c0, c1, c2, c3, c4, c5] = xs;
  return [
    code(r, col(c0, c1), codeName),
    mk(r, col(c1, c2), { kind: 'input', field: `${field}Era`, ariaLabel: `${who}の元号`, options: ERA_OPTIONS, compactSelectedOption: true }),
    mk(r, col(c2, c3), dateSelect('y', `${field}Y`, `${who}（年）`)),
    mk(r, col(c3, c4), dateSelect('m', `${field}M`, `${who}（月）`)),
    mk(r, col(c4, c5), dateSelect('d', `${field}D`, `${who}（日）`)),
  ];
}

/** 遺産の分割状況（分割区分と分割の日） */
function divisionRows(common: string): GridCell[] {
  const head = row(391.5, 416.5);
  const sub = row(416.5, 441.5);
  const entry = row(441.5, 509);
  return [
    label(row(391.5, 441.5), col(X.L, X.DIV_R), '遺産の分割状況'),
    label(row(391.5, 509), col(X.DIV_R, X.SUM2_C), '分割の日'),
    label(head, col(X.SUM2_C, X.ALL_D), '全部分割'),
    label(head, col(X.ALL_D, X.R), '一部分割'),
    label(sub, col(X.SUM2_C, X.G_RC), '元号'),
    label(sub, col(X.G_RC, X.ALL_Y), '年'),
    label(sub, col(X.ALL_Y, X.ALL_M), '月'),
    label(sub, col(X.ALL_M, X.ALL_D), '日'),
    label(sub, col(X.ALL_D, X.PART_E), '元号'),
    label(sub, col(X.PART_E, X.PART_Y), '年'),
    label(sub, col(X.PART_Y, X.PART_M), '月'),
    label(sub, col(X.PART_M, X.R), '日'),

    label(entry, col(X.L, X.NO_L), '1：全部分割\n2：一部分割\n3：全部未分割', { align: 'left', fontSize: 7.5 }),
    code(entry, col(X.NO_L, X.E_L), 'G01'),
    mk(entry, col(X.E_L, X.DIV_R), { kind: 'input', field: `${common}divKind`, ariaLabel: '遺産の分割状況', options: DIVISION_OPTIONS, compactSelectedOption: true }),

    ...divisionDate('N01', `${common}divAll`, '全部分割の日', [X.SUM2_C, X.N1_C, X.G_RC, X.ALL_Y, X.ALL_M, X.ALL_D]),
    ...divisionDate('N02', `${common}divPart`, '一部分割の日', [X.ALL_D, X.SUM3_C, X.PART_E, X.PART_Y, X.PART_M, X.R]),
  ];
}

/** 財産取得者の一覧（項番・氏名を左右2人ずつ5行）。氏名と項番は第1表からの自動転記。 */
function listRows(people: Table11Person[]): GridCell[] {
  const head = row(538, 582);
  return [
    label(row(509, 538), col(X.L, X.R), '財産取得者の一覧'),
    label(head, col(X.L, X.NO_L), '項番'),
    label(head, col(X.NO_L, X.G_R), '財産を取得した人の氏名'),
    label(head, col(X.G_R, X.E_R), '項番'),
    label(head, col(X.E_R, X.R), '財産を取得した人の氏名'),

    ...people.flatMap((person, slot): GridCell[] => {
      // コードは左→右・上→下の順に振られている（G02/E02 が1人目、G03/E03 が2人目）
      const top = LIST_TOP + Math.floor(slot / 2) * ROW_H;
      const r = row(top, top + ROW_H);
      const n = String(2 + slot).padStart(2, '0');
      const left = slot % 2 === 0;
      const xs = left
        ? [X.L, X.G_L, X.NO_L, X.E_L, X.G_R] as const
        : [X.G_R, X.G_RC, X.E_R, X.E_RC, X.R] as const;
      return [
        code(r, col(xs[0], xs[1]), `G${n}`),
        mk(r, col(xs[1], xs[2]), { kind: 'input', field: `${person.prefix}t11no`, ariaLabel: `${person.label}の項番`, integerDigits: 2, align: 'center', readOnly: true }),
        code(r, col(xs[2], xs[3]), `E${n}`),
        mk(r, col(xs[3], xs[4]), { kind: 'input', field: `${person.prefix}name`, ariaLabel: `${person.label}の氏名`, align: 'left', fontSize: 10, readOnly: true }),
      ];
    }),
  ];
}

/**
 * 取得財産の価額の合計表（①分割財産・②未分割財産・③その合計）。
 * ①②③はいずれも（注）2〜4のとおり付表1〜4からの導出なので、3欄とも入力不可にする。
 */
function sumRows(people: Table11Person[]): GridCell[] {
  const head = row(954, SUM_TOP);
  /** 見出しの丸番号は罫線を持たず、金額欄の見出しと同じマスの左端に印字されている */
  const headCell = (from: number, mark: number, to: number, no: string, text: string): GridCell[] => [
    mk(head, col(from, to), {}),
    label(head, col(from, mark), no, { noBorder: true, fontSize: 9 }),
    label(head, col(mark, to), text, { noBorder: true }),
  ];
  return [
    label(head, col(X.L, X.NO_L), '財産を取得\nした人の番号'),
    ...headCell(X.NO_L, X.E_L, X.SUM2_L, '①', '分割財産の価額（円）'),
    ...headCell(X.SUM2_L, X.SUM2_C, X.ALL_D, '②', '未分割財産の価額（円）'),
    ...headCell(X.ALL_D, X.SUM3_C, X.R, '③', '取得財産の価額（円）\n（①＋②）'),

    ...people.flatMap((person, slot): GridCell[] => {
      const top = SUM_TOP + slot * ROW_H;
      const r = row(top, top + ROW_H);
      const n = 12 + slot * 4;
      const p = person.prefix;
      return [
        code(r, col(X.L, X.G_L), `G${n}`),
        mk(r, col(X.G_L, X.NO_L), { kind: 'input', field: `${p}t11no`, ariaLabel: `${person.label}の番号`, integerDigits: 2, align: 'center', readOnly: true }),
        code(r, col(X.NO_L, X.E_L), `G${n + 1}`),
        // ①③は代償財産（記載例62ページ）で負数になり得るため △ を表示できるようにする
        mk(r, col(X.E_L, X.SUM2_L), { kind: 'input', field: `${p}t11v1`, ariaLabel: `${person.label} ①分割財産の価額`, signedCommaInteger: true, readOnly: true }),
        code(r, col(X.SUM2_L, X.SUM2_C), `G${n + 2}`),
        mk(r, col(X.SUM2_C, X.ALL_D), { kind: 'input', field: `${p}t11v2`, ariaLabel: `${person.label} ②未分割財産の価額`, commaInteger: true, readOnly: true }),
        code(r, col(X.ALL_D, X.SUM3_C), `G${n + 3}`),
        mk(r, col(X.SUM3_C, X.R), { kind: 'input', field: `${p}t11v3`, ariaLabel: `${person.label} ③取得財産の価額`, signedCommaInteger: true, readOnly: true }),
      ];
    }),
  ];
}

/**
 * 第11表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）
 * @param people この様式に載る10人（不足分も接頭辞だけは渡す。値が無ければ空欄になる）
 */
export function buildTable11(common: string, people: Table11Person[]): GridCell[] {
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(110, 170.5), col(X.DEC_L, X.ALL_Y), '被相続人の氏名'),
    code(row(110, 170.5), col(X.ALL_Y, X.E_R), 'E01'),
    mk(row(110, 170.5), col(X.E_R, X.DEC_R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    notes(row(179, 302.5), TABLE11_LEAD),

    ...sectionHead(317.5, 391.5, '1　遺産の分割状況及び財産取得者の一覧', '遺産の分割状況及び相続税がかかる財産を取得した人全ての氏名を記入します。'),
    ...divisionRows(common),
    ...listRows(people),
    notes(row(859.5, 906.5), TABLE11_LIST_NOTES),

    ...sectionHead(913.5, 954, '2　取得財産の価額の合計表'),
    ...sumRows(people),
    notes(row(1564.5, 1689), TABLE11_SUM_NOTES),
  ];
}
