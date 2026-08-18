/**
 * 相続税の申告書 第13表「債務及び葬式費用の明細書」。
 *
 * 1枚に 1債務の明細4行・2葬式費用の明細5行・3合計額の人4人分 が載る。
 * どれか1つでも足りなければ用紙を増やすため、枚数は共通欄 `t13Pages` と
 * 人数（4人／枚）の大きい方で決める（`table13Pages`）。
 * 1・2の合計欄と3の「各人の合計」列は全枚数を通した合計なので、**最終ページにだけ値を出す**
 * （第11の2表と同じ扱い）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 181.5px（被相続人欄の上辺）〜下端 1693.5px（下部の（注）枠の下辺）、
 * 左端 106.5px 〜 右端 1201.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { ERA_OPTIONS } from '../data/codes';
import { code, dateSelect, label, mk, type FormRow } from './geometry';

export const TABLE13_FORM_CODE = 'NTA0KSE130010020';
export const TABLE13_TITLE = '相続税の申告書　第13表';
export const TABLE13_SUBTITLE = '債務及び葬式費用の明細書';
export const TABLE13_EDITION = '（令和2年4月分以降用）（R8.7）';

/** 様式1枚に記入できる債務の件数 */
export const TABLE13_DEBT_ROWS = 4;
/** 様式1枚に記入できる葬式費用の件数 */
export const TABLE13_FUNERAL_ROWS = 5;
/** 様式1枚に載る「債務などを承継した人」の人数 */
export const TABLE13_PERSONS = 4;

/**
 * 1・2の明細を持つ配列のID（`FormData.details` のキー）。
 *
 * 明細は「行そのもの」を1要素とする配列で持つ。共通欄に `t13d0Kind` のように
 * 行の位置を欄の名前へ焼き込むと、行を入れ替えるには全部の欄を移し替えるしかなく、
 * 1つでも移し忘れると別の行の値が混ざる。配列なら並べ替えは要素の移動だけで済む。
 */
export const TABLE13_DEBT_FORM = 'table13debt';
/** 2 葬式費用の明細（同上） */
export const TABLE13_FUNERAL_FORM = 'table13funeral';

const TOP = 181.5;
const BOTTOM = 1693.5;
const LEFT = 106.5;
const RIGHT = 1201.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE13_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

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
  L: 106.5,      // 表の左端 ／ 1の種類・2の氏名のコード枠の左端
  C1: 127.5,     // 1の種類・2の氏名のコード枠の右端
  LBL3: 149.5,   // 3の縦帯（債務・葬式費用）の右端
  KIND: 192.5,   // 1の種類の右端 ／ 細目のコード枠の左端
  C2: 213.5,     // 1の細目のコード枠の右端
  ITEM: 278.5,   // 1の細目の右端 ／ 債権者氏名のコード枠の左端 ＝ 2の氏名の右端
  C3: 299.5,     // 1の債権者氏名・2の住所のコード枠の右端
  NO3: 342.5,    // 3の項目名の右端 ＝ 丸番号セルの左端
  MK3: 364.5,    // 3の丸番号セルの右端 ／ 「各人の合計」のコード枠の左端
  SUM3_C: 385.5, // 3の「各人の合計」のコード枠の右端
  NAME: 407.5,   // 1の債権者氏名の右端 ／ 住所のコード枠の左端
  C4: 428.5,     // 1の住所のコード枠の右端
  ADDR2: 536.5,  // 2の住所の右端 ＝ 支払年月日の左端 ／ 3の「各人の合計」の右端
  D2_C: 557.5,   // 2の支払年月日のコード枠の右端 ／ 3の1人目のコード枠の右端
  ADDR1: 600.5,  // 1の住所の右端 ＝ 発生年月日の左端 ／ 2の支払年月日「元号」の右端
  D1_C: 622.5,   // 1の発生年月日のコード枠の右端 ／ 2「年」の右端
  E1: 665.5,     // 1「元号」の右端 ／ 2「月」の右端
  Y1: 708.5,     // 1「年」の右端 ／ 2「日」の右端 ＝ 3の1人目の右端
  P2_C: 729.5,   // 3の2人目のコード枠の右端
  M1: 751.5,     // 1「月」の右端 ＝ 2の支払年月日の右端 ／ 2の金額のコード枠の左端
  F_C: 772.5,    // 2の金額のコード枠の右端
  D1_R: 794.5,   // 1「日」の右端 ＝ 1の金額のコード枠の左端
  C5: 815.5,     // 1の金額のコード枠の右端
  P2_R: 880.5,   // 3の2人目の右端 ／ 3人目のコード枠の左端
  P3_C: 901.5,   // 3の3人目のコード枠の右端
  AMT: 945.0,    // 1・2の金額の右端 ＝ 負担する人の氏名のコード枠の左端
  C6: 966.5,     // 負担する人の氏名のコード枠の右端
  P3_R: 1052.5,  // 3の3人目の右端 ／ 4人目のコード枠の左端
  SHARE: 1073.5, // 負担する人の氏名の右端 ＝ 負担する金額のコード枠の左端 ／ 3の4人目のコード枠の右端
  C7: 1095.5,    // 負担する金額のコード枠の右端
  R: 1201.5,     // 表の右端
} as const;

