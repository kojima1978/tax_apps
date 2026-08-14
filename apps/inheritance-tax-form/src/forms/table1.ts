/**
 * 相続税の申告書 第1表。
 *
 * 横罫線の位置は様式PNG（150dpi）の実測px。上端182px・下端1625.5pxを 0〜100％ に写す。
 * 縦罫線と繰り返し構造は geometry.ts と共有する。
 */

import type { GridCell } from '../components/ui/GridForm';
import { DAY_OPTIONS, ERA_OPTIONS, ERA_YEAR_OPTIONS, MONTH_OPTIONS } from '../data/codes';
import { TAX_OFFICES } from '../data/taxOffices';
import {
  CALC_ORDER, GENERIC_ROWS, V, calcBands, calcRowRanges, calcRows, code, decedentColumn,
  flag, label, mk, personColumn, personLabelColumn, type PersonCodes, type PersonY,
} from './geometry';

export const TABLE1_FORM_CODE = 'NTA1KSE010010030';
export const TABLE1_TITLE = '相続税の申告書　第1表';

/** 共通欄（被相続人・提出先）と、自動計算欄（「各人の合計」列・第2表からの転記）のフィールド接頭辞 */
export const COMMON = 'c.';
export const TOTALS = 't.';

/**
 * 提出先税務署の候補。都道府県が決まっていればその県の署だけに絞る
 * （都道府県は被相続人の郵便番号から求める）。
 * 保存済みの値が候補に無いとき（自由入力で保存された古いデータなど）は消えないように先頭へ残す。
 */
export function taxOfficeOptions(pref: string, current: string): { value: string; label: string }[] {
  const list = TAX_OFFICES.filter((o) => pref === '' || o.pref === pref);
  const options = [{ value: '', label: '' }, ...list.map((o) => ({ value: o.name, label: o.name }))];
  if (current !== '' && !list.some((o) => o.name === current)) options.splice(1, 0, { value: current, label: current });
  return options;
}

const TOP = 182;
const BOTTOM = 1625.5;
/** 実測px → 様式高さに対する％ */
const y = (px: number): number => ((px - TOP) / (BOTTOM - TOP)) * 100;

/** 上部2行だけで使う縦罫線（％） */
const X = {
  SUBMIT_R: 28.32,   // 「年月日提出」「税務署長」の右端
  START_R: 34.84,    // 「相続開始年月日」ラベルの右端
  N_CODE: 36.98,     // 相続開始年月日のコード枠（N01）の右端
  ERA_R: 43.50,
  YEAR_R: 50.04,
  MONTH_R: 56.56,
  DAY_R: 63.08,
  AMEND_R: 76.11,    // 「修正申告の場合…」ラベルの右端
  AMEND_CODE: 78.28, // G01 の右端
  EXT_L: 82.62,      // ※申告期限延長日の左端
} as const;

/** 下部（税理士行・通信日付印）で使う縦罫線（％） */
const XB = {
  TAX_NAME_R: 28.32,   // 税理士署名入力の右端
  TEL_LABEL_R: 34.84,  // 「電話番号（税理士）」ラベルの右端
  TEL_CODE_R: 36.98,   // R02 の右端
  NOTE_R: 67.42,       // 異動の内容等 入力の右端／「税理士法書面提出」の右端
  ART30_R: 71.76,
  ART30_CODE: 73.94,
  ART30_BOX: 78.28,
  ART33_R: 84.80,
  ART33_CODE: 86.97,
  ART33_BOX: 91.31,
  MARK_L: 80.45,       // ※通信日付印 欄の右ブロック左端
  CHECK_R: 95.66,      // 「※確認」の右端
  CHECK_CODE: 97.83,   // K22 の右端
  DATE_Y_R: 91.31,
  DATE_M_R: 95.66,
} as const;

