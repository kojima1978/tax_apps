// 月次入出金の棒グラフ（SVG）。棒の組み立ては monthlyBuckets.ts。
//
// - 長い案件（20年分など）は年ごとを既定にし、月ごとでも開いた直後は新しい側（基準日の直前）を見せる
// - 縦軸は左に固定し、棒だけを横に流す。いまどこを見ているかは上の帯に和暦で出す
// - 突出した棒で縦軸がつぶれるときは上限で切り、切った棒には切れ目と実額を描く
// - 棒を押すとその月（年）の取引一覧へ。キーボードでは下の表の月（年）から移れる
// - 出金と入金は色に加えて塗り（出金）と斜線（入金）でも分ける

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { num } from '../../lib/format';
import {
  axisCap,
  axisLabel,
  defaultUnit,
  maxBucketIndex,
  monthBuckets,
  niceStep,
  sliceRange,
  yearBuckets,
  type Bucket,
  type Unit,
} from './monthlyBuckets';
import type { OverviewData } from './types';

type Monthly = OverviewData['chartMonthly'];

const HEIGHT = 320;
const TOP = 30;
const BOTTOM = { month: 58, year: 44 } as const;
const AXIS_W = 60;
// 1本ぶんの最小の幅（これより狭くなるなら横に流す）
const BAND_MIN = { month: 34, year: 56 } as const;
const COLORS = { out: '#dc2626', in: '#2563eb' };
const UNITS: readonly { unit: Unit; label: string }[] = [
  { unit: 'month', label: '月ごと' },
  { unit: 'year', label: '年ごと' },
];
const RANGES = [
  { months: 12, label: '直近12か月' },
  { months: 36, label: '3年' },
  { months: 84, label: '7年' },
  { months: 0, label: '全期間' },
] as const;
const UNIT_WORD = { month: '月', year: '年' } as const;

const listSearch = (b: Bucket) => new URLSearchParams({ tab: 'all', date_from: b.from, date_to: b.to }).toString();
const bucketName = (b: Bucket) => `${b.label}${b.note ? `（${b.note}）` : ''}`;

// 出金（塗り）・入金（斜線）の見本。凡例とグラフで同じ形を使う
function Swatch({ kind }: { kind: 'out' | 'in' }) {
  return (
    <svg width={14} height={12} aria-hidden="true" className="shrink-0">
      {kind === 'out' ? (
        <rect width={14} height={12} rx={2} fill={COLORS.out} />
      ) : (
        <>
          <rect width={14} height={12} rx={2} fill="url(#monthly-hatch-in)" />
          <rect x={0.5} y={0.5} width={13} height={11} rx={2} fill="none" stroke={COLORS.in} />
        </>
      )}
    </svg>
  );
}

