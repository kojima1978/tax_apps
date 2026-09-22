/**
 * 様式の枚数。1枚に載る行数・人数が決まっているので、入力量から必要枚数が決まる。
 *
 * どの様式も「最低枚数」（入力済みの明細と人数から決まる下限）と、共通欄に持つ
 * 手動の枚数の大きい方をとる。下限を下回れると、用紙に出ていない行が集計にだけ効く。
 */

import { TABLE10_DETAIL_FORM, TABLE10_ROWS } from '../../forms/table10';
import {
  TABLE13_DEBT_FORM, TABLE13_DEBT_ROWS, TABLE13_FUNERAL_FORM, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS,
} from '../../forms/table13';
import {
  TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_FORM, TABLE14_DONATION_ROWS, TABLE14_GIFT_FORM,
  TABLE14_GIFT_ROWS,
} from '../../forms/table14';
import { TABLE9_DETAIL_FORM, TABLE9_ROWS } from '../../forms/table9';
import { isEmptyDetail } from './detail';
import { type Values, num } from './values';

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
