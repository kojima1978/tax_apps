/**
 * 第1表・第1表（続）・第2表・第11表の自動計算。
 *
 * 【単位の扱い】
 * 様式には末尾の「000」「00」があらかじめ印字されている欄がある（⑥・Ⓑ・⑦・⑰・⑳・㉑・㉔）。
 * これらは切り捨て後の上位桁だけを記入する欄なので、状態にも上位桁だけを保持し、
 * 計算に使うときだけ SCALE 倍して円に戻す。表示と保存が様式の記載どおりに揃う。
 *
 * 【様式間の転記】
 * 第1表のⒷ・⑦・法定相続人の数は第2表からの転記欄。手入力させず totals（'t.' スコープ）に置き、
 * 両様式の同じキーを参照させることで転記のずれが起きないようにしている。
 * 第1表①は第11表2③からの転記欄。こちらは人ごとの欄なので相続人の値（'h0.' スコープ）に
 * 置き、第11表を使用する間だけ ① を ③ で上書きして読み取り専用にする。
 * 第11表2①は付表（財産の明細書）からの転記欄。付表の「分割が確定した財産」を
 * 「財産を取得した人の番号」ごとに合計する。番号は第11表の項番＝入力順の通し番号。
 */

import { ERA_BASE_YEAR } from '../data/codes';
import { formatCommaInteger, formatCommaNumber } from './format';
import { DETAIL_KINDS, codeNames } from '../data/detailCodes';
import { TABLE112_ROWS } from '../forms/table112';
import { TABLE1112F1_RATE } from '../forms/table1112f1';
import { SLOTS_BY_KIND, SLOTS_BY_ROW, TABLE1112F1B_OWNERS, TABLE1112F1B_ROWS } from '../forms/table1112f1b';
import {
  TABLE13_DEBT_FORM, TABLE13_DEBT_ROWS, TABLE13_FUNERAL_FORM, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS,
} from '../forms/table13';
import { TABLE10_DETAIL_FORM, TABLE10_ROWS } from '../forms/table10';
import { TABLE5_FLOOR } from '../forms/table5';
import {
  TABLE6_COLS, TABLE6_DISABLED_AGE, TABLE6_DISABLED_RATE, TABLE6_MINOR_AGE, TABLE6_MINOR_RATE, TABLE6_SPECIAL_RATE,
} from '../forms/table6';
import { TABLE4_PERSONS, TABLE4_RATE } from '../forms/table4';
import { TABLE42_BLOCKS, TABLE42_CREDIT_ROWS, TABLE42_PERSONS } from '../forms/table42';
import { TABLE7_ROWS, TABLE7_SPAN } from '../forms/table7';
import { TABLE9_DETAIL_FORM, TABLE9_ROWS } from '../forms/table9';
import { TABLE88_CREDIT_ROWS, TABLE88_DEFERRAL_ROWS, TABLE88_PERSONS } from '../forms/table88';
import {
  TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_FORM, TABLE14_DONATION_ROWS,
  TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS, TABLE14_PERSONS,
} from '../forms/table14';
import { TABLE15_KEYS, TABLE15_KEY_BY_MARK, table15Key } from '../forms/table15';
import { RATE_BRACKETS } from '../forms/table2';
import { DISABILITY_GENERAL, DISABILITY_SPECIAL } from '../forms/person';
import {
  SUBSTITUTE_CHILD, SUBSTITUTE_SIBLING, adoptionCounted, autoLawfulShares, civilShares,
  type Member, type Share,
} from './lawfulShare';

export type Values = Record<string, string>;

const ERA_START_YEARS: Record<string, number> = {
  '1': 1868,
  '2': 1912,
  '3': 1926,
  '4': 1989,
  '5': 2019,
};

/** 相続開始日当日の満年齢。日付が不足・不正な場合は空欄にする。 */
function ageAtInheritanceStart(common: Values, heir: Values): number | undefined {
  const startEra = ERA_START_YEARS[common.startEra ?? ''];
  const birthEra = ERA_START_YEARS[heir.birthEra ?? ''];
  const startY = num(common.startY);
  const startM = num(common.startM);
  const startD = num(common.startD);
  const birthY = num(heir.birthY);
  const birthM = num(heir.birthM);
  const birthD = num(heir.birthD);
  if (startEra === undefined || birthEra === undefined
    || startY < 1 || birthY < 1 || startM < 1 || startD < 1 || birthM < 1 || birthD < 1) return undefined;

  const startYear = startEra + startY - 1;
  const birthYear = birthEra + birthY - 1;
  const validDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (!validDate(startYear, startM, startD) || !validDate(birthYear, birthM, birthD)) return undefined;

  let age = startYear - birthYear;
  if (startM < birthM || (startM === birthM && startD < birthD)) age -= 1;
  return age >= 0 ? age : undefined;
}

/**
 * 第6表② 控除額と、その計。様式に「0,000」まで印字されているので万円単位で保持する。
 * 未成年者（m）・障害者（d）の各3列＋計で8欄あるので、キーは組み立てて作る。
 */
const TABLE6_SCALE = Object.fromEntries(
  ['m', 'd'].flatMap((k) => [
    `t6${k}T2`,
    ...Array.from({ length: TABLE6_COLS }, (_, i) => `t6${k}${i}v2`),
  ]).map((key) => [key, 10000]),
);

/** 上位桁のみ記入する欄（値 × SCALE ＝ 円） */
export const SCALE: Record<string, number> = {
  ...TABLE6_SCALE,
  v6: 1000,      // ⑥ 課税価格（1,000円未満切捨て）
  tB: 1000000,   // Ⓑ 遺産に係る基礎控除額
  t7: 100,       // ⑦ 相続税の総額 ＝ 第2表⑧
  t11: 100,      // 第2表⑪ 相続税の総額（農業投資価格による）
  v17: 100,      // ⑰ 相続時精算課税分の贈与税額控除額
  v20: 100,      // ⑳ 納税猶予税額
  v21: 100,      // ㉑ 申告期限までに納付すべき税額
  v24: 100,      // ㉔ 納税猶予税額（この修正前の）
  t15v38: 1000,  // 第15表㊳ 課税価格（1,000円未満切捨て）
  t5s1v6: 1000,  // 第5表⑥ 配偶者の税額軽減額を計算する場合の課税価格（1,000円未満切捨て）
  t5s2v6: 1000,  // 第5表⑯ 同上（農業相続人がいる場合）
  t5a3: 1000,    // 第5表 第3表のⒶの金額（課税価格の合計額）
  t5v17: 100,    // 第5表⑰ 第3表の⑦の金額（相続税の総額）
  t9A: 1000000,  // 第9表Ⓐ 保険金の非課税限度額（百万円単位で記入する）
  t10A: 1000000, // 第10表Ⓐ 退職手当金などの非課税限度額（百万円単位で記入する）
  // 第2表①②③欄
  k2: 1000,      // ㋭ 第3表の課税価格の合計額
  k4: 10000,     // ㋩ 遺産に係る基礎控除額（万円単位で記入する）
  k5: 1000,      // ㋥ 課税遺産総額
  k6: 1000,      // ㋬ 農業投資価格による課税遺産総額
};

/** 文字列（カンマ・△付き）を数値に。空欄は 0。 */
export function num(v: string | undefined): number {
  if (!v) return 0;
  const raw = v.replace(/,/g, '').replace(/△/g, '-').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** 数値を欄の保存形式（符号なし整数文字列）に。0 は空欄のままにせず 0 を表示する。 */
function str(n: number): string {
  return String(Math.trunc(n));
}

/** 還付欄など △ を許す欄の保存形式 */
function signed(n: number): string {
  const t = Math.trunc(n);
  return t < 0 ? `△${Math.abs(t)}` : String(t);
}

/** 円に戻した値を取り出す（上位桁のみの欄は SCALE 倍） */
export function yen(values: Values, key: string): number {
  return num(values[key]) * (SCALE[key] ?? 1);
}

/** 「入力されているか」— 0 と未入力を区別する（⑩の有無で⑯の算式が変わるため） */
function filled(values: Values, key: string): boolean {
  return (values[key] ?? '').trim() !== '';
}

/** 100円未満切捨て（黒字のときのみ。赤字はそのまま） */
function truncHundred(n: number): number {
  return n > 0 ? Math.floor(n / 100) * 100 : n;
}

/** 第11の2表の枚数（その人1人分）。1枚に6行しか無いので、精算課税の贈与が多い人は増やす。 */
export function table112Pages(h: Values): number {
  return Math.max(1, Math.trunc(num(h.t112Pages)) || 1);
}

/**
 * その人に相続時精算課税適用財産の記入があるか。
 * 「入力が1つも無い人の第11の2表は印刷しない」の判定に使う（氏名は自動転記なので数えない）。
 */
export function hasTable112(h: Values): boolean {
  return Object.entries(h).some(
    ([k, v]) => k.startsWith('t112') && k !== 't112Pages' && (v ?? '').trim() !== '',
  );
}

/**
 * 第11の2表1（相続時精算課税適用財産の明細）の計算。値はその人の欄（'h0.' スコープ）に持つ。
 *
 * 行数はその人の用紙の枚数で決まる（`t112Pages`）。枚数を減らしたときに残る入力値を
 * 合計に混ぜないよう、表に出ている行番号だけを走査する（値そのものは消さないので、
 * 枚数を戻せば元の記入内容が戻る）。
 * ⑧⑨⑩はその人の全枚数を通した合計で、表示は最終ページにだけ出す。
 */
function computeTable112(h: Values): Values {
  const out: Values = {};
  let sum5 = 0;
  let sum6 = 0;
  let sum7 = 0;
  let any = false;
  for (let i = 0; i < table112Pages(h) * TABLE112_ROWS; i += 1) {
    // ⑤ 相続時精算課税適用財産の価額（③−④）（赤字のときは0）
    const has3or4 = (h[`t112a${i}`] ?? '').trim() !== '' || (h[`t112b${i}`] ?? '').trim() !== '';
    const v5 = Math.max(0, num(h[`t112a${i}`]) - num(h[`t112b${i}`]));
    out[`t112c${i}`] = has3or4 ? str(v5) : '';
    sum5 += v5;
    sum6 += num(h[`t112d${i}`]);
    sum7 += num(h[`t112e${i}`]);
    any ||= has3or4 || (h[`t112d${i}`] ?? '').trim() !== '' || (h[`t112e${i}`] ?? '').trim() !== '';
  }
  out.t112v8 = any ? str(sum5) : '';
  out.t112v9 = any ? str(sum6) : '';
  out.t112v10 = any ? str(sum7) : '';
  return out;
}

/** 末尾の空行を除いた件数（打って消しただけの行は用紙を増やす理由にならない） */
function filledLength(rows: readonly Values[] | undefined): number {
  let n = 0;
  (rows ?? []).forEach((row, i) => { if (!isEmptyDetail(row)) n = i + 1; });
  return n;
}

/**
 * 第13表の最低枚数。1枚に債務4件・葬式費用5件・人4人しか載らないので、
 * 人数と入力済みの明細の件数から決まる。**これより少ない枚数には減らせない**
 * （減らせてしまうと、用紙に出ていない行が集計にだけ効く）。
 */
export function table13MinPages(heirs: number, details: Record<string, Values[]>): number {
  return Math.max(
    1,
    Math.ceil(heirs / TABLE13_PERSONS),
    Math.ceil(filledLength(details[TABLE13_DEBT_FORM]) / TABLE13_DEBT_ROWS),
    Math.ceil(filledLength(details[TABLE13_FUNERAL_FORM]) / TABLE13_FUNERAL_ROWS),
  );
}

/** 第13表の枚数。明細の枚数（共通欄 `t13Pages`）と最低枚数の大きい方をとる。 */
export function table13Pages(common: Values, heirs: number, details: Record<string, Values[]>): number {
  const explicit = Math.max(1, Math.trunc(num(common.t13Pages)) || 1);
  return Math.max(explicit, table13MinPages(heirs, details));
}

/** 第13表1・2の明細の集計 */
interface Table13 {
  /** 人の番号（1始まり）ごとの 3① 負担することが確定した債務 */
  debt: number[];
  /** 同 3④ 負担することが確定した葬式費用 */
  funeral: number[];
  /** 1の合計（G09） */
  debtTotal: number;
  /** 2の合計（G20） */
  funeralTotal: number;
}

/**
 * 第13表1（債務の明細）・2（葬式費用の明細）を集計する。値は明細の配列（`details`）に持つ。
 *
 * 合計欄は「金額」列の合計で、負担する人が決まっていない債務も含まれる。
 * 3①④は「負担する金額」を負担する人ごとに合計したもの。負担する人の欄は選択式で、
 * ここへ来る時点では `resolveHeirRefs` が「何人目か」へ直してある。
 * 用紙に出ていない行は存在しない（枚数が明細の件数より少なくならない）ので、全件を走査する。
 */
function computeTable13(details: Record<string, Values[]>): Table13 {
  const out: Table13 = { debt: [], funeral: [], debtTotal: 0, funeralTotal: 0 };
  const scan = (form: string, by: number[]): number => {
    let total = 0;
    for (const row of details[form] ?? []) {
      total += num(row.amt);
      const no = num(row.who);
      if (no > 0) by[no] = (by[no] ?? 0) + num(row.share);
    }
    return total;
  };
  out.debtTotal = scan(TABLE13_DEBT_FORM, out.debt);
  out.funeralTotal = scan(TABLE13_FUNERAL_FORM, out.funeral);
  return out;
}

/**
 * 明細を持つ様式の最低枚数。**これより少ない枚数には減らせない**
 * （減らせてしまうと、用紙に出ていない行が集計にだけ効く）。
 */
function detailMinPages(details: Record<string, Values[]>, form: string, rowsPerPage: number): number {
  return Math.max(1, Math.ceil(filledLength(details[form]) / rowsPerPage));
}

/** 第9表の最低枚数（1枚に明細5件） */
export function table9MinPages(details: Record<string, Values[]>): number {
  return detailMinPages(details, TABLE9_DETAIL_FORM, TABLE9_ROWS);
}

/** 第9表の枚数。1枚に明細5件・相続人5人しか載らないので、足りなければ用紙を増やす。 */
export function table9Pages(common: Values, details: Record<string, Values[]>): number {
  return Math.max(Math.trunc(num(common.t9Pages)) || 1, table9MinPages(details));
}

/**
 * 第4表の枚数。1枚に加算の対象となる人4人分。
 * 2割加算の対象になるかどうかは続柄だけでは決まらないので、人数からは決めず −／＋ で増減する。
 */
export function table4Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t4Pages)) || 1);
}

