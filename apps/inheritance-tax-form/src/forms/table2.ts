/**
 * 相続税の申告書 第2表（相続税の総額の計算書）。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 237.5px（被相続人欄の上辺）〜下端 1549px（速算表の下辺）、
 * 左端 77px 〜 右端 1142px を 0〜100％ に写す。
 * 第1表と様式の骨格が違う（人物ブロックも計算欄も持たない）ため、
 * geometry.ts からはセル生成の最小ユーティリティ（mk/code/label）だけを借りる。
 */

import type { GridCell } from '../components/ui/GridForm';
import { RELATION_OPTIONS } from '../data/codes';
import { code, label, mk } from './geometry';
import { personAction } from './person';

export const TABLE2_FORM_CODE = 'NTA0KSE020010020';
export const TABLE2_TITLE = '相続税の申告書　第2表';
export const TABLE2_SUBTITLE = '相続税の総額の計算書';
/** 様式の適用年分（第1表とは違う） */
export const TABLE2_EDITION = '（令和5年1月分以降用）（R8.7）';

/** 法定相続人の記入欄の行数（これを超える場合は様式では第2表の付表を使う） */
export const LAWFUL_ROWS = 6;

/** 表頭の説明文 */
const TABLE2_LEAD = '　この表は、第1表及び第3表の「相続税の総額」の計算のために使用します。\n'
  + '　なお、被相続人から相続、遺贈や相続時精算課税に係る贈与によって財産を取得した人のうちに農業相続人がいない場合は、'
  + 'この表の㋭欄及び㋬欄並びに⑨欄から⑪欄までは記入する必要がありません。';

/** 罫線表の中に印字されている（注） */
const TABLE2_INNER_NOTES: NonNullable<GridCell['numberedNotes']> = [
  {
    number: '１',
    body: '被相続人との続柄は、コード表を参照してください。なお、④欄の記入に当たっては、被相続人に養子がある場合や'
      + '相続の放棄があった場合には、「相続税の申告のしかた」をご覧ください。',
  },
  {
    number: '２',
    body: '⑧欄の金額を第1表⑦欄へ転記します。財産を取得した人のうちに農業相続人がいる場合は、'
      + '⑧欄の金額を第1表⑦欄へ転記するとともに、⑪欄の金額を第3表⑦欄へ転記します。',
  },
];

/** 罫線表の外（下）に印字されている速算表の使用方法と連帯納付義務 */
export const TABLE2_NOTES = 'この速算表の使用方法は、次のとおりです。\n'
  + '⑥欄の金額×税率−控除額＝⑦欄の税額　　　⑨欄の金額×税率−控除額＝⑩欄の税額\n'
  + '例えば、⑥欄の金額30,000千円に対する税額（⑦欄）は、30,000千円×15％−500千円＝4,000千円です。';

/** 罫線表の外（下）に印字されている連帯納付義務の説明 */
export const TABLE2_JOINT_NOTES = '○連帯納付義務について\n'
  + '　相続税の納税については、各相続人等が相続、遺贈や相続時精算課税に係る贈与により受けた利益の価額を限度として、'
  + 'お互いに連帯して納付しなければならない義務があります。';

