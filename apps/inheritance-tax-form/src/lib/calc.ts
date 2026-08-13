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

import { DETAIL_KINDS } from '../data/detailCodes';
import { TABLE112_ROWS } from '../forms/table112';
import { TABLE1112F1_RATE } from '../forms/table1112f1';
import { SLOTS_BY_KIND, SLOTS_BY_ROW, TABLE1112F1B_OWNERS, TABLE1112F1B_ROWS } from '../forms/table1112f1b';
import { TABLE13_DEBT_ROWS, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS } from '../forms/table13';
import { TABLE10_ROWS } from '../forms/table10';
import { TABLE5_FLOOR } from '../forms/table5';
import {
  TABLE6_COLS, TABLE6_DISABLED_AGE, TABLE6_DISABLED_RATE, TABLE6_MINOR_AGE, TABLE6_MINOR_RATE, TABLE6_SPECIAL_RATE,
} from '../forms/table6';
import { TABLE4_PERSONS, TABLE4_RATE } from '../forms/table4';
import { TABLE7_ROWS, TABLE7_SPAN } from '../forms/table7';
import { TABLE9_ROWS } from '../forms/table9';
import { TABLE15_KEYS, TABLE15_KEY_BY_MARK, table15Key } from '../forms/table15';
import { RATE_BRACKETS } from '../forms/table2';

export type Values = Record<string, string>;

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

/**
 * 第13表の枚数。1枚に債務4件・葬式費用5件・人4人しか載らないので、
 * 明細の枚数（共通欄 `t13Pages`）と人数から決まる枚数の大きい方をとる。
 */
export function table13Pages(common: Values, heirs: number): number {
  const explicit = Math.max(1, Math.trunc(num(common.t13Pages)) || 1);
  return Math.max(explicit, Math.ceil(heirs / TABLE13_PERSONS));
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
 * 第13表1（債務の明細）・2（葬式費用の明細）を集計する。値は共通欄（'c.' スコープ）に持つ。
 *
 * 合計欄は「金額」列の合計で、負担する人が決まっていない債務も含まれる。
 * 3①④は「負担する金額」を負担する人ごとに合計したもので、負担する人の欄は
 * 第11表の項番（＝入力順の通し番号）を選ぶ選択式なので、そのまま人に結び付く。
 * 枚数を減らしたときに残る入力値を混ぜないよう、表に出ている行番号だけを走査する。
 */
function computeTable13(common: Values, pages: number): Table13 {
  const out: Table13 = { debt: [], funeral: [], debtTotal: 0, funeralTotal: 0 };
  const scan = (prefix: string, rows: number, by: number[]): number => {
    let total = 0;
    for (let i = 0; i < pages * rows; i += 1) {
      total += num(common[`${prefix}${i}Amt`]);
      const no = num(common[`${prefix}${i}Who`]);
      if (no > 0) by[no] = (by[no] ?? 0) + num(common[`${prefix}${i}Share`]);
    }
    return total;
  };
  out.debtTotal = scan('t13d', TABLE13_DEBT_ROWS, out.debt);
  out.funeralTotal = scan('t13f', TABLE13_FUNERAL_ROWS, out.funeral);
  return out;
}

/** 第9表の枚数。1枚に明細5件・相続人5人しか載らないので、足りなければ用紙を増やす。 */
export function table9Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t9Pages)) || 1);
}

/**
 * 第4表の枚数。1枚に加算の対象となる人4人分。
 * 2割加算の対象になるかどうかは続柄だけでは決まらないので、人数からは決めず −／＋ で増減する。
 */
export function table4Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t4Pages)) || 1);
}

/** 第10表の枚数。第9表と同じく1枚に明細5件・相続人5人。 */
export function table10Pages(common: Values): number {
  return Math.max(1, Math.trunc(num(common.t10Pages)) || 1);
}

