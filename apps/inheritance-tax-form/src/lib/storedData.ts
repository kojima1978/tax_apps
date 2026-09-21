/**
 * 申告書全体の入力状態。
 *
 * GridForm は `g(field)` / `u(field, value)` の2関数だけで値をやり取りするため、
 * フィールド名の接頭辞で保存先を振り分ける:
 *   `c.xxx`  … 共通欄（被相続人・提出先・第2表㋭）
 *   `t.xxx`  … 自動計算欄（「各人の合計」列と様式間の転記欄・書き込み不可）
 *   `h0.xxx` … 財産を取得した人 0番目（第1表に載る人）
 *   `h1.xxx` … 以降は第1表（続）に2人ずつ（第2表④の法定相続人もこの人の欄を指す）
 *   `table11f1#0.xxx` … 付表（財産の明細書）の様式ID＋明細の通し番号。
 *                       付表は「人」ではなく「財産」の一覧なので別枠で持つ。
 */

import {
  DETAIL_METHOD, TABLE11F1_MULTIPLE, TABLE11F1_ROUTE_PRICE,
  detailShareCount, isEmptyDetail, type Values,
} from './calc';
import { DETAIL_KINDS } from '../data/detailCodes';
import { TABLE9_DETAIL_FORM } from '../forms/table9';
import { TABLE10_DETAIL_FORM } from '../forms/table10';
import { migrateHeirRefs, withHeirIds } from './heirRef';

export interface FormData {
  common: Values;
  heirs: Values[];
  /** 使用する様式のID（印刷対象） */
  used: string[];
  /**
   * 付表（財産の明細書）の明細。様式IDごとに、**財産1つ＝1要素**の配列。
   * 配列の順がそのまま出力順で、項番は順番から決まる。
   * 取得者は `who0`/`amount0` から可変長で並べる（様式の1組は3人までだが、
   * 4人以上で共有した財産は記載例59ページのQ&Aのとおり次の組へ続けて印字する）。
   */
  details: Record<string, Values[]>;
  /**
   * 保存形式の版。
   * 2 … 付表を「1組＝1要素」から「1財産＝1要素」に変えた
   * 3 … 付表1の評価方式（路線価／倍率）を明示的に持つようにした
   * 4 … 相続の放棄を第2表の行から「財産を取得した人」へ移した
   * 5 … 第2表④の行を廃止し、法定相続人であることと法定相続分も「財産を取得した人」へ移した
   * 6 … 各表の氏名欄が持つ「第1表の何人目か」を、人ごとの不変のID（`_id`）に変えた
   * 7 … 付表1の「単価（円）又は倍数」を路線価・倍数・調整の3欄に分けた
   */
  version?: number;
}

export const STORAGE_KEY = 'inheritance-tax-form:v1';
/** 移行前のデータの退避先（付表のまとめ直しは元に戻せないため） */
export const BACKUP_KEY = 'inheritance-tax-form:v1-backup';
/** 現在の保存形式 */
export const DATA_VERSION = 7;
/** 第1表に1人＋第1表（続）10枚に2人ずつ */
export const MAX_HEIRS = 21;
/** 既定で使用する様式 */
export const DEFAULT_USED = ['table1', 'table2', 'table11'];

export const emptyData = (): FormData => ({
  common: {}, heirs: withHeirIds([{}]), used: [...DEFAULT_USED], details: {}, version: DATA_VERSION,
});

/**
 * 明細が1件でも入っている付表の様式ID。
 *
 * 「使用する」の印は提出する様式の指定であると同時に、集計と転記のスイッチも兼ねている
 * （付表→第11表2①②は印の付いた付表だけ、第11表2③→第1表①は第11表に印があるときだけ）。
 * 印を忘れると入力しても画面上は何も起きず、原因が分からないまま止まる。
 * 入力した以上は提出する様式なので、印は自動で付ける（`requiredForms` で外せなくもする）。
 */