/** 人物ブロックの行位置 */
const PY: PersonY = {
  head: [y(242.5), y(265)],
  furigana: [y(265), y(287.5)],
  name: [y(287.5), y(324.5)],
  myNumber: [y(324.5), y(358.5)],
  birthHead: [y(358.5), y(381)],
  birth: [y(381), y(420.5)],
  zip: [y(420.5), y(454.5)],
  address: [y(454.5), y(515)],
  tel: [y(515), y(549)],
  relation: [y(549), y(588.5)],
  cause: [y(588.5), y(620.5)],
  calcHead: [y(620.5), y(643)],
};

/** 財産を取得した人（右ブロック）の識別コード */
const HEIR_CODES: PersonCodes = {
  furigana: 'E05', name: 'E06', ref: 'G72', myNumber: 'G31', birth: 'N03', age: 'G32',
  zip: 'P01', address: 'E07', tel: 'T01', relation: 'G33', job: 'E08',
  cause: ['G34', 'G35', 'G36'],
};

/** 「各人の合計」列の識別コード */
const TOTAL_CODES: Record<string, string> = {
  v1: 'G03', v2: 'G04', v3: 'G05', v4: 'G06', v5: 'G07', v6: 'G08', v7: 'G11',
  v9: 'G12', v10: 'G13', v11: 'G14', v12: 'G15', v13: 'G16', v14: 'G17', v15: 'G18',
  v16: 'G19', v17: 'G20', v18: 'G21', v19: 'G22', v20: 'G23', v21: 'G24', v22: 'G25',
  v23: 'G26', v24: 'G27', v25: 'G28', v26: 'G29', v27: 'G30',
};

/** 財産を取得した人の列の識別コード（⑨以降は G43 から連番） */
const HEIR_CALC_CODES: Record<string, string> = {
  v1: 'G37', v2: 'G38', v3: 'G39', v4: 'G40', v5: 'G41', v6: 'G42', v8: 'C01',
  ...Object.fromEntries(
    CALC_ORDER.slice(CALC_ORDER.indexOf('v9')).map((key, i): [string, string] => [key, `G${43 + i}`]),
  ),
};

/** 計算欄の行位置（①の上端＝643px） */
const RY = calcRowRanges(643, y);

/** 汎用行として描く行（⑥はⒶ枠、⑧は印字済みの「1.00」があるため個別に組む） */
const GENERIC = GENERIC_ROWS.filter((key) => key !== 'v6' && key !== 'v8');

/** 第2表からの転記を促す注記（Ⓑ行・⑦行の右ブロック） */
const NOTE = { fontSize: 7, align: 'left' } as const;