const TOP = 237.5;
const BOTTOM = 1549;
const LEFT = 77;
const RIGHT = 1142;

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
  L: 77,        // 表の左端
  CODE: 99,     // ④欄 先頭のコード枠（E02…）の右端
  MARK_R: 165,  // ㋑・㋭ ラベルの右端
  MARK_C: 187,  // G01・G02 コード枠の右端
  A_LBL: 209,   // 「法定相続人の数（人）」ラベルの右端（合計行）
  NAME_R: 231,  // 氏名入力の右端
  REL_C: 253,   // 続柄コード枠の右端
  REL_R: 319,   // 続柄入力の右端 ＝ ⑤欄の左端
  FR_C: 341,    // ⑤欄のコード枠（G08/G09）の右端
  SUM_R: 363,   // 合計行「合計」ラベルの右端
  D1: 427,      // 第1表ブロック境界（二重線の左）
  D1R: 431,     //   〃（二重線の右）
  N6_C: 451,    // ⑥のコード枠の右端
  DED_L: 473,   // ㋺ 記号の左端
  DED_C: 495,   // G03 コード枠の左端
  DED_BOX: 517, // G03 コード枠の右端 ＝ ㋺入力枠の左端
  N7_L: 605,    // ⑥入力の右端 ／ ㋺入力枠の右端
  N7_C: 627,    // ⑦のコード枠の右端 ／ ㋩ 記号の左端
  DED2_C: 649,  // ㋩ 記号の右端 ＝ G04 コード枠の左端
  DED2_BOX: 671,// G04 コード枠の右端 ＝ ㋩入力枠の左端
  D3: 779,      // 第3表ブロック境界（二重線の左）
  D3R: 783,     //   〃（二重線の右）
  N9_C: 803,    // ⑨のコード枠の右端
  DEC_LBL: 693, // 「被相続人」ラベルの左端
  DEC_L: 847,   // 「被相続人」ラベルの右端
  DEC_C: 869,   // E01 コード枠の右端
  NET_R: 891,   // ㋥・㋬ ラベルの右端
  NET_C: 913,   // G05・G06 コード枠の右端
  N10_L: 957,   // ⑨入力の右端 ＝ ⑩のコード枠の左端
  N10_C: 988,   // ⑩のコード枠の右端
  R: 1142,      // 表の右端
} as const;

/** 速算表の縦罫線（実測px）。左端の見出し列＋8区分。 */
const RATE_X = [99, 253, 363, 473, 583, 693, 803, 913, 1032, 1142] as const;

/**
 * 法定相続人1人分の行位置（実測px）。
 * ⑤欄は上段に分子・下段に分母を書き、その間に分数の横線（二重線）が入る。
 */
const LAW_Y: readonly (readonly [number, number, number, number])[] = [
  [631.5, 676.5, 691.0, 736.0],
  [736.0, 781.0, 796.0, 841.0],
  [841.0, 886.0, 900.5, 945.5],
  [945.5, 990.5, 1005.5, 1050.5],
  [1050.5, 1095.5, 1110.0, 1155.0],
  [1155.0, 1200.0, 1215.0, 1260.0],
];

/**
 * ④に載る法定相続人1人分の参照先。
 * 行そのものは値を持たず、「財産を取得した人」の欄（`h{n}.`）をそのまま指す。
 */
export interface LawfulRowRef {
  /** その人のフィールド接頭辞（'h0.'） */
  prefix: string;
  /** 続柄と人数から法定相続分の自動候補を出せるか */
  autoable: boolean;
}

/** ④⑤⑥⑦欄の識別コード（1行ごとに5ずつ進む） */
const lawCode = (i: number, offset: number): string => `G${String(7 + i * 5 + offset).padStart(2, '0')}`;

/** 金額欄の共通指定 */
const money = (field: string, ariaLabel: string, zeros?: string): Partial<GridCell> => ({
  kind: 'input', field, ariaLabel, commaInteger: true, readOnly: true,
  ...(zeros ? { rightLabel: zeros } : {}),
});

