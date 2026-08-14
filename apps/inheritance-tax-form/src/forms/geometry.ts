/**
 * 第1表・第1表（続）で共通の座標と、繰り返し構造のセル生成。
 *
 * 座標は様式PNG（150dpi）から罫線を機械的に検出して得た実測値。
 * 縦罫線は両様式で完全に一致するため、この1箇所で定義する。
 * 横罫線は行の並びだけが様式ごとに違うので、各様式ファイルが実測pxを持ち `y()` で％に直す。
 */

import type { GridCell } from '../components/ui/GridForm';
import {
  DAY_OPTIONS, ERA_NOTE, ERA_OPTIONS, ERA_YEAR_OPTIONS, MONTH_OPTIONS, RELATION_OPTIONS,
} from '../data/codes';

/** 縦罫線の位置（％）。両様式共通。 */
export const V = {
  L: 0,           // 様式の左端
  BAND1: 2.44,    // 縦書き大見出し帯の右端（課税価格の計算・各人の納付… など）
  BAND2: 4.88,    // 縦書き小見出し帯の右端（税額控除・この修正前の）
  SUBMIT: 7.31,   // 第1表「提出先」ラベルの右端
  NARROW: 9.71,   // 「申告納税額」帯／「被相続人との続柄」ラベルの右端
  LBL_A: 12.15,   // 「一般の場合」「法定相続人の数」ラベルの右端
  LBL_B: 14.54,   // 「農地等納税猶予の適用を受ける場合」ラベルの右端
  LBL_C: 16.94,   // E09ラベル／続の「修正申告の場合…」ラベルの右端
  CODE_C: 19.33,  // E09・G01 コード枠の右端
  LBL: 21.81,     // 行ラベル列の右端 ＝ 左ブロックの左端
  NUM: 23.98,     // 丸番号セルの右端 ＝ 左ブロックのコード枠の右端
  CODE1: 26.15,   // 左列コード枠の右端
  A_CODE: 28.32,  // 第1表⑥行のコード枠の右端（Ⓐの枠が入る分だけ右にずれる）
  CNT: 30.50,     // 第1表Ⓑ行 法定相続人の数（人）入力の右端
  B_MARK: 32.67,  // 第1表Ⓑ行 Ⓑ の右端
  B_CODE: 34.84,  // 第1表Ⓑ行 G10 の右端
  MID: 60.90,     // 左ブロックと右ブロックの境
  CODE2: 63.08,   // 右列コード枠の右端
  R: 100,
} as const;

/** 人物ブロック1列の幅（％）。左右どちらも同じ幅で、内部の割付も完全に一致する。 */
export const COL_W = V.MID - V.LBL;

/** 上下・左右（％）を指定してセルを作る。 */
export function mk(y: readonly [number, number], x: readonly [number, number], rest: Partial<GridCell> = {}): GridCell {
  return { top: y[0], left: x[0], width: x[1] - x[0], height: y[1] - y[0], ...rest };
}

/** 様式の識別コード（G03 等）の小さな枠。枠が狭く「G0/3」と折り返すため1行に固定する。 */
export function code(y: readonly [number, number], x: readonly [number, number], text: string): GridCell {
  return mk(y, x, { kind: 'label', text, fontSize: 5.5, align: 'left', noWrap: true, forceHorizontal: true, semanticRole: 'presentation' });
}

/** 固定文字セル */
export function label(y: readonly [number, number], x: readonly [number, number], text: string, rest: Partial<GridCell> = {}): GridCell {
  return mk(y, x, { kind: 'label', text, ...rest });
}

// ════════════════════════════════════════════
// 人物ブロック（1列 ＝ 財産を取得した人1人分）
// ════════════════════════════════════════════

/** 人物ブロックの各行の上下位置（％） */
export interface PersonY {
  head: [number, number];       // 「財産を取得した人」「参考記載」見出し帯
  furigana: [number, number];
  name: [number, number];
  myNumber: [number, number];
  birthHead: [number, number];  // 元号・年・月・日・年齢の見出し
  birth: [number, number];
  zip: [number, number];
  address: [number, number];
  tel: [number, number];
  relation: [number, number];   // 続柄・職業
  cause: [number, number];      // 取得原因
  calcHead: [number, number];   // 「◯◯の計算（円）」帯
}