/** 提出日・提出先・相続開始年月日の2行 */
function topRows(officeOptions: GridCell['options']): GridCell[] {
  const r1: [number, number] = [y(182), y(201)];
  const r2: [number, number] = [y(201), y(233)];
  const r12: [number, number] = [y(182), y(233)];
  return [
    // 1行目 — 提出日は罫線を持たない（下端の線は2行目のセル上辺が兼ねる）
    mk(r1, [V.L, X.SUBMIT_R], {
      date: true, field: `${COMMON}submitDate`, ariaLabel: '申告書の提出年月日',
      dateSuffix: '提出', align: 'right', noBorder: true,
    }),
    label(r1, [X.N_CODE, X.ERA_R], '元号'),
    label(r1, [X.ERA_R, X.YEAR_R], '年'),
    label(r1, [X.YEAR_R, X.MONTH_R], '月'),
    label(r1, [X.MONTH_R, X.DAY_R], '日'),
    label(r1, [X.EXT_L, V.R], '※申告期限延長日', { align: 'left' }),

    // 2行目 — 提出先税務署
    label(r2, [V.L, V.SUBMIT], '提出先'),
    code(r2, [V.SUBMIT, V.NARROW], 'F01'),
    mk(r2, [V.NARROW, V.LBL], {
      kind: 'input', field: `${COMMON}office`, ariaLabel: '提出先税務署', align: 'left',
      options: officeOptions,
    }),
    label(r2, [V.LBL, X.SUBMIT_R], '税務署長'),
    label(r2, [X.EXT_L, V.R], '年　　月　　日'),

    // 相続開始年月日（2行にまたがる見出し＋2行目に記入欄）
    label(r12, [X.SUBMIT_R, X.START_R], '相続開始\n年月日'),
    mk(r1, [X.START_R, X.N_CODE], {}),
    code(r2, [X.START_R, X.N_CODE], 'N01'),
    mk(r2, [X.N_CODE, X.ERA_R], { kind: 'input', field: `${COMMON}startEra`, ariaLabel: '相続開始年月日（元号）', options: ERA_OPTIONS, compactSelectedOption: true }),
    mk(r2, [X.ERA_R, X.YEAR_R], {
      kind: 'input', field: `${COMMON}startY`, ariaLabel: '相続開始年月日（年）',
      options: ERA_YEAR_OPTIONS, align: 'center',
    }),
    mk(r2, [X.YEAR_R, X.MONTH_R], {
      kind: 'input', field: `${COMMON}startM`, ariaLabel: '相続開始年月日（月）',
      options: MONTH_OPTIONS, align: 'center',
    }),
    mk(r2, [X.MONTH_R, X.DAY_R], {
      kind: 'input', field: `${COMMON}startD`, ariaLabel: '相続開始年月日（日）',
      options: DAY_OPTIONS, align: 'center',
    }),

    // 修正申告の場合の「1」
    label(r12, [X.DAY_R, X.AMEND_R], '修正申告の場合、右欄に\n「1」と記入します。', { noWrap: true }),
    code(r12, [X.AMEND_R, X.AMEND_CODE], 'G01'),
    mk(r12, [X.AMEND_CODE, X.EXT_L], flag(`${COMMON}amend`, '修正申告の場合は1')),

    // 見出し帯の上の空白帯（様式に罫線が無い）
    mk([y(233), y(242.5)], [V.L, V.R], { noBorder: true }),
  ];
}

