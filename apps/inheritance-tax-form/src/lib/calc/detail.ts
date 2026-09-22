/**
 * 付表（財産の明細書）の明細。1行＝財産1件で、取得者は可変長で並べる。
 *
 * 第11表2①は付表からの転記欄。付表の「分割が確定した財産」を
 * 「財産を取得した人の番号」ごとに合計する。番号は第11表の項番＝入力順の通し番号。
 */

import { formatCommaInteger, formatCommaNumber } from '../format';
import { type Values, decimal, num, str } from './values';

/**
 * 付表の「分割が確定した財産」欄は、様式の1組に3人分しか無い。
 * 4人以上で共有した財産は、記載例59ページのQ&Aのとおり次の組に同じ項番で続きを書く。
 * データの側は「財産1件＝1要素」で持ち、取得者は `who0`/`amount0` から可変長で並べる。
 * 何組に割り付けるかは印字のときだけの話なので、集計はここでは組を意識しない。
 */
export const DETAIL_SHARES_PER_GROUP = 3;

/** 明細1件が持つ取得者の枠の数（＝最後に何か入っている枠の次まで） */
export function detailShareCount(item: Values): number {
  let last = -1;
  for (const [key, value] of Object.entries(item)) {
    const found = /^(?:who|amount|ratioN|ratioD)(\d+)$/.exec(key);
    if (found && value.trim() !== '') last = Math.max(last, Number(found[1]));
  }
  return last + 1;
}

/**
 * 明細1件が使う組の数。
 * 最後の組が3人とも埋まったら次の組を1つ空けておく（4人目を書く場所を先に用意する）。
 * 空の組は様式の未使用行と見分けが付かないので、印刷しても差し支えない。
 */
export function detailGroupCount(item: Values): number {
  return Math.floor(detailShareCount(item) / DETAIL_SHARES_PER_GROUP) + 1;
}

/**
 * 2つの入力内容が同じか（欄の並び順は見ない）。
 * 「取消」で戻す前に、そもそも変わっているかを調べるのに使う。
 * 空文字と欄そのものが無い状態は同じものとして扱う（打って消すと空文字が残るため）。
 */
export function sameValues(a: Values, b: Values): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a[key] ?? '') === (b[key] ?? ''));
}

/** 明細1件がまったくの空欄か（項番を振る対象から外す） */
export function isEmptyDetail(item: Values | undefined): boolean {
  return item === undefined || Object.values(item).every((value) => value.trim() === '');
}

/** 付表2〜4の「価額」の計算式（様式ごと。付表1は評価方式があるので別に持つ） */
interface DetailValueRule {
  /** 数量にあたる欄 */
  base: string;
  /** 掛ける欄（すべて入っていないと自動計算しない） */
  times: readonly string[];
  /** 入っていれば掛ける欄（空欄は1.0として扱う） */
  optional?: readonly string[];
}

/** 付表1（土地・家屋等）の評価方式 */
export type DetailMethod = 'route' | 'ratio';

/** 評価方式の欄名 */
export const DETAIL_METHOD = 'method';

/** 付表1の欄名（用紙には独立した枠が無く、入力画面にだけ並ぶ欄を含む） */
export const TABLE11F1_ROUTE_PRICE = 'routePrice';

export const TABLE11F1_MULTIPLE = 'multiple';

export const TABLE11F1_ADJUST = 'adjust';

/**
 * 用紙の「単価（円）又は倍数」に印字する値の擬似フィールド。
 * 様式の枠は1つしか無いので、保存する欄（路線価・倍数・調整）から組み立てて表示する。
 */
export const TABLE11F1_UNIT = 'unit';

/** 付表1の評価方式ごとの計算式 */
interface Table11f1Rule {
  /** 方式の名前（補助資料の見出しに使う） */
  label: string;
  /** 数量にあたる欄 */
  base: string;
  baseName: string;
  /** 単価のもとになる欄 */
  unit: string;
  unitName: string;
  /** 単価に調整を掛けた結果を円未満切り捨てにするか（倍数は小数のまま扱う） */
  floorUnit: boolean;
}

/**
 * 付表1の評価方式ごとの計算式。単価欄は様式上「単価（円）又は倍数」で共通のため、
 * どちらの式で計算するかは**入力から推測せずユーザーが選ぶ**。
 * 固定資産税評価額を参考に控えただけで倍率方式に化ける、といったことを起こさないため。
 *
 * どちらの方式でも欄はすべて入力できる（選んでいない方式の値も参考として残せる）。
 * 方式は「単価欄にどちらを印字するか」「価額をどちらの式で出すか」だけを決める。
 */