/** 人物ブロックの識別コード */
export interface PersonCodes {
  furigana: string;
  name: string;
  ref: string;      // 参考記載
  myNumber: string;
  birth: string;
  age: string;
  zip: string;
  address: string;
  tel: string;
  relation: string;
  job: string;
  cause: [string, string, string];  // 相続／遺贈／相続時精算課税に係る贈与
}

/** 列内のオフセット（％）。左端からの相対位置で、左右どちらの列でも同じ。 */
const O = {
  code: 2.17,       // 先頭のコード枠の右端
  nameR: 30.41,     // 氏名入力の右端（＝参考記載欄の左端）
  refCode: 32.58,   // 参考記載・年齢のコード枠の右端
  eraR: 10.86,      // 元号の右端
  yearR: 17.37,     // 年の右端
  monthR: 23.89,    // 月の右端
  dayR: 30.41,      // 日の右端
  relHead: 6.51,    // 「続柄はコード表参照」の右端
  relCode: 8.69,    // 続柄コード枠の右端
  relR: 15.20,      // 続柄入力の右端
  jobCode: 17.37,   // 職業コード枠の右端
  cause1: 4.34,     // 「相続」ラベルの右端
  cause1Code: 6.51,
  cause1R: 10.86,
  cause2: 15.20,    // 「遺贈」ラベルの右端
  cause2Code: 17.37,
  cause2R: 21.72,
  cause3: 32.58,    // 「相続時精算課税に係る贈与」ラベルの右端
  cause3Code: 34.75,
  end: COL_W,
} as const;

/**
 * 住所欄は枠の高さを変えずに中を2段に割る。
 * 上段は郵便番号から自動で入れる部分、下段は丁目以下の手入力部分。
 */
export const ADDRESS_LINES = { top: '都道府県・市区町村・町域', bottom: '丁目・番地・建物名' } as const;

/**
 * 該当するときだけ「1」を記入する欄。取り得る値が空欄と「1」しかないので選択式にする
 * （様式に出るのは選んだ「1」だけ＝`compactSelectedOption`）。
 */
export const FLAG_OPTIONS = [{ value: '', label: '' }, { value: '1', label: '1' }];

export const flag = (field: string, ariaLabel: string): Partial<GridCell> => ({
  kind: 'input', field, ariaLabel, integerDigits: 1, align: 'center',
  options: FLAG_OPTIONS, compactSelectedOption: true,
});

/** 生年月日（元号・年・月・日）と年齢。左右どちらの列でも割付は同じ。 */
function birthCells(
  x: number, y: PersonY, birthCode: string, ageCode: string, p: string, who: string, useDateSelects = false,
): GridCell[] {
  const at = (d: number) => x + d;
  return [
    mk(y.birthHead, [x, at(O.code)], {}),
    label(y.birthHead, [at(O.code), at(O.eraR)], '元号'),
    label(y.birthHead, [at(O.eraR), at(O.yearR)], '年'),
    label(y.birthHead, [at(O.yearR), at(O.monthR)], '月'),
    label(y.birthHead, [at(O.monthR), at(O.dayR)], '日'),
    label(y.birthHead, [at(O.dayR), at(O.end)], '年齢'),
    code(y.birth, [x, at(O.code)], birthCode),
    mk(y.birth, [at(O.code), at(O.eraR)], { kind: 'input', field: `${p}birthEra`, ariaLabel: `${who}の生年月日（元号）`, options: ERA_OPTIONS, compactSelectedOption: true }),
    mk(y.birth, [at(O.eraR), at(O.yearR)], {
      kind: 'input', field: `${p}birthY`, ariaLabel: `${who}の生年月日（年）`, align: 'center',
      ...(useDateSelects ? { options: ERA_YEAR_OPTIONS } : { integerDigits: 2 }),
    }),
    mk(y.birth, [at(O.yearR), at(O.monthR)], {
      kind: 'input', field: `${p}birthM`, ariaLabel: `${who}の生年月日（月）`, align: 'center',
      ...(useDateSelects ? { options: MONTH_OPTIONS } : { integerDigits: 2 }),
    }),
    mk(y.birth, [at(O.monthR), at(O.dayR)], {
      kind: 'input', field: `${p}birthD`, ariaLabel: `${who}の生年月日（日）`, align: 'center',
      ...(useDateSelects ? { options: DAY_OPTIONS } : { integerDigits: 2 }),
    }),
    code(y.birth, [at(O.dayR), at(O.refCode)], ageCode),
    mk(y.birth, [at(O.refCode), at(O.end)], { kind: 'input', field: `${p}age`, ariaLabel: `${who}の年齢`, integerDigits: 3, align: 'center' }),
  ];
}