/** ⑥・Ⓑ・⑦・⑧ — 「各人の合計」側の形が他の行と違う4行 */
function specialRows(heir: string): GridCell[] {
  return [
    // ⑥ 課税価格（合計欄はⒶ）
    label(RY.v6!, [V.BAND1, V.LBL], '課税価格（④＋⑤）\n（1,000円未満切捨て）'),
    label(RY.v6!, [V.LBL, V.NUM], '⑥', { fontSize: 10, semanticRole: 'rowheader' }),
    label(RY.v6!, [V.NUM, V.CODE1], 'Ⓐ', { fontSize: 10 }),
    code(RY.v6!, [V.CODE1, V.A_CODE], 'G08'),
    mk(RY.v6!, [V.A_CODE, V.MID], { kind: 'input', field: `${TOTALS}v6`, ariaLabel: 'Ⓐ 課税価格の合計額', commaInteger: true, rightLabel: '000', readOnly: true }),
    code(RY.v6!, [V.MID, V.CODE2], HEIR_CALC_CODES.v6!),
    mk(RY.v6!, [V.CODE2, V.R], { kind: 'input', field: `${heir}v6`, ariaLabel: '⑥ 課税価格', commaInteger: true, rightLabel: '000', readOnly: true }),

    // Ⓑ 法定相続人の数・遺産に係る基礎控除額（第2表からの転記）
    label(RY.vB!, [V.BAND1, V.LBL_A], '法定相続人の数\n（人）'),
    label(RY.vB!, [V.LBL_A, V.LBL], '遺産に係る\n基礎控除額'),
    code(RY.vB!, [V.LBL, V.NUM], 'G09'),
    mk(RY.vB!, [V.NUM, V.CNT], { kind: 'input', field: `${TOTALS}heirCount`, ariaLabel: '法定相続人の数（人）', integerDigits: 2, align: 'center', readOnly: true }),
    label(RY.vB!, [V.CNT, V.B_MARK], 'Ⓑ', { fontSize: 10 }),
    code(RY.vB!, [V.B_MARK, V.B_CODE], 'G10'),
    mk(RY.vB!, [V.B_CODE, V.MID], { kind: 'input', field: `${TOTALS}tB`, ariaLabel: 'Ⓑ 遺産に係る基礎控除額', commaInteger: true, rightLabel: ',000,000', readOnly: true }),
    label(RY.vB!, [V.MID, V.R], '左の欄には、第２表の②欄の㋺の人数及び㋩の金額を記入します。', NOTE),

    // ⑦ 相続税の総額（第2表からの転記）
    label(RY.v7!, [V.BAND1, V.LBL], '相続税の総額'),
    label(RY.v7!, [V.LBL, V.NUM], '⑦', { fontSize: 10, semanticRole: 'rowheader' }),
    code(RY.v7!, [V.NUM, V.CODE1], 'G11'),
    mk(RY.v7!, [V.CODE1, V.MID], { kind: 'input', field: `${TOTALS}t7`, ariaLabel: '⑦ 相続税の総額', commaInteger: true, rightLabel: '00', readOnly: true }),
    label(RY.v7!, [V.MID, V.R], '左の欄には、第２表の⑧欄の金額を記入します。', NOTE),

    // ⑧ あん分割合（合計欄は「1.00」が印字済み）
    label(RY.v8!, [V.LBL_A, V.LBL], 'あん分割合\n（各人の⑥/Ⓐ）'),
    label(RY.v8!, [V.LBL, V.NUM], '⑧', { fontSize: 10, semanticRole: 'rowheader' }),
    label(RY.v8!, [V.NUM, V.MID], '1.00', { fontSize: 10, align: 'right' }),
    code(RY.v8!, [V.MID, V.CODE2], HEIR_CALC_CODES.v8!),
    mk(RY.v8!, [V.CODE2, V.R], { kind: 'input', field: `${heir}v8`, ariaLabel: '⑧ あん分割合', decimalPlaces: 2, align: 'center', readOnly: true }),
  ];
}

/** ※注記帯・異動の内容等・税理士署名の3行 */
function bottomRows(): GridCell[] {
  const note: [number, number] = [y(1545.5), y(1562.5)];
  const amend: [number, number] = [y(1562.5), y(1594.5)];
  const stampU: [number, number] = [y(1562.5), y(1574.5)];
  const stampL: [number, number] = [y(1574.5), y(1594.5)];
  const tax: [number, number] = [y(1594.5), y(1625.5)];
  return [
    label(note, [V.L, V.R], '※の項目は記入する必要がありません。', { noBorder: true, align: 'right', fontSize: 6.5 }),

    // 修正申告である場合の異動の内容等
    label(amend, [V.L, V.LBL_C], 'この申告が修正申告である場合の異動の内容等', { align: 'left' }),
    code(amend, [V.LBL_C, V.CODE_C], 'E09'),
    mk(amend, [V.CODE_C, XB.NOTE_R], { kind: 'input', field: `${COMMON}amendReason`, ariaLabel: 'この申告が修正申告である場合の異動の内容等', align: 'left', readOnly: true }),

    // ※通信日付印の年月日（記入不要）
    label(amend, [XB.NOTE_R, XB.MARK_L], '※通信日付印の年月日'),
    mk(stampU, [XB.MARK_L, X.EXT_L], {}),
    label(stampU, [X.EXT_L, XB.DATE_Y_R], '（西暦）年'),
    label(stampU, [XB.DATE_Y_R, XB.DATE_M_R], '月'),
    label(stampU, [XB.DATE_M_R, V.R], '日'),
    code(stampL, [XB.MARK_L, X.EXT_L], 'F12'),
    mk(stampL, [X.EXT_L, XB.DATE_Y_R], {}),
    mk(stampL, [XB.DATE_Y_R, XB.DATE_M_R], {}),
    mk(stampL, [XB.DATE_M_R, V.R], {}),

    // 税理士署名・税理士法書面提出（注3）
    label(tax, [V.L, V.BAND2], '税理士\n署名', { noWrap: true }),
    code(tax, [V.BAND2, V.SUBMIT], 'R01'),
    mk(tax, [V.SUBMIT, XB.TAX_NAME_R], { kind: 'input', field: `${COMMON}taxAccountant`, ariaLabel: '税理士署名', align: 'left' }),
    label(tax, [XB.TAX_NAME_R, XB.TEL_LABEL_R], '電話番号\n（税理士）'),
    code(tax, [XB.TEL_LABEL_R, XB.TEL_CODE_R], 'R02'),
    mk(tax, [XB.TEL_CODE_R, V.MID], { tel: true, field: `${COMMON}taxAccountantTel`, ariaLabel: '税理士の電話番号' }),
    label(tax, [V.MID, XB.NOTE_R], '税理士法\n書面提出'),
    label(tax, [XB.NOTE_R, XB.ART30_R], '30条'),
    code(tax, [XB.ART30_R, XB.ART30_CODE], 'G62'),
    mk(tax, [XB.ART30_CODE, XB.ART30_BOX], flag(`${COMMON}article30`, '税理士法第30条の書面を提出する場合は1')),
    label(tax, [XB.ART30_BOX, XB.ART33_R], '33条の2'),
    code(tax, [XB.ART33_R, XB.ART33_CODE], 'G63'),
    mk(tax, [XB.ART33_CODE, XB.ART33_BOX], flag(`${COMMON}article33`, '税理士法第33条の2の書面を提出する場合は1')),
    label(tax, [XB.ART33_BOX, XB.CHECK_R], '※確認'),
    code(tax, [XB.CHECK_R, XB.CHECK_CODE], 'K22'),
    mk(tax, [XB.CHECK_CODE, V.R], {}),
  ];
}