/**
 * 第4表の2の枚数。1枚に控除を受ける人3人分。
 * 第4表と同じく、贈与税を納めているかどうかは相続人の一覧からは分からないので −／＋ で増減する。
 */
export function table42Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t42Pages)) || 1);
}

/**
 * 第14表の最低枚数。1枚に1の明細4件・2の明細2件・3の明細2件。
 * 枚数は3つの節で1つなので、いちばん足りていない節に合わせる。
 */
export function table14MinPages(details: Record<string, Values[]>): number {
  return Math.max(
    detailMinPages(details, TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS),
    detailMinPages(details, TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS),
    detailMinPages(details, TABLE14_DONATION_FORM, TABLE14_DONATION_ROWS),
  );
}

/**
 * 第14表の枚数。1枚に1の明細4件・④4人・2の明細2件・3の明細2件。
 * ④は明細から件数が決まらない（同じ人が何行も持てる）ので、
 * 件数だけでは決めず −／＋ で増やせるようにし、明細が載り切る枚数を下限にする。
 */
export function table14Pages(common: Values, details: Record<string, Values[]>): number {
  return Math.max(Math.trunc(num(common.t14Pages)) || 1, table14MinPages(details));
}

/**
 * 第14表の確認欄（特定贈与財産）の「受贈財産の番号」を、1の明細の並べ替えに追従させる。
 *
 * この番号だけは行を外から名指ししている。手で書いた番号なので、行が動いた後もそのまま残ると
 * 別の財産を指したまま気付けない。確認欄は用紙ごとに1つなので、指す行が別の用紙へ移ったときは
 * 確認欄そのものをその用紙へ移す。
 *
 * @param indexOf 並べ替え前の添字 → 並べ替え後の添字
 */
export function remapTable14Confirm(common: Values, indexOf: (from: number) => number): Values {
  const entries = Object.keys(common)
    .map((key) => /^t14c(\d+)No$/.exec(key))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .filter((page) => num(common[`t14c${page}No`]) > 0)
    .map((page) => ({
      page,
      spouse: common[`t14c${page}Spouse`] ?? '',
      to: indexOf(page * TABLE14_GIFT_ROWS + num(common[`t14c${page}No`]) - 1),
    }));
  if (entries.length === 0) return common;

  const out = { ...common };
  for (const entry of entries) {
    delete out[`t14c${entry.page}No`];
    delete out[`t14c${entry.page}Spouse`];
  }
  const taken = new Set<number>();
  for (const entry of entries) {
    const page = Math.trunc(entry.to / TABLE14_GIFT_ROWS);
    if (taken.has(page)) {
      // 1枚に確認欄は1つしかない。氏名は元の用紙に残し、行き先の分からなくなった番号だけ空ける
      if (out[`t14c${entry.page}Spouse`] === undefined) out[`t14c${entry.page}Spouse`] = entry.spouse;
      continue;
    }
    taken.add(page);
    out[`t14c${page}Spouse`] = entry.spouse;
    out[`t14c${page}No`] = String((entry.to % TABLE14_GIFT_ROWS) + 1);
  }
  return out;
}

/**
 * 第8の8表の枚数。1枚に2人分（1・2とも同じ2人）。
 * 税額控除も納税猶予も相続人の一覧からは対象者が決まらないので、件数からは導出せず −／＋ で増減する。
 */
export function table88Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t88Pages)) || 1);
}

/** 第10表の最低枚数（1枚に明細5件） */
export function table10MinPages(details: Record<string, Values[]>): number {
  return detailMinPages(details, TABLE10_DETAIL_FORM, TABLE10_ROWS);
}

/** 第10表の枚数。第9表と同じく1枚に明細5件・相続人5人。 */
export function table10Pages(common: Values, details: Record<string, Values[]>): number {
  return Math.max(Math.trunc(num(common.t10Pages)) || 1, table10MinPages(details));
}

/**
 * 相続人（相続の放棄をした人を除く）の項番（1始まり＝第11表の項番）。
 *
 * 相続税法12条1項6号・7号の非課税は「相続人の取得した」ものだけが対象なので、
 * 受遺者など相続人以外を除くために使う。相続人かどうかは、その人に「法定相続人」の印
 * （`isLawful`）が付いているかで判定し、放棄した人は相続人ではないので除く。
 *
 * 養子の数の制限（相法15条2項）はここでは効かせない。制限は非課税限度額を出すための
 * 「法定相続人の数」に掛かるものであって、制限で数から外れた養子も相続人ではあるため、
 * その人が受け取った保険金・退職手当金は非課税の対象になる。
 */
function heirNosOfLawfulHeirs(heirs: readonly Values[]): Set<number> {
  const out = new Set<number>();
  heirs.forEach((heir, index) => {
    if (heir.isLawful === '1' && heir.renounced !== '1') out.add(index + 1);
  });
  return out;
}

/**
 * 第9表2・第10表2（課税される金額の計算）。様式が違うだけで算式は完全に同一なので1本にまとめる。
 * 1・2とも様式全体の一覧なので入力は共通欄（'c.' スコープ）に持ち、自動計算の結果だけを返す。
 *
 * 2は1の明細から丸ごと導出する（手入力は無い）。1の各明細の「受取人の氏名」と金額を人ごとに
 * 合計し、そのうち**相続人の分だけ**を項番順に並べたものが2の氏名欄と①になる
 * （相続税法12条1項6号・7号。相続人以外は非課税の対象外で、1の（注）2のとおり
 * その金額をそのまま第11表の付表4へ書く）。
 *
 * Ⓐ 非課税限度額 ＝ 500万円 × 法定相続人の数（第2表㋺からの転記）。
 * 様式に「,000,000」が印字されている欄なので百万円単位で保持する。
 * Ⓑ（①の合計）がⒶ以下なら①がそのまま②の非課税金額になり、超えるときはⒶを①で按分する
 * （1円未満切捨て）。③は①−②。
 *
 * @param rows 1の明細（`details` の配列。1行が1要素）。使うのは `who` と `amt`
 * @param p 出力するフィールドの接頭辞（'t9' または 't10'）。`${p}A` `${p}B`
 *   `${p}r{i}No` `${p}r{i}v1` `${p}r{i}v2` `${p}r{i}v3` `${p}v2Total` `${p}v3Total`
 */
/** 第9表・第10表 2 の1行分（受取人ごとの ①受取金額・②非課税金額・③課税金額） */
interface NonTaxableRow {
  /** 受取人の番号（第11表の項番＝入力順の通し番号） */
  no: number;
  v1: number;
  v2: number;
  v3: number;
}

/**
 * 1の明細を受取人ごとに合計し、非課税限度額Ⓐで按分して①②③を出す（項番順）。
 * 対象は法定相続人だけで、相続人以外が受け取った分はここに出てこない
 * （相続税法12条1項6号・7号。非課税の対象外なので全額が課税される）。
 *
 * 用紙に出ていない行は存在しない（枚数が明細の件数より少なくならない）ので、全件を走査する。
 */
function nonTaxableByHeir(
  rows: readonly Values[], heirs: readonly Values[], p: string, heirCount: number,
): NonTaxableRow[] {
  const lawfulHeirs = heirNosOfLawfulHeirs(heirs);
  const byNo = new Map<number, number>();
  for (const detail of rows) {
    const no = num(detail.who);
    if (no <= 0 || !lawfulHeirs.has(no)) continue;
    byNo.set(no, (byNo.get(no) ?? 0) + num(detail.amt));
  }
  const listed = [...byNo.keys()].sort((a, b) => a - b);
  const limit = (heirCount > 0 ? 5 * heirCount : 0) * (SCALE[`${p}A`] ?? 1);
  const b = listed.reduce((s, no) => s + (byNo.get(no) ?? 0), 0);
  return listed.map((no): NonTaxableRow => {
    const v1 = byNo.get(no) ?? 0;
    const v2 = b <= limit ? v1 : Math.floor((limit * v1) / b);
    return { no, v1, v2, v3: v1 - v2 };
  });
}

function computeNonTaxableLimit(
  rows: readonly Values[], heirs: readonly Values[], p: string, pages: number, rowsPerPage: number,
  heirCount: number,
): Values {
  const out: Values = {};
  // Ⓐ（百万円単位）。法定相続人が未入力のうちは空欄のままにする。
  const aMillion = heirCount > 0 ? 5 * heirCount : 0;
  out[`${p}A`] = aMillion > 0 ? str(aMillion) : '';

  const listed = nonTaxableByHeir(rows, heirs, p, heirCount);
  const b = listed.reduce((s, row) => s + row.v1, 0);
  let sum2 = 0;
  let sum3 = 0;
  for (let i = 0; i < pages * rowsPerPage; i += 1) {
    const row = listed[i];
    if (row === undefined) {
      out[`${p}r${i}No`] = '';
      out[`${p}r${i}v1`] = '';
      out[`${p}r${i}v2`] = '';
      out[`${p}r${i}v3`] = '';
      continue;
    }
    out[`${p}r${i}No`] = str(row.no);
    out[`${p}r${i}v1`] = str(row.v1);
    out[`${p}r${i}v2`] = str(row.v2);
    out[`${p}r${i}v3`] = str(row.v3);
    sum2 += row.v2;
    sum3 += row.v3;
  }
  out[`${p}B`] = b === 0 ? '' : str(b);
  out[`${p}v2Total`] = b === 0 ? '' : str(sum2);
  out[`${p}v3Total`] = b === 0 ? '' : str(sum3);
  return out;
}

/** 他の様式から転記された明細に付く印（値は転記元の様式ID）。この印がある明細は手で直せない */
export const DETAIL_SOURCE = 'sourceForm';