/** ①②③ — 課税価格の合計額・遺産に係る基礎控除額・課税遺産総額 */
function taxableEstateRows(totals: string): GridCell[] {
  const head = row(343.5, 408.5);
  const sub = row(378.5, 408.5);
  const r1 = row(408.5, 464);
  const r2 = row(464, 518);
  return [
    // 見出し（②だけ2段。下段は罫線を持たない補足ラベル）
    label(head, col(X.L, X.REL_R), '①　課税価格の合計額(円)'),
    label(row(343.5, 378.5), col(X.REL_R, X.D3), '②　遺産に係る基礎控除額'),
    label(sub, col(X.DED_C, X.N7_L), 'Ⓐの法定相続人の数(人)', { noBorder: true, fontSize: 6, noWrap: true }),
    label(sub, col(X.DED2_BOX, X.D3), '(単位：万円)', { noBorder: true, fontSize: 7, bold: true }),
    label(head, col(X.D3, X.R), '③　課税遺産総額(円)'),

    // ㋑（第1表⑥Ⓐ）＝ 第1表の課税価格の合計額
    label(r1, col(X.L, X.MARK_R), '㋑\n(第1表⑥Ⓐ)'),
    code(r1, col(X.MARK_R, X.MARK_C), 'G01'),
    mk(r1, col(X.MARK_C, X.REL_R), { ...money(`${totals}v6`, '㋑ 課税価格の合計額', '，000'), navigateToForm: 'table1' }),

    // 3,000万円＋(600万円×㋺法定相続人の数)＝㋩遺産に係る基礎控除額
    mk(r1, col(X.REL_R, X.DED_C), {}),
    label(r1, col(X.REL_R, X.DED_L), '3,000万円＋(600万円×', { noBorder: true, align: 'left', noWrap: true }),
    label(r1, col(X.DED_L, X.DED_C), '㋺', { noBorder: true }),
    code(r1, col(X.DED_C, X.DED_BOX), 'G03'),
    mk(r1, col(X.DED_BOX, X.N7_L), { kind: 'input', field: `${totals}heirCount`, ariaLabel: '㋺ 法定相続人の数', integerDigits: 2, align: 'center', readOnly: true }),
    mk(r1, col(X.DED_BOX, X.N7_L), { outline: true }),
    mk(r1, col(X.N7_L, X.DED2_C), {}),
    label(r1, col(X.N7_L, X.N7_C), ')＝', { noBorder: true }),
    label(r1, col(X.N7_C, X.DED2_C), '㋩', { noBorder: true }),
    code(r1, col(X.DED2_C, X.DED2_BOX), 'G04'),
    mk(r1, col(X.DED2_BOX, X.D3), { kind: 'input', field: `${totals}k4`, ariaLabel: '㋩ 遺産に係る基礎控除額（万円）', commaInteger: true, readOnly: true }),
    mk(r1, col(X.DED2_BOX, X.D3), { outline: true }),

    // ㋥（㋑−㋩）＝ 課税遺産総額
    label(r1, col(X.D3, X.NET_R), '㋥\n(㋑−㋩)'),
    code(r1, col(X.NET_R, X.NET_C), 'G05'),
    mk(r1, col(X.NET_C, X.R), money(`${totals}k5`, '㋥ 課税遺産総額', '，000')),

    // ㋭（第3表⑥Ⓐ）— 農業相続人がいる場合のみ記入する。第3表は未対応のため手入力。
    label(r2, col(X.L, X.MARK_R), '㋭\n(第3表⑥Ⓐ)'),
    code(r2, col(X.MARK_R, X.MARK_C), 'G02'),
    mk(r2, col(X.MARK_C, X.REL_R), { kind: 'input', field: `${totals}k2`, ariaLabel: '㋭ 第3表の課税価格の合計額', commaInteger: true, rightLabel: '，000', readOnly: true }),
    label(r2, col(X.REL_R, X.D3), '㋺の人数及び㋩の金額を第1表Ⓑへ転記します。'),
    label(r2, col(X.D3, X.NET_R), '㋬\n(㋭−㋩)'),
    code(r2, col(X.NET_R, X.NET_C), 'G06'),
    mk(r2, col(X.NET_C, X.R), money(`${totals}k6`, '㋬ 農業投資価格による課税遺産総額', '，000')),
  ];
}