/**
 * 「財産を取得した人」1人分の列。
 * @param x 列の左端（％）。第1表の取得者列は V.MID、第1表（続）は V.LBL と V.MID。
 * @param p フィールド接頭辞（'h0.' など）
 * @param who アクセシブル名の主語（「1人目」など）
 */
export function personColumn(x: number, y: PersonY, c: PersonCodes, p: string, who: string): GridCell[] {
  const at = (d: number) => x + d;
  const nameSpan: [number, number] = [y.furigana[0], y.name[1]];
  return [
    label(y.head, [x, at(O.nameR)], '財産を取得した人', { fontSize: 10 }),
    label(y.head, [at(O.nameR), at(O.end)], '参考記載', { fontSize: 8 }),

    // フリガナ・氏名・参考記載
    code(y.furigana, [x, at(O.code)], c.furigana),
    mk(y.furigana, [at(O.code), at(O.nameR)], { kind: 'input', field: `${p}furigana`, ariaLabel: `${who}のフリガナ`, align: 'left' }),
    code(y.name, [x, at(O.code)], c.name),
    mk(y.name, [at(O.code), at(O.nameR)], { kind: 'input', field: `${p}name`, ariaLabel: `${who}の氏名`, align: 'left', fontSize: 11 }),
    code(nameSpan, [at(O.nameR), at(O.refCode)], c.ref),
    mk(nameSpan, [at(O.refCode), at(O.end)], flag(`${p}ref`, `${who}：参考として記載する場合は1`)),

    // 個人番号又は法人番号
    code(y.myNumber, [x, at(O.code)], c.myNumber),
    mk(y.myNumber, [at(O.code), at(O.end)], { kind: 'input', field: `${p}myNumber`, ariaLabel: `${who}の個人番号又は法人番号`, align: 'left' }),

    ...birthCells(x, y, c.birth, c.age, p, who, true),

    // 郵便番号・住所・電話番号
    code(y.zip, [x, at(O.code)], c.zip),
    // 郵便番号が7桁そろったら住所の上段を補う（上段が空のときだけ）
    mk(y.zip, [at(O.code), at(O.end)], { zip: true, field: `${p}zip`, ariaLabel: `${who}の郵便番号`, zipAddress: `${p}address` }),
    code(y.address, [x, at(O.code)], c.address),
    mk(y.address, [at(O.code), at(O.end)], { kind: 'input', field: `${p}address`, ariaLabel: `${who}の住所`, align: 'left', twoLine: ADDRESS_LINES }),
    code(y.tel, [x, at(O.code)], c.tel),
    mk(y.tel, [at(O.code), at(O.end)], { tel: true, field: `${p}tel`, ariaLabel: `${who}の電話番号` }),

    // 被相続人との続柄・職業
    label(y.relation, [x, at(O.relHead)], '続柄は\nコード表参照', { fontSize: 6, align: 'left' }),
    code(y.relation, [at(O.relHead), at(O.relCode)], c.relation),
    mk(y.relation, [at(O.relCode), at(O.relR)], { kind: 'input', field: `${p}relation`, ariaLabel: `${who}の被相続人との続柄`, options: RELATION_OPTIONS, compactSelectedOption: true, fontSize: 5 }),
    code(y.relation, [at(O.relR), at(O.jobCode)], c.job),
    mk(y.relation, [at(O.jobCode), at(O.end)], { kind: 'input', field: `${p}job`, ariaLabel: `${who}の職業`, align: 'left' }),

    // 取得原因（該当する欄に「1」と記入）
    label(y.cause, [x, at(O.cause1)], '相続'),
    code(y.cause, [at(O.cause1), at(O.cause1Code)], c.cause[0]),
    mk(y.cause, [at(O.cause1Code), at(O.cause1R)], flag(`${p}cause1`, `${who}の取得原因：相続`)),
    label(y.cause, [at(O.cause1R), at(O.cause2)], '遺贈'),
    code(y.cause, [at(O.cause2), at(O.cause2Code)], c.cause[1]),
    mk(y.cause, [at(O.cause2Code), at(O.cause2R)], flag(`${p}cause2`, `${who}の取得原因：遺贈`)),
    label(y.cause, [at(O.cause2R), at(O.cause3)], '相続時精算課税に\n係る贈与', { fontSize: 6.5 }),
    code(y.cause, [at(O.cause3), at(O.cause3Code)], c.cause[2]),
    mk(y.cause, [at(O.cause3Code), at(O.end)], flag(`${p}cause3`, `${who}の取得原因：相続時精算課税に係る贈与`)),

    label(y.calcHead, [x, at(O.end)], '財産を取得した人の計算（円）', { fontSize: 10 }),
  ];
}