/** 第9表・第10表 1 の明細 → 第11表の付表4 の明細（1行が1明細） */
const TRANSFER_TO_F4 = [
  { form: 'table9', detailForm: TABLE9_DETAIL_FORM, prefix: 't9', kindCode: '71' },
  { form: 'table10', detailForm: TABLE10_DETAIL_FORM, prefix: 't10', kindCode: '74' },
] as const;

/**
 * 第9表（生命保険金など）・第10表（退職手当金など）の明細を第11表の付表4へ転記する。
 *
 * 価額に入るのは課税される部分だけ。法定相続人は同表2③（＝①−②非課税金額）を、
 * その人の行へ受取金額の比で割り振る（端数は先頭の行へ寄せる。取得者ごとの按分と同じ扱い）。
 * 法定相続人以外は非課税の対象外なので受取金額をそのまま転記する（第9表1（注）2）。
 * 全額が非課税になる行は課税価格に入らないので明細を作らない。
 */
function derivedTable11f4(
  details: Record<string, Values[]>, heirs: readonly Values[], heirCount: number,
): Values[] {
  const kindNames = codeNames(DETAIL_KINDS.table11f4 ?? []);
  const out: Values[] = [];
  for (const t of TRANSFER_TO_F4) {
    const rows = details[t.detailForm] ?? [];
    const byNo = new Map(nonTaxableByHeir(rows, heirs, t.prefix, heirCount).map((row) => [row.no, row]));
    /** 行の添字 → 価額 */
    const values = new Map<number, number>();
    /** 受取人 → その人の先頭の行の添字 */
    const first = new Map<number, number>();
    /** 受取人 → 割り振りの残り（端数） */
    const rest = new Map<number, number>();
    rows.forEach((row, i) => {
      const no = num(row.who);
      const amt = num(row.amt);
      if (no <= 0 || amt === 0) return;
      const taxed = byNo.get(no);
      if (taxed === undefined) {
        values.set(i, amt);
        return;
      }
      const value = taxed.v1 === 0 ? 0 : Math.floor((taxed.v3 * amt) / taxed.v1);
      values.set(i, value);
      if (!first.has(no)) {
        first.set(no, i);
        rest.set(no, taxed.v3);
      }
      rest.set(no, (rest.get(no) ?? 0) - value);
    });
    for (const [no, remainder] of rest) {
      const i = first.get(no);
      if (i === undefined || remainder === 0) continue;
      values.set(i, (values.get(i) ?? 0) + remainder);
    }
    rows.forEach((row, i) => {
      const value = values.get(i) ?? 0;
      if (value === 0) return;
      out.push({
        [DETAIL_SOURCE]: t.form,
        kindCode: t.kindCode,
        kind: kindNames[t.kindCode] ?? '',
        assetName: row.name ?? '',
        place: row.addr ?? '',
        value: str(value),
        who0: str(num(row.who)),
        amount0: str(value),
      });
    });
  }
  return out;
}

/**
 * 第15表（相続財産の種類別価額表）のうち、様式に算式が印字されている行を計算する。
 *
 * ①〜㉘は付表からの転記（`sumTable15` が入れる）、㉛㉝㉞㊲は他の様式からの転記で、
 * 手入力が残るのは⑧⑨（⑥のうち特例農地等）だけ（㊲は第14表を使わないときのみ手入力）。
 * 値はその人の欄（'h0.' スコープ）に持ち、「各人の合計」列は横計（`TOTAL_ROWS`）で作る。
 */
function computeTable15(h: Values): Values {
  const out: Values = {};
  const raw = (n: number): string => out[table15Key(n)] ?? h[table15Key(n)] ?? '';
  const val = (n: number): number => num(raw(n));
  const any = (ns: number[]): boolean => ns.some((n) => raw(n).trim() !== '');
  /** 算式に使う欄が1つも埋まっていない行は、0ではなく空欄のままにする */
  const sum = (dst: number, src: number[]): void => {
    out[table15Key(dst)] = any(src) ? signed(src.reduce((s, n) => s + val(n), 0)) : '';
  };

  sum(6, [1, 2, 3, 4, 5]);                // ⑥ 土地の計（⑦は③の内数なので加えない）
  sum(16, [12, 13, 14, 15]);              // ⑯ 事業（農業）用財産の計
  sum(22, [17, 18, 19, 20, 21]);          // ㉒ 有価証券の計
  sum(29, [25, 26, 27, 28]);              // ㉙ その他の財産の計
  sum(30, [6, 10, 16, 22, 23, 24, 29]);   // ㉚ 合計
  sum(32, [6, 10, 12, 17, 18, 27]);       // ㉜ 不動産等の価額
  sum(35, [33, 34]);                      // ㉟ 債務等の合計

  // ㊱ 差引純資産価額（㉚＋㉛−㉟）（赤字のときは0）
  const v36 = Math.max(0, val(30) + val(31) - val(35));
  out[table15Key(36)] = any([30, 31, 35]) ? str(v36) : '';
  // ㊳ 課税価格（㊱＋㊲）（1,000円未満切捨て）— 様式の「000」に合わせ千円単位で保持
  out[table15Key(38)] = any([36, 37]) ? str(Math.floor((v36 + val(37)) / 1000)) : '';
  return out;
}

/** どの様式を使っているか（使う様式によって第1表の転記欄が変わる） */
export interface UsedForms {
  /** 第11表を使用する（＝第1表①を第11表2③から転記して読み取り専用にする） */
  table11?: boolean;
  /** 第11の2表を使用する（＝第1表②⑰を第11の2表1⑧⑨から転記して読み取り専用にする） */
  table112?: boolean;
  /** 第13表を使用する（＝第1表③を第13表3⑦から転記して読み取り専用にする） */
  table13?: boolean;
}

/**
 * 相続人1人分の計算。手入力欄はそのままに、算出欄だけを上書きした新しい値を返す。
 * @param total7 ⑦相続税の総額（円）
 * @param totalA Ⓐ課税価格の合計額（円）
 */
export function computeHeir(h: Values, total7: number, totalA: number, forms: UsedForms = {}): Values {
  const out: Values = { ...h, ...computeTable112(h) };
  const has = (...vals: (string | undefined)[]) => vals.some((v) => (v ?? '').trim() !== '');
  /** 算式に使う欄が1つも埋まっていない行は、0ではなく空欄のままにする（白紙の様式を0で埋めない） */
  const show = (n: number, present: boolean) => (present ? str(n) : '');

  // 第11表2 ③ 取得財産の価額（①＋②）。第11表を使う場合は第1表①がこれの転記欄になる。
  // 代償財産を支払う人は①が負数になり得る（記載例62ページ）ので △ を保てる形式で持つ。
  const hasT11 = has(h.t11v1, h.t11v2);
  out.t11v3 = hasT11 ? signed(num(h.t11v1) + num(h.t11v2)) : '';
  if (forms.table11) out.v1 = out.t11v3;

  // 第1表② ← 第11の2表1⑧（円）／ 第1表⑰ ← 同⑨（⑰は百円単位の欄なので100で割る）
  if (forms.table112) {
    out.v2 = out.t112v8;
    out.v17 = out.t112v9 === '' ? '' : str(num(out.t112v9) / 100);
  }

  // 第13表3 ③計（①＋②）・⑥計（④＋⑤）・⑦合計（③＋⑥）。①④は1・2の明細からの転記。
  out.t13v3 = show(num(h.t13v1) + num(h.t13v2), has(h.t13v1, h.t13v2));
  out.t13v6 = show(num(h.t13v4) + num(h.t13v5), has(h.t13v4, h.t13v5));
  out.t13v7 = show(num(out.t13v3) + num(out.t13v6), has(out.t13v3, out.t13v6));
  // 第1表③ ← 第13表3⑦
  if (forms.table13) out.v3 = out.t13v7;

  // 第15表㉛ ← 第11の2表1⑧ ／ ㉝ ← 第13表3③ ／ ㉞ ← 第13表3⑥
  if (forms.table112) out[table15Key(31)] = out.t112v8 ?? '';
  if (forms.table13) {
    out[table15Key(33)] = out.t13v3;
    out[table15Key(34)] = out.t13v6;
  }
  Object.assign(out, computeTable15(out));

  // ④ 純資産価額（①＋②−③）（赤字のときは0）
  const v4 = Math.max(0, num(out.v1) + num(out.v2) - num(out.v3));
  out.v4 = show(v4, has(out.v1, out.v2, out.v3));

  // ⑥ 課税価格（④＋⑤）（1,000円未満切捨て） — 様式の「000」に合わせ千円単位で保持
  const v6yen = Math.floor((v4 + num(h.v5)) / 1000) * 1000;
  out.v6 = show(v6yen / 1000, has(out.v4, h.v5));

  // ⑧ あん分割合（各人の⑥／Ⓐ）。全員の合計が1.00になる端数調整値が渡された場合はそれを使う。
  // v8a は computeAll 内だけで使う一時値で、保存データの旧手入力値（v8/v8m）は計算に採用しない。
  out.v8 = totalA > 0 && has(out.v6)
    ? h.v8a ?? (v6yen / totalA).toFixed(2)
    : '';
  const v8 = num(out.v8);

  // ⑨ 算出税額（⑦×各人の⑧）— 円未満切捨て
  out.v9 = show(Math.floor(total7 * v8), total7 > 0 && has(out.v8));

  // ⑮ 計（⑫＋⑬＋⑭）
  const v15 = num(h.v12) + num(h.v13) + num(h.v14);
  out.v15 = show(v15, has(h.v12, h.v13, h.v14));

  // ⑯ 差引税額（⑨＋⑪−⑮）又は（⑩＋⑪−⑮）（赤字のときは0）
  //    ⑩（農地等納税猶予の適用を受ける場合の算出税額）が記入されていればそちらを使う
  const base = filled(h, 'v10') ? num(h.v10) : num(out.v9);
  const v16 = Math.max(0, base + num(h.v11) - v15);
  out.v16 = show(v16, has(out.v9, h.v10, h.v11, out.v15));

  // ⑲ 小計（⑯−⑰−⑱）（黒字のときは100円未満切捨て）
  const v19 = truncHundred(v16 - yen(out, 'v17') - num(h.v18));
  out.v19 = show(v19, has(out.v16, out.v17, h.v18));

  // ㉑ 申告期限までに納付すべき税額／㉒ 還付される税額（⑲−⑳）
  const payable = v19 - yen(h, 'v20');
  const hasPayable = has(out.v19, h.v20);
  out.v21 = hasPayable && payable > 0 ? str(payable / 100) : '';
  out.v22 = hasPayable && payable < 0 ? str(-payable) : '';

  // ㉖ 小計の増加額（⑲−㉓）
  out.v26 = show(v19 - num(h.v23), has(out.v19, h.v23));

  // ㉗ この申告により納付すべき税額又は還付される税額（（㉑又は㉒）−㉕）
  //    還付は頭に△。黒字のときは100円未満切捨て（記載要領等 修正申告の場合 3）
  out.v27 = has(out.v21, out.v22, h.v25) ? signed(truncHundred(payable - num(h.v25))) : '';

  return out;
}

/** 「各人の合計」列に横計で集計する欄（Ⓐ＝⑥は千円単位のまま合計してよい） */
const TOTAL_ROWS: readonly string[] = [
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24', 'v25', 'v26',
  // 第13表3の「各人の合計」列
  't13v1', 't13v2', 't13v3', 't13v4', 't13v5', 't13v6', 't13v7',
  // 第15表の「各人の合計」列（①〜㊳。㊳は千円単位のまま合計してよい）
  ...TABLE15_KEYS,
];

/** △表示のまま合計する欄（還付額・差引額） */
const SIGNED_TOTAL_ROWS = ['v27'] as const;

/**
 * 相続税の速算表で税額（円）を求める。
 * @param thousand 法定相続分に応ずる取得金額（千円単位）
 */
export function rateTax(thousand: number): number {
  if (thousand <= 0) return 0;
  const bracket = RATE_BRACKETS.find((b) => thousand <= b.limit)!;
  return Math.max(0, Math.floor(thousand * 1000 * bracket.rate) - bracket.deduction * 1000);
}

/** 第2表の計算結果 */
interface Table2 {
  /** 法定相続人ごとの⑥⑦⑨⑩ */
  lawful: Values[];
  /** ㋺㋩㋥㋬・Ⓐ・⑧・⑪ と、第1表へ転記するⒷ・⑦ */
  totals: Values;
}