/** ④⑤⑥⑦⑨⑩ の見出し2段 */
function lawfulHead(): GridCell[] {
  const r1 = row(522, 563.5);
  const r2 = row(563.5, 631.5);
  return [
    label(r1, col(X.L, X.REL_R), '④法定相続人　((注)1参照)'),
    label(r2, col(X.L, X.NAME_R), '氏名'),
    label(r2, col(X.NAME_R, X.REL_R), '被相続人\nとの続柄'),
    label(row(522, 631.5), col(X.REL_R, X.D1), '⑤左の法定相続人に応じた\n法定相続分', { align: 'left' }),

    label(r1, col(X.D1R, X.D3), '第1表の「相続税の総額⑦」の計算(円)'),
    label(r2, col(X.D1R, X.N7_L), '⑥法定相続分に応ずる\n取得金額（㋥×⑤）\n(1,000円未満切捨て)'),
    label(r2, col(X.N7_L, X.D3), '⑦相続税の総額の基となる税額\n(下の「速算表」で計算します。)', { fontSize: 6.5 }),

    label(r1, col(X.D3R, X.R), '第3表の「相続税の総額⑦」の計算(円)'),
    label(r2, col(X.D3R, X.N10_L), '⑨法定相続分に応ずる\n取得金額（㋬×⑤）\n(1,000円未満切捨て)'),
    label(r2, col(X.N10_L, X.R), '⑩相続税の総額の基となる税額\n(下の「速算表」で計算します。)', { fontSize: 6.5 }),
  ];
}

/**
 * ④の氏名欄の手掛かり。誰を載せるかは「財産を取得した人」の画面で決める
 * （放棄がなかったものとした場合の一覧なので、放棄した人もここに載って人数に入る）。
 */
const LAWFUL_HINT = '法定相続人は「財産を取得した人」の画面で印を付けます。'
  + 'クリックするとその人の画面を開きます。'
  + '法定相続人の数は、相続の放棄がなかったものとして数えます。';

/** ⑤法定相続分の手掛かり（自動候補を出せるかで文言を変える） */
const SHARE_HINT_AUTO = '続柄と人数から自動で入れています。'
  + '数字を入れると手入力が優先され、消すと自動に戻ります。'
  + '半血の兄弟姉妹がいる場合は自動の値が当てはまりません。';
const SHARE_HINT_MANUAL = '続柄の組み合わせからは自動で決められないので、手で入力してください'
  + '（代襲相続の孫、続柄が「その他」の人、順位の違う血族が混ざっている場合など）。';