/** 被相続人欄（右上）の縦割り */
const DEC = { L: 772.5, CODE: 923.5, INPUT: 944.5 } as const;

/** 1 債務の明細の行位置（上端・下端）。1行目だけ元号等の見出しを持つ分だけ高い。 */
const DEBT_Y: readonly (readonly [number, number])[] = [[364.5, 440.5], [440.5, 497.0], [497.0, 553.5], [553.5, 610.0]];
/** 債務1行目の「元号・年・月・日」見出しの下端（発生年月日はここから始まる） */
const DEBT_HEAD = 384.0;
/** 2 葬式費用の明細の行位置 */
const FUNERAL_Y: readonly (readonly [number, number])[] = [[801.0, 877.0], [877.0, 933.5], [933.5, 990.0], [990.0, 1046.5], [1046.5, 1103.0]];
/** 葬式費用1行目の「元号・年・月・日」見出しの下端 */
const FUNERAL_HEAD = 820.5;
/** 3 合計額の各行の上端（①〜⑦）と最終行の下端 */
const SUM_Y = [1258.5, 1315.0, 1371.5, 1428.0, 1484.5, 1541.0, 1597.5, 1654.0] as const;

/** 日付欄の縦割り（コード枠の左端・右端・元号・年・月・日の右端） */
type DateX = readonly [number, number, number, number, number, number];
/** 1 債務の明細（発生年月日・弁済期限） */
const DEBT_DATE_X: DateX = [X.ADDR1, X.D1_C, X.E1, X.Y1, X.M1, X.D1_R];
/** 2 葬式費用の明細（支払年月日） */
const FUNERAL_DATE_X: DateX = [X.ADDR2, X.D2_C, X.D1_C, X.E1, X.Y1, X.M1];

/** 明細行の「金額／負担する人の氏名／負担する金額」（右側3列）の縦割り */
type ShareX = readonly [number, number];
/** 1 債務の明細（金額欄が左に広い） */
const DEBT_SHARE_X: ShareX = [X.D1_R, X.C5];
/** 2 葬式費用の明細 */
const FUNERAL_SHARE_X: ShareX = [X.M1, X.F_C];

/** 3 合計額の人物列（コード枠の左端・右端・列の右端） */
const PERSON_X: readonly (readonly [number, number, number])[] = [
  [X.ADDR2, X.D2_C, X.Y1],
  [X.Y1, X.P2_C, X.P2_R],
  [X.P2_R, X.P3_C, X.P3_R],
  [X.P3_R, X.SHARE, X.R],
];

