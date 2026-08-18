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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DETAIL_AUTO_VALUE, DETAIL_METHOD, DETAIL_SOURCE, TABLE11F1_MULTIPLE, TABLE11F1_ROUTE_PRICE, TABLE11F1_UNIT,
  computeAll, detailAutoValue, detailShareAmounts, detailShareCount, detailUnit,
  isEmptyDetail, moved, type Values,
} from '../lib/calc';
import { DETAIL_KINDS } from '../data/detailCodes';
import { TABLE9_DETAIL_FORM } from '../forms/table9';
import { TABLE10_DETAIL_FORM } from '../forms/table10';
import {
  HEIR_ID, detailHeirRefKind, heirRefMap, isTotalsHeirRef, migrateHeirRefs, newHeirId, resolveHeirRefs,
  withHeirIds,
} from '../lib/heirRef';

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

const STORAGE_KEY = 'inheritance-tax-form:v1';
/** 移行前のデータの退避先（付表のまとめ直しは元に戻せないため） */
const BACKUP_KEY = 'inheritance-tax-form:v1-backup';
/** 現在の保存形式 */
const DATA_VERSION = 7;
/** 第1表に1人＋第1表（続）10枚に2人ずつ */
const MAX_HEIRS = 21;
/** 既定で使用する様式 */
const DEFAULT_USED = ['table1', 'table2', 'table11'];