function detailFormsInUse(details: Record<string, Values[]>): string[] {
  const forms = Object.keys(DETAIL_KINDS)
    .filter((id) => (details[id] ?? []).some((item) => !isEmptyDetail(item)));
  // 第9表・第10表の明細は付表4へ転記される。印が無いと転記先が集計に入らないので付けておく
  const transferred = [TABLE9_DETAIL_FORM, TABLE10_DETAIL_FORM]
    .some((id) => (details[id] ?? []).some((item) => !isEmptyDetail(item)));
  if (transferred && !forms.includes('table11f4')) forms.push('table11f4');
  return forms;
}

/** 明細のある付表と、その合計表である第11表に「使用する」の印を付ける */
export function withDetailForms(used: string[], details: Record<string, Values[]>): string[] {
  const forms = detailFormsInUse(details);
  if (forms.length > 0) forms.push('table11');
  const add = forms.filter((id) => !used.includes(id));
  return add.length === 0 ? used : [...used, ...add];
}

/**
 * 保存形式 1（1組＝1要素）の明細を、2（1財産＝1要素）へまとめ直す。
 *
 * 版1では4人以上の共有を「項番を手で同じ番号にした次の組」で表していたので、
 * 「項番が直前と同じで、明細欄が空の組」を直前の財産の続きとみなして
 * `who3`/`amount3` … へ繋ぎ替える。まったくの空組は落とす（項番は順番から決まるため、
 * 途中に空組が残っていると番号がずれる）。
 */
function migrateDetails(rows: readonly Values[]): Values[] {
  const out: Values[] = [];
  let lastNo = '';
  for (const row of rows) {
    const { no = '', ...rest } = row;
    if (isEmptyDetail(rest)) { lastNo = ''; continue; }
    const shares: Values = {};
    const detail: Values = {};
    for (const [key, value] of Object.entries(rest)) {
      (/^(?:who|amount)\d$/.test(key) ? shares : detail)[key] = value;
    }
    const prev = out[out.length - 1];
    // 明細欄が空＝続きの組。直前の財産の取得者として後ろに足す
    if (prev !== undefined && no !== '' && no === lastNo && isEmptyDetail(detail)) {
      const base = detailShareCount(prev);
      for (const [key, value] of Object.entries(shares)) {
        const found = /^(who|amount)(\d)$/.exec(key)!;
        prev[`${found[1]}${base + Number(found[2])}`] = value;
      }
      continue;
    }
    out.push({ ...detail, ...shares });
    lastNo = no;
  }
  return out;
}

/**
 * 版2までの付表1は「固定資産税評価額が入っていれば倍率方式」と推測していた。
 * 版3では方式を明示的に持つので、その推測を1回だけ実際の値に焼き付ける。
 */
function migrateMethod(rows: readonly Values[]): Values[] {
  return rows.map((row) => (
    row[DETAIL_METHOD] !== undefined || (row.fixedValue ?? '').trim() === ''
      ? row
      : { ...row, [DETAIL_METHOD]: 'ratio' }
  ));
}

/**
 * 版4までの第2表④は独立した行の一覧で、誰を載せるか・その人の法定相続分・相続の放棄が
 * 行の側に付いていた。どれも人に付く事実で、放棄は第6表の候補や第9表・第10表2の非課税の
 * 判定にも効く。版5では行そのものを廃し、「財産を取得した人」へ移す
 * （結び付け `source` をたどって移し替える）。
 *
 * `source` を持たない行（版3以前に手で氏名を打った行）は第1表の人と結び付いていないので
 * 移す先が無い。第2表④に載る人は第1表にも必ず載る人なので、人物を登録し直してもらう。
 */
function migrateLawful(heirs: readonly Values[], lawful: readonly Values[]): Values[] {
  const next = heirs.map((heir) => ({ ...heir }));
  for (const row of lawful) {
    const source = row.source ?? '';
    if (!/^\d+$/.test(source)) continue;
    const heir = next[Number(source)];
    if (heir === undefined) continue;
    heir.isLawful = '1';
    if (row.renounced === '1') heir.renounced = '1';
    // 分数は手入力として引き継ぐ（消せば続柄からの自動候補に切り替わる）
    if ((row.num ?? '') !== '') heir.lawNum = row.num!;
    if ((row.den ?? '') !== '') heir.lawDen = row.den!;
  }
  return next;
}

