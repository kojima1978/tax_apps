/**
 * 財産・債務の価額に関わる様式。
 * 第9表・第10表（非課税）、第11の2表、第11・11の2表の付表1、第13表、第14表、第15表。
 */

import { DETAIL_KINDS, codeNames } from '../../data/detailCodes';
import { TABLE10_DETAIL_FORM } from '../../forms/table10';
import { TABLE1112F1_RATE } from '../../forms/table1112f1';
import { SLOTS_BY_KIND, SLOTS_BY_ROW, TABLE1112F1B_OWNERS, TABLE1112F1B_ROWS } from '../../forms/table1112f1b';
import { TABLE112_ROWS } from '../../forms/table112';
import { TABLE13_DEBT_FORM, TABLE13_FUNERAL_FORM } from '../../forms/table13';
import {
  TABLE14_BEQUEST_FORM, TABLE14_DONATION_FORM, TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS, TABLE14_PERSONS,
} from '../../forms/table14';
import { TABLE15_KEY_BY_MARK, table15Key } from '../../forms/table15';
import { TABLE9_DETAIL_FORM } from '../../forms/table9';
import { detailShares, resolveDetail } from './detail';
import { heirNosOfLawfulHeirs } from './lawful';
import { table112Pages } from './pages';
import { SCALE, type Values, area, filled, num, signed, str } from './values';

/**
 * 第11の2表1（相続時精算課税適用財産の明細）の計算。値はその人の欄（'h0.' スコープ）に持つ。
 *
 * 行数はその人の用紙の枚数で決まる（`t112Pages`）。枚数を減らしたときに残る入力値を
 * 合計に混ぜないよう、表に出ている行番号だけを走査する（値そのものは消さないので、
 * 枚数を戻せば元の記入内容が戻る）。
 * ⑧⑨⑩はその人の全枚数を通した合計で、表示は最終ページにだけ出す。
 */
export function computeTable112(h: Values): Values {
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
export function computeTable13(details: Record<string, Values[]>): Table13 {
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
export function computeNonTaxableLimit(
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
export function derivedTable11f4(
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
 * ①〜㉘は付表からの転記（`sumTable15` が入れる）、㉛㉝㉞㊲は他の様式からの転記。
 * ⑧⑨（⑥のうち特例農地等）は第12表が未実装なので入力させない（＝手入力の残る欄は無い）。
 * 値はその人の欄（'h0.' スコープ）に持ち、「各人の合計」列は横計（`TOTAL_ROWS`）で作る。
 */
export function computeTable15(h: Values): Values {
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

/**
 * 第15表で手入力にしない欄（丸番号）。読み取り専用にするほか、
 * 転記元が無くなったときに古い値が残らないよう毎回空に戻す先でもある。
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
  // ㉛は第11の2表、㊲は第14表からしか入らない欄なので、その様式を使っていなくても手入力にはしない
  marks.add('㉛').add('㊲');
  if (used.includes('table13')) marks.add('㉝').add('㉞');
  return [...marks];
}

/**
 * 第15表①〜㉘ ← 付表の「分割が確定した財産」。細目コードごとの転記先はコード表が持つ。
 * 添字は財産を取得した人の番号（1始まり）で、返すのは行キーごとの人別合計。
 */
export function sumTable15(used: readonly string[], details: Record<string, Values[]>): Record<string, number[]> {
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

/**
 * 第11・11の2表の付表1（別表1）の「1 持分に応じた宅地等」と
 * 「3 特例の対象とならない宅地等（1−2）」を計算する。
 * 1 ＝ A〜Fの面積・評価額 × 持分割合（評価額は円未満切捨て）、3 ＝ 1 − 2。
 * B行は2欄が上下2段に分かれるので、3欄からは2段の合計を引く。
 */
export function computeTable1112f1b(sheets: Values[]): Values {
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
export function computeTable1112f1(items: Values[], sheets: Values[]): Values {
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
export function computeTable14(common: Values, details: Record<string, Values[]>, pages: number): Table14 {
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