const emptyData = (): FormData => ({
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
function withDetailForms(used: string[], details: Record<string, Values[]>): string[] {
  const forms = detailFormsInUse(details);
  if (forms.length > 0) forms.push('table11');
  const add = forms.filter((id) => !used.includes(id));
  return add.length === 0 ? used : [...used, ...add];
}

/** 財産を取得した人 i 番目のフィールド接頭辞 */
export const heirPrefix = (i: number): string => `h${i}.`;
/** アクセシブル名・画面表示に使う呼び名 */
export const heirLabel = (i: number): string => `${i + 1}人目`;
/** 接頭辞（'h0.'）から何人目かを取り出す。人物ブロックのクリックは接頭辞で返ってくる */
export const heirIndex = (prefix: string): number => Number(prefix.slice(1, -1));

/** 付表 form の i 番目の明細のフィールド接頭辞 */
export const detailPrefix = (form: string, i: number): string => `${form}#${i}.`;
/** アクセシブル名に使う呼び名 */
export const detailLabel = (i: number): string => `明細${i + 1}`;

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
function migrate(parsed: Partial<FormData>): Partial<FormData> {
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

function isFormData(value: unknown): value is Partial<FormData> {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<FormData>;
  return typeof data.common === 'object' && data.common !== null && Array.isArray(data.heirs);
}

/** 保存済み・読込データを現在の形（行数・様式一覧・保存形式）に揃える */
function normalize(input: Partial<FormData>): FormData {
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

function loadStored(): FormData {
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

/** `h0.v1` を ['h0', 'v1'] に分ける */
function splitField(field: string): [string, string] {
  const dot = field.indexOf('.');
  return dot < 0 ? ['c', field] : [field.slice(0, dot), field.slice(dot + 1)];
}

/** 項番の欄名（`no0`・`no3` …）から、その組の先頭の取得者の添字を取り出す */
function shareBase(key: string): number | null {
  const found = /^no(\d+)$/.exec(key);
  return found ? Number(found[1]) : null;
}

/**
 * 付表の項番。財産の並び順から決まる（空欄の財産は数えない）ので入力できない。
 * 続きの組（`base` が3以上）は、そこに取得者が入ったときだけ番号を出す。
 * 4人目を書くために先回りして空けてある組に番号だけ浮かぶのを避けるため。
 */
function detailNo(rows: readonly Values[], index: number, base: number): string {
  const item = rows[index];
  if (isEmptyDetail(item)) return '';
  if (base > 0 && base >= detailShareCount(item!)) return '';
  let no = 0;
  for (let i = 0; i <= index; i += 1) if (!isEmptyDetail(rows[i])) no += 1;
  return String(no);
}

/** `table11f1#3` を ['table11f1', 3] に分ける（付表以外は null） */
function splitDetailScope(scope: string): [string, number] | null {
  const hash = scope.indexOf('#');
  if (hash < 0) return null;
  const index = Number(scope.slice(hash + 1));
  return Number.isInteger(index) && index >= 0 ? [scope.slice(0, hash), index] : null;
}

export function useFormData() {
  const [data, setData] = useState<FormData>(loadStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 容量超過や privacy モードでは保存を諦める（入力自体は続けられる）
    }
  }, [data]);

  /**
   * 計算に渡す前に、氏名欄が持つIDを「何人目か」へ直す。
   * 位置に依存する計算（第4表・第6表・第7表・付表の集計）はここより下では今までどおり。
   */
  const resolved = useMemo(
    () => resolveHeirRefs(data.common, data.heirs, data.details),
    [data.common, data.heirs, data.details],
  );

  const computed = useMemo(
    () => computeAll(resolved.common, data.heirs, data.used, resolved.details),
    [resolved, data.heirs, data.used],
  );

  /** 画面へ返すときの読み替え（計算結果の中の人の番号は、選択肢に合わせてIDへ戻す） */
  const refs = useMemo(() => heirRefMap(data.heirs), [data.heirs]);

  /** 明細が入っているため「使用する」の印を外せない様式（付表とその合計表の第11表） */
  const requiredForms = useMemo(() => withDetailForms([], data.details), [data.details]);

  /**
   * 用紙に載せる明細（保存した明細の後ろに、他の様式から転記された明細を続けたもの）。
   * 転記行は読み取り専用で、直すときは転記元の様式を開く。
   */
  const detailRows = useMemo(() => {
    const forms = Object.keys(computed.derived);
    if (forms.length === 0) return data.details;
    const out = { ...data.details };
    for (const form of forms) out[form] = [...(data.details[form] ?? []), ...computed.derived[form]!];
    return out;
  }, [data.details, computed.derived]);

  const g = useCallback((field: string): string => {
    const [scope, key] = splitField(field);
    if (scope === 't') {
      const value = computed.totals[key] ?? '';
      return isTotalsHeirRef(key) ? refs.toId(value) : value;
    }
    if (scope === 'c') return data.common[key] ?? '';
    const detail = splitDetailScope(scope);
    if (detail) {
      const [form, index] = detail;
      const rows = detailRows[form] ?? [];
      const base = shareBase(key);
      if (base !== null) return detailNo(rows, index, base);
      const item = rows[index];
      if (item === undefined) return '';
      // 転記された明細は計算済み（人も番号のまま）なので、そのまま出す
      if (item[DETAIL_SOURCE] !== undefined) return item[key] ?? '';
      // 用紙の「単価（円）又は倍数」は保存欄ではなく、路線価・倍数・調整から組み立てる
      if (key === TABLE11F1_UNIT) return detailUnit(item) ?? '';
      // 価額は元になる欄（面積×単価など）がそろっていれば自動計算に切り替わる
      if (key === 'value' || key === DETAIL_AUTO_VALUE) {
        const auto = detailAutoValue(form, item);
        if (key === DETAIL_AUTO_VALUE) return auto === undefined ? '' : '1';
        if (auto !== undefined) return auto;
      }
      // 取得者ごとの価額は、取り分の割合が入っていれば按分で決まる
      const share = /^amount(\d+)$/.exec(key);
      if (share !== null) {
        const amount = detailShareAmounts(form, item)[Number(share[1])];
        if (amount !== undefined) return amount;
      }
      // 取得者は用紙に「何人目か」を印字する（画面の選択肢はIDのままなので、ここでだけ直す）
      const value = item[key] ?? '';
      return detailHeirRefKind(key) === 'number' ? refs.toNo(value) : value;
    }
    return computed.heirs[Number(scope.slice(1))]?.[key] ?? '';
  }, [data, detailRows, computed, refs]);

  const u = useCallback((field: string, value: string): void => {
    const [scope, key] = splitField(field);
    if (scope === 't') return; // 自動計算欄は書き込み不可
    const detail = splitDetailScope(scope);
    if (detail && shareBase(key) !== null) return; // 付表の項番は並び順から決まるので書き込み不可
    const index = Number(scope.slice(1));
    setData((prev) => {
      if (scope === 'c') return { ...prev, common: { ...prev.common, [key]: value } };
      if (detail) {
        const [form, i] = detail;
        // 価額は用紙から直接は書けない。自動計算か直接入力かの選択も含めて入力画面に一本化してある
        if (key === 'value') return prev;
        // 明細は用紙の枚数だけ表示するので、未作成の行は入力時に作る
        const rows = [...(prev.details[form] ?? [])];
        // 転記行は保存行の後ろに並ぶ。その添字へ書くと転記行を保存行で押しのけてしまう
        if (i >= rows.length && (computed.derived[form]?.length ?? 0) > 0) return prev;
        while (rows.length <= i) rows.push({});
        rows[i] = { ...rows[i]!, [key]: value };
        return { ...prev, details: { ...prev.details, [form]: rows } };
      }
      // 第1表（続）は必ず2人分が印刷されるため、右側の未作成の1人は入力時に作る
      if (!Number.isInteger(index) || index < 0 || index > prev.heirs.length || index >= MAX_HEIRS) return prev;
      const current = prev.heirs[index] ?? { [HEIR_ID]: newHeirId() };
      const next = { ...current, [key]: value };
      const heirs = [...prev.heirs];
      heirs[index] = next;
      return { ...prev, heirs };
    });
  }, [computed.derived]);

  const addHeir = useCallback(() => {
    setData((prev) => (prev.heirs.length >= MAX_HEIRS
      ? prev
      : { ...prev, heirs: [...prev.heirs, { [HEIR_ID]: newHeirId() }] }));
  }, []);

  /**
   * 「財産を取得した人」を1人消す。
   * 各表の氏名欄はIDを持っているので、後ろの人がずれても指す相手は変わらない。
   * 消した人を指していた欄は行き先が無くなるため、空欄として表示される。
   */
  const removeHeir = useCallback((index: number) => {
    setData((prev) => (prev.heirs.length <= 1 || index < 0 || index >= prev.heirs.length
      ? prev
      : { ...prev, heirs: prev.heirs.filter((_, i) => i !== index) }));
  }, []);

  /** 「財産を取得した人」の並びを入れ替える（用紙に載る順と番号が変わる。参照は付いてくる） */
  const moveHeir = useCallback((from: number, to: number) => {
    setData((prev) => {
      const { heirs } = prev;
      if (from === to || from < 0 || to < 0 || from >= heirs.length || to >= heirs.length) return prev;
      return { ...prev, heirs: moved(heirs, from, to) };
    });
  }, []);

  /**
   * 「財産を取得した人」1人分を丸ごと差し替える（人物の画面の「取消」で使う）。
   * 人物の画面は打つそばから書き込むので、取り消すには開いた時に控えたオブジェクトを戻す。
   * 欄を数え上げて組み立て直すのではないため、他の表が入れた計算値も控えたまま戻る。
   * IDだけは今の人のものを残す（控えた時点でまだIDが無くても、参照の指す先を失わないため）。
   */
  const setHeir = useCallback((index: number, values: Values) => {
    setData((prev) => {
      const current = prev.heirs[index];
      if (!Number.isInteger(index) || index < 0 || current === undefined) return prev;
      const heirs = [...prev.heirs];
      heirs[index] = { ...values, [HEIR_ID]: current[HEIR_ID] ?? values[HEIR_ID] ?? newHeirId() };
      return { ...prev, heirs };
    });
  }, []);

  /**
   * 付表の明細1件を丸ごと差し替える（別画面の「確定」）。
   * 入力は1件ずつ別画面で行い、確定するまで申告内容には反映しない。
   * `index` が末尾より後なら新しい明細として足す。
   */
  const setDetailItem = useCallback((form: string, index: number, item: Values) => {
    setData((prev) => {
      const rows = [...(prev.details[form] ?? [])];
      while (rows.length <= index) rows.push({});
      // 空欄は保存しない（項番は「空でない明細」の並び順から決まるため）
      rows[index] = Object.fromEntries(Object.entries(item).filter(([, value]) => value.trim() !== ''));
      const details = { ...prev.details, [form]: rows };
      return { ...prev, details, used: withDetailForms(prev.used, details) };
    });
  }, []);

  /** 付表の明細1件を消す（以降の項番は自動で繰り上がる） */
  const removeDetailItem = useCallback((form: string, index: number) => {
    setData((prev) => {
      const rows = prev.details[form] ?? [];
      if (index < 0 || index >= rows.length) return prev;
      return { ...prev, details: { ...prev.details, [form]: rows.filter((_, i) => i !== index) } };
    });
  }, []);

  /**
   * 明細の並びを入れ替える（項番は並び順そのものなので、動かせば番号も振り直される）。
   *
   * @param remapCommon 共通欄が行を番号で名指ししている様式（第14表の確認欄）だけ渡す。
   *   共通欄と明細を1回の更新でまとめて直せるのがここしかないため。
   */
  const moveDetailItem = useCallback((
    form: string, from: number, to: number,
    remapCommon?: (common: Values, indexOf: (index: number) => number) => Values,
  ) => {
    setData((prev) => {
      const rows = prev.details[form] ?? [];
      if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return prev;
      const details = { ...prev.details, [form]: moved(rows, from, to) };
      if (remapCommon === undefined) return { ...prev, details };
      /** 動かした1件だけが行き先へ跳び、間に挟まれた行は1つずつ寄る */
      const indexOf = (index: number): number => {
        if (index === from) return to;
        if (from < index && index <= to) return index - 1;
        if (to <= index && index < from) return index + 1;
        return index;
      };
      return { ...prev, common: remapCommon(prev.common, indexOf), details };
    });
  }, []);

  /** 付表の明細を1枚分（`rows` 件）増やす */
  const addDetailPage = useCallback((form: string, rows: number) => {
    setData((prev) => {
      const current = prev.details[form] ?? [];
      const next = [...current, ...Array.from({ length: rows }, (): Values => ({}))];
      return { ...prev, details: { ...prev.details, [form]: next } };
    });
  }, []);

  /**
   * 明細の件数をちょうど `count` 件にする。
   * 枚数ではなく件数で増減する様式（第11・11の2表の付表1と、その別表1）用。
   * 表示件数は「配列の長さ」ではなく「様式が持つ最低枚数」との大きい方なので、
   * 未作成（長さ0）の状態から ＋ を押したときも飛ばずに1件だけ増える。
   */
  const setDetailCount = useCallback((form: string, count: number) => {
    setData((prev) => {
      const current = prev.details[form] ?? [];
      if (count <= 0 || count === current.length) return prev;
      const next = count < current.length
        ? current.slice(0, count)
        : [...current, ...Array.from({ length: count - current.length }, (): Values => ({}))];
      return { ...prev, details: { ...prev.details, [form]: next } };
    });
  }, []);

  /** 様式を「使用する／しない」で切り替える（印刷対象の出し入れ） */
  const toggleUsed = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      used: prev.used.includes(id) ? prev.used.filter((x) => x !== id) : [...prev.used, id],
    }));
  }, []);

  const reset = useCallback(() => setData(emptyData()), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `相続税申告書_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importJson = useCallback(async (file: File): Promise<boolean> => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isFormData(parsed)) return false;
      setData(normalize(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    data, detailRows, g, u, addHeir, removeHeir, moveHeir, setHeir, addDetailPage, setDetailCount, setDetailItem, removeDetailItem, moveDetailItem,
    toggleUsed, reset, exportJson, importJson, requiredForms, maxHeirs: MAX_HEIRS,
  };
}