const TABLE11F1_RULES: Record<DetailMethod, Table11f1Rule> = {
  // 路線価方式: 面積 × 切捨(路線価 × 調整) × 持分割合
  route: {
    label: '路線価方式', base: 'area', baseName: '面積（㎡）',
    unit: TABLE11F1_ROUTE_PRICE, unitName: '路線価（円）', floorUnit: true,
  },
  // 倍率方式: 固定資産税評価額 × (倍数 × 調整) × 持分割合
  ratio: {
    label: '倍率方式', base: 'fixedValue', baseName: '固定資産税評価額（円）',
    unit: TABLE11F1_MULTIPLE, unitName: '倍数', floorUnit: false,
  },
};

/** 付表1の持分割合の欄 */
const TABLE11F1_SHARE_RATIO = ['shareN', 'shareD'] as const;

/**
 * 用紙の「単価（円）又は倍数」に印字する値。もとになる欄が空なら `undefined`。
 * 路線価方式は 路線価 × 調整（円未満切り捨て）、倍率方式は 倍率 × 調整（小数のまま）。
 * 調整が空・0のときは掛けない（＝1.0）。
 */
export function detailUnit(item: Values): string | undefined {
  const rule = TABLE11F1_RULES[detailMethod(item)];
  const unit = num(item[rule.unit]);
  if (unit <= 0) return undefined;
  const adjust = num(item[TABLE11F1_ADJUST]);
  const value = adjust > 0 ? unit * adjust : unit;
  return rule.floorUnit ? str(Math.floor(value)) : decimal(value);
}

/**
 * 付表1の価額。用紙の上で 数量 × 単価 × 持分割合 の検算が閉じるよう、
 * **用紙に印字した単価から**計算する（調整を掛けた後の値）。
 */
function table11f1Value(item: Values): string | undefined {
  const base = num(item[TABLE11F1_RULES[detailMethod(item)].base]);
  const unit = num(detailUnit(item));
  if (base <= 0 || unit <= 0) return undefined;
  let total = base * unit;
  const [n, d] = TABLE11F1_SHARE_RATIO.map((key) => num(item[key]));
  if (n! > 0 && d! > 0) total = (total * n!) / d!;
  return str(Math.floor(total));
}

/** 補助資料（単価の計算根拠）1行分 */
export interface Table11f1Calc {
  method: DetailMethod;
  /** 方式の名前 */
  methodLabel: string;
  /** 数量（路線価方式は面積、倍率方式は固定資産税評価額） */
  base: string;
  baseName: string;
  /** 単価のもと（路線価又は倍数） */
  unitSource: string;
  unitName: string;
  adjust: string;
  /** 用紙に印字する単価（＝ もと × 調整） */
  unit: string;
  /** 持分割合（分子／分母。指定が無ければ空） */
  share: string;
  /** 価額（自動計算できないときは手入力の値） */
  value: string;
  /** 検算用の式（そのまま読めば同じ値になる） */
  formula: string;
}

/**
 * 補助資料に出す1行分。用紙には単価の結果しか出ないため、
 * 何をどう掛けてその単価・価額になったのかをここで文字にして残す。
 */
export function table11f1Calc(item: Values): Table11f1Calc {
  const method = detailMethod(item);
  const rule = TABLE11F1_RULES[method];
  const base = item[rule.base] ?? '';
  const unitSource = item[rule.unit] ?? '';
  const adjust = item[TABLE11F1_ADJUST] ?? '';
  const unit = detailUnit(item) ?? '';
  const [n, d] = TABLE11F1_SHARE_RATIO.map((key) => num(item[key]));
  const share = n! > 0 && d! > 0 ? `${item.shareN}／${item.shareD}` : '';

  const value = detailValue('table11f1', item);
  // 式に出す数はすべて用紙と同じ見た目（カンマ入り）にそろえる
  const unitParts = [num(unitSource) > 0 ? formatCommaNumber(unitSource) : '?'];
  if (num(adjust) > 0) unitParts.push(adjust);
  const valueParts = [num(base) > 0 ? formatCommaNumber(base) : '?', unit === '' ? '?' : formatCommaNumber(unit)];
  if (share !== '') valueParts.push(share);
  const formula = `単価 ${unitParts.join(' × ')}`
    + `${rule.floorUnit && unitParts.length > 1 ? '（円未満切捨て）' : ''}`
    + ` ＝ ${unit === '' ? '—' : formatCommaNumber(unit)}`
    + ` ／ 価額 ${valueParts.join(' × ')} ＝ ${value === '' ? '—' : formatCommaInteger(value)}`;

  return {
    method,
    methodLabel: rule.label,
    base,
    baseName: rule.baseName,
    unitSource,
    unitName: rule.unitName,
    adjust,
    unit,
    share,
    value,
    formula,
  };
}