/**
 * 第1表のセルを組み立てる。
 * @param heir 1人目の財産取得者のフィールド接頭辞（'h0.'）
 * @param transferred 1人目の列で他の様式からの転記になっている行（読み取り専用にする）。
 *   「各人の合計」列はもともと常に読み取り専用なので同じものを渡してよい。
 * @param officeOptions 提出先税務署の候補（taxOfficeOptions で作る）
 */
export function buildTable1(
  heir: string, transferred: readonly string[] = [], officeOptions: GridCell['options'] = [],
  sourceForms: Readonly<Record<string, string>> = {},
): GridCell[] {
  return [
    ...topRows(officeOptions),
    ...personLabelColumn(PY),
    ...decedentColumn(V.LBL, PY, COMMON),
    ...personColumn(V.MID, PY, HEIR_CODES, heir, '1人目'),
    ...calcBands(RY),
    ...calcRows({
      ry: RY, keys: GENERIC, codes1: TOTAL_CODES, codes2: HEIR_CALC_CODES,
      p1: TOTALS, p2: heir, who1: '各人の合計', who2: '1人目', readOnly1: true, transferred, transferred2: transferred, sourceForms,
    }),
    ...specialRows(heir),
    ...bottomRows(),
  ];
}

/** 様式の枠外に印字されている注記 */
export const TABLE1_NOTES = [
  '（注）1 この申告書で提出しない人である場合（参考として記載している場合）、その人の分は申告書とは取り扱いません。',
  '　　　2 ⑲欄の金額が赤字となる場合は、⑲欄の頭に△を付してください。なお、この場合で、⑲欄の金額のうちに贈与税の外国税額控除額（第11の２表１⑩）があるときの㉒欄の金額については、「相続税の申告のしかた」を参照してください。',
  '　　　3 税理士の方が、税理士法第30条、第33条の２に規定する書面を作成し、申告書と併せて提出される場合には、該当する欄に「1」と記入してください。',
].join('\n');

/** 様式の適用年分 */
export const EDITION = '（令和6年1月分以降用）（R8.7）';