/**
 * 第9表2・第10表2（課税される金額の計算）。様式が違うだけで算式は完全に同一なので1本にまとめる。
 * 1・2とも様式全体の一覧なので入力は共通欄（'c.' スコープ）に持ち、自動計算の結果だけを返す。
 *
 * Ⓐ 非課税限度額 ＝ 500万円 × 法定相続人の数（第2表㋺からの転記）。
 * 様式に「,000,000」が印字されている欄なので百万円単位で保持する。
 * Ⓑ（①の合計）がⒶ以下なら①がそのまま②の非課税金額になり、超えるときはⒶを①で按分する
 * （1円未満切捨て）。③は①−②。
 * 枚数を減らしたときに残る入力値を混ぜないよう、表に出ている行番号だけを走査する。
 *
 * @param p フィールドの接頭辞（'t9' または 't10'）。入力は `${p}p{i}v1`、
 *   出力は `${p}A` `${p}B` `${p}r{i}v2` `${p}r{i}v3` `${p}v2Total` `${p}v3Total`
 */
function computeNonTaxableLimit(
  common: Values, p: string, pages: number, rowsPerPage: number, heirCount: number,
): Values {
  const out: Values = {};
  // Ⓐ（百万円単位）。法定相続人が未入力のうちは空欄のままにする。
  const aMillion = heirCount > 0 ? 5 * heirCount : 0;
  out[`${p}A`] = aMillion > 0 ? str(aMillion) : '';

  const limit = aMillion * (SCALE[`${p}A`] ?? 1);
  const rows = Array.from({ length: pages * rowsPerPage }, (_unused, i) => i);
  const b = rows.reduce((s, i) => s + num(common[`${p}p${i}v1`]), 0);
  let sum2 = 0;
  let sum3 = 0;
  for (const i of rows) {
    const v1 = num(common[`${p}p${i}v1`]);
    const v2 = b <= limit ? v1 : Math.floor((limit * v1) / b);
    const has = filled(common, `${p}p${i}v1`);
    out[`${p}r${i}v2`] = has ? str(v2) : '';
    out[`${p}r${i}v3`] = has ? str(v1 - v2) : '';
    sum2 += v2;
    sum3 += v1 - v2;
  }
  out[`${p}B`] = b === 0 ? '' : str(b);
  out[`${p}v2Total`] = b === 0 ? '' : str(sum2);
  out[`${p}v3Total`] = b === 0 ? '' : str(sum3);
  return out;
}

/**
 * 第15表（相続財産の種類別価額表）のうち、様式に算式が印字されている行を計算する。
 *
 * ①〜㉘は付表からの転記（`sumTable15` が入れる）、㉛㉝㉞は他の様式からの転記で、
 * 手入力が残るのは⑧⑨（⑥のうち特例農地等）と㊲（第14表1④）だけ。
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

  // ⑧ あん分割合（各人の⑥／Ⓐ）— 端数調整のため手入力での上書きを許す（v8m が立っている間は触らない）
  if (!h.v8m) out.v8 = totalA > 0 && has(out.v6) ? (v6yen / totalA).toFixed(2) : '';
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

/**
 * 第2表（相続税の総額の計算書）。
 * @param totalAThousand ㋑ 課税価格の合計額（＝第1表Ⓐ・千円単位）
 */