/** ⑤の分子・分母を約分しながら正確に合算し、入力済みの場合だけ合計1かを返す。 */
function lawfulShareIsOne(lawful: Values[]): boolean | undefined {
  let sumNumerator = 0n;
  let sumDenominator = 1n;
  let hasInput = false;

  for (const row of lawful) {
    const numeratorText = (row.num ?? '').trim();
    const denominatorText = (row.den ?? '').trim();
    if (numeratorText === '' && denominatorText === '') continue;
    hasInput = true;
    if (!/^\d+$/.test(numeratorText) || !/^\d+$/.test(denominatorText)) return false;

    const numerator = BigInt(numeratorText);
    const denominator = BigInt(denominatorText);
    if (denominator === 0n) return false;
    sumNumerator = sumNumerator * denominator + numerator * sumDenominator;
    sumDenominator *= denominator;

    let a = sumNumerator;
    let b = sumDenominator;
    while (b !== 0n) [a, b] = [b, a % b];
    if (a !== 0n) {
      sumNumerator /= a;
      sumDenominator /= a;
    }
  }

  return hasInput ? sumNumerator === sumDenominator : undefined;
}

/**
 * 第2表④の一覧を「財産を取得した人」から作る。
 *
 * ④は人の一覧なので、誰を載せるかは人に付ける印（`isLawful`）で決め、行の側では持たない。
 * 並びは登録順。氏名・続柄・放棄は第1表の最新値をそのまま指す。
 *
 * ⑤法定相続分は続柄と人数から自動で入れ、手入力（`lawNum`/`lawDen`）があればそちらを優先する
 * （消せば自動に戻る＝付表の価額と同じ扱い）。自動で決められない組み合わせは空欄のままにする。
 */
export interface LawfulMember {
  /** 何人目か（0始まり） */
  index: number;
  heir: Values;
  /** 法定相続人の数に算入されるか（相法15条2項の養子の数の制限） */
  counted: boolean;
}

/** 人物の欄から `lawfulShare` が見る事実を取り出す */
const memberOf = (heir: Values): Member => ({
  relation: heir.relation ?? '',
  renounced: heir.renounced === '1',
  realChild: heir.realChild === '1',
  substitute: heir.substitute === SUBSTITUTE_CHILD || heir.substitute === SUBSTITUTE_SIBLING
    ? heir.substitute : '',
  substituteFor: heir.substituteFor ?? '',
  halfBlood: heir.halfBlood === '1',
});

/**
 * 「法定相続人」の印が付いた人と、養子の数の制限（相法15条2項）の判定。
 * 制限で外れた養子も戻す（画面でそのことを知らせるため）。
 */
export function lawfulMembers(heirs: readonly Values[]): LawfulMember[] {
  const picked = heirs.flatMap((heir, index) => (heir.isLawful === '1' ? [{ heir, index }] : []));
  const counted = adoptionCounted(picked.map(({ heir }) => memberOf(heir)));
  return picked.map(({ heir, index }, i) => ({ index, heir, counted: counted[i] === true }));
}

/**
 * 表示する分数を決める。手入力があればそちらを使い、消せば自動候補に戻る（付表の価額と同じ扱い）。
 *
 * @param auto 自動候補。`undefined` は自動では決められない（手で入れてもらう）、
 *   `null` は自動で決めた結果「相続分なし」（放棄した人）
 * @returns `num` `den` と、自動候補が出せるか（`autoable`）・手入力で上書きしているか（`override`）
 */
function pickShare(auto: Share | null | undefined, manualNum: string, manualDen: string): Values {
  const manual = manualNum !== '' || manualDen !== '';
  const determined = auto !== undefined;
  if (manual || !determined) {
    return {
      num: manualNum,
      den: manualDen,
      autoable: determined ? '1' : '',
      override: manual && determined ? '1' : '',
    };
  }
  return {
    num: auto === null ? '' : str(auto.num),
    den: auto === null ? '' : str(auto.den),
    autoable: '1',
    override: '',
  };
}

export function deriveLawful(heirs: readonly Values[]): Values[] {
  const members = lawfulMembers(heirs).filter((member) => member.counted);
  const autos = autoLawfulShares(members.map(({ heir }) => memberOf(heir)));
  return members.map(({ heir, index }, i) => ({
    source: str(index),
    name: heir.name ?? '',
    rel: heir.relation ?? '',
    renounced: heir.renounced ?? '',
    ...pickShare(autos?.[i], (heir.lawNum ?? '').trim(), (heir.lawDen ?? '').trim()),
  }));
}

/**
 * 民法上の相続分。未分割の財産の按分（相法55条）にだけ使い、様式には印刷しない。
 *
 * 自動候補を出せるのは「法定相続人」の印が付いた人の分だけだが、行は全員分作る。
 * ある順位の血族が全員放棄すると相続人は次順位へ移り、その人は第2表④に載らない（＝印が無い）ので、
 * そういう場合でも手入力だけで相続分を持てるようにしておく。
 *
 * @param lawful 税法上の法定相続分（`deriveLawful`）。民法上の相続分が自動でも手入力でも
 *   決まらない人の按分に使う。放棄も養子の数の制限も無ければ両者は同じ値なので、
 *   続柄を入れずに第2表④の分数だけ手で入れた入力でも従来どおり按分できる
 */
export function deriveCivil(heirs: readonly Values[], lawful: readonly Values[]): Values[] {
  const lawByIndex = new Map(lawful.map((row) => [Number(row.source), row]));
  const picked = lawfulMembers(heirs);
  const autos = civilShares(picked.map(({ heir }) => memberOf(heir)));
  const autoByIndex = new Map<number, Share | null>();
  if (autos !== undefined) {
    picked.forEach(({ index }, i) => autoByIndex.set(index, autos[i] ?? null));
  }
  return heirs.map((heir, index) => {
    const row: Values = {
      source: str(index),
      name: heir.name ?? '',
      ...pickShare(
        autoByIndex.has(index) ? autoByIndex.get(index)! : undefined,
        (heir.civilNum ?? '').trim(),
        (heir.civilDen ?? '').trim(),
      ),
    };
    // 自動候補も手入力も無い（＝相続分が空のまま）人だけ、税法上の法定相続分で代える。
    // 放棄した人は自動で「相続分なし」と決まっている（autoable が立つ）ので代えない
    if (row.autoable === '1' || row.num !== '' || row.den !== '') return row;
    const law = lawByIndex.get(index);
    return law === undefined ? row : { ...row, num: law.num ?? '', den: law.den ?? '' };
  });
}

/**
 * 第2表（相続税の総額の計算書）。
 * @param lawful `deriveLawful` が作った法定相続人の一覧（載せる人はここで決まっている）
 * @param totalAThousand ㋑ 課税価格の合計額（＝第1表Ⓐ・千円単位）
 */
function computeTable2(lawful: Values[], totalAThousand: number): Table2 {
  const named = lawful.length;
  const totals: Values = {};
  // 第3表は未対応。保存済みの旧入力値も計算へ混ぜず、㋭は空欄・読み取り専用にする。
  totals.k2 = '';
  const shareIsOne = lawfulShareIsOne(lawful);
  totals.lawShareInvalid = shareIsOne === false ? '1' : '';
  totals.lawShareTotalDisplay = shareIsOne === false ? '1\n※合計が1ではありません' : '1';

  // ㋺ 法定相続人の数 ／ ㋩ 遺産に係る基礎控除額（3,000万円＋600万円×法定相続人の数・万円単位）
  const deduction = named > 0 ? 3000 + 600 * named : 0;
  totals.heirCount = named > 0 ? str(named) : '';
  totals.k4 = named > 0 ? str(deduction) : '';
  // Ⓑ（第1表）は百万円単位で記入する欄なので㋩（万円）を100で割る
  totals.tB = named > 0 ? str(deduction / 100) : '';

  // ㋥（㋑−㋩）／ ㋬（㋭−㋩）。基礎控除以下なら課税遺産は生じないので0とする。
  const gross3 = 0;
  const net = Math.max(0, totalAThousand - deduction * 10);
  const net3 = Math.max(0, gross3 - deduction * 10);
  totals.k5 = totalAThousand > 0 || named > 0 ? str(net) : '';
  totals.k6 = gross3 > 0 ? str(net3) : '';

  let sum7 = 0;
  let sum10 = 0;
  const rows = lawful.map((l): Values => {
    const den = num(l.den);
    const share = den > 0 ? num(l.num) / den : 0;
    const active = share > 0;
    // ⑥⑨ 法定相続分に応ずる取得金額（1,000円未満切捨て） → ⑦⑩ 速算表による税額
    const v6 = active ? Math.floor(net * share) : 0;
    const v7 = active ? rateTax(v6) : 0;
    const farm = active && gross3 > 0;
    const v9 = farm ? Math.floor(net3 * share) : 0;
    const v10 = farm ? rateTax(v9) : 0;
    sum7 += v7;
    sum10 += v10;
    return {
      ...l,
      v6: active ? str(v6) : '',
      v7: active ? str(v7) : '',
      v9: farm ? str(v9) : '',
      v10: farm ? str(v10) : '',
    };
  });

  // ⑧⑪ 相続税の総額（100円未満切捨て）— 様式の「00」に合わせ百円単位で保持
  totals.t7 = sum7 > 0 ? str(Math.floor(sum7 / 100)) : '';
  totals.t11 = sum10 > 0 ? str(Math.floor(sum10 / 100)) : '';

  return { lawful: rows, totals };
}

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
 * 小数のまま扱う値の表示形。
 * 掛け算の結果は 1.1 × 0.98 = 1.0780000000000001 のように誤差が出るので、
 * 倍数として意味のある桁で丸めてから文字にする。
 */