/**
 * 付表2〜4の「価額」を元の欄から自動計算する式。
 * 付表2の為替は外貨建てのときだけ入れる欄なので、空欄は 1.0（邦貨建て）として扱う。
 */
const DETAIL_VALUE_RULES: Record<string, DetailValueRule> = {
  table11f2: { base: 'quantity', times: ['unitPrice'], optional: ['fx'] },
  table11f3: { base: 'quantity', times: ['unitPrice'] },
  table11f4: { base: 'quantity', times: ['unitPrice'], optional: ['multiple'] },
};

/** 明細1件の評価方式（付表1のみ。未指定は路線価方式） */
export function detailMethod(item: Values): DetailMethod {
  return item[DETAIL_METHOD] === 'ratio' ? 'ratio' : 'route';
}

/**
 * 「価額が自動計算になっているか」を GridForm へ渡すための擬似フィールド。
 * 保存はされない（`g` が明細から求めて '1' か '' を返す）。
 */
export const DETAIL_AUTO_VALUE = 'valueAuto';

/**
 * 価額を直接入力にしている明細の印（'1' なら直接入力）。
 * 既定は自動計算で、この印が付いている明細だけ元の欄（数量・単価など）を残したまま
 * 価額を手で入れられる。数量・単価・為替はこの印と関係なく用紙に印字される。
 */
export const DETAIL_VALUE_MANUAL = 'valueManual';

/**
 * 明細1件の価額の自動計算。元になる欄がそろっていないときは `undefined`（手入力のまま）。
 * 円未満は切り捨てる。
 */
export function detailAutoValue(form: string, item: Values): string | undefined {
  // 直接入力を選んでいる明細は、元の欄がそろっていても計算しない
  if (item[DETAIL_VALUE_MANUAL] === '1') return undefined;
  if (form === 'table11f1') return table11f1Value(item);
  const rule = DETAIL_VALUE_RULES[form];
  if (rule === undefined) return undefined;
  const base = num(item[rule.base]);
  if (base <= 0) return undefined;
  let total = base;
  for (const key of rule.times) {
    const value = num(item[key]);
    if (value <= 0) return undefined;
    total *= value;
  }
  for (const key of rule.optional ?? []) {
    const value = num(item[key]);
    if (value > 0) total *= value;
  }
  return str(Math.floor(total));
}

/** 明細1件の価額（自動計算できるものは計算値、できないものは手入力の値） */
export function detailValue(form: string, item: Values): string {
  return detailAutoValue(form, item) ?? item.value ?? '';
}

/** 取得者ごとの取り分の割合（分数）の欄名 */
export const DETAIL_RATIO_N = 'ratioN';

export const DETAIL_RATIO_D = 'ratioD';

/** 取得者1人分を作る欄（添字を付けて `who0` … のように並ぶ） */
const SHARE_KEYS = ['who', DETAIL_RATIO_N, DETAIL_RATIO_D, 'amount'] as const;

/**
 * 配列の `from` 番目を `to` 番目の位置へ移す（並べ替えの共通処理）。
 * 元の配列は変えない。
 */
export function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  if (from === to || from < 0 || to < 0 || from >= out.length || to >= out.length) return out;
  out.splice(to, 0, ...out.splice(from, 1));
  return out;
}

/**
 * 明細の中の取得者の並びを入れ替える。
 * 1人は `who`・割合・`amount` の4欄で1組なので、まとめて動かして添字を振り直す。
 * 按分の端数は先頭の取得者へ寄せるので、並び順は金額にも効く。
 */
export function moveDetailShare(item: Values, from: number, to: number): Values {
  const count = detailShareCount(item);
  if (from === to || from < 0 || to < 0 || from >= count || to >= count) return item;
  const out: Values = {};
  for (const [key, value] of Object.entries(item)) {
    if (!/^(?:who|amount|ratioN|ratioD)\d+$/.test(key)) out[key] = value;
  }
  moved(Array.from({ length: count }, (_, i) => i), from, to).forEach((source, index) => {
    for (const key of SHARE_KEYS) {
      const value = item[`${key}${source}`];
      if (value !== undefined) out[`${key}${index}`] = value;
    }
  });
  return out;
}

/**
 * 取得者ごとの「取得財産の価額」を、割合（分数）から按分して求める。
 * 割合が1つも入っていない取得者は `undefined`（手入力のまま）。
 *
 * 端数は合計が財産の価額とぴったり一致するよう先頭の取得者へ寄せる
 * （第1表の未分割財産の按分と同じ扱い）。
 */