/** 3 合計額の行見出し（丸番号・項目名・自動計算かどうか） */
const SUM_ROWS = [
  { mark: '①', text: '負担することが\n確定した債務', auto: true },
  { mark: '②', text: '負担することが確定\nしていない債務', auto: false },
  { mark: '③', text: '計（①＋②）', auto: true },
  { mark: '④', text: '負担することが\n確定した葬式費用', auto: true },
  { mark: '⑤', text: '負担することが確定\nしていない葬式費用', auto: false },
  { mark: '⑥', text: '計（④＋⑤）', auto: true },
  { mark: '⑦', text: '合計（③＋⑥）', auto: true },
] as const;

const DEBT_LEAD = '（この表は、被相続人の債務について、その明細と負担する人の氏名及び金額を記入します。'
  + 'なお、特別寄与者に対し相続人が支払う特別寄与料についても、これに準じて記入します。）';
const FUNERAL_LEAD = '（この表は、被相続人の葬式に要した費用について、その明細と負担する人の氏名及び金額を記入します。）';
const TABLE13_NOTES = '（注）　1　各人の⑦欄の金額を第1表のその人の「債務及び葬式費用の金額③」欄に転記します。\n'
  + '　　　　2　③、⑥及び⑦欄の金額を第15表の㉝、㉞及び㉟欄にそれぞれ転記します。';

/** 「1 …」「2 …」の章見出し（太字の見出しと、その右に続く説明文） */
function sectionHead(top: number, bottom: number, heading: string, lead: string): GridCell[] {
  const y = row(top, bottom);
  return [
    mk(y, col(X.L, X.R), {}),
    label(y, col(X.L, X.NAME), heading, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    label(y, col(X.NAME, X.R), lead, { noBorder: true, align: 'left', fontSize: 7.5 }),
  ];
}

/** 元号・年・月・日の見出し（明細1行目の上に載る細い帯） */
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
    mk(y, col(xs[2], xs[3]), dateSelect('y', `${field}Y`, `${who}（年）`)),
    mk(y, col(xs[3], xs[4]), dateSelect('m', `${field}M`, `${who}（月）`)),
    mk(y, col(xs[4], xs[5]), dateSelect('d', `${field}D`, `${who}（日）`)),
  ];
}

/** 明細行の右側3列（金額・負担する人の氏名・負担する金額）。1と2で割付は同じ。 */
function shareCells(
  y: [number, number], xs: ShareX, f: string, who: string,
  codes: readonly [string, string, string], whoOptions: GridCell['options'],
): GridCell[] {
  return [
    code(y, col(xs[0], xs[1]), codes[0]),
    mk(y, col(xs[1], X.AMT), { kind: 'input', field: `${f}amt`, ariaLabel: `${who}の金額`, commaInteger: true }),
    code(y, col(X.AMT, X.C6), codes[1]),
    mk(y, col(X.C6, X.SHARE), { kind: 'input', field: `${f}who`, ariaLabel: `${who}を負担する人の氏名`, options: whoOptions, align: 'left' }),
    code(y, col(X.SHARE, X.C7), codes[2]),
    mk(y, col(X.C7, X.R), { kind: 'input', field: `${f}share`, ariaLabel: `${who}のうち負担する金額`, commaInteger: true }),
  ];
}