function decimal(n: number): string {
  return String(Number(n.toFixed(10)));
}

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
function resolveDetail(form: string, item: Values): Values {
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
function detailShares(item: Values): { no: number; amount: number }[] {
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
function sumDetails(details: Values[]): number[] {
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
function computeUnsplit(details: Values[], civil: Values[]): number[] {
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

/**
 * 第15表で「その様式を使うときだけ転記になる」欄（丸番号）。
 * 付表の分はコード表（`DETAIL_KINDS`）から機械的に導く — 欄の一覧をここに書き写さない。
 */
export function table15Transferred(used: readonly string[]): string[] {
  const marks = new Set<string>();
  for (const [form, kinds] of Object.entries(DETAIL_KINDS)) {
    if (!used.includes(form)) continue;
    for (const kind of kinds) {
      marks.add(kind.table15);
      if (kind.table15Extra) marks.add(kind.table15Extra.table15);
    }
  }
  if (used.includes('table112')) marks.add('㉛');
  if (used.includes('table13')) marks.add('㉝').add('㉞');
  if (used.includes('table14')) marks.add('㊲');
  return [...marks];
}

/**
 * 第15表①〜㉘ ← 付表の「分割が確定した財産」。細目コードごとの転記先はコード表が持つ。
 * 添字は財産を取得した人の番号（1始まり）で、返すのは行キーごとの人別合計。
 */
function sumTable15(used: readonly string[], details: Record<string, Values[]>): Record<string, number[]> {
  const byKey: Record<string, number[]> = {};
  const add = (mark: string, no: number, amount: number): void => {
    const key = TABLE15_KEY_BY_MARK[mark];
    if (key === undefined) return;
    const row = byKey[key] ?? (byKey[key] = []);
    row[no] = (row[no] ?? 0) + amount;
  };
  for (const [form, kinds] of Object.entries(DETAIL_KINDS)) {
    if (!used.includes(form)) continue;
    const byCode = new Map(kinds.map((kind) => [kind.code, kind]));
    for (const raw of details[form] ?? []) {
      // 価額の自動計算と取得者ごとの按分を通してから合計する（第11表2①と同じ数字にする）
      const item = resolveDetail(form, raw);
      const kind = byCode.get(item.kindCode ?? '');
      if (kind === undefined) continue;
      // 利用区分が一致するときだけ増える欄がある（配偶者居住権に基づく敷地利用権 → ③に加えて⑦）。
      // 判定は完全一致で行う（「配偶者居住権の目的となっている建物」は⑪の対象ではない）。
      const extra = kind.table15Extra !== undefined && (item.usage ?? '').trim() === kind.table15Extra.whenUsage
        ? kind.table15Extra.table15
        : undefined;
      for (const { no, amount } of detailShares(item)) {
        add(kind.table15, no, amount);
        if (extra !== undefined) add(extra, no, amount);
      }
    }
  }
  return byKey;
}

export interface Computed {
  /** 相続人ごとの算出済みの値（入力順） */
  heirs: Values[];
  /** 第2表の法定相続人ごとの算出済みの値 */
  lawful: Values[];
  /** 「各人の合計」列と、第2表から転記されるⒷ・⑦・法定相続人の数 */
  totals: Values;
  /** 他の様式から転記される明細（様式IDごと）。保存した明細の後ろに続けて表示する */
  derived: Record<string, Values[]>;
}

/** 面積欄の保存形式（小数第2位まで）。0 は空欄にする。 */
function area(n: number): string {
  return n === 0 ? '' : n.toFixed(2);
}

/**
 * 第11・11の2表の付表1（別表1）の「1 持分に応じた宅地等」と
 * 「3 特例の対象とならない宅地等（1−2）」を計算する。
 * 1 ＝ A〜Fの面積・評価額 × 持分割合（評価額は円未満切捨て）、3 ＝ 1 − 2。
 * B行は2欄が上下2段に分かれるので、3欄からは2段の合計を引く。
 */
function computeTable1112f1b(sheets: Values[]): Values {
  const out: Values = {};
  sheets.forEach((s, si) => {
    for (let b = 0; b < TABLE1112F1B_OWNERS; b += 1) {
      const den = num(s[`p${b}den`]);
      const share = den === 0 ? 0 : num(s[`p${b}num`]) / den;
      for (let r = 0; r < TABLE1112F1B_ROWS; r += 1) {
        const a1 = num(s[`r${r}a`]) * share;
        const v1 = Math.floor(num(s[`r${r}v`]) * share);
        const slots = SLOTS_BY_ROW[r] ?? [];
        const selA = slots.reduce((t, k) => t + num(s[`p${b}s${k}a`]), 0);
        const selV = slots.reduce((t, k) => t + num(s[`p${b}s${k}v`]), 0);
        const key = `f1b${si}p${b}`;
        out[`${key}o${r}a`] = area(a1);
        out[`${key}o${r}v`] = v1 === 0 ? '' : str(v1);
        out[`${key}n${r}a`] = area(a1 - selA);
        out[`${key}n${r}v`] = v1 - selV === 0 ? '' : str(v1 - selV);
      }
    }
  });
  return out;
}

/**
 * 第11・11の2表の付表1の明細（⑥⑦⑧）と、限度面積要件の判定（⑩・⑪）を計算する。
 * ③④は別表1と結び付けた明細だけ、別表1の「2 選択特例対象宅地等」から転記する。
 * ⑪は「4 貸付事業用宅地等」の選択が無ければイ、あればロだけを埋める。
 */
function computeTable1112f1(items: Values[], sheets: Values[]): Values {
  const out: Values = {};
  /** 添字は小規模宅地等の種類（1〜4） */
  const byKind = [0, 0, 0, 0, 0];
  items.forEach((item, i) => {
    const kind = item.kind ?? '';
    const link = /^(\d+)-(\d+)$/.exec(item.link ?? '');
    let a3 = num(item.area);
    let a4 = num(item.value);
    if (link !== null) {
      const sheet = sheets[Number(link[1])];
      const slots = SLOTS_BY_KIND[kind] ?? [];
      const b = Number(link[2]);
      a3 = sheet === undefined ? 0 : slots.reduce((t, k) => t + num(sheet[`p${b}s${k}a`]), 0);
      a4 = sheet === undefined ? 0 : slots.reduce((t, k) => t + num(sheet[`p${b}s${k}v`]), 0);
      out[`f1d${i}v3`] = area(a3);
      out[`f1d${i}v4`] = a4 === 0 ? '' : str(a4);
    }
    const a5 = num(item.sel);
    const v6 = a3 === 0 ? 0 : Math.floor((a4 * a5) / a3);
    const v7 = Math.floor(v6 * (TABLE1112F1_RATE[kind] ?? 0));
    const filledIn = a3 > 0 && a4 > 0;
    out[`f1d${i}v6`] = filledIn ? str(v6) : '';
    out[`f1d${i}v7`] = filledIn ? str(v7) : '';
    out[`f1d${i}v8`] = filledIn ? str(a4 - v7) : '';
    const k = Math.trunc(num(kind));
    if (k >= 1 && k <= 4) byKind[k] += a5;
  });

  // ⑩ 種類ごとの⑤の合計（全枚数を通した合計）
  const [, k1, k2, k3, k4] = byKind as [number, number, number, number, number];
  for (let k = 1; k <= 4; k += 1) out[`f1a${k}`] = area(byKind[k]!);

  // ⑪ 限度面積（イ＝貸付事業用が無い場合、ロ＝ある場合）
  const k23 = k2 + k3;
  out.f1i1 = k4 > 0 ? '' : area(k1);
  out.f1i2 = k4 > 0 ? '' : area(k23);
  out.f1o1 = k4 > 0 ? area(k1) : '';
  out.f1o2 = k4 > 0 ? area(k23) : '';
  out.f1o3 = k4 > 0 ? area(k4) : '';
  // 限度面積を超えている欄は強調するだけで、値は書き換えない
  out.f1ovI1 = k4 === 0 && k1 > 330 ? '1' : '';
  out.f1ovI2 = k4 === 0 && k23 > 400 ? '1' : '';
  out.f1ovO = k4 > 0 && (k1 * 200) / 330 + (k23 * 200) / 400 + k4 > 200 ? '1' : '';
  return out;
}

/**
 * 配偶者の相続人番号（0起点。いなければ −1）。続柄コード「01」＝配偶者で判定する。
 * 第5表は配偶者1人分の様式なので、複数いる場合は先に入力された方を配偶者として扱う。
 */
export function spouseIndex(heirs: Values[]): number {
  return heirs.findIndex((h) => h.relation === '01');
}

/** 第5表 各セクションの転記元（上段＝第1表、下段＝第3表） */
interface Table5Source {
  /** キーの接頭辞（'t5s1' / 't5s2'） */
  p: string;
  /** Ⓐ 課税価格の合計額（円） */
  totalA: number;
  /** ⑦ 相続税の総額（円） */
  tax: number;
  /** 法定相続分の分子・分母 */
  numerator: number;
  denominator: number;
  /** 限度額の1つ目（上段は⑨又は⑩、下段は⑩のみ） */
  useV10Only: boolean;
}

/**
 * 第5表（配偶者に対する相続税額の軽減額の計算書）。
 *
 * 上段・下段は転記元（第1表／第3表）が違うだけで算式は同じなので、
 * `Table5Source` を差し替えて同じ計算を2回まわす。
 * ①②③⑤は配偶者の第11表2・第1表からの転記なので、上段・下段で同じ値になる。
 */
function computeTable5(
  common: Values,
  spouseValues: Values | undefined,
  spouseLawful: Values | undefined,
  totalA: number,
  total7: number,
): Values {
  const out: Values = {};
  if (spouseValues === undefined) return out;
  const lawfulNumerator = num(spouseLawful?.num);
  const lawfulDenominator = num(spouseLawful?.den);
  out.t5num = spouseLawful === undefined ? '' : str(lawfulNumerator);
  out.t5den = spouseLawful === undefined ? '' : str(lawfulDenominator);
  const sources: Table5Source[] = [
    { p: 't5s1', totalA, tax: total7, numerator: lawfulNumerator, denominator: lawfulDenominator, useV10Only: false },
    { p: 't5s2', totalA: yen(common, 't5a3'), tax: yen(common, 't5v17'), numerator: num(common.t5num2), denominator: num(common.t5den2), useV10Only: true },
  ];
  // ①③は第11表2の配偶者の①②、②⑤は第1表の配偶者の③⑤（どちらの段も同じ）
  const v1 = num(spouseValues.t11v1);
  const v2 = num(spouseValues.v3);
  const v3 = num(spouseValues.t11v2);
  const v4 = Math.max(0, v2 - v3);
  // ⑥ 配偶者の税額軽減額を計算する場合の課税価格（⑤より小さいときは⑤・1,000円未満切捨て）
  const v6yen = Math.floor(Math.max(v1 - v4 + num(spouseValues.v5), num(spouseValues.v5)) / 1000) * 1000;
  // 第1表の配偶者の⑨（⑩の記入があれば⑩）と⑫
  const g2 = num(spouseValues.v12);

  for (const s of sources) {
    const show = (n: number, present: boolean) => (present ? str(n) : '');
    const hasA = s.totalA > 0;
    out[`${s.p}v1`] = show(v1, v1 !== 0);
    out[`${s.p}v2`] = show(v2, v2 !== 0);
    out[`${s.p}v3`] = show(v3, v3 !== 0);
    out[`${s.p}v4`] = show(v4, v2 !== 0 || v3 !== 0);
    out[`${s.p}v5`] = show(num(spouseValues.v5), num(spouseValues.v5) !== 0);
    out[`${s.p}v6`] = show(v6yen / 1000, v6yen !== 0);

    // 課税価格の合計額 × 配偶者の法定相続分（円未満切捨て）。16,000万円に満たないときは16,000万円
    const mul = hasA && s.denominator > 0 ? Math.floor((s.totalA * s.numerator) / s.denominator) : 0;
    out[`${s.p}mul`] = show(mul, mul !== 0);
    const i = Math.max(mul, TABLE5_FLOOR);
    out[`${s.p}i`] = show(i, hasA);

    // ⑧ ㋑の金額と⑥の金額のうち少ない方 ／ ⑩ ⑦×⑧÷⑨（円未満切捨て）
    const v8 = Math.min(i, v6yen);
    out[`${s.p}v8`] = show(v8, hasA && v6yen !== 0);
    const v10 = hasA ? Math.floor((s.tax * v8) / s.totalA) : 0;
    out[`${s.p}v10`] = show(v10, hasA && s.tax > 0 && v6yen !== 0);

    // 限度額 ㋺ ＝ （⑨又は⑩）−⑫、軽減額 ㋩ ＝ ⑩と㋺のうち少ない方
    const g1 = s.useV10Only || filled(spouseValues, 'v10') ? num(spouseValues.v10) : num(spouseValues.v9);
    out[`${s.p}g1`] = show(g1, g1 !== 0);
    out[`${s.p}g2`] = show(g2, g2 !== 0);
    const ro = Math.max(0, g1 - g2);
    out[`${s.p}ro`] = show(ro, g1 !== 0);
    out[`${s.p}ha`] = show(Math.min(v10, ro), g1 !== 0 && v10 !== 0);
  }
  return out;
}

/** 第6表③⑤の元になる第1表の相続税額 ＝ （⑨＋⑪−⑫−⑬）又は（⑩＋⑪−⑫−⑬）（円） */
function table1Balance(h: Values | undefined): number {
  if (h === undefined) return 0;
  const base = filled(h, 'v10') ? num(h.v10) : num(h.v9);
  return Math.max(0, base + num(h.v11) - num(h.v12) - num(h.v13));
}

/** 第6表の計算結果 */
interface Table6 {
  /** ②③④⑤と各計（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第8の8表1① 未成年者控除額（第11表の項番 → 円） */
  minor: Map<number, number>;
  /** 第8の8表1② 障害者控除額（同上） */
  disabled: Map<number, number>;
}

/**
 * 第6表（未成年者控除額・障害者控除額の計算書）。
 *
 * 上段（未成年者）と下段（障害者）は、控除額の算式（18歳×10万円／85歳×10万円・20万円）と
 * ③⑤が第8の8表1の①を引くかどうかが違うだけなので、`section` を諸元違いで2回まわす。
 *
 * ③⑤の「第8の8表1の①」は未成年者控除額そのもので、その値は第6表1の min(②,③)
 * （扶養義務者なら⑥の配分額）なのでこの表の中だけで確定する。
 * 上段を先に計算して項番ごとに控えておき（`credits.m`）、下段でそれを差し引く。
 * 同じ作りで採った障害者分（`credits.d`）と併せて、第8の8表1の①②へ渡す。
 *
 * ①年齢は第1表・第1表（続）の年齢から転記し、⑥は扶養義務者間で協議して配分する額なので手入力。
 * それ以外（②③④⑤と各計）は自動計算。
 */
function computeTable6(common: Values, heirs: Values[]): Table6 {
  const out: Values = {};
  /** 各人が実際に受けた控除額（第11表の項番 → 円）。'm'＝未成年者、'd'＝障害者 */
  const credits = { m: new Map<number, number>(), d: new Map<number, number>() };
  /** 障害者の段だけ、その人の未成年者控除額を差し引いた後の相続税額にする */
  const balance = (minor: boolean, no: number): number => Math.max(
    0, table1Balance(no > 0 ? heirs[no - 1] : undefined) - (minor ? 0 : credits.m.get(no) ?? 0),
  );

  const section = (
    k: 'm' | 'd', minor: boolean, limit: number, rate: (i: number) => number,
    /** 選んだ人がその列の区分に合っているか（合わないときだけ注意を出す） */
    mismatched: (person: Values | undefined, i: number) => boolean,
  ): void => {
    const add = (no: number, amount: number): void => {
      if (no > 0 && amount > 0) credits[k].set(no, (credits[k].get(no) ?? 0) + amount);
    };
    const sums = { v2: 0, v3: 0, v4: 0, v5: 0, v6: 0 };
    // 合計が0でも、列に0が出ているなら計にも0を出す（列が空欄のときだけ計も空欄にする）
    const has = { v2: false, v3: false, v4: false, v5: false, v6: false };
    const allocations: { p: string; v5: number; v6: number }[] = [];
    for (let i = 0; i < TABLE6_COLS; i += 1) {
      const p = `t6${k}${i}`;
      const no = num(common[`${p}no`]);
      const person = no > 0 ? heirs[no - 1] : undefined;
      const age = person?.age ?? '';
      out[`${p}age`] = age;
      out[`${p}noError`] = mismatched(person, i) ? '1' : '';
      const hasAge = age !== '';
      // ② 控除額（万円単位で保持）。基準年齢に達している人は0
      const man = hasAge ? Math.max(0, rate(i) * (limit - num(age))) : 0;
      const v3 = balance(minor, no);
      // ④ 控除しきれない金額（②−③）。②③が揃っていなければ空欄のまま
      const both = hasAge && no > 0;
      const v4 = Math.max(0, man * 10000 - v3);
      out[`${p}v2`] = hasAge ? str(man) : '';
      out[`${p}v3`] = no > 0 ? str(v3) : '';
      out[`${p}v4`] = both ? str(v4) : '';
      sums.v2 += man;
      sums.v3 += no > 0 ? v3 : 0;
      sums.v4 += both ? v4 : 0;
      has.v2 ||= hasAge;
      has.v3 ||= no > 0;
      has.v4 ||= both;
      // その人自身が控除を受けた分は第8の8表1の①②になる
      if (both) add(no, Math.min(man * 10000, v3));

      // 扶養義務者: ⑤は第1表からの転記、⑥はⒶを協議で配分した額（手入力）
      const fp = `t6${k}f${i}`;
      const fno = num(common[`${fp}no`]);
      const v5 = balance(minor, fno);
      out[`${fp}v5`] = fno > 0 ? str(v5) : '';
      sums.v5 += fno > 0 ? v5 : 0;
      has.v5 ||= fno > 0;
      const v6 = num(common[`${fp}v6`]);
      allocations.push({ p: fp, v5, v6 });
      sums.v6 += v6;
      has.v6 ||= filled(common, `${fp}v6`);
      add(fno, v6);
    }
    const show = (n: number, present: boolean): string => (present ? str(n) : '');
    out[`t6${k}T2`] = show(sums.v2, has.v2);
    out[`t6${k}T3`] = show(sums.v3, has.v3);
    out[`t6${k}A`] = show(sums.v4, has.v4);
    out[`t6${k}fT5`] = show(sums.v5, has.v5);
    out[`t6${k}fT6`] = show(sums.v6, has.v6);
    for (const allocation of allocations) {
      out[`${allocation.p}v6Error`] = allocation.v5 > allocation.v6 && sums.v4 > sums.v6 ? '1' : '';
    }
  };

  // 未成年者の段は年齢だけで判定できる（年齢が出ていないときは何も言わない）
  section('m', true, TABLE6_MINOR_AGE, () => TABLE6_MINOR_RATE, (person) => {
    const age = person?.age ?? '';
    return age !== '' && num(age) >= TABLE6_MINOR_AGE;
  });
  // 障害者の段は3列目だけ特別障害者（20万円）。区分が未登録のうちは判定しない
  section(
    'd', false, TABLE6_DISABLED_AGE, (i) => (i === TABLE6_COLS - 1 ? TABLE6_SPECIAL_RATE : TABLE6_DISABLED_RATE),
    (person, i) => {
      const kind = person?.disability ?? '';
      if (kind === '') return false;
      return kind !== (i === TABLE6_COLS - 1 ? DISABILITY_SPECIAL : DISABILITY_GENERAL);
    },
  );
  return { totals: out, minor: credits.m, disabled: credits.d };
}

interface YMD { y: number; m: number; d: number }

/** 元号・年・月・日の欄から西暦の日付を組み立てる。1つでも欠けていれば undefined */
function eraDate(values: Values, p: string): YMD | undefined {
  const base = ERA_BASE_YEAR[(values[`${p}Era`] ?? '').trim()];
  const y = num(values[`${p}Y`]);
  const m = num(values[`${p}M`]);
  const d = num(values[`${p}D`]);
  if (base === undefined || y <= 0 || m <= 0 || d <= 0) return undefined;
  return { y: base + y - 1, m, d };
}

/** 満年数（1年未満切捨て） */
function fullYears(from: YMD, to: YMD): number {
  const before = to.m < from.m || (to.m === from.m && to.d < from.d);
  return to.y - from.y - (before ? 1 : 0);
}

/** 第7表の計算結果 */
interface Table7 {
  /** ③④⑦Ⓐ⑫⑬（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第8の8表1③ 相次相続控除額（第11表の項番 → 円） */
  credit: Map<number, number>;
}

/**
 * 第7表（相次相続控除額の計算書）。
 *
 * 1 の総額Ⓐ ＝ ⑥の相続税額 × ⑧/⑦（1を超えるときは1）× ④の年数/10。
 * 2 の各人の控除額 ＝ Ⓐ × その人の純資産価額の割合。
 *
 * (1)一般の場合 は第1表の④（＝各人の純資産価額）をそのまま使えるが、
 * (2)農業相続人がいる場合 の元になる第3表は未実装なので⑮だけ手入力とし、
 * Ⓒはその合計をとる。⑰⑱の算式は(1)と同じ。
 *
 * ①前の相続の年月日と⑤⑥は前の相続の申告書を見て入力する欄なので手入力。
 * ②は第1表の相続開始年月日からの転記で、③は①②の差（1年未満切捨て）。
 * @param totalNet 第1表④の合計（＝⑧＝Ⓑ）
 */
function computeTable7(common: Values, heirs: Values[], totalNet: number): Table7 {
  const out: Values = {};
  /** 第8の8表1③ 相次相続控除額（第11表の項番 → 円） */
  const credit = new Map<number, number>();
  const prev = eraDate(common, 't7p');
  const now = eraDate(common, 'start');
  const span = prev === undefined || now === undefined ? undefined : Math.max(0, fullYears(prev, now));
  out.t7v3 = span === undefined ? '' : str(span);
  out.t7v4 = span === undefined ? '' : str(Math.max(0, TABLE7_SPAN - span));

  // ⑦（⑤−⑥）。赤字のときは0
  const v6 = num(common.t7v6);
  const hasAmount = filled(common, 't7v5') || filled(common, 't7v6');
  const v7 = Math.max(0, num(common.t7v5) - v6);
  out.t7v7 = hasAmount ? str(v7) : '';

  // Ⓐ 相次相続控除額の総額（円未満切捨て）。⑦が0でも⑧があれば割合は1とする
  const ratio = v7 > 0 ? Math.min(totalNet / v7, 1) : (totalNet > 0 ? 1 : 0);
  const a = Math.floor((v6 * ratio * num(out.t7v4)) / TABLE7_SPAN);
  const hasA = hasAmount && span !== undefined;
  out.t7A = hasA ? str(a) : '';

  /** 1段分（(1)(2) 共通）。⑫⑰の割合は第1表⑧と同じ小数2桁 */
  const rows = (k: string, value: (i: number) => string, total: number): void => {
    for (let i = 0; i < TABLE7_ROWS; i += 1) {
      const p = `t7${k}${i}`;
      const no = num(common[`${p}no`]);
      const share = no > 0 && total > 0 ? (num(value(i)) / total).toFixed(2) : '';
      const v13 = share !== '' && hasA ? Math.floor(a * num(share)) : undefined;
      out[`${p}v12`] = share;
      out[`${p}v13`] = v13 === undefined ? '' : str(v13);
      // 第8の8表1③（⑬又は⑱）。(1)と(2)は択一なので、両方に書いてあれば後の(2)を採る
      if (v13 !== undefined && v13 > 0) credit.set(no, v13);
    }
  };

  // (1) 一般の場合: ⑩は第1表の各人の④、Ⓑは第1表④の合計
  for (let i = 0; i < TABLE7_ROWS; i += 1) {
    const no = num(common[`t7a${i}no`]);
    const h = no > 0 ? heirs[no - 1] : undefined;
    out[`t7a${i}v10`] = h === undefined ? '' : str(num(h.v4));
  }
  rows('a', (i) => out[`t7a${i}v10`] ?? '', totalNet);

  // (2) 農業相続人がいる場合: 第3表が未実装なので⑮は手入力、Ⓒはその合計
  let sum15 = 0;
  let has15 = false;
  for (let i = 0; i < TABLE7_ROWS; i += 1) {
    sum15 += num(common[`t7b${i}v15`]);
    has15 ||= filled(common, `t7b${i}v15`);
  }
  out.t7C = has15 ? str(sum15) : '';
  rows('b', (i) => common[`t7b${i}v15`] ?? '', sum15);

  return { totals: out, credit };
}

/** 第4表の計算結果 */
interface Table4 {
  /** ①③④⑥（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑪へ転記する⑥（相続人の番号は0起点） */
  v11: Map<number, string>;
}

/**
 * 第4表（相続税額の加算金額の計算書）。
 *
 * ⑥ ＝ ①×0.2。ただし④又は⑤があるときは（①−④−⑤）×0.2。
 * ① は第1表⑨（⑩に記入があれば⑩）、③ は第1表①＋②＋⑤、④ は ①×②÷③（円未満切捨て）。
 *
 * ② は「一親等の血族であった期間内の相続時精算課税適用財産」で第1表からは出せないので手入力。
 * ⑤ の第4表の付表は実装対象の様式に含まれないのでこちらも手入力。
 *
 * 氏名は第6表・第7表と同じ選択式（項番→氏名）で、選ばれた人の第1表を参照する。
 * @param heirs 2周目まで確定した第1表（⑨と①②⑤が入っている）
 */
function computeTable4(common: Values, heirs: Values[], pages: number): Table4 {
  const out: Values = {};
  const v11 = new Map<number, string>();
  const show = (n: number, present: boolean): string => (present ? str(n) : '');

  for (let i = 0; i < pages * TABLE4_PERSONS; i += 1) {
    const p = `t4${i}`;
    const no = num(common[`${p}no`]);
    const h = no > 0 ? heirs[no - 1] : undefined;
    if (h === undefined) {
      for (const key of ['v1', 'v3', 'v4', 'v6']) out[`${p}${key}`] = '';
      continue;
    }
    // ① 各人の税額控除前の相続税額（第1表⑨。⑩に記入があればそちら）
    const v1 = filled(h, 'v10') ? num(h.v10) : num(h.v9);
    const hasV1 = filled(h, 'v9') || filled(h, 'v10');
    // ③ 相続税の課税価格に算入された財産の価額（第1表①＋②＋⑤）
    const v3 = num(h.v1) + num(h.v2) + num(h.v5);
    const hasV3 = filled(h, 'v1') || filled(h, 'v2') || filled(h, 'v5');
    // ④ 加算の対象とならない相続税額（①×②÷③）（円未満切捨て）
    const hasV4 = filled(common, `${p}v2`) && v3 > 0;
    const v4 = hasV4 ? Math.floor((v1 * num(common[`${p}v2`])) / v3) : 0;
    const v5 = num(common[`${p}v5`]);
    // ⑥ 相続税額の加算金額。④又は⑤があるときは①からその分を差し引いてから2割にする
    const cut = hasV4 || filled(common, `${p}v5`);
    const v6 = Math.floor(Math.max(0, cut ? v1 - v4 - v5 : v1) * TABLE4_RATE);

    out[`${p}v1`] = show(v1, hasV1);
    out[`${p}v3`] = show(v3, hasV3);
    out[`${p}v4`] = show(v4, hasV4);
    out[`${p}v6`] = show(v6, hasV1);
    if (hasV1) v11.set(no - 1, str(v6));
  }
  return { totals: out, v11 };
}

/** 第4表の2の計算結果 */
interface Table42 {
  /** ④⑧㉕（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑫へ転記する㉕（相続人の番号は0起点） */
  v12: Map<number, string>;
}

/**
 * 第4表の2（暦年課税分の贈与税額控除額の計算書）。
 *
 * 年分ごとに ④＝③×②÷①（特例贈与財産分）と ⑧＝⑦×⑥÷⑤（一般贈与財産分）を求め（円未満切捨て）、
 * ㉕＝④＋⑧＋⑫＋⑯＋⑳＋㉔ をその人の贈与税額控除額とする。
 * ①〜③・⑤〜⑦は贈与税の申告書を書き写す欄なので、この様式は自分の入力だけで完結する。
 * そのため第4表と違って第1表を1周する前に確定でき、第5表㋺（配偶者の⑫を引く）にも間に合う。
 */
function computeTable42(common: Values, pages: number): Table42 {
  const out: Values = {};
  const v12 = new Map<number, string>();

  const eraStarts = [
    { code: '1', year: 1868 },
    { code: '2', year: 1912 },
    { code: '3', year: 1926 },
    { code: '4', year: 1989 },
    { code: '5', year: 2019 },
  ] as const;
  const startEra = eraStarts.find((era) => era.code === common.startEra);
  const startYear = num(common.startY);
  const startGregorianYear = startEra !== undefined && startYear > 0
    ? startEra.year + startYear - 1
    : undefined;

  for (let page = 0; page < pages; page += 1) {
    for (let b = 0; b < TABLE42_BLOCKS; b += 1) {
      const prefix = `t42y${page}b${b}`;
      const targetYear = startGregorianYear === undefined ? undefined : startGregorianYear - b - 1;
      const era = targetYear === undefined
        ? undefined
        : [...eraStarts].reverse().find((candidate) => candidate.year <= targetYear);
      out[`${prefix}Era`] = era?.code ?? '';
      out[`${prefix}Y`] = era === undefined || targetYear === undefined
        ? ''
        : String(targetYear - era.year + 1).padStart(2, '0');
    }
  }

  for (let i = 0; i < pages * TABLE42_PERSONS; i += 1) {
    const p = `t42${i}`;
    let sum = 0;
    let any = false;
    for (let b = 0; b < TABLE42_BLOCKS; b += 1) {
      for (const [dst, tax, base, total] of TABLE42_CREDIT_ROWS) {
        const key = `${p}b${b}r`;
        const den = num(common[`${key}${total}`]);
        // 分母（①又は⑤）が無いと按分できない。分子側が空欄のままなら控除額も空欄にする
        const has = den > 0 && (filled(common, `${key}${tax}`) || filled(common, `${key}${base}`));
        const v = has ? Math.floor((num(common[`${key}${tax}`]) * num(common[`${key}${base}`])) / den) : 0;
        out[`${key}${dst}`] = has ? str(v) : '';
        sum += v;
        any ||= has;
      }
    }
    out[`${p}v25`] = any ? str(sum) : '';
    const no = num(common[`${p}no`]);
    if (no > 0) v12.set(no - 1, any ? str(sum) : '');
  }
  return { totals: out, v12 };
}

/** 第14表の計算結果 */
interface Table14 {
  /** ③・④・各節の合計（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑤・第15表㊲へ転記する④（相続人の番号は0起点） */
  v5: Map<number, string>;
}

/**
 * 第14表（純資産価額に加算される暦年課税分の贈与財産価額等の明細書）。
 *
 * 1の明細は ③＝①−②（赤字は0）。④は「贈与を受けた人ごとの③欄の合計額」で、
 * 全枚数を通してその人（項番で選ぶ）の③を合計する。2・3の合計も全枚数の通算。
 * ①②は贈与税の申告書を書き写す欄なので、この様式も自分の入力だけで完結する。
 * ④は第1表⑤（⑥→Ⓐ→⑦→⑨…の入口）へ転記するため、第4表の2と同じく1周する前に確定させる。
 */
function computeTable14(common: Values, details: Record<string, Values[]>, pages: number): Table14 {
  const out: Values = {};
  const v5 = new Map<number, string>();

  // 1の明細: ③＝①−②（赤字は0）を求めつつ、贈与を受けた人（項番）ごとに合計する
  const gifts = details[TABLE14_GIFT_FORM] ?? [];
  const byNo = new Map<number, number>();
  for (let i = 0; i < pages * TABLE14_GIFT_ROWS; i += 1) {
    const gift = gifts[i] ?? {};
    const has = filled(gift, 'amt') || filled(gift, 'v2');
    const v3 = Math.max(0, num(gift.amt) - num(gift.v2));
    out[`t14g${i}v3`] = has ? str(v3) : '';
    const no = num(gift.who);
    if (has && no > 0) byNo.set(no, (byNo.get(no) ?? 0) + v3);
  }

  // ④: 氏名を選んだ枠だけに合計を出し、そのまま第1表⑤・第15表㊲への転記元にする
  let total4 = 0;
  let any4 = false;
  for (let j = 0; j < pages * TABLE14_PERSONS; j += 1) {
    const no = num(common[`t14p${j}Who`]);
    const sum = no > 0 ? byNo.get(no) : undefined;
    out[`t14p${j}v4`] = sum === undefined ? '' : str(sum);
    if (sum === undefined) continue;
    total4 += sum;
    any4 = true;
    v5.set(no - 1, str(sum));
  }
  out.t14v4Total = any4 ? str(total4) : '';

  // 2・3の合計（明細の「価額」の通算）
  const sumAmt = (form: string): string => {
    const rows = details[form] ?? [];
    return rows.some((detail) => filled(detail, 'amt'))
      ? str(rows.reduce((s, detail) => s + num(detail.amt), 0))
      : '';
  };
  out.t14bTotal = sumAmt(TABLE14_BEQUEST_FORM);
  out.t14dTotal = sumAmt(TABLE14_DONATION_FORM);

  return { totals: out, v5 };
}

/** 第8の8表の計算結果 */
interface Table88 {
  /** 1の①②③⑤・2の⑧（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑭へ転記する1⑤（相続人の番号は0起点） */
  v14: Map<number, string>;
  /** 第1表⑳へ転記する2⑧（同上。様式が百円単位なので100で割った値） */
  v20: Map<number, string>;
}

/**
 * 第8の8表（税額控除額及び納税猶予税額の内訳書）。
 *
 * 1・2とも「合計＝その上の各行の和」だけの表で、2人分／枚。
 * 1の①②は第6表、③は第7表からの転記なので自動計算にするが、その様式を使っていなければ手入力に戻す。
 * ④（第8表）と2の①〜⑦（第8表2・第8の2表〜第8の6表）は転記元が実装対象の様式に無いので常に手入力。
 *
 * @param t6 第6表の控除額（①②の転記元）
 * @param t7 第7表の控除額（③の転記元）
 * @param useT6 第6表を使っているか（使っていなければ①②も手入力）
 * @param useT7 第7表を使っているか（同じく③）
 */
function computeTable88(
  common: Values, pages: number, t6: Table6, t7: Table7, useT6: boolean, useT7: boolean,
): Table88 {
  const out: Values = {};
  const v14 = new Map<number, string>();
  const v20 = new Map<number, string>();

  /** 1の①②③（転記になる行）の値。undefined を返した行は手入力 */
  const creditAuto = (i: number, no: number): number | undefined => {
    const source = [useT6 && t6.minor, useT6 && t6.disabled, useT7 && t7.credit][i];
    return source === undefined || source === false ? undefined : source.get(no) ?? 0;
  };

  /**
   * 1人分の段を集計する。合計は転記・手入力のどちらかに記入があるときだけ出す。
   * @returns 氏名を選んでいて合計が出るときだけ、その項番と合計
   */
  const person = (
    k: string, count: number, page: number, cell: number, auto: (i: number, no: number) => number | undefined,
  ): { no: number; total: number } | undefined => {
    const p = `t88${k}p${page}c${cell}`;
    const no = num(common[`${p}no`]);
    let total = 0;
    let any = false;
    for (let i = 0; i < count; i += 1) {
      const key = `${p}v${i + 1}`;
      const t = auto(i, no);
      if (t === undefined) {
        total += num(common[key]);
        any ||= filled(common, key);
        continue;
      }
      // 転記の行は、名前を選び直したときに古い値が残らないよう毎回上書きする
      out[key] = t > 0 ? str(t) : '';
      total += t;
      any ||= t > 0;
    }
    out[`${p}v${count + 1}`] = any ? str(total) : '';
    return any && no > 0 ? { no, total } : undefined;
  };

  for (let page = 0; page < pages; page += 1) {
    for (let cell = 0; cell < TABLE88_PERSONS; cell += 1) {
      const credit = person('a', TABLE88_CREDIT_ROWS, page, cell, creditAuto);
      if (credit !== undefined) v14.set(credit.no - 1, str(credit.total));
      const deferral = person('b', TABLE88_DEFERRAL_ROWS, page, cell, () => undefined);
      // ⑳は様式に「00」が印字されている百円単位の欄
      if (deferral !== undefined) v20.set(deferral.no - 1, str(Math.floor(deferral.total / 100)));
    }
  }

  return { totals: out, v14, v20 };
}

/**
 * 全体を計算する。⑧の按分にはⒶ（＝⑥の合計）を、⑨には⑦（＝第2表⑧）を使うため、
 * ⑥→Ⓐ→（第2表）⑧→⑨ の順に第1表を2周する。循環はしない。
 * @param used 使用する様式のID。第11表・付表を使うかどうかで第1表①・第11表2①の扱いが変わる。
 * @param details 付表の明細（様式IDごと）。使用する付表の分だけ第11表2①へ合計する。
 */
function computeAllWithRatios(
  common: Values, heirs: Values[], used: string[] = [], details: Record<string, Values[]> = {},
  ratios?: readonly number[],
): Computed {
  const forms: UsedForms = {
    table11: used.includes('table11'),
    table112: used.includes('table112'),
    table13: used.includes('table13'),
  };

  // 第2表④は「財産を取得した人」のうち法定相続人の印が付いた人。行として別に持たず毎回作る
  const linkedLawful = deriveLawful(heirs);
  // 未分割財産の按分に使う民法上の相続分（放棄を反映し、養子の数の制限は受けない）
  const linkedCivil = deriveCivil(heirs, linkedLawful);

  // 付表4 ← 第9表・第10表（生命保険金等・退職手当金等のうち課税される部分）。
  // 保存した明細の後ろに続け、以降の集計はこの継ぎ足した明細を見る
  const f4 = derivedTable11f4(details, heirs, linkedLawful.length);
  const withDerived = f4.length === 0
    ? details
    : { ...details, table11f4: [...(details.table11f4 ?? []), ...f4] };

  // 第11表2① ← 付表の「分割が確定した財産」。財産の明細書（付表1〜4）だけを合計する
  // ＝ 明細を配列で持つ様式は他にもあるので、コード表を持つ様式だけに絞る。
  const detailForms = used.filter((id) => id in DETAIL_KINDS && (withDerived[id]?.length ?? 0) > 0);
  const detailItems = detailForms.flatMap((id) => withDerived[id]!.map((item) => resolveDetail(id, item)));
  const detailTotals = sumDetails(detailItems);
  // 第11表2② ← 付表の未分割の明細を民法上の相続分で按分したもの
  const unsplitTotals = computeUnsplit(detailItems, linkedCivil);
  // 第13表3①④ ← 同表1・2の明細の「負担する金額」
  const t13 = computeTable13(details);
  // 第15表①〜㉘ ← 付表の細目ごとの合計。転記になる欄は手入力の残りを混ぜないよう毎回空に戻す。
  const t15 = sumTable15(used, withDerived);
  // 第1表⑫ ← 第4表の2㉕。この様式は自分の入力だけで完結するので、第1表を1周する前に確定させる
  // （配偶者の⑫は第5表㋺で引かれるため、2周目より後では間に合わない）。
  // 名前を選び直したときに古い値が読み取り専用のまま残らないよう、使用中は全員分を上書きする。
  const t42 = computeTable42(common, table42Pages(common));
  const t42Used = used.includes('table42');
  // 第1表⑤・第15表㊲ ← 第14表1④。⑤は⑥→Ⓐ→⑦→⑨… の入口なので、これも1周する前に確定させる。
  const t14 = computeTable14(common, details, table14Pages(common, details));
  const t14Used = used.includes('table14');
  const t15Blank = Object.fromEntries(
    table15Transferred(used).flatMap((mark) => {
      const key = TABLE15_KEY_BY_MARK[mark];
      return key === undefined ? [] : [[key, '']];
    }),
  ) as Values;
  const inputs = heirs.map((h, i): Values => {
    const detail = detailTotals[i + 1] ?? 0;
    const unsplit = unsplitTotals[i + 1] ?? 0;
    const debt = t13.debt[i + 1] ?? 0;
    const funeral = t13.funeral[i + 1] ?? 0;
    const age = ageAtInheritanceStart(common, h);
    return {
      ...h,
      age: age === undefined ? '' : str(age),
      ...(ratios === undefined ? {} : { v8a: ratios[i]!.toFixed(2) }),
      ...(t42Used ? { v12: t42.v12.get(i) ?? '' } : {}),
      // 第11表2①②は（注）2・3のとおり付表1〜4からの導出しかないので、
      // 付表が空でも手入力に戻さず空欄のままにする（欄そのものが入力不可）
      t11v1: detail === 0 ? '' : signed(detail),
      t11v2: unsplit === 0 ? '' : str(unsplit),
      t13v1: debt === 0 ? '' : str(debt),
      t13v4: funeral === 0 ? '' : str(funeral),
      ...t15Blank,
      ...Object.fromEntries(Object.entries(t15).map(([key, byNo]) => {
        const amount = byNo[i + 1] ?? 0;
        return [key, amount === 0 ? '' : signed(amount)];
      })),
      // 第14表を使う間は、名前を選び直したときに古い値が残らないよう全員分を上書きする
      ...(t14Used ? { v5: t14.v5.get(i) ?? '', [table15Key(37)]: t14.v5.get(i) ?? '' } : {}),
    };
  });

  // 1周目: Ⓐ（⑥の合計）を確定させる
  const firstPass = inputs.map((h) => computeHeir(h, 0, 0, forms));
  const totalA = firstPass.reduce((s, h) => s + yen(h, 'v6'), 0);

  // 第2表: Ⓐと法定相続人から相続税の総額⑧（＝第1表⑦）を求める
  const table2 = computeTable2(linkedLawful, totalA / 1000);
  const total7 = yen(table2.totals, 't7');

  // 2周目以降は他の様式からの転記を重ねて第1表を計算し直す。第11表の項番は入力順の通し番号。
  const pass = (patches: Values[]): Values[] => inputs.map((h, i) => ({
    ...computeHeir({ ...h, ...patches[i] }, total7, totalA, forms), t11no: str(i + 1),
  }));
  const none: Values[] = inputs.map(() => ({}));

  // 2周目: 確定したⒶ・⑦で⑧以降を計算する
  const pass2 = pass(none);

  // 第5表: 2周目で確定した配偶者の⑨⑫を使って軽減額㋩（㋬）を求める
  const spouse = spouseIndex(heirs);
  const spouseName = (heirs[spouse]?.name ?? '').trim();
  const spouseLawful = linkedLawful.find((row) => row.source === String(spouse))
    ?? linkedLawful.find((row) => spouseName !== '' && (row.name ?? '').trim() === spouseName);
  const table5 = computeTable5(common, pass2[spouse], spouseLawful, totalA, total7);
  const t5v13 = used.includes('table5')
    ? filled(common, 't5a3') || filled(common, 't5v17') ? table5.t5s2ha : table5.t5s1ha
    : '';
  // 第4表: 2周目で確定した⑨と①②⑤から加算金額⑥を求める（⑨は⑪に依存しないので循環しない）
  const table4 = computeTable4(common, pass2, table4Pages(common));
  const t4v11 = used.includes('table4') ? table4.v11 : new Map<number, string>();

  // 3周目: 第5表㋩を配偶者の⑬へ、第4表⑥を各人の⑪へ転記して⑮⑯以降を計算し直す
  const patch3: Values[] = inputs.map((_h, i) => ({
    ...(i === spouse ? { v13: t5v13 ?? '' } : {}),
    ...(t4v11.has(i) ? { v11: t4v11.get(i)! } : {}),
  }));
  const computed = pass(patch3);

  // 第6表・第7表: 3周目で確定した第1表の⑨〜⑬（＝③⑤の元）と④から控除額を求める
  const t6 = computeTable6(common, computed);
  const t7 = computeTable7(common, computed, computed.reduce((s, h) => s + num(h.v4), 0));
  // 第8の8表: 1⑤→第1表⑭、2⑧→第1表⑳。①②③の元が第6表・第7表なのでここまで下りてくる。
  // ⑭⑳は第6表③⑤・第7表④のどちらにも影響しないので循環はしない。
  const t88 = computeTable88(common, table88Pages(common), t6, t7, used.includes('table6'), used.includes('table7'));

  // 4周目: 第8の8表の合計を各人の⑭⑳へ転記して⑮〜㉗を計算し直す
  const final = used.includes('table88')
    ? pass(patch3.map((p, i) => ({ ...p, v14: t88.v14.get(i) ?? '', v20: t88.v20.get(i) ?? '' })))
    : computed;

  const totals: Values = { ...table2.totals, ...table5 };
  for (const key of TOTAL_ROWS) {
    const sum = final.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : str(sum);
  }
  for (const key of SIGNED_TOTAL_ROWS) {
    const sum = final.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : signed(sum);
  }
  // ⑧ 合計欄は様式にあらかじめ「1.00」と印字されている
  totals.v8 = '1.00';
  // 第13表1・2の合計（負担する人が決まっていない分も含む「金額」列の合計）
  totals.t13dTotal = t13.debtTotal === 0 ? '' : str(t13.debtTotal);
  totals.t13fTotal = t13.funeralTotal === 0 ? '' : str(t13.funeralTotal);
  // 第9表（生命保険金など）・第10表（退職手当金など）。どちらもⒶは第2表の法定相続人の数から決まる
  const heirCount = num(table2.totals.heirCount);
  Object.assign(
    totals,
    computeNonTaxableLimit(
      details[TABLE9_DETAIL_FORM] ?? [], heirs, 't9', table9Pages(common, details), TABLE9_ROWS, heirCount,
    ),
    computeNonTaxableLimit(
      details[TABLE10_DETAIL_FORM] ?? [], heirs, 't10', table10Pages(common, details), TABLE10_ROWS, heirCount,
    ),
  );
  // 第4表（相続税額の加算金額）。⑥は上で求めた各人の⑪への転記元
  Object.assign(totals, table4.totals);
  // 第4表の2（暦年課税分の贈与税額控除額）。㉕は第1表を1周する前に各人の⑫へ入れてある
  Object.assign(totals, t42.totals);
  Object.assign(totals, t14.totals);
  // 第6表（未成年者控除・障害者控除）・第7表（相次相続控除）と、その合計を集める第8の8表
  Object.assign(totals, t6.totals, t7.totals, t88.totals);
  // 第11・11の2表の付表1（小規模宅地等）と、その別表1
  const f1Sheets = details.table1112f1b ?? [];
  Object.assign(totals, computeTable1112f1b(f1Sheets), computeTable1112f1(details.table1112f1 ?? [], f1Sheets));

  // 第2表④の行はその人自身の欄なので、⑤⑥⑦⑨⑩をその人の値として持たせる
  // （様式側は `h{n}.lawNum` … を参照する。分数は手入力があればそれ、無ければ自動候補）
  const byHeir = new Map(table2.lawful.map((row) => [Number(row.source), row]));
  // 民法上の相続分は様式に印刷しないが、自動候補を登録画面に出すのでその人の値として持たせる
  const civilByHeir = new Map(linkedCivil.map((row) => [Number(row.source), row]));
  const withLawful = final.map((heir, i): Values => {
    const civil = civilByHeir.get(i);
    const withCivil: Values = civil === undefined ? heir : {
      ...heir,
      civilNum: civil.num ?? '', civilDen: civil.den ?? '', civilOverride: civil.override ?? '',
    };
    const row = byHeir.get(i);
    return row === undefined ? withCivil : {
      ...withCivil,
      lawNum: row.num ?? '', lawDen: row.den ?? '', lawOverride: row.override ?? '',
      lawV6: row.v6 ?? '', lawV7: row.v7 ?? '', lawV9: row.v9 ?? '', lawV10: row.v10 ?? '',
    };
  });

  return {
    heirs: withLawful, lawful: table2.lawful, totals,
    derived: f4.length === 0 ? {} : { table11f4: f4 },
  };
}

/** ⑧の端数調整後に比較する税負担。⑲は税額控除後・納税猶予前なので、猶予を節税と誤認しない。 */
function apportionedTaxBurden(computed: Computed): number {
  return computed.heirs.reduce((sum, heir) => sum + num(heir.v19), 0);
}

/**
 * 相続税法基本通達17－1に従い、各人の⑧を小数第2位で調整して合計を1.00にする。
 * 各人は正確な割合の切捨て値または切上げ値のどちらかとし、不足する0.01を、
 * ⑲の合計税負担への増分が小さい人から配る。同額なら正確な割合の端数が大きい人を優先する。
 */
export function computeAll(
  common: Values, heirs: Values[], used: string[] = [], details: Record<string, Values[]> = {},
): Computed {
  const preliminary = computeAllWithRatios(common, heirs, used, details);
  const totalA = preliminary.heirs.reduce((sum, heir) => sum + yen(heir, 'v6'), 0);
  if (totalA <= 0) return preliminary;

  const exactUnits = preliminary.heirs.map((heir) => (yen(heir, 'v6') * 100) / totalA);
  const floorUnits = exactUnits.map((units) => Math.floor(units + 1e-10));
  const missingUnits = Math.max(0, 100 - floorUnits.reduce((sum, units) => sum + units, 0));
  const floorRatios = floorUnits.map((units) => units / 100);
  if (missingUnits === 0) return computeAllWithRatios(common, heirs, used, details, floorRatios);

  const floorResult = computeAllWithRatios(common, heirs, used, details, floorRatios);
  const floorTax = apportionedTaxBurden(floorResult);
  const candidates = exactUnits.flatMap((units, index) => {
    const remainder = units - floorUnits[index]!;
    if (remainder <= 1e-10) return [];
    const trial = [...floorRatios];
    trial[index] = (floorUnits[index]! + 1) / 100;
    const tax = apportionedTaxBurden(computeAllWithRatios(common, heirs, used, details, trial));
    return [{ index, taxIncrease: tax - floorTax, remainder }];
  });
  candidates.sort((a, b) => (
    a.taxIncrease - b.taxIncrease || b.remainder - a.remainder || a.index - b.index
  ));

  const optimized = [...floorRatios];
  for (const candidate of candidates.slice(0, missingUnits)) {
    optimized[candidate.index] = (floorUnits[candidate.index]! + 1) / 100;
  }
  return computeAllWithRatios(common, heirs, used, details, optimized);
}