/**
 * 版6までの付表1は、路線価も倍数も同じ `unitPrice` に入れていた（様式の枠が1つのため）。
 * 版7では欄を分けたので、その明細の評価方式が指している側へ移す。
 */
function migrateUnitPrice(rows: readonly Values[]): Values[] {
  return rows.map((row) => {
    const { unitPrice, ...rest } = row;
    if (unitPrice === undefined) return row;
    const field = row[DETAIL_METHOD] === 'ratio' ? TABLE11F1_MULTIPLE : TABLE11F1_ROUTE_PRICE;
    return rest[field] === undefined ? { ...rest, [field]: unitPrice } : rest;
  });
}

/** 保存済みデータを現在の保存形式へ移行する */
export function migrate(parsed: Partial<FormData>): Partial<FormData> {
  if (parsed.version === DATA_VERSION) return parsed;
  const { lawful, ...rest } = parsed as Partial<FormData> & { lawful?: Values[] };
  const out: Partial<FormData> = { ...rest, heirs: migrateLawful(parsed.heirs ?? [], lawful ?? []) };
  if (typeof parsed.details !== 'object' || parsed.details === null) return out;
  const details: Record<string, Values[]> = {};
  for (const [form, rows] of Object.entries(parsed.details)) {
    const list = Array.isArray(rows) ? rows : [];
    details[form] = (parsed.version ?? 1) < 2 ? migrateDetails(list) : list;
  }
  if (details.table11f1 !== undefined) {
    details.table11f1 = migrateUnitPrice(migrateMethod(details.table11f1));
  }
  return { ...out, details };
}

/** 第1表1枚＋（続）は2人ずつ */
export const pageCount = (heirs: number): number => 1 + Math.ceil(Math.max(0, heirs - 1) / 2);

export function isFormData(value: unknown): value is Partial<FormData> {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<FormData>;
  return typeof data.common === 'object' && data.common !== null && Array.isArray(data.heirs);
}

/** 保存済み・読込データを現在の形（行数・様式一覧・保存形式）に揃える */
export function normalize(input: Partial<FormData>): FormData {
  const parsed = migrate(input);
  const stored = typeof parsed.details === 'object' && parsed.details !== null ? parsed.details : {};
  const heirs = withHeirIds(parsed.heirs && parsed.heirs.length > 0 ? parsed.heirs : [{}]);
  // 版5までの氏名欄は「第1表の何人目か」。IDを付けた直後の並びで1回だけ読み替える
  const { common, details } = (input.version ?? 1) < 6
    ? migrateHeirRefs(parsed.common ?? {}, heirs, stored)
    : { common: parsed.common ?? {}, details: stored };
  return {
    common,
    heirs,
    // 印を付け忘れたまま入力していた既存データも、読み込んだ時点で直す
    used: withDetailForms(Array.isArray(parsed.used) ? parsed.used : [...DEFAULT_USED], details),
    details,
    version: DATA_VERSION,
  };
}

export function loadStored(): FormData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed: unknown = JSON.parse(raw);
    if (!isFormData(parsed)) return emptyData();
    try {
      // 付表のまとめ直しは元に戻せないので、移行前のものを1回だけ退避しておく
      if (parsed.version !== DATA_VERSION && localStorage.getItem(BACKUP_KEY) === null) {
        localStorage.setItem(BACKUP_KEY, raw);
      }
    } catch {
      // 退避できなくても読み込み自体は続ける
    }
    return normalize(parsed);
  } catch {
    return emptyData();
  }
}

/**
 * 保存する。容量超過や privacy モードでは保存を諦める（入力自体は続けられる）。
 * @returns 保存できたか
 */
export function saveStored(data: FormData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
