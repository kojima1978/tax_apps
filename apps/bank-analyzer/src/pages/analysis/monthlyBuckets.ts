// 月次入出金グラフの棒の組み立て（画面だけの決めごと。集計そのものはサーバの monthlyCashflow）。
//
// - サーバは取引のあった月だけを返す。グラフは時間の長さが見た目に出るよう、間の月を0で埋める
// - 年ごとは月ごとを畳むだけ（数え方は月ごとと同じ。相続開始月以降はサーバの段階で入っていない）
// - 棒を押すと取引一覧へ移る。そのときの期間（from〜to）は棒の金額と同じ取引を拾うように作る
//   （相続開始の年は相続開始月の前日まで）
// - 突出した月で縦軸がつぶれるときは、上限で切って実額を添える（対数軸にはしない）

import { warekiMonthShort, warekiYearAbbr } from '../../../server/lib/dates';
import type { OverviewData } from './types';

type Monthly = OverviewData['chartMonthly'];

export type Unit = 'month' | 'year';

export type Bucket = {
  // 月は 'YYYY-MM'、年は 'YYYY'
  key: string;
  // 棒の下の文字（和暦）
  label: string;
  // 年の棒で、その年の途中から・途中までのとき（「7月から」「相続開始まで」）。月は空
  note: string;
  out: number;
  in: number;
  // 取引一覧へ渡す期間（両端を含む）
  from: string;
  to: string;
};

// 年ごとを既定にする長さ（この月数を超えたら）
export const YEARLY_DEFAULT_OVER_MONTHS = 60;

const pad2 = (n: number) => String(n).padStart(2, '0');

function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return `${key}-${pad2(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}

function nextMonth(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`;
}

// 'YYYY-MM' の前日（相続開始月の1日の前日 = 前月の末日）
function dayBeforeMonth(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
  return monthEnd(prev);
}

// 最初の月から最後の月まで、取引の無い月を0で埋めた月ごとの棒
export function monthBuckets(data: Monthly): Bucket[] {
  const keys = data.monthKeys;
  if (keys.length === 0) return [];
  const byKey = new Map(keys.map((k, i) => [k, i]));
  const out: Bucket[] = [];
  for (let key = keys[0]!; key <= keys[keys.length - 1]!; key = nextMonth(key)) {
    const i = byKey.get(key);
    out.push({
      key,
      label: warekiMonthShort(`${key}-01`),
      note: '',
      out: i === undefined ? 0 : data.out[i]!,
      in: i === undefined ? 0 : data.in[i]!,
      from: `${key}-01`,
      to: monthEnd(key),
    });
  }
  return out;
}

// 月ごとの棒を年に畳む。startMonth は相続開始月（'YYYY-MM'、未設定は空）
export function yearBuckets(months: readonly Bucket[], startMonth: string): Bucket[] {
  const years = new Map<string, Bucket & { first: number; last: number }>();
  for (const b of months) {
    const year = b.key.slice(0, 4);
    const m = Number(b.key.slice(5, 7));
    const y = years.get(year);
    if (y) {
      y.out += b.out;
      y.in += b.in;
      y.last = m;
      continue;
    }
    years.set(year, {
      key: year,
      label: `${warekiYearAbbr(Number(year))}年`,
      note: '',
      out: b.out,
      in: b.in,
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      first: m,
      last: m,
    });
  }
  return [...years.values()].map(({ first, last, ...b }) => {
    const notes: string[] = [];
    if (first !== 1) notes.push(`${first}月から`);
    if (startMonth && startMonth.startsWith(`${b.key}-`)) {
      notes.push('相続開始まで');
      b.to = dayBeforeMonth(startMonth);
    } else if (last !== 12) {
      notes.push(`${last}月まで`);
    }
    return { ...b, note: notes.join('・') };
  });
}

// 表示期間（0 は全期間）。月ごとは最後の月から数えた月数、年ごとは年数（月数 ÷ 12）
export function sliceRange(buckets: readonly Bucket[], unit: Unit, months: number): Bucket[] {
  if (months <= 0) return [...buckets];
  const count = unit === 'year' ? Math.ceil(months / 12) : months;
  return buckets.slice(Math.max(0, buckets.length - count));
}

// 最大の棒（出金＋入金が最大）。すべて0なら -1。
// 相続開始月以降はサーバの段階で外してあるので、ここでは見ない
export function maxBucketIndex(buckets: readonly Bucket[]): number {
  let best = -1;
  let bestValue = 0;
  buckets.forEach((b, i) => {
    const v = b.out + b.in;
    if (v > bestValue) {
      best = i;
      bestValue = v;
    }
  });
  return best;
}

// 目盛りの刻み（1・2・5 × 10のべき）
export function niceStep(max: number, ticks = 4): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

const niceCeil = (v: number) => {
  const step = niceStep(v);
  return Math.ceil(v / step) * step;
};

// 縦軸の上限を切るか。切るなら上限の値、切らないなら null。
// 上位 5%（最低1本）を除いた最大の棒の3倍を超える棒があるときだけ、その棒の 1.2 倍で切る
export function axisCap(buckets: readonly Bucket[]): number | null {
  const peaks = buckets
    .map((b) => Math.max(b.out, b.in))
    .filter((v) => v > 0)
    .sort((a, b) => b - a);
  if (peaks.length < 4) return null;
  const base = peaks[Math.max(1, Math.floor(peaks.length * 0.05))]!;
  if (peaks[0]! <= base * 3) return null;
  return niceCeil(base * 1.2);
}

// 目盛り・突出した棒に添える金額（円の桁が多いので万・億で縮める）
export function axisLabel(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}億`;
  if (v >= 1e4) return `${(v / 1e4).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
  return v.toLocaleString('ja-JP');
}

// 既定の単位（5年を超える長さは年ごと）
export const defaultUnit = (monthCount: number): Unit => (monthCount > YEARLY_DEFAULT_OVER_MONTHS ? 'year' : 'month');
