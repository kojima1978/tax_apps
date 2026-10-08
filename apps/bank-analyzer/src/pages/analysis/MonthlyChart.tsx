// 月次入出金の棒グラフ。Django 版は Plotly（約3.5MB）で描いていたが、出しているのは
// 出金・入金の2本の棒と「最大取引月」の印だけなので SVG で描く。
// 最大取引月は相続開始月以降を除いた中から選ぶ（Django 版と同じ）

import { useMemo, useState } from 'react';
import { num } from '../../lib/format';
import type { OverviewData } from './types';

type Monthly = OverviewData['chartMonthly'];

const HEIGHT = 320;
const MARGIN = { top: 36, right: 16, bottom: 64, left: 64 };
const BAND_MIN = 34; // 1か月ぶんの最小の幅（これより狭くなるなら横に流す）
const COLORS = { out: '#dc2626', in: '#2563eb' };
const RANGES = [
  { months: 0, label: '全期間' },
  { months: 12, label: '直近12か月' },
] as const;

// 目盛りの刻み（1・2・5 × 10のべき）
export function niceStep(max: number, ticks = 4): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

// 目盛りの文字（円の桁が多いので万・億で縮める）
export function axisLabel(v: number): string {
  if (v >= 1e8) return `${+(v / 1e8).toFixed(2)}億`;
  if (v >= 1e4) return `${+(v / 1e4).toFixed(1)}万`;
  return num(v);
}

// 最大取引月（出金＋入金が最大の月。相続開始月以降は除く）。該当が無ければ -1
export function maxMonthIndex(monthKeys: readonly string[], out: readonly number[], inn: readonly number[], startMonth: string): number {
  let best = -1;
  let bestValue = 0;
  monthKeys.forEach((key, i) => {
    if (startMonth && key >= startMonth) return;
    const v = out[i]! + inn[i]!;
    if (v > bestValue) {
      best = i;
      bestValue = v;
    }
  });
  return best;
}

export function MonthlyChart({ data }: { data: Monthly }) {
  const [range, setRange] = useState<number>(0);

  const view = useMemo(() => {
    const start = range > 0 ? Math.max(0, data.months.length - range) : 0;
    const months = data.months.slice(start);
    const out = data.out.slice(start);
    const inn = data.in.slice(start);
    const keys = data.monthKeys.slice(start);
    return { months, out, inn, maxIndex: maxMonthIndex(keys, out, inn, data.inheritanceStartMonth) };
  }, [data, range]);

  if (data.months.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-slate-500">
        {data.inheritanceStartMonth ? '相続開始月より前の取引データがありません' : '表示できる月次データがありません'}
      </p>
    );
  }

  const n = view.months.length;
  const band = Math.max(BAND_MIN, 640 / n);
  const width = MARGIN.left + MARGIN.right + band * n;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const peak = Math.max(1, ...view.out, ...view.inn);
  const step = niceStep(peak);
  const top = Math.ceil(peak / step) * step;
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const barW = Math.min(18, band * 0.36);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-slate-600" aria-hidden="true">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS.out }} />
            出金
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS.in }} />
            入金
          </span>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="グラフの表示期間">
          {RANGES.map((r) => (
            <button
              key={r.months}
              type="button"
              aria-pressed={range === r.months}
              onClick={() => setRange(r.months)}
              className={`px-3 py-1 text-xs ${range === r.months ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label="月次の出金額と入金額を比較する棒グラフ（数値は下の「表形式のデータ」にあります）"
          className="max-w-none text-slate-500"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
              <text x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="currentColor">
                {axisLabel(t)}
              </text>
            </g>
          ))}
          {view.months.map((label, i) => {
            const cx = MARGIN.left + band * i + band / 2;
            const out = view.out[i]!;
            const inn = view.inn[i]!;
            return (
              <g key={label}>
                <rect x={cx - barW} y={y(out)} width={barW} height={y(0) - y(out)} fill={COLORS.out} opacity={0.85}>
                  <title>{`${label} 出金 ${num(out)}円`}</title>
                </rect>
                <rect x={cx} y={y(inn)} width={barW} height={y(0) - y(inn)} fill={COLORS.in} opacity={0.85}>
                  <title>{`${label} 入金 ${num(inn)}円`}</title>
                </rect>
                <text
                  x={cx}
                  y={HEIGHT - MARGIN.bottom + 12}
                  fontSize={11}
                  fill="currentColor"
                  textAnchor="end"
                  transform={`rotate(-45 ${cx} ${HEIGHT - MARGIN.bottom + 12})`}
                >
                  {label}
                </text>
                {i === view.maxIndex && (
                  <g>
                    <text x={cx} y={y(Math.max(out, inn)) - 14} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={600}>
                      最大取引月
                    </text>
                    <path d={`M${cx - 4} ${y(Math.max(out, inn)) - 9} L${cx + 4} ${y(Math.max(out, inn)) - 9} L${cx} ${y(Math.max(out, inn)) - 3} Z`} fill="#475569" />
                  </g>
                )}
              </g>
            );
          })}
          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(0)} y2={y(0)} stroke="#94a3b8" />
        </svg>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-600">表形式のデータを表示</summary>
        <div className="mt-2 max-h-80 overflow-auto">
          <table className="table-base">
            <caption className="sr-only">月次入出金グラフの表形式データ</caption>
            <thead>
              <tr>
                <th>月</th>
                <th className="text-right">出金</th>
                <th className="text-right">入金</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m, i) => (
                <tr key={m}>
                  <th scope="row" className="font-normal">
                    {m}
                  </th>
                  <td className="text-right tabular-nums">{num(data.out[i])}</td>
                  <td className="text-right tabular-nums">{num(data.in[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