/** 法定相続人 i 行目。`ref` が無い行は様式の空欄（法定相続人がその行まで居ない） */
function lawfulRow(i: number, ref?: LawfulRowRef): GridCell[] {
  const [top, barTop, barBottom, bottom] = LAW_Y[i]!;
  const who = `法定相続人${i + 1}人目`;
  const all = row(top, bottom);
  const upper = row(top, barTop);
  const lower = row(barBottom, bottom);
  // 識別コードと分数の横線は、人が居ない行にも様式どおり印字する
  const frame: GridCell[] = [
    code(all, col(X.L, X.CODE), `E0${2 + i}`),
    code(all, col(X.NAME_R, X.REL_C), lawCode(i, 0)),
    code(upper, col(X.REL_R, X.FR_C), lawCode(i, 1)),
    mk(row(barTop, barBottom), col(X.REL_R, X.D1), {}),
    code(lower, col(X.REL_R, X.FR_C), lawCode(i, 2)),
    code(all, col(X.D1R, X.N6_C), lawCode(i, 3)),
    code(all, col(X.N7_L, X.N7_C), lawCode(i, 4)),
    code(all, col(X.D3R, X.N9_C), `G${37 + i * 2}`),
    code(all, col(X.N10_L, X.N10_C), `G${38 + i * 2}`),
  ];
  const boxes: [[number, number], [number, number]][] = [
    [all, col(X.CODE, X.NAME_R)], [all, col(X.REL_C, X.REL_R)],
    [upper, col(X.FR_C, X.D1)], [lower, col(X.FR_C, X.D1)],
    [all, col(X.N6_C, X.N7_L)], [all, col(X.N7_C, X.D3)],
    [all, col(X.N9_C, X.N10_L)], [all, col(X.N10_C, X.R)],
  ];
  if (ref === undefined) return [...frame, ...boxes.map(([y, x]) => mk(y, x, {}))];

  const p = ref.prefix;
  const share = (field: string, name: string): Partial<GridCell> => ({
    kind: 'input', field: `${p}${field}`, ariaLabel: `${who}の法定相続分（${name}）`,
    integerDigits: 3, align: 'center',
    hint: ref.autoable ? SHARE_HINT_AUTO : SHARE_HINT_MANUAL,
    // 自動候補があるのに手で入れている行は、自動と違うことが分かるように強調する
    highlightWhen: (g) => g(`${p}lawOverride`) === '1',
  });
  return [
    ...frame,
    // 氏名はこの欄で選ぶのではなく、人物に付けた印の結果。クリックでその人の画面を開く
    label(all, col(X.CODE, X.NAME_R), '', {
      textField: `${p}name`, align: 'left', fontSize: 10,
      action: personAction(p), ariaLabel: `${who}の基本情報を入力する`, hint: LAWFUL_HINT,
    }),
    mk(all, col(X.REL_C, X.REL_R), {
      kind: 'input', field: `${p}relation`, ariaLabel: `${who}の被相続人との続柄`,
      options: RELATION_OPTIONS, compactSelectedOption: true, stackedSelectedOption: true, readOnly: true,
    }),

    // ⑤ 法定相続分（上段＝分子・下段＝分母。間の細い帯が様式の分数の横線）
    mk(upper, col(X.FR_C, X.D1), share('lawNum', '分子')),
    mk(lower, col(X.FR_C, X.D1), share('lawDen', '分母')),

    mk(all, col(X.N6_C, X.N7_L), money(`${p}lawV6`, `${who} ⑥法定相続分に応ずる取得金額`, '，000')),
    mk(all, col(X.N7_C, X.D3), money(`${p}lawV7`, `${who} ⑦相続税の総額の基となる税額`)),
    mk(all, col(X.N9_C, X.N10_L), money(`${p}lawV9`, `${who} ⑨法定相続分に応ずる取得金額`, '，000')),
    mk(all, col(X.N10_C, X.R), money(`${p}lawV10`, `${who} ⑩相続税の総額の基となる税額`)),
  ];
}

/** 合計行（Ⓐ法定相続人の数・⑧相続税の総額・⑪相続税の総額） */
function totalRow(totals: string): GridCell[] {
  const r = row(1260, 1329);
  return [
    label(r, col(X.L, X.A_LBL), '法定相続人の数\n(人)'),
    label(r, col(X.A_LBL, X.NAME_R), 'Ⓐ', { fontSize: 10 }),
    code(r, col(X.NAME_R, X.REL_C), 'G49'),
    mk(r, col(X.REL_C, X.REL_R), { kind: 'input', field: `${totals}heirCount`, ariaLabel: 'Ⓐ 法定相続人の数', integerDigits: 2, align: 'center', readOnly: true }),
    label(r, col(X.REL_R, X.SUM_R), '合計'),
    mk(r, col(X.SUM_R, X.D1), {
      kind: 'label', textField: `${totals}lawShareTotalDisplay`, fontSize: 6,
      highlightWhen: (g) => g(`${totals}lawShareInvalid`) === '1',
    }),

    label(r, col(X.D1R, X.N7_L), '⑧相続税の総額（⑦の合計額）\n(円)（100円未満切捨て）', { fontSize: 7 }),
    code(r, col(X.N7_L, X.N7_C), 'G50'),
    mk(r, col(X.N7_C, X.D3), money(`${totals}t7`, '⑧ 相続税の総額', '00')),

    label(r, col(X.D3R, X.N10_L), '⑪相続税の総額（⑩の合計額）\n(円)（100円未満切捨て）', { fontSize: 7 }),
    code(r, col(X.N10_L, X.N10_C), 'G51'),
    mk(r, col(X.N10_C, X.R), money(`${totals}t11`, '⑪ 相続税の総額', '00')),
  ];
}