/** 1・2の合計行（金額欄だけが合計を持ち、他の欄は斜線） */
function totalRow(
  y: [number, number], xs: ShareX, codeName: string, name: string,
  field: string | undefined, blanks: readonly (readonly [number, number])[],
): GridCell[] {
  return [
    label(y, col(X.L, X.ITEM), '合　計'),
    ...blanks.map(([a, b]) => mk(y, col(a, b), { diagonal: 'bltr' as const })),
    code(y, col(xs[0], xs[1]), codeName),
    field === undefined
      ? mk(y, col(xs[1], X.AMT), {})
      : mk(y, col(xs[1], X.AMT), { kind: 'input', field, ariaLabel: `${name}の合計`, commaInteger: true, readOnly: true }),
    mk(y, col(X.AMT, X.SHARE), { diagonal: 'bltr' }),
    mk(y, col(X.SHARE, X.R), { diagonal: 'bltr' }),
  ];
}

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 1 債務の明細（4行＋合計） */
function debtRows(rows: readonly Table13Row[], last: boolean, whoOptions: GridCell['options']): GridCell[] {
  const head = row(296.5, 330.5);
  const sub = row(330.5, 364.5);
  const full = row(296.5, 364.5);
  return [
    label(row(262.5, 296.5), col(X.L, X.AMT), '債　務　の　明　細'),
    label(row(262.5, 296.5), col(X.AMT, X.R), '負担することが確定した債務'),

    label(full, col(X.L, X.KIND), '種　類'),
    label(full, col(X.KIND, X.ITEM), '細　目'),
    label(head, col(X.ITEM, X.ADDR1), '債　権　者'),
    label(sub, col(X.ITEM, X.NAME), '氏名又は名称'),
    label(sub, col(X.NAME, X.ADDR1), '住所又は所在地'),
    label(head, col(X.ADDR1, X.D1_R), '発生年月日'),
    label(sub, col(X.ADDR1, X.D1_R), '弁済期限'),
    label(full, col(X.D1_R, X.AMT), '金　額(円)'),
    label(full, col(X.AMT, X.SHARE), '負担する人の氏名'),
    label(full, col(X.SHARE, X.R), '負担する金額(円)'),

    // 種類・細目・氏名・住所は枠に入りきらないことが多いので、枠内で2行以上に折り返す
    ...DEBT_Y.flatMap(([top, bottom], r): GridCell[] => {
      const { prefix: f, label: who } = rows[r]!;
      const body = row(top, bottom);
      // 1行目だけ「元号・年・月・日」の見出し帯を持ち、その分だけ日付欄が下にずれる
      const dateTop = r === 0 ? DEBT_HEAD : top;
      const mid = (dateTop + bottom) / 2;
      const e = 2 + r * 5;
      return [
        code(body, col(X.L, X.C1), cd('E', e)),
        mk(body, col(X.C1, X.KIND), { kind: 'input', field: `${f}kind`, ariaLabel: `${who}の種類`, align: 'left', multiline: true }),
        code(body, col(X.KIND, X.C2), cd('E', e + 1)),
        mk(body, col(X.C2, X.ITEM), { kind: 'input', field: `${f}item`, ariaLabel: `${who}の細目`, align: 'left', multiline: true }),
        code(body, col(X.ITEM, X.C3), cd('E', e + 2)),
        mk(body, col(X.C3, X.NAME), { kind: 'input', field: `${f}name`, ariaLabel: `${who}の債権者の氏名又は名称`, align: 'left', multiline: true }),
        code(body, col(X.NAME, X.C4), cd('E', e + 3)),
        mk(body, col(X.C4, X.ADDR1), { kind: 'input', field: `${f}addr`, ariaLabel: `${who}の債権者の住所又は所在地`, align: 'left', multiline: true }),
        ...(r === 0 ? dateHead(row(top, DEBT_HEAD), DEBT_DATE_X) : []),
        ...dateRow(row(dateTop, mid), DEBT_DATE_X, cd('N', 1 + r * 2), `${f}occ`, `${who}の発生年月日`),
        ...dateRow(row(mid, bottom), DEBT_DATE_X, cd('N', 2 + r * 2), `${f}due`, `${who}の弁済期限`),
        ...shareCells(body, DEBT_SHARE_X, f, who, [cd('G', 1 + r * 2), cd('E', e + 4), cd('G', 2 + r * 2)], whoOptions),
      ];
    }),

    ...totalRow(row(610.0, 666.5), DEBT_SHARE_X, 'G09', '債務', last ? 't.t13dTotal' : undefined, [
      [X.ITEM, X.NAME], [X.NAME, X.ADDR1], [X.ADDR1, X.D1_R],
    ]),
  ];
}