export function detailShareAmounts(form: string, item: Values): (string | undefined)[] {
  const shares = Array.from({ length: detailShareCount(item) }, (_, i) => {
    const n = num(item[`${DETAIL_RATIO_N}${i}`]);
    const d = num(item[`${DETAIL_RATIO_D}${i}`]);
    return n > 0 && d > 0 ? n / d : 0;
  });
  const out: (string | undefined)[] = shares.map(() => undefined);
  const denominator = shares.reduce((sum, share) => sum + share, 0);
  const total = num(detailValue(form, item));
  if (denominator <= 0 || total === 0) return out;
  let rest = total;
  let first = -1;
  shares.forEach((share, i) => {
    if (share <= 0) return;
    const amount = Math.floor((total * share) / denominator);
    out[i] = str(amount);
    rest -= amount;
    if (first < 0) first = i;
  });
  if (first >= 0 && rest !== 0) out[first] = str(num(out[first]!) + rest);
  return out;
}

/** 自動計算できる明細は価額と取得者ごとの価額を計算値に置き換える（手入力の欄はそのまま） */
export function resolveDetail(form: string, item: Values): Values {
  const value = detailAutoValue(form, item);
  const resolved = value === undefined ? item : { ...item, value };
  const amounts = detailShareAmounts(form, resolved);
  if (amounts.every((amount) => amount === undefined)) return resolved;
  const out: Values = { ...resolved };
  amounts.forEach((amount, i) => {
    if (amount !== undefined) out[`amount${i}`] = amount;
  });
  return out;
}

/** 明細1件の取得者（番号が入っているものだけ） */
export function detailShares(item: Values): { no: number; amount: number }[] {
  const out: { no: number; amount: number }[] = [];
  const count = detailShareCount(item);
  for (let i = 0; i < count; i += 1) {
    const no = num(item[`who${i}`]);
    if (no > 0) out.push({ no, amount: num(item[`amount${i}`]) });
  }
  return out;
}

/** 組1つ分の割り付け（どの明細の、何人目からを載せるか） */
export interface DetailSlot {
  /** 明細の通し番号 */
  item: number;
  /** この組に載せる取得者の先頭の添字（0・3・6…） */
  base: number;
}

/**
 * 明細の一覧を様式の組へ割り付ける。`least` は用紙の枚数ぶんの組数（足りない分は空の明細で埋める）。
 */
export function detailSlots(items: readonly Values[], least: number): DetailSlot[] {
  const slots: DetailSlot[] = [];
  items.forEach((item, index) => {
    const groups = detailGroupCount(item);
    for (let g = 0; g < groups; g += 1) slots.push({ item: index, base: g * DETAIL_SHARES_PER_GROUP });
  });
  for (let index = items.length; slots.length < least; index += 1) slots.push({ item: index, base: 0 });
  return slots;
}

/**
 * 付表の「分割が確定した財産」を、財産を取得した人の番号ごとに合計する（円）。
 * 添字は番号そのもの（1始まり）。番号が空欄の明細は分割が確定していないので集計しない。
 */
export function sumDetails(details: Values[]): number[] {
  const byNumber: number[] = [];
  for (const item of details) {
    for (const { no, amount } of detailShares(item)) {
      byNumber[no] = (byNumber[no] ?? 0) + amount;
    }
  }
  return byNumber;
}

/**
 * 第11表2②（未分割財産の価額）。添字は財産を取得した人の番号（1始まり）。
 *
 * 未分割の財産＝付表の明細のうち「分割が確定した財産」に取得者が1人も入っていない行。
 * その価額の合計を、第11表2の（注）3のとおり各相続人が相続分に応じて取得するものとして按分する。
 *
 * ここで使う相続分は**民法上の相続分**（相法55条）であって、第2表④の法定相続分ではない。
 * 第2表④は放棄がなかったものとした場合の一覧で、養子の数の制限も受けているため、
 * 放棄や養子がいる相続では割合そのものが変わる。`deriveCivil` が別に求めている。
 * 円未満は切り捨て、差額は項番のいちばん若い相続人に寄せて合計を一致させる。
 */
export function computeUnsplit(details: Values[], civil: Values[]): number[] {
  const total = details.reduce((sum, item) => (
    detailShares(item).length > 0 ? sum : sum + num(item.value)
  ), 0);
  const shares: { no: number; share: number }[] = [];
  for (const row of civil) {
    const den = num(row.den);
    if (den <= 0) continue;
    shares.push({ no: Number(row.source) + 1, share: num(row.num) / den });
  }
  shares.sort((a, b) => a.no - b.no);
  const denominator = shares.reduce((s, x) => s + x.share, 0);
  const byNumber: number[] = [];
  if (total === 0 || denominator === 0) return byNumber;
  let rest = total;
  for (const { no, share } of shares) {
    const amount = Math.floor((total * share) / denominator);
    byNumber[no] = (byNumber[no] ?? 0) + amount;
    rest -= amount;
  }
  const first = shares[0]!.no;
  byNumber[first] = (byNumber[first] ?? 0) + rest;
  return byNumber;
}
