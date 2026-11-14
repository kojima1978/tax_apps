// 元号の無い日付（`6-08-12`・`6.8.12`・`06/08/12`）を、取込の手順3で人が元号を選んでまとめて直す（依頼27）。
//
// 通帳の1ページの画像からは元号を決めようが無いので、AI には推測させず数字のまま書かせる（指示文）。
// アプリも元号を黙って決めない ── 候補を並べて（いちばん合いそうなものを先頭に）、選ぶのは人。
//
// - 年が戻る所（`31-04-26` の次が `1-05-07`）で区切り、区切りごとに元号を選べる（元号をまたぐ通帳）。
//   年が進むだけ（`6-12-22` の次が `7-01-05`）なら区切らない（年をまたぐ通帳）
// - 候補の並び: 実在しない日になる元号は選べない。未来の日・元号の期間の外になる元号は後ろ。
//   残りは「目印」に近い順 ── 同じ口座の取込済みの取引の期間 → 相続開始日 → 今日 の最初にあるもの
// - 当てたあとの注意: 未来の日付・相続開始日より後・前の行より古い日付
//
// 既存の読める日付（西暦・元号つき和暦）は dates.ts の parseStatementDate がそのまま読む。ここが扱うのは
// それが読めなかった値のうち、上の形のものだけ（読み方は変えない）。

import { ERAS, toIsoDate, warekiShort } from '../dates.js';

export type EraChoice = 'R' | 'H' | 'S' | 'AD';

export const ERA_CHOICES: readonly { value: EraChoice; label: string }[] = [
  { value: 'R', label: '令和' },
  { value: 'H', label: '平成' },
  { value: 'S', label: '昭和' },
  { value: 'AD', label: '西暦（20xx）' },
];

export const eraLabel = (era: EraChoice): string => ERA_CHOICES.find((c) => c.value === era)!.label;

export type EralessDate = { year: number; month: number; day: number };

const ERALESS = /^(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})$/;
const ERALESS_KANJI = /^(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/;

// 年が1〜2桁で元号の無い日付なら年・月・日、違えば null（全角は NFKC で半角へ）
export function parseEralessDate(raw: string | null | undefined): EralessDate | null {
  const text = (raw ?? '').normalize('NFKC').trim();
  const m = ERALESS.exec(text) ?? ERALESS_KANJI.exec(text);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

// 元号の期間 [開始, 次の元号の開始)。西暦は期間を見ない
function eraPeriod(era: EraChoice): { start: string; end: string | null } | null {
  if (era === 'AD') return null;
  const i = ERAS.findIndex((e) => e.abbr === era);
  return { start: ERAS[i]!.start, end: i > 0 ? ERAS[i - 1]!.start : null };
}

// 元号を当てた日付（'YYYY-MM-DD'）。実在しない日（2月30日など）は null
export function eralessToIso(d: EralessDate, era: EraChoice): string | null {
  if (d.year < 1) return null;
  const year = era === 'AD' ? 2000 + d.year : ERAS.find((e) => e.abbr === era)!.firstYear + d.year - 1;
  return toIsoDate(year, d.month, d.day);
}

// 元号の期間の外（`R1.4.26` は平成の日、`H31.5.7` は令和の日）
export function outsideEra(iso: string, era: EraChoice): boolean {
  const p = eraPeriod(era);
  return p !== null && (iso < p.start || (p.end !== null && iso >= p.end));
}

// 年が戻る所で区切る（元号が変わったかもしれない所）。並びは渡した順のまま
export function eraSegments<T extends { date: EralessDate }>(rows: readonly T[]): T[][] {
  const out: T[][] = [];
  for (const r of rows) {
    const cur = out[out.length - 1];
    const prev = cur?.[cur.length - 1];
    if (!cur || !prev || r.date.year < prev.date.year) out.push([r]);
    else cur.push(r);
  }
  return out;
}

export type EraContext = {
  // 同じ口座の取込済みの取引の期間（無ければ null）
  existing: { from: string; to: string } | null;
  // 相続開始日（案件の基準日）
  referenceDate: string | null;
  today: string;
};

export type EraOption = {
  era: EraChoice;
  label: string;
  from: string | null;
  to: string | null;
  // 実在しない日になる行の数（1つでもあれば選べない）
  impossible: number;
  future: number;
  outside: number;
  // 目印からの離れ（日）。目印の期間と重なれば 0
  distance: number;
};

const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// 何を目印に並べたか（画面の「候補」の説明に出す）
export function eraAnchor(ctx: EraContext): { from: string; to: string; text: string } {
  if (ctx.existing)
    return { ...ctx.existing, text: `この口座の取込済みの取引（${warekiShort(ctx.existing.from)}〜${warekiShort(ctx.existing.to)}）に近い` };
  if (ctx.referenceDate)
    return { from: ctx.referenceDate, to: ctx.referenceDate, text: `相続開始日（${warekiShort(ctx.referenceDate)}）に近い` };
  return { from: ctx.today, to: ctx.today, text: '今日に近い' };
}

// 選べる元号を、合いそうな順に並べる（先頭が候補。決めるのは人）
export function rankEras(dates: readonly EralessDate[], ctx: EraContext): EraOption[] {
  const anchor = eraAnchor(ctx);
  const options = ERA_CHOICES.map(({ value: era, label }): EraOption => {
    const isos = dates.map((d) => eralessToIso(d, era));
    const ok = isos.filter((x): x is string => x !== null).sort();
    const from = ok[0] ?? null;
    const to = ok[ok.length - 1] ?? null;
    const distance =
      from === null || to === null ? Number.MAX_SAFE_INTEGER : to < anchor.from ? days(to, anchor.from) : from > anchor.to ? days(anchor.to, from) : 0;
    return {
      era,
      label,
      from,
      to,
      impossible: isos.length - ok.length,
      future: ok.filter((x) => x > ctx.today).length,
      outside: ok.filter((x) => outsideEra(x, era)).length,
      distance,
    };
  });
  const rank = (o: EraOption) => [o.impossible > 0 ? 1 : 0, o.future > 0 || o.outside > 0 ? 1 : 0, o.distance] as const;
  // 同じなら ERA_CHOICES の並び（Array.prototype.sort は安定）
  return options.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
}

export type EraWarning = { key: number; text: string };

// 元号を当てた行の注意。並びは画面の並び（前の行より古いかは、日付のある直前の行と比べる）
export function eraWarnings(
  rows: readonly { key: number; date: string; eraFilled: EraChoice | null }[],
  ctx: Pick<EraContext, 'referenceDate' | 'today'>,
): EraWarning[] {
  const out: EraWarning[] = [];
  let prev: string | null = null;
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (r.eraFilled !== null) {
      const texts = [
        ...(r.date > ctx.today ? ['未来の日付'] : []),
        ...(ctx.referenceDate && r.date > ctx.referenceDate ? [`相続開始日（${warekiShort(ctx.referenceDate)}）より後`] : []),
        ...(prev !== null && r.date < prev ? [`前の行（${warekiShort(prev)}）より古い`] : []),
        ...(outsideEra(r.date, r.eraFilled) ? [`${eraLabel(r.eraFilled)}の期間の外`] : []),
      ];
      for (const text of texts) out.push({ key: r.key, text });
    }
    prev = r.date;
  }
  return out;
}