/** 2 葬式費用の明細（5行＋合計） */
function funeralRows(rows: readonly Table13Row[], last: boolean, whoOptions: GridCell['options']): GridCell[] {
  const head = row(744.5, 772.5);
  const sub = row(772.5, 801.0);
  const full = row(744.5, 801.0);
  return [
    label(row(710.5, 744.5), col(X.L, X.AMT), '葬　式　費　用　の　明　細'),
    label(row(710.5, 744.5), col(X.AMT, X.R), '負担することが確定した葬式費用'),

    label(head, col(X.L, X.ADDR2), '支　払　先'),
    label(sub, col(X.L, X.ITEM), '氏名又は名称'),
    label(sub, col(X.ITEM, X.ADDR2), '住所又は所在地'),
    label(full, col(X.ADDR2, X.M1), '支払年月日'),
    label(full, col(X.M1, X.AMT), '金　額(円)'),
    label(full, col(X.AMT, X.SHARE), '負担する人の氏名'),
    label(full, col(X.SHARE, X.R), '負担する金額(円)'),

    ...FUNERAL_Y.flatMap(([top, bottom], r): GridCell[] => {
      const { prefix: f, label: who } = rows[r]!;
      const body = row(top, bottom);
      const dateTop = r === 0 ? FUNERAL_HEAD : top;
      const e = 22 + r * 3;
      return [
        code(body, col(X.L, X.C1), cd('E', e)),
        mk(body, col(X.C1, X.ITEM), { kind: 'input', field: `${f}name`, ariaLabel: `${who}の支払先の氏名又は名称`, align: 'left', multiline: true }),
        code(body, col(X.ITEM, X.C3), cd('E', e + 1)),
        mk(body, col(X.C3, X.ADDR2), { kind: 'input', field: `${f}addr`, ariaLabel: `${who}の支払先の住所又は所在地`, align: 'left', multiline: true }),
        ...(r === 0 ? dateHead(row(top, FUNERAL_HEAD), FUNERAL_DATE_X) : []),
        ...dateRow(row(dateTop, bottom), FUNERAL_DATE_X, cd('N', 9 + r), `${f}pay`, `${who}の支払年月日`),
        ...shareCells(body, FUNERAL_SHARE_X, f, who, [cd('G', 10 + r * 2), cd('E', e + 2), cd('G', 11 + r * 2)], whoOptions),
      ];
    }),

    ...totalRow(row(1103.0, 1159.5), FUNERAL_SHARE_X, 'G20', '葬式費用', last ? 't.t13fTotal' : undefined, [
      [X.ITEM, X.ADDR2], [X.ADDR2, X.M1],
    ]),
  ];
}