/**
 * 第1表の「被相続人」列。記入不要の欄が斜線で潰されている点だけが取得者列と違う。
 * @param p フィールド接頭辞（'c.'）
 */
export function decedentColumn(x: number, y: PersonY, p: string): GridCell[] {
  const at = (d: number) => x + d;
  const slash = (row: [number, number], from = 0, to: number = O.end): GridCell => mk(row, [at(from), at(to)], { diagonal: 'bltr' });
  return [
    label(y.head, [x, at(O.end)], '被相続人', { fontSize: 10 }),

    code(y.furigana, [x, at(O.code)], 'E01'),
    mk(y.furigana, [at(O.code), at(O.nameR)], { kind: 'input', field: `${p}furigana`, ariaLabel: '被相続人のフリガナ', align: 'left' }),
    code(y.name, [x, at(O.code)], 'E02'),
    mk(y.name, [at(O.code), at(O.nameR)], { kind: 'input', field: `${p}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 11 }),
    mk([y.furigana[0], y.name[1]], [at(O.nameR), at(O.end)], { diagonal: 'bltr' }),

    slash(y.myNumber),

    ...birthCells(x, y, 'N02', 'G02', p, '被相続人', true),

    // 様式では記入不要（斜線）の欄。住所の補助と提出先税務署の絞り込みに使うため画面だけ入力できるようにし、
    // 印刷では様式どおりの斜線に戻す。
    mk(y.zip, [x, at(O.end)], {
      zip: true, field: `${p}zip`, zipAddress: `${p}address`, printDiagonal: 'bltr',
      ariaLabel: '被相続人の郵便番号（入力の補助に使う欄。印刷されません）',
    }),
    code(y.address, [x, at(O.code)], 'E03'),
    mk(y.address, [at(O.code), at(O.end)], { kind: 'input', field: `${p}address`, ariaLabel: '被相続人の住所', align: 'left', twoLine: ADDRESS_LINES }),
    slash(y.tel),

    slash(y.relation, 0, O.relR),
    code(y.relation, [at(O.relR), at(O.jobCode)], 'E04'),
    mk(y.relation, [at(O.jobCode), at(O.end)], { kind: 'input', field: `${p}job`, ariaLabel: '被相続人の職業', align: 'left' }),

    slash(y.cause),

    label(y.calcHead, [x, at(O.end)], '各人の合計（円）', { fontSize: 10 }),
  ];
}

/**
 * 人物ブロック左側のラベル列（0〜21.81％）。両様式で完全に同じ。
 * 見出し帯の左（0〜21.81％）は様式に罫線が無い。
 */
export function personLabelColumn(y: PersonY): GridCell[] {
  const nameSpan: [number, number] = [y.furigana[0], y.name[1]];
  const birthSpan: [number, number] = [y.birthHead[0], y.birth[1]];
  return [
    mk(y.head, [V.L, V.LBL], { noBorder: true }),
    label(y.furigana, [V.L, V.LBL_A], 'フリガナ'),
    label(y.name, [V.L, V.LBL_A], '氏名', { fontSize: 11 }),
    label(nameSpan, [V.LBL_A, V.LBL], '参考記載の\n場合「1」\nと記入（注1）', { fontSize: 7, align: 'left' }),
    label(y.myNumber, [V.L, V.LBL], '個人番号又は法人番号'),
    // 生年月日欄は上下2行が1マス。左に見出し、右に元号コードの破線注記が入る。
    mk(birthSpan, [V.L, V.LBL], {}),
    label(birthSpan, [V.L, 8.60], '生年月日\n・年齢', { noBorder: true }),
    label(birthSpan, [8.60, 20.80], ERA_NOTE, { dashed: true, fontSize: 5.5, align: 'left' }),
    label(y.zip, [V.L, V.LBL], '郵便番号'),
    label(y.address, [V.L, V.LBL], '住所', { fontSize: 11 }),
    label(y.tel, [V.L, V.LBL], '電話番号'),
    label(y.relation, [V.L, V.NARROW], '被相続人\nとの続柄'),
    label(y.relation, [V.NARROW, V.LBL], '職業'),
    label(y.cause, [V.L, V.LBL], '取得原因\n（該当する欄に「1」と記入）'),
    mk(y.calcHead, [V.L, V.LBL], {}),
  ];
}

// ════════════════════════════════════════════
// 計算欄（①〜㉗）
// ════════════════════════════════════════════

/** 計算欄の行の高さ（実測px）。両様式で同じ。 */
const CALC_H: Record<string, number> = { v16: 44.5, v27: 52 };
const CALC_H_DEFAULT = 31;

/** 表示順。vB は「法定相続人の数／遺産に係る基礎控除額」の行。 */
export const CALC_ORDER = [
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'vB', 'v7', 'v8', 'v9', 'v10', 'v11',
  'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22',
  'v23', 'v24', 'v25', 'v26', 'v27',
] as const;

/** 行キー → ［上端％, 下端％］。①行の上端pxと px→％ 変換を渡す。 */
export function calcRowRanges(basePx: number, y: (px: number) => number): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  let top = basePx;
  for (const key of CALC_ORDER) {
    const bottom = top + (CALC_H[key] ?? CALC_H_DEFAULT);
    out[key] = [y(top), y(bottom)];
    top = bottom;
  }
  return out;
}

interface CalcRowDef {
  /** 丸番号 */
  no: string;
  /** 行ラベル（様式の印字そのまま） */
  label: string;
  /** ラベルの左端（既定 V.BAND1） */
  labelLeft?: number;
  /** 様式にあらかじめ印字されている末尾の0 */
  zeros?: string;
  /** △（還付）を許す欄 */
  signed?: boolean;
  /** 金額ではなく割合（小数2桁）の欄 */
  decimals?: boolean;
  /** 自動計算欄（編集不可） */
  auto?: boolean;
}

/** ①〜㉗の行定義（Ⓑ行と⑦行は様式ごとに形が違うので各様式ファイルで組む）。 */
const CALC_DEFS: Record<string, CalcRowDef> = {
  // 代償財産を支払う人は付表の「取得財産の価額」が負数になる（記載例62ページ）ので、△を表示できるようにする
  v1: { no: '①', label: '取得財産の価額\n（第11表２③）', signed: true },
  v2: { no: '②', label: '相続時精算課税適用財産の価額\n（第11の２表１⑧）' },
  v3: { no: '③', label: '債務及び葬式費用の金額\n（第13表３⑦）' },
  v4: { no: '④', label: '純資産価額（①＋②−③）\n（赤字のときは０）', auto: true },
  v5: { no: '⑤', label: '純資産価額に加算される暦年課税分の\n贈与財産価額（第14表１④）' },
  v6: { no: '⑥', label: '課税価格（④＋⑤）\n（1,000円未満切捨て）', zeros: '000', auto: true },
  v8: { no: '⑧', label: 'あん分割合\n（各人の⑥/Ⓐ）', labelLeft: V.LBL_A, decimals: true, auto: true },
  v9: { no: '⑨', label: '算出税額\n（⑦×各人の⑧）', labelLeft: V.LBL_A, auto: true },
  v10: { no: '⑩', label: '算出税額\n（第３表⑬）', labelLeft: V.LBL_B, auto: true },
  v11: { no: '⑪', label: '相続税額の２割加算が行われる\n場合の加算金額（第４表⑥）' },
  v12: { no: '⑫', label: '暦年課税分の贈与税額控除額\n（第４表の２㉕）', labelLeft: V.BAND2 },
  v13: { no: '⑬', label: '配偶者の税額軽減額\n（第５表㋐又は㋩）', labelLeft: V.BAND2 },
  v14: { no: '⑭', label: '⑫・⑬以外の税額控除額\n（第８の８表１⑤）', labelLeft: V.BAND2 },
  v15: { no: '⑮', label: '計', labelLeft: V.BAND2, auto: true },
  v16: { no: '⑯', label: '差引税額\n（⑨＋⑪−⑮）又は（⑩＋⑪−⑮）\n（赤字のときは０）', auto: true },
  v17: { no: '⑰', label: '相続時精算課税分の贈与税額控除額\n（第11の２表１⑨）', zeros: '00' },
  v18: { no: '⑱', label: '医療法人持分税額控除額\n（第８の４表２Ｂ）', auto: true },
  v19: { no: '⑲', label: '小計（⑯−⑰−⑱）\n（黒字のときは100円未満切捨て）', auto: true, signed: true },
  v20: { no: '⑳', label: '納税猶予税額\n（第８の８表２⑧）', zeros: '00', auto: true },
  v21: { no: '㉑', label: '申告期限までに\n納付すべき税額', labelLeft: V.NARROW, zeros: '00', auto: true },
  v22: { no: '㉒', label: '還付される税額', labelLeft: V.NARROW, auto: true },
  v23: { no: '㉓', label: '小計', labelLeft: V.BAND2, auto: true },
  v24: { no: '㉔', label: '納税猶予税額', labelLeft: V.BAND2, zeros: '00', auto: true },
  v25: { no: '㉕', label: '申告納税額\n（還付の場合は、頭に△を記載）', labelLeft: V.BAND2, signed: true, auto: true },
  v26: { no: '㉖', label: '小計の増加額（⑲−㉓）', auto: true },
  v27: { no: '㉗', label: 'この申告により納付すべき税額\n又は還付される税額\n（還付の場合は、頭に△を記載）\n（（㉑又は㉒）−㉕）', auto: true, signed: true },
};

export interface CalcRowsOptions {
  /** 行キー → ［上端％, 下端％］ */
  ry: Record<string, [number, number]>;
  /** 汎用行として描く行キー（Ⓑ行・⑦行など特殊行は含めない） */
  keys: string[];
  /** 左列・右列の識別コード（行キー → コード） */
  codes1: Record<string, string>;
  codes2: Record<string, string>;
  /** 左列・右列のフィールド接頭辞 */
  p1: string;
  p2: string;
  /** 左列・右列のアクセシブル名（「各人の合計」など） */
  who1: string;
  who2: string;
  /** 左列を常に編集不可にする（第1表の「各人の合計」列） */
  readOnly1?: boolean;
  /**
   * 定義上は手入力だが、他の様式からの転記になっている行（第11表を使う場合の①など）。
   * 左列・右列で別々に指定する。第5表の⑬のように**その人が配偶者のときだけ**
   * 転記になる欄があるため、列ごとに分けている（第1表（続）は両列とも人の列）。
   */
  transferred?: readonly string[];
  transferred2?: readonly string[];
  /** 転記行をクリックしたときに開く様式（行キー → 様式ID） */
  sourceForms?: Readonly<Record<string, string>>;
}

/** 金額欄・割合欄の共通指定 */
function valueCell(field: string, ariaLabel: string, def: CalcRowDef, readOnly: boolean, navigateToForm?: string): Partial<GridCell> {
  return {
    kind: 'input', field, ariaLabel, readOnly, navigateToForm,
    ...(def.decimals ? { decimalPlaces: 2, align: 'center' } : def.signed ? { signedCommaInteger: true } : { commaInteger: true }),
    ...(def.zeros ? { rightLabel: def.zeros } : {}),
  };
}

/** 計算欄の汎用行（ラベル・丸番号・コード枠・金額欄）をまとめて生成する。 */
export function calcRows({ ry, keys, codes1, codes2, p1, p2, who1, who2, readOnly1, transferred, transferred2, sourceForms }: CalcRowsOptions): GridCell[] {
  return keys.flatMap((key) => {
    const def = CALC_DEFS[key]!;
    const y = ry[key]!;
    const auto = def.auto === true || transferred?.includes(key) === true;
    const auto2 = def.auto === true || transferred2?.includes(key) === true;
    const name = `${def.no}${def.label.split('\n')[0]}`;
    return [
      label(y, [def.labelLeft ?? V.BAND1, V.LBL], def.label),
      label(y, [V.LBL, V.NUM], def.no, { fontSize: 10, semanticRole: 'rowheader' }),
      code(y, [V.NUM, V.CODE1], codes1[key] ?? ''),
      mk(y, [V.CODE1, V.MID], valueCell(`${p1}${key}`, `${who1} ${name}`, def, readOnly1 === true || auto, sourceForms?.[key])),
      code(y, [V.MID, V.CODE2], codes2[key] ?? ''),
      mk(y, [V.CODE2, V.R], valueCell(`${p2}${key}`, `${who2} ${name}`, def, auto2, sourceForms?.[key])),
    ];
  });
}

/** 計算欄の縦書き見出し帯と、複数行にまたがる行見出し。両様式で同じ。 */
export function calcBands(ry: Record<string, [number, number]>): GridCell[] {
  const span = (from: string, to: string): [number, number] => [ry[from]![0], ry[to]![1]];
  return [
    // 0〜2.44％：大見出し
    label(span('v1', 'v6'), [V.L, V.BAND1], '課税価格の計算'),
    label(span('vB', 'v11'), [V.L, V.BAND1], '各人の算出税額の計算'),
    label(span('v12', 'v22'), [V.L, V.BAND1], '各人の納付・還付税額の計算'),
    label(span('v23', 'v27'), [V.L, V.BAND1], 'この申告書が修正申告書である場合'),
    // 2.44〜4.88％：小見出し
    label(span('v12', 'v15'), [V.BAND1, V.BAND2], '税額控除'),
    label(span('v23', 'v25'), [V.BAND1, V.BAND2], 'この修正前の'),
    // 複数行にまたがる行見出し
    label(span('v8', 'v9'), [V.BAND1, V.LBL_A], '一般の場合\n（⑩の場合を除く）', { noWrap: true }),
    label(ry.v10!, [V.BAND1, V.LBL_B], '農地等納税猶予の\n適用を受ける場合'),
    label(span('v21', 'v22'), [V.BAND1, V.NARROW], '申　告\n納税額\n（⑲−⑳）'),
  ];
}

/** 汎用行として描く行キー（Ⓑ行・⑦行は常に特殊） */
export const GENERIC_ROWS = CALC_ORDER.filter((k) => k !== 'vB' && k !== 'v7');