function computeTable2(common: Values, lawful: Values[], totalAThousand: number): Table2 {
  const named = lawful.filter((l) => (l.name ?? '').trim() !== '').length;
  const totals: Values = {};

  // ㋺ 法定相続人の数 ／ ㋩ 遺産に係る基礎控除額（3,000万円＋600万円×法定相続人の数・万円単位）
  const deduction = named > 0 ? 3000 + 600 * named : 0;
  totals.heirCount = named > 0 ? str(named) : '';
  totals.k4 = named > 0 ? str(deduction) : '';
  // Ⓑ（第1表）は百万円単位で記入する欄なので㋩（万円）を100で割る
  totals.tB = named > 0 ? str(deduction / 100) : '';

  // ㋥（㋑−㋩）／ ㋬（㋭−㋩）。基礎控除以下なら課税遺産は生じないので0とする。
  const gross3 = num(common.k2);
  const net = Math.max(0, totalAThousand - deduction * 10);
  const net3 = Math.max(0, gross3 - deduction * 10);
  totals.k5 = totalAThousand > 0 || named > 0 ? str(net) : '';
  totals.k6 = gross3 > 0 ? str(net3) : '';

  let sum7 = 0;
  let sum10 = 0;
  const rows = lawful.map((l): Values => {
    const den = num(l.den);
    const share = den > 0 ? num(l.num) / den : 0;
    const active = (l.name ?? '').trim() !== '' && share > 0;
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

/** 付表（財産の明細書）の1明細で、1つの財産を分けられる人数 */
const DETAIL_SHARES = [0, 1, 2] as const;

/**
 * 付表の「分割が確定した財産」を、財産を取得した人の番号ごとに合計する（円）。
 * 添字は番号そのもの（1始まり）。番号が空欄の明細は分割が確定していないので集計しない。
 */
function sumDetails(details: Values[]): number[] {
  const byNumber: number[] = [];
  for (const item of details) {
    for (const i of DETAIL_SHARES) {
      const no = num(item[`who${i}`]);
      if (no <= 0) continue;
      byNumber[no] = (byNumber[no] ?? 0) + num(item[`amount${i}`]);
    }
  }
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
    for (const item of details[form] ?? []) {
      const kind = byCode.get(item.kindCode ?? '');
      if (kind === undefined) continue;
      // 利用区分が一致するときだけ増える欄がある（配偶者居住権に基づく敷地利用権 → ③に加えて⑦）。
      // 判定は完全一致で行う（「配偶者居住権の目的となっている建物」は⑪の対象ではない）。
      const extra = kind.table15Extra !== undefined && (item.usage ?? '').trim() === kind.table15Extra.whenUsage
        ? kind.table15Extra.table15
        : undefined;
      for (const i of DETAIL_SHARES) {
        const no = num(item[`who${i}`]);
        if (no <= 0) continue;
        const amount = num(item[`amount${i}`]);
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
  /** 法定相続分の分子・分母（共通欄のキー） */
  numKey: string;
  denKey: string;
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
function computeTable5(common: Values, spouseValues: Values | undefined, totalA: number, total7: number): Values {
  const out: Values = {};
  if (spouseValues === undefined) return out;
  const sources: Table5Source[] = [
    { p: 't5s1', totalA, tax: total7, numKey: 't5num', denKey: 't5den', useV10Only: false },
    { p: 't5s2', totalA: yen(common, 't5a3'), tax: yen(common, 't5v17'), numKey: 't5num2', denKey: 't5den2', useV10Only: true },
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
    const den = num(common[s.denKey]);
    const mul = hasA && den > 0 ? Math.floor((s.totalA * num(common[s.numKey])) / den) : 0;
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

/**
 * 第6表（未成年者控除額・障害者控除額の計算書）。
 *
 * 上段（未成年者）と下段（障害者）は、控除額の算式（18歳×10万円／85歳×10万円・20万円）と
 * ③⑤が第8の8表1の①を引くかどうかが違うだけなので、`section` を諸元違いで2回まわす。
 *
 * ③⑤の「第8の8表1の①」は未成年者控除額そのもので、第8の8表は未実装だが
 * その値は第6表1の min(②,③)（扶養義務者なら⑥の配分額）なので、この表の中だけで確定する。
 * 上段を先に計算して項番ごとに控えておき（`minorCredit`）、下段でそれを差し引く。
 *
 * ①年齢は生年月日を持っていないので手入力、⑥は扶養義務者間で協議して配分する額なので手入力。
 * それ以外（②③④⑤と各計）は自動計算。
 */
function computeTable6(common: Values, heirs: Values[]): Values {
  const out: Values = {};
  /** 第8の8表1① 未成年者控除額（第11表の項番 → 円） */
  const minorCredit = new Map<number, number>();
  const add = (no: number, amount: number): void => {
    if (no > 0) minorCredit.set(no, (minorCredit.get(no) ?? 0) + amount);
  };
  /** 障害者の段だけ、その人の未成年者控除額を差し引いた後の相続税額にする */
  const balance = (minor: boolean, no: number): number => Math.max(
    0, table1Balance(no > 0 ? heirs[no - 1] : undefined) - (minor ? 0 : minorCredit.get(no) ?? 0),
  );

  const section = (k: string, minor: boolean, limit: number, rate: (i: number) => number): void => {
    const sums = { v2: 0, v3: 0, v4: 0, v5: 0, v6: 0 };
    // 合計が0でも、列に0が出ているなら計にも0を出す（列が空欄のときだけ計も空欄にする）
    const has = { v2: false, v3: false, v4: false, v5: false, v6: false };
    for (let i = 0; i < TABLE6_COLS; i += 1) {
      const p = `t6${k}${i}`;
      const no = num(common[`${p}no`]);
      const hasAge = filled(common, `${p}age`);
      // ② 控除額（万円単位で保持）。基準年齢に達している人は0
      const man = hasAge ? Math.max(0, rate(i) * (limit - num(common[`${p}age`]))) : 0;
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
      // その人自身が控除を受けた分は第8の8表1の①になる
      if (minor && both) add(no, Math.min(man * 10000, v3));

      // 扶養義務者: ⑤は第1表からの転記、⑥はⒶを協議で配分した額（手入力）
      const fp = `t6${k}f${i}`;
      const fno = num(common[`${fp}no`]);
      const v5 = balance(minor, fno);
      out[`${fp}v5`] = fno > 0 ? str(v5) : '';
      sums.v5 += fno > 0 ? v5 : 0;
      has.v5 ||= fno > 0;
      const v6 = num(common[`${fp}v6`]);
      sums.v6 += v6;
      has.v6 ||= filled(common, `${fp}v6`);
      if (minor) add(fno, v6);
    }
    const show = (n: number, present: boolean): string => (present ? str(n) : '');
    out[`t6${k}T2`] = show(sums.v2, has.v2);
    out[`t6${k}T3`] = show(sums.v3, has.v3);
    out[`t6${k}A`] = show(sums.v4, has.v4);
    out[`t6${k}fT5`] = show(sums.v5, has.v5);
    out[`t6${k}fT6`] = show(sums.v6, has.v6);
  };

  section('m', true, TABLE6_MINOR_AGE, () => TABLE6_MINOR_RATE);
  // 障害者の段は3列目だけ特別障害者（20万円）
  section('d', false, TABLE6_DISABLED_AGE, (i) => (i === TABLE6_COLS - 1 ? TABLE6_SPECIAL_RATE : TABLE6_DISABLED_RATE));
  return out;
}

/** 元号コード → 元年の西暦（第7表①②の年月日から期間を出すため） */
const ERA_BASE: Record<string, number> = { 1: 1868, 2: 1912, 3: 1926, 4: 1989, 5: 2019 };

interface YMD { y: number; m: number; d: number }

/** 元号・年・月・日の欄から西暦の日付を組み立てる。1つでも欠けていれば undefined */
function eraDate(values: Values, p: string): YMD | undefined {
  const base = ERA_BASE[(values[`${p}Era`] ?? '').trim()];
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
function computeTable7(common: Values, heirs: Values[], totalNet: number): Values {
  const out: Values = {};
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
      const filledRow = num(common[`${p}no`]) > 0;
      const share = filledRow && total > 0 ? (num(value(i)) / total).toFixed(2) : '';
      out[`${p}v12`] = share;
      out[`${p}v13`] = share !== '' && hasA ? str(Math.floor(a * num(share))) : '';
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

  return out;
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

/**
 * 全体を計算する。⑧の按分にはⒶ（＝⑥の合計）を、⑨には⑦（＝第2表⑧）を使うため、
 * ⑥→Ⓐ→（第2表）⑧→⑨ の順に第1表を2周する。循環はしない。
 * @param used 使用する様式のID。第11表・付表を使うかどうかで第1表①・第11表2①の扱いが変わる。
 * @param details 付表の明細（様式IDごと）。使用する付表の分だけ第11表2①へ合計する。
 */
export function computeAll(
  common: Values, heirs: Values[], lawful: Values[], used: string[] = [], details: Record<string, Values[]> = {},
): Computed {
  const forms: UsedForms = {
    table11: used.includes('table11'),
    table112: used.includes('table112'),
    table13: used.includes('table13'),
  };

  // 第11表2① ← 付表の「分割が確定した財産」。財産の明細書（付表1〜4）だけを合計する
  // ＝ 明細を配列で持つ様式は他にもあるので、コード表を持つ様式だけに絞る。
  const detailForms = used.filter((id) => id in DETAIL_KINDS && (details[id]?.length ?? 0) > 0);
  const detailTotals = sumDetails(detailForms.flatMap((id) => details[id]!));
  // 第13表3①④ ← 同表1・2の明細の「負担する金額」
  const t13 = computeTable13(common, table13Pages(common, heirs.length));
  // 第15表①〜㉘ ← 付表の細目ごとの合計。転記になる欄は手入力の残りを混ぜないよう毎回空に戻す。
  const t15 = sumTable15(used, details);
  const t15Blank = Object.fromEntries(
    table15Transferred(used).flatMap((mark) => {
      const key = TABLE15_KEY_BY_MARK[mark];
      return key === undefined ? [] : [[key, '']];
    }),
  ) as Values;
  const inputs = heirs.map((h, i): Values => {
    const detail = detailTotals[i + 1] ?? 0;
    const debt = t13.debt[i + 1] ?? 0;
    const funeral = t13.funeral[i + 1] ?? 0;
    return {
      ...h,
      ...(detailForms.length === 0 ? {} : { t11v1: detail === 0 ? '' : signed(detail) }),
      t13v1: debt === 0 ? '' : str(debt),
      t13v4: funeral === 0 ? '' : str(funeral),
      ...t15Blank,
      ...Object.fromEntries(Object.entries(t15).map(([key, byNo]) => {
        const amount = byNo[i + 1] ?? 0;
        return [key, amount === 0 ? '' : signed(amount)];
      })),
    };
  });

  // 1周目: Ⓐ（⑥の合計）を確定させる
  const firstPass = inputs.map((h) => computeHeir(h, 0, 0, forms));
  const totalA = firstPass.reduce((s, h) => s + yen(h, 'v6'), 0);

  // 第2表: Ⓐと法定相続人から相続税の総額⑧（＝第1表⑦）を求める
  const table2 = computeTable2(common, lawful, totalA / 1000);
  const total7 = yen(table2.totals, 't7');

  // 2周目: 確定したⒶ・⑦で⑧以降を計算する。第11表の項番は入力順の通し番号。
  const pass2: Values[] = inputs.map((h, i) => ({ ...computeHeir(h, total7, totalA, forms), t11no: str(i + 1) }));

  // 第5表: 2周目で確定した配偶者の⑨⑫を使って軽減額㋩（㋬）を求める
  const spouse = used.includes('table5') ? spouseIndex(heirs) : -1;
  const table5 = computeTable5(common, pass2[spouse], totalA, total7);
  const t5v13 = filled(common, 't5a3') || filled(common, 't5v17') ? table5.t5s2ha : table5.t5s1ha;
  // 第4表: 2周目で確定した⑨と①②⑤から加算金額⑥を求める（⑨は⑪に依存しないので循環しない）
  const table4 = computeTable4(common, pass2, table4Pages(common));
  const t4v11 = used.includes('table4') ? table4.v11 : new Map<number, string>();

  // 3周目: 第5表㋩を配偶者の⑬へ、第4表⑥を各人の⑪へ転記して⑮⑯以降を計算し直す
  const computed: Values[] = pass2.map((h, i) => {
    const patch: Values = {
      ...(i === spouse ? { v13: t5v13 ?? '' } : {}),
      ...(t4v11.has(i) ? { v11: t4v11.get(i)! } : {}),
    };
    if (Object.keys(patch).length === 0) return h;
    return { ...computeHeir({ ...inputs[i]!, ...patch }, total7, totalA, forms), t11no: str(i + 1) };
  });

  const totals: Values = { ...table2.totals, ...table5 };
  for (const key of TOTAL_ROWS) {
    const sum = computed.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : str(sum);
  }
  for (const key of SIGNED_TOTAL_ROWS) {
    const sum = computed.reduce((s, h) => s + num(h[key]), 0);
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
    computeNonTaxableLimit(common, 't9', table9Pages(common), TABLE9_ROWS, heirCount),
    computeNonTaxableLimit(common, 't10', table10Pages(common), TABLE10_ROWS, heirCount),
  );
  // 第4表（相続税額の加算金額）。⑥は上で求めた各人の⑪への転記元
  Object.assign(totals, table4.totals);
  // 第6表（未成年者控除・障害者控除）。③⑤は3周目で確定した第1表の⑨〜⑬を引く
  Object.assign(totals, computeTable6(common, computed));
  // 第7表（相次相続控除）。⑧Ⓑは第1表④の合計、⑩は各人の④
  Object.assign(totals, computeTable7(common, computed, num(totals.v4)));
  // 第11・11の2表の付表1（小規模宅地等）と、その別表1
  const f1Sheets = details.table1112f1b ?? [];
  Object.assign(totals, computeTable1112f1b(f1Sheets), computeTable1112f1(details.table1112f1 ?? [], f1Sheets));

  return { heirs: computed, lawful: table2.lawful, totals };
}