/** 3 債務及び葬式費用の合計額（「各人の合計」列＋この用紙に載る4人） */
function sumRows(totals: string, people: readonly Table13Row[], last: boolean): GridCell[] {
  const headY = row(1202.0, SUM_Y[0]);
  return [
    label(headY, col(X.L, X.MK3), '債務などを承継した人の氏名'),
    label(headY, col(X.MK3, X.ADDR2), '（各人の合計）'),
    ...people.flatMap((person, slot): GridCell[] => {
      const [c0, c1, c2] = PERSON_X[slot]!;
      return [
        code(headY, col(c0, c1), `E${37 + slot}`),
        mk(headY, col(c1, c2), { kind: 'input', field: `${person.prefix}name`, ariaLabel: `${person.label}の氏名`, align: 'left', fontSize: 10, readOnly: true }),
      ];
    }),

    // 左端の縦帯（①〜③が債務、④〜⑥が葬式費用。⑦は帯を持たず行全体が見出しになる）
    label(row(SUM_Y[0], SUM_Y[3]), col(X.L, X.LBL3), '債務（円）'),
    label(row(SUM_Y[3], SUM_Y[6]), col(X.L, X.LBL3), '葬式費用（円）'),

    ...SUM_ROWS.flatMap((def, r): GridCell[] => {
      const y = row(SUM_Y[r]!, SUM_Y[r + 1]!);
      const key = `t13v${r + 1}`;
      const total = r === SUM_ROWS.length - 1;
      return [
        label(y, col(total ? X.L : X.LBL3, X.NO3), def.text),
        label(y, col(X.NO3, X.MK3), def.mark, { fontSize: 9 }),
        code(y, col(X.MK3, X.SUM3_C), `G${21 + r}`),
        last
          ? mk(y, col(X.SUM3_C, X.ADDR2), { kind: 'input', field: `${totals}${key}`, ariaLabel: `各人の合計 ${def.mark}`, commaInteger: true, readOnly: true })
          : mk(y, col(X.SUM3_C, X.ADDR2), {}),
        ...people.flatMap((person, slot): GridCell[] => {
          const [c0, c1, c2] = PERSON_X[slot]!;
          return [
            code(y, col(c0, c1), `G${28 + slot * 7 + r}`),
            mk(y, col(c1, c2), {
              kind: 'input',
              field: `${person.prefix}${key}`,
              ariaLabel: `${person.label} ${def.mark}`,
              commaInteger: true,
              readOnly: def.auto,
            }),
          ];
        }),
      ];
    }),
  ];
}

/** 様式1枚に載る1行（承継した人・債務・葬式費用）の在りか */
export type Table13Row = FormRow;

/** 第13表1枚に載る行（枚数から決まるので、どの行が何番目かは呼ぶ側が決める） */
export interface Table13Rows {
  /** 3 債務などを承継した人（4人。不足分も接頭辞だけは渡す。値が無ければ空欄になる） */
  people: readonly Table13Row[];
  /** 1 債務の明細（4件） */
  debt: readonly Table13Row[];
  /** 2 葬式費用の明細（5件） */
  funeral: readonly Table13Row[];
}

/**
 * 第13表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 被相続人の氏名
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— 3の「各人の合計」列
 * @param rows この用紙に載る行
 * @param last 最終ページか（1・2の合計と3の「各人の合計」は全枚数の通算なのでここにだけ出す）
 * @param whoOptions 「負担する人の氏名」の選択肢（値は人のID）
 */
export function buildTable13(
  common: string, totals: string, rows: Table13Rows, last: boolean,
  whoOptions: GridCell['options'],
): GridCell[] {
  const decY = row(181.5, 215.5);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(decY, col(DEC.L, DEC.CODE), '被相続人'),
    code(decY, col(DEC.CODE, DEC.INPUT), 'E01'),
    mk(decY, col(DEC.INPUT, X.R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    ...sectionHead(215.5, 262.5, '1　債務の明細', DEBT_LEAD),
    ...debtRows(rows.debt, last, whoOptions),

    // 1と2の間の細い空き帯（罫線は上下のセルが持つ）
    mk(row(666.5, 672.0), col(X.L, X.R), { noBorder: true }),

    ...sectionHead(672.0, 710.5, '2　葬式費用の明細', FUNERAL_LEAD),
    ...funeralRows(rows.funeral, last, whoOptions),

    mk(row(1159.5, 1165.0), col(X.L, X.R), { noBorder: true }),

    label(row(1165.0, 1202.0), col(X.L, X.R), '3　債務及び葬式費用の合計額', { align: 'left', bold: true, fontSize: 9 }),
    ...sumRows(totals, rows.people, last),

    label(row(1654.0, 1693.5), col(X.L, X.R), TABLE13_NOTES, { align: 'left', fontSize: 7 }),
  ];
}