export function MonthlyChart({ data }: { data: Monthly }) {
  const navigate = useNavigate();
  const months = useMemo(() => monthBuckets(data), [data]);
  const years = useMemo(() => yearBuckets(months, data.inheritanceStartMonth), [months, data.inheritanceStartMonth]);
  const [unit, setUnit] = useState<Unit>(() => defaultUnit(months.length));
  const [range, setRange] = useState<number>(0);
  const [capOn, setCapOn] = useState(true);
  const [flash, setFlash] = useState(-1);

  const view = useMemo(() => sliceRange(unit === 'year' ? years : months, unit, range), [unit, range, months, years]);
  const maxIndex = useMemo(() => maxBucketIndex(view), [view]);
  const cap = useMemo(() => axisCap(view), [view]);
  const capped = capOn && cap !== null;

  // 棒の幅は横幅いっぱいに広げ、狭くなりすぎるなら横へ流す
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(720);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWrapW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = view.length;
  const plotW = Math.max(120, wrapW - AXIS_W);
  const band = Math.max(BAND_MIN[unit], n > 0 ? plotW / n : plotW);
  const width = Math.max(plotW, band * n);
  const bottom = BOTTOM[unit];
  const plotH = HEIGHT - TOP - bottom;
  const peak = Math.max(1, ...view.map((b) => Math.max(b.out, b.in)));
  const top = capped && cap !== null ? cap : Math.ceil(peak / niceStep(peak)) * niceStep(peak);
  const step = niceStep(top);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => TOP + plotH - (Math.min(v, top) / top) * plotH;
  const barW = Math.min(unit === 'year' ? 22 : 18, band * 0.36);

  // いま見えている範囲（横に流れるときだけ出す）
  const [visible, setVisible] = useState<{ first: number; last: number; ratio: number; size: number } | null>(null);
  const updateVisible = useCallback(() => {
    const el = scrollRef.current;
    if (!el || n === 0 || el.scrollWidth <= el.clientWidth + 1) {
      setVisible(null);
      return;
    }
    const first = Math.min(n - 1, Math.max(0, Math.floor(el.scrollLeft / band + 0.3)));
    const last = Math.min(n - 1, Math.max(first, Math.ceil((el.scrollLeft + el.clientWidth) / band - 0.3) - 1));
    const room = el.scrollWidth - el.clientWidth;
    setVisible({ first, last, ratio: room > 0 ? el.scrollLeft / room : 1, size: el.clientWidth / el.scrollWidth });
  }, [n, band]);

  // 単位・期間・幅が変わったら新しい側（右端）を見せる
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
    updateVisible();
  }, [unit, range, width, updateVisible]);

  useEffect(() => {
    if (flash < 0) return;
    const t = window.setTimeout(() => setFlash(-1), 2500);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (months.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-slate-500">
        {data.inheritanceStartMonth ? '相続開始月より前の取引データがありません' : '表示できる月次データがありません'}
      </p>
    );
  }

  const changeUnit = (u: Unit) => {
    setUnit(u);
    setFlash(-1);
    // 年ごとに「直近12か月」は無い（1本になってしまう）ので3年へ
    if (u === 'year' && range === 12) setRange(36);
  };

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * scrollRef.current.clientWidth * 0.8, behavior: 'smooth' });

  const goToMax = () => {
    if (maxIndex < 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: band * maxIndex + band / 2 - el.clientWidth / 2, behavior: 'smooth' });
    setFlash(maxIndex);
  };

  const open = (b: Bucket) => navigate({ search: listSearch(b) });
  const word = UNIT_WORD[unit];

  return (
    <div>
      <svg width={0} height={0} className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="monthly-hatch-in" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={6} height={6} fill="#dbeafe" />
            <rect width={3.2} height={6} fill={COLORS.in} />
          </pattern>
        </defs>
      </svg>

      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Swatch kind="out" />
            出金（左・塗り）
          </span>
          <span className="flex items-center gap-1">
            <Swatch kind="in" />
            入金（右・斜線）
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="棒の単位">
            {UNITS.map((u) => (
              <button
                key={u.unit}
                type="button"
                aria-pressed={unit === u.unit}
                onClick={() => changeUnit(u.unit)}
                className={`px-3 py-1 text-xs ${unit === u.unit ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="グラフの表示期間">
            {RANGES.map((r) => {
              const disabled = unit === 'year' && r.months === 12;
              return (
                <button
                  key={r.months}
                  type="button"
                  aria-pressed={range === r.months}
                  disabled={disabled}
                  title={disabled ? '年ごとでは選べません（月ごとに切り替えてください）' : undefined}
                  onClick={() => setRange(r.months)}
                  className={`px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:text-slate-300 ${
                    range === r.months ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 enabled:hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={goToMax} disabled={maxIndex < 0}>
            <Crosshair size={14} aria-hidden="true" />
            最大の{word}へ
          </button>
        </div>
      </div>

      {cap !== null && (
        <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
          {capped
            ? `突出した${word}があるため、縦軸を${axisLabel(cap)}円で切っています（超える棒は切れ目を入れ、実額を棒の中に書いています）。`
            : '縦軸を最大の棒に合わせています。'}
          <button type="button" className="text-blue-700 underline print:hidden" onClick={() => setCapOn((v) => !v)}>
            {capped ? '実寸で表示' : '突出を切って表示'}
          </button>
        </p>
      )}

      {visible && (
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-600 print:hidden">
          <button type="button" className="btn btn-secondary btn-sm px-1.5" onClick={() => scrollBy(-1)} disabled={visible.ratio <= 0.001} aria-label="古い側へ送る">
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="relative h-1.5 rounded bg-slate-200" aria-hidden="true">
              <div
                className="absolute inset-y-0 rounded bg-slate-500"
                style={{ width: `${Math.max(4, visible.size * 100)}%`, left: `${visible.ratio * (100 - Math.max(4, visible.size * 100))}%` }}
              />
            </div>
            <p className="mt-0.5 truncate" aria-live="polite">
              表示中 {view[visible.first]!.label}〜{view[visible.last]!.label}（全体 {view[0]!.label}〜{view[n - 1]!.label}）
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm px-1.5" onClick={() => scrollBy(1)} disabled={visible.ratio >= 0.999} aria-label="新しい側へ送る">
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {visible && (
        // 印刷は横に流れた先を刷れないので、刷られる範囲（画面で見えている範囲）を書いておく
        <p className="mb-1 hidden text-xs text-slate-600 print:block">
          印刷は {view[visible.first]!.label}〜{view[visible.last]!.label} の範囲（全体 {view[0]!.label}〜{view[n - 1]!.label}）。全体は下の表形式のデータか「表をExcel出力」で確認できます。
        </p>
      )}

      <div ref={wrapRef} className="flex">
        <svg width={AXIS_W} height={HEIGHT} className="shrink-0 text-slate-500" aria-hidden="true">
          {ticks.map((t) => (
            <text key={t} x={AXIS_W - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="currentColor">
              {axisLabel(t)}
            </text>
          ))}
          <text x={4} y={TOP - 14} fontSize={10} fill="currentColor">
            （円）
          </text>
        </svg>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto" onScroll={updateVisible}>
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={`${word}ごとの出金額と入金額の棒グラフ（数値は下の「表形式のデータ」にあり、そこから取引一覧へ移れます）`}
            className="max-w-none text-slate-500"
          >
            {ticks.map((t) => (
              <line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            ))}
            {view.map((b, i) => {
              const x0 = band * i;
              const cx = x0 + band / 2;
              const bars = [
                { kind: 'out' as const, v: b.out, x: cx - barW, fill: COLORS.out },
                { kind: 'in' as const, v: b.in, x: cx, fill: 'url(#monthly-hatch-in)' },
              ];
              const peakTop = y(Math.max(b.out, b.in));
              return (
                <g key={b.key} className="group cursor-pointer" onClick={() => open(b)}>
                  <title>{`${bucketName(b)}　出金 ${num(b.out)}円 ／ 入金 ${num(b.in)}円（押すと取引一覧へ）`}</title>
                  <rect
                    x={x0}
                    y={TOP - 4}
                    width={band}
                    height={plotH + 4}
                    className={flash === i ? 'fill-amber-200 print:fill-transparent' : 'fill-transparent group-hover:fill-slate-100 print:fill-transparent'}
                  />
                  {bars.map((bar) =>
                    bar.v > 0 ? (
                      <g key={bar.kind}>
                        <rect x={bar.x} y={y(bar.v)} width={barW} height={y(0) - y(bar.v)} fill={bar.fill} stroke={bar.kind === 'in' ? COLORS.in : 'none'} strokeWidth={0.8} />
                        {capped && bar.v > top && (
                          <>
                            {/* 切れ目（上限を超えた棒） */}
                            <path
                              d={`M${bar.x - 2} ${TOP + 10} L${bar.x + barW + 2} ${TOP + 4} M${bar.x - 2} ${TOP + 15} L${bar.x + barW + 2} ${TOP + 9}`}
                              stroke="#fff"
                              strokeWidth={2.5}
                            />
                            <text
                              x={bar.x + barW / 2}
                              y={TOP + 20}
                              transform={`rotate(-90 ${bar.x + barW / 2} ${TOP + 20})`}
                              textAnchor="end"
                              dy="0.35em"
                              fontSize={10}
                              fontWeight={700}
                              fill="#fff"
                              stroke={COLORS[bar.kind]}
                              strokeWidth={3}
                              paintOrder="stroke"
                            >
                              {axisLabel(bar.v)}
                            </text>
                          </>
                        )}
                      </g>
                    ) : null,
                  )}
                  {i === maxIndex && (
                    <g>
                      <text x={cx} y={peakTop - 13} textAnchor="middle" fontSize={11} fill="#334155" fontWeight={700}>
                        最大
                      </text>
                      <path d={`M${cx - 4} ${peakTop - 9} L${cx + 4} ${peakTop - 9} L${cx} ${peakTop - 3} Z`} fill="#334155" />
                    </g>
                  )}
                  {unit === 'month' ? (
                    <text x={cx} y={HEIGHT - bottom + 12} fontSize={11} fill="currentColor" textAnchor="end" transform={`rotate(-45 ${cx} ${HEIGHT - bottom + 12})`}>
                      {b.label}
                    </text>
                  ) : (
                    <>
                      <text x={cx} y={HEIGHT - bottom + 15} fontSize={11} fill="currentColor" textAnchor="middle">
                        {b.label}
                      </text>
                      {b.note.split('・').map((line, k) => (
                        <text key={line || k} x={cx} y={HEIGHT - bottom + 27 + k * 11} fontSize={9} fill="currentColor" textAnchor="middle">
                          {line}
                        </text>
                      ))}
                    </>
                  )}
                </g>
              );
            })}
            <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="#94a3b8" />
          </svg>
        </div>
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-600">表形式のデータを表示（{word}を押すと取引一覧へ）</summary>
        <div className="relative mt-2 max-h-80 overflow-auto">
          <table className="table-base">
            <caption className="sr-only">{word}ごとの入出金グラフの表形式データ</caption>
            <thead>
              <tr>
                <th>{word}</th>
                <th className="text-right">出金</th>
                <th className="text-right">入金</th>
              </tr>
            </thead>
            <tbody>
              {view.map((b) => (
                <tr key={b.key}>
                  <th scope="row" className="font-normal">
                    <Link to={{ search: listSearch(b) }} className="text-blue-700 underline">
                      {bucketName(b)}
                    </Link>
                  </th>
                  <td className="text-right tabular-nums">{num(b.out)}</td>
                  <td className="text-right tabular-nums">{num(b.in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
