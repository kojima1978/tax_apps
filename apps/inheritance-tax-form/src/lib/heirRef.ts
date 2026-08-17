/**
 * 「財産を取得した人」への参照。
 *
 * 各表の氏名欄（第13表の負担する人、付表の取得者など）が保存しているのは人そのものではなく
 * 「第1表の何人目か」だった。位置は人を並べ替えたり途中の人を消したりすると意味が変わるので、
 * 参照が黙って別人を指す。だから**保存する値は人ごとの不変のID**（`_id`）にして、
 * 位置（1始まりの番号）へ直すのは計算と印字の入口の1回だけにする。
 *
 * 参照の欄がどれかは名前でしか分からないため、ここに一覧を持つ。
 * 抜けると「並べ替えたら別人になる」に逆戻りするので、`heirRef.test.ts` が
 * 全様式を組み立てて「氏名の選択肢が付いている欄」と突き合わせ、漏れを落とす。
 */

import type { Values } from './calc';

/** 人の不変のID を持つ欄の名前（人の値に同居させる） */
export const HEIR_ID = '_id';

let seq = 0;

/**
 * 新しいID。**数字だけにはしない** —
 * 版5までの参照は「何人目か」の数字なので、見ただけで旧データと区別できるようにする。
 */
export function newHeirId(): string {
  seq += 1;
  return `p${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** IDの無い人に付ける（読込時と追加時。既に持っている人はそのまま） */
export function withHeirIds(heirs: readonly Values[]): Values[] {
  return heirs.map((heir) => ((heir[HEIR_ID] ?? '') !== '' ? heir : { ...heir, [HEIR_ID]: newHeirId() }));
}

/** 共通欄（`c.`）で人を指す欄 */
const COMMON_REFS = [
  /Who$/, // 第9表・第10表・第13表・第14表の明細
  /^t4\d*no$/, // 第4表・第4表の2
  /^t6[dm]f?\d+no$/, // 第6表（未成年者・障害者と、その扶養義務者）
  /^t7[ab]\d+no$/, // 第7表
  /^t88[ab]p\d+c\d+no$/, // 第8の8表
  /^f1ag\d+$/, // 第11・11の2表の付表1（農地等の取得者）
];

/** 自動計算欄（`t.`）で人を指す欄（第9表・第10表の非課税の按分結果） */
const TOTALS_REFS = [/^t(?:9|10)r\d+No$/];

/** 付表（`table…#n.`）の選択式の参照 */
const DETAIL_SELECT_REFS = [/^who$/, /^p\d+who$/];

/** 付表（`table…#n.`）で**用紙に番号を印字する**参照（財産を取得した人の番号） */
const DETAIL_NUMBER_REFS = [/^who\d+$/];

const matches = (list: readonly RegExp[], key: string): boolean => list.some((re) => re.test(key));

export const isCommonHeirRef = (key: string): boolean => matches(COMMON_REFS, key);
export const isTotalsHeirRef = (key: string): boolean => matches(TOTALS_REFS, key);

/** 付表の参照の種類。`number` は用紙に番号を出すので、読むときに位置へ直す */
export function detailHeirRefKind(key: string): 'select' | 'number' | null {
  if (matches(DETAIL_NUMBER_REFS, key)) return 'number';
  return matches(DETAIL_SELECT_REFS, key) ? 'select' : null;
}

/**
 * 接頭辞の付いた欄名（`c.t9d0Who`・`table1112f1#0.who` など）が人を指すか。
 * 様式の側と一覧を突き合わせるテストで使う。
 */
export function isHeirRefField(field: string): boolean {
  const dot = field.indexOf('.');
  const scope = dot < 0 ? 'c' : field.slice(0, dot);
  const key = dot < 0 ? field : field.slice(dot + 1);
  if (scope === 'c') return isCommonHeirRef(key);
  if (scope === 't') return isTotalsHeirRef(key);
  return scope.includes('#') && detailHeirRefKind(key) !== null;
}

export interface HeirRefMap {
  /** ID → 何人目か（1始まり）。消された人・未選択は空文字 */
  toNo: (id: string) => string;
  /** 何人目か（1始まり）→ ID */
  toId: (no: string) => string;
}

export function heirRefMap(heirs: readonly Values[]): HeirRefMap {
  const byId = new Map<string, string>();
  const byNo = new Map<string, string>();
  heirs.forEach((heir, i) => {
    const id = heir[HEIR_ID] ?? '';
    if (id === '') return;
    byId.set(id, String(i + 1));
    byNo.set(String(i + 1), id);
  });
  return {
    toNo: (id) => (id === '' ? '' : byId.get(id) ?? ''),
    toId: (no) => (no === '' ? '' : byNo.get(no) ?? ''),
  };
}

/** 参照の欄だけを `convert` に通した写しを返す（共通欄と付表） */
function mapRefs(
  common: Values, details: Record<string, Values[]>, convert: (value: string) => string,
): { common: Values; details: Record<string, Values[]> } {
  const nextCommon: Values = {};
  for (const [key, value] of Object.entries(common)) {
    nextCommon[key] = isCommonHeirRef(key) ? convert(value) : value;
  }
  const nextDetails: Record<string, Values[]> = {};
  for (const [form, rows] of Object.entries(details)) {
    nextDetails[form] = rows.map((row) => {
      const out: Values = {};
      for (const [key, value] of Object.entries(row)) {
        out[key] = detailHeirRefKind(key) !== null ? convert(value) : value;
      }
      return out;
    });
  }
  return { common: nextCommon, details: nextDetails };
}

/**
 * 計算に渡す前に、参照を「何人目か」へ直す。
 * これで計算側（`computeAll`）は今までどおり位置だけを見ればよい。
 */
export function resolveHeirRefs(
  common: Values, heirs: readonly Values[], details: Record<string, Values[]>,
): { common: Values; details: Record<string, Values[]> } {
  return mapRefs(common, details, heirRefMap(heirs).toNo);
}

/** 版5までの「何人目か」の参照を、人に付けたIDへ1回だけ読み替える */
export function migrateHeirRefs(
  common: Values, heirs: readonly Values[], details: Record<string, Values[]>,
): { common: Values; details: Record<string, Values[]> } {
  return mapRefs(common, details, heirRefMap(heirs).toId);
}