/** 相続税の速算表（法定相続分に応ずる取得金額は千円単位） */
export const RATE_BRACKETS = [
  { limit: 10000, rate: 0.1, deduction: 0 },
  { limit: 30000, rate: 0.15, deduction: 500 },
  { limit: 50000, rate: 0.2, deduction: 2000 },
  { limit: 100000, rate: 0.3, deduction: 7000 },
  { limit: 200000, rate: 0.4, deduction: 17000 },
  { limit: 300000, rate: 0.45, deduction: 27000 },
  { limit: 600000, rate: 0.5, deduction: 42000 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.55, deduction: 72000 },
] as const;

/** 速算表（様式の下部に印字されている早見表） */
function rateTable(): GridCell[] {
  const head = row(1442, 1484);
  const rate = row(1484, 1517.5);
  const deduct = row(1517.5, 1549);
  const at = (i: number): [number, number] => col(RATE_X[i + 1]!, RATE_X[i + 2]!);
  const amount = (b: (typeof RATE_BRACKETS)[number]): string => (
    Number.isFinite(b.limit) ? `${b.limit.toLocaleString('en-US')}千円\n以下` : '600,000千円\n超'
  );
  return [
    label(row(1406.5, 1442), col(X.CODE, X.R), '相続税の速算表', { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    label(head, col(RATE_X[0]!, RATE_X[1]!), '法定相続分に\n応ずる取得金額'),
    label(rate, col(RATE_X[0]!, RATE_X[1]!), '税　　　　　率'),
    label(deduct, col(RATE_X[0]!, RATE_X[1]!), '控　　除　　額'),
    ...RATE_BRACKETS.flatMap((b, i): GridCell[] => [
      label(head, at(i), amount(b), { align: 'right' }),
      label(rate, at(i), `${Math.round(b.rate * 100)}%`, { align: 'right' }),
      label(deduct, at(i), b.deduction === 0 ? '−' : `${b.deduction.toLocaleString('en-US')}千円`, { align: b.deduction === 0 ? 'center' : 'right' }),
    ]),
  ];
}

/**
 * 第2表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）
 * @param rows ④に載せる法定相続人（上から順に。行数を超える分は様式では第2表の付表に書く）
 */
export function buildTable2(
  common: string, totals: string, rows: readonly LawfulRowRef[] = [],
): GridCell[] {
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(237.5, 267.5), col(X.DEC_LBL, X.DEC_L), '被相続人'),
    code(row(237.5, 267.5), col(X.DEC_L, X.DEC_C), 'E01'),
    mk(row(237.5, 267.5), col(X.DEC_C, X.R), { kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10, readOnly: true, navigateToForm: 'table1' }),

    label(row(267.5, 343.5), col(X.L, X.R), TABLE2_LEAD, { align: 'left', fontSize: 7 }),

    ...taxableEstateRows(totals),

    // ①②③ブロックと④以下のブロックを分ける二重線
    mk(row(518, 522), col(X.L, X.R), {}),
    // 第1表ブロック・第3表ブロックの境界（二重線）
    mk(row(522, 1329), col(X.D1, X.D1R), {}),
    mk(row(522, 1329), col(X.D3, X.D3R), {}),

    ...lawfulHead(),
    ...LAW_Y.map((_, i) => lawfulRow(i, rows[i])).flat(),
    ...totalRow(totals),

    mk(row(1329, 1406.5), col(X.L, X.R), { kind: 'label', numberedNotes: TABLE2_INNER_NOTES, align: 'left', fontSize: 7 }),
    ...rateTable(),
  ];
}
