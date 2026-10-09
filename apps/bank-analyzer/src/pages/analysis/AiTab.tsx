// 分類候補タブ（Django: _tab_ai.html・analysis_tabs.js の AISuggestions）。
// 未分類の取引の摘要を、登録済みのキーワードとあいまいに突き合わせた候補（AI ではない）。
// 摘要ごとのまとめ（既定）と1件ずつの一覧、候補に出す下限、信頼度での一括適用、パターンの管理。
//
// Django 版との違い（直したもの）:
// - 「閾値」のスライダーは URL に値を載せるだけで、計算側が設定の閾値で上書きしていたため、
//   何を選んでも同じ候補が出ていた。「候補に出す下限」として URL（cutoff）からサーバーへ渡す
// - 「95%以上／85%以上を一括適用」は、画面の候補ではなく自動分類の規則を当てていたため、
//   画面に出ていない分類になることがあった。画面と同じ第1候補を当て、件数を先に出す
// - 「却下」で未分類の件数と進み具合が減っていた（取引は未分類のまま）。却下は画面から
//   外すだけで、件数には触らない
// - このタブを開いている間だけ、画面上部の「未分類」「分類候補」の件数が別の数え方に
//   置き換わっていた（server/services/dashboard.ts）

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCheck, CircleCheck, EyeOff, Layers, Lightbulb, List, RotateCcw, SlidersHorizontal, Tags } from 'lucide-react';
import { ConfirmDialog } from '../../components/Dialog';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import { PatternManager, type PatternChange, type PatternSaveResult } from './PatternManager';
import { PatternAddDialog, type PatternApplied, type PatternTarget } from './TxDialogs';
import type { AiGroup, AiSuggestion } from '../../../server/lib/aggregate';
import type { DashboardSummary, TabData } from './types';

type Props = { dash: DashboardSummary & TabData['ai']; reload: () => void };

const HIGH = 95;
const MID = 85;
const SHOWN_LIMIT = 100;
const RELOAD_DELAY_MS = 800;
const CUTOFF_MIN = 50;

type Alt = { category: string; score: number };
// まとめ・1件ずつのどちらの行も、当てる取引と候補で表す
type Row = { key: string; description: string; txIds: number[]; category: string; score: number; alternatives: Alt[] };
type Confirm = { row: Row; category: string };

// 信頼度は小数で届く（22.22…）。表示だけ丸め、判定は元の値で行う
const pct = (score: number) => Math.round(score);
const scoreTone = (score: number) => (score >= HIGH ? 'bg-emerald-500' : score >= MID ? 'bg-blue-500' : 'bg-amber-500');

export function AiTab({ dash, reload }: Props) {
  const caseId = dash.case.id;
  const notice = useNotice();
  const { busy, run } = useAction();
  const [params, setParams] = useSearchParams();
  const flat = params.get('view') === 'flat';

  // 当てた取引は読み直すまで先に隠す。却下は件数に触らないので、読み直しても隠したまま
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [lastData, setLastData] = useState(dash.aiSuggestions);
  if (lastData !== dash.aiSuggestions) {
    setLastData(dash.aiSuggestions);
    setApplied(new Set());
  }
  const hidden = (id: number) => applied.has(id) || dismissed.has(id);

  const [cutoff, setCutoff] = useState(dash.suggestionCutoff);
  const [lastCutoff, setLastCutoff] = useState(dash.suggestionCutoff);
  if (lastCutoff !== dash.suggestionCutoff) {
    setLastCutoff(dash.suggestionCutoff);
    setCutoff(dash.suggestionCutoff);
  }

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<number | null>(null);
  const [patternTarget, setPatternTarget] = useState<(PatternTarget & { row: Row }) | null>(null);

  const pending = useRef(0);
  const reloadTimer = useRef<number | undefined>(undefined);
  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => pending.current === 0 && reload(), RELOAD_DELAY_MS);
  }, [reload]);
  useEffect(() => () => window.clearTimeout(reloadTimer.current), []);

  const byTx = useMemo(() => new Map(dash.aiSuggestions.map((s) => [s.txId, s])), [dash.aiSuggestions]);

  // まとめの行（隠した取引を除き、件数と合計を数え直す）
  const groups = useMemo(
    () =>
      dash.aiGroups
        .map((g) => {
          const txIds = g.txIds.filter((id) => !hidden(id));
          const txs = txIds.map((id) => byTx.get(id)).filter((s): s is AiSuggestion => s !== undefined);
          return { ...g, txIds, count: txIds.length, totalOut: txs.reduce((n, s) => n + s.amountOut, 0), totalIn: txs.reduce((n, s) => n + s.amountIn, 0), txs };
        })
        .filter((g) => g.count > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dash.aiGroups, byTx, applied, dismissed],
  );
  const rows = useMemo(() => dash.aiSuggestions.filter((s) => !hidden(s.txId)), [dash.aiSuggestions, applied, dismissed]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownCount = groups.reduce((n, g) => n + g.count, 0);

  const groupRow = (g: AiGroup): Row => ({
    key: `${g.description}\u0000${g.suggestedCategory}`,
    description: g.description,
    txIds: g.txIds,
    category: g.suggestedCategory,
    score: g.score,
    alternatives: g.alternativeSuggestions,
  });
  const txRow = (s: AiSuggestion): Row => ({
    key: String(s.txId),
    description: s.description,
    txIds: [s.txId],
    category: s.suggestedCategory,
    score: s.score,
    alternatives: s.alternativeSuggestions,
  });

  const hide = (setter: typeof setApplied, ids: Iterable<number>) =>
    setter((s) => {
      const n = new Set(s);
      for (const id of ids) n.add(id);
      return n;
    });

  // ---- 当てる ----

  const applyRow = async (row: Row, category: string) => {
    setConfirm(null);
    pending.current += 1;
    try {
      const res = await run(`apply:${row.key}`, () =>
        row.txIds.length === 1
          ? api.post<{ count: number }>(`/cases/${caseId}/classify/suggestion`, { txId: row.txIds[0], category })
          : api.post<{ count: number }>(`/cases/${caseId}/categories/bulk`, {
              updates: Object.fromEntries(row.txIds.map((id) => [String(id), category])),
              sourceTab: 'ai',
            }),
      );
      if (!res) return;
      hide(setApplied, row.txIds);
      notice.success(row.txIds.length === 1 ? `「${category}」に分類しました` : `「${row.description}」${num(res.count)}件を「${category}」に分類しました`);
    } finally {
      pending.current -= 1;
      scheduleReload();
    }
  };

  // 第1候補で95%以上ならそのまま、それ以外（下位の候補を選んだときも）は確かめてから
  const askApply = (row: Row, category: string) => {
    if (category === row.category && row.score >= HIGH) void applyRow(row, category);
    else setConfirm({ row, category });
  };

  const applyBulk = async () => {
    const minScore = bulkConfirm;
    setBulkConfirm(null);
    if (minScore === null) return;
    const res = await run('bulk', () => api.post<{ count: number; message: string }>(`/cases/${caseId}/classify/bulk-suggestions`, { minScore }));
    if (!res) return;
    notice.success(res.message);
    reload();
  };

  const onPatternApplied = (res: PatternApplied) => {
    // サーバーが当てた取引をそのまま隠す（照合の規則はサーバーにだけ置く）
    hide(setApplied, res.txIds);
    scheduleReload();
  };

  const dismiss = (row: Row) => {
    hide(setDismissed, row.txIds);
    notice.success(`${row.txIds.length > 1 ? `${num(row.txIds.length)}件の` : ''}候補を一覧から外しました（取引は未分類のままです。画面を開き直すと戻ります）`);
  };

  // ---- 表示の切り替え・下限 ----

  const setParam = (key: string, value: string | null) => {
    const q = new URLSearchParams(params);
    if (value === null) q.delete(key);
    else q.set(key, value);
    setParams(q);
  };
  const applyCutoff = (v: number) => setParam('cutoff', v === dash.defaultCutoff ? null : String(v));

  const savePatterns = (changes: PatternChange[]) => api.post<PatternSaveResult>(`/cases/${caseId}/patterns/bulk`, { changes });

  const actions = (row: Row) => ({
    busy: busy === `apply:${row.key}`,
    disabled: busy !== null,
    onApply: (category: string) => askApply(row, category),
    onPattern: () =>
      setPatternTarget({
        description: row.description,
        category: row.category,
        apply: true,
        scope: 'case',
        note: `この摘要の候補: ${num(row.txIds.length)}件。キーワードを含むこの案件の未分類はすべて分類されます。`,
        row,
      }),
    onDismiss: () => dismiss(row),
  });

  // 下限を下げれば出る候補。いちばん高い点まで下げる先を出す（それより下は似ていないものが増える）
  const hiddenBest = dash.hiddenScores[0];
  const reveal = hiddenBest === undefined ? null : { cutoff: Math.floor(hiddenBest), count: dash.hiddenScores.filter((n) => n >= Math.floor(hiddenBest)).length };

  const bulk95 = dash.bulkCounts[String(HIGH)] ?? 0;
  const bulk85 = dash.bulkCounts[String(MID)] ?? 0;

  return (
    <div className="space-y-3">
      {dash.targetCount === 0 ? (
        <section className="card flex flex-col items-center gap-2 px-4 py-12 text-center" role="status">
          <CircleCheck size={40} className="text-emerald-600" aria-hidden="true" />
          <p className="text-lg font-semibold">すべての取引が分類されています</p>
          <p className="text-sm text-slate-600">候補を出す未分類の取引はありません{dash.flaggedCount > 0 ? '（付箋付きの取引は対象外です）' : ''}。</p>
        </section>
      ) : (
        <>
          <section className="card space-y-3 p-4" aria-label="分類候補の概要">
            <div className="flex flex-wrap items-start gap-3">
              <Lightbulb size={20} className="mt-0.5 text-blue-700" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  未分類 <strong className="tabular-nums">{num(dash.targetCount)}</strong>件（付箋付きを除く）の摘要を、登録済みのキーワードと突き合わせた候補です。
                </p>
                <p className="text-xs text-slate-600">
                  摘要にキーワードをそのまま含む取引は
                  <Link to={`/cases/${caseId}/classify`} className="mx-1 text-blue-700 underline">
                    自動分類のプレビュー
                  </Link>
                  で、当たる分類を確かめてからまとめて当てられます。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null || bulk95 === 0} onClick={() => setBulkConfirm(HIGH)}>
                <CheckCheck size={14} />
                {HIGH}%以上を一括適用（{num(bulk95)}件）
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null || bulk85 === 0} onClick={() => setBulkConfirm(MID)}>
                {MID}%以上を一括適用（{num(bulk85)}件）
              </button>
              <span className="text-xs text-slate-500">一括適用は表示の下限に関わらず、未分類の全件が対象です。</span>
            </div>
            <form
              className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                applyCutoff(cutoff);
              }}
            >
              <SlidersHorizontal size={14} className="text-slate-500" aria-hidden="true" />
              <label htmlFor="aiCutoff">候補に出す下限</label>
              <input
                id="aiCutoff"
                type="range"
                min={Math.min(CUTOFF_MIN, dash.defaultCutoff, dash.suggestionCutoff)}
                max={100}
                step={1}
                value={cutoff}
                onChange={(e) => setCutoff(Number(e.target.value))}
                className="w-40"
                aria-valuetext={`${cutoff}%`}
              />
              <output htmlFor="aiCutoff" className="w-10 tabular-nums">
                {cutoff}%
              </output>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={cutoff === dash.suggestionCutoff}>
                再表示
              </button>
              {dash.suggestionCutoff !== dash.defaultCutoff && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyCutoff(dash.defaultCutoff)}>
                  <RotateCcw size={14} />
                  既定（{dash.defaultCutoff}%）に戻す
                </button>
              )}
              <small className="text-slate-500">既定は設定の「あいまい一致のしきい値」から10引いた値です</small>
            </form>
          </section>

          <section className="card" aria-label="分類候補の一覧">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                {flat ? (
                  <>
                    <strong className="tabular-nums">{num(rows.length)}</strong>件
                  </>
                ) : (
                  <>
                    <strong className="tabular-nums">{num(groups.length)}</strong>グループ / <strong className="tabular-nums">{num(shownCount)}</strong>件
                  </>
                )}
                <small className="ml-2 text-slate-500">
                  下限 {dash.suggestionCutoff}%{dash.hiddenScores.length > 0 && `（下限未満 ${num(dash.hiddenScores.length)}件）`}
                </small>
              </span>
              <div className="flex rounded-md border border-slate-300" role="group" aria-label="表示の切り替え">
                {(
                  [
                    [false, '摘要ごと', Layers],
                    [true, '1件ずつ', List],
                  ] as const
                ).map(([f, label, Icon]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={flat === f}
                    className={`flex items-center gap-1 px-3 py-1 text-sm first:rounded-l-md last:rounded-r-md ${flat === f ? 'bg-blue-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                    onClick={() => setParam('view', f ? 'flat' : null)}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {dash.targetCount > SHOWN_LIMIT && (
              <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                未分類 {num(dash.targetCount)}件のうち、新しい{SHOWN_LIMIT}件から候補を出しています。分類すると次の分が出ます。
              </p>
            )}
            {(flat ? rows.length : groups.length) === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-600" role="status">
                <p className="font-semibold">下限 {dash.suggestionCutoff}% 以上の候補はありません</p>
                {reveal ? (
                  <>
                    <p className="mt-1 text-xs">
                      下限未満に{num(dash.hiddenScores.length)}件あります（最高 {pct(hiddenBest ?? 0)}%）。信頼度が低いので、分類は1件ずつ確かめてください。
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => applyCutoff(reveal.cutoff)}>
                      <SlidersHorizontal size={14} />
                      下限を{reveal.cutoff}%にして{num(reveal.count)}件を表示
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-xs">登録済みのキーワードに似た摘要がありません。下のパターンにキーワードを登録すると候補が出ます。</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      {flat && <th className="w-24">日付</th>}
                      <th className="min-w-60">摘要</th>
                      {!flat && <th className="w-16 text-right">件数</th>}
                      <th className="w-28 text-right">{flat ? '払戻' : '払戻合計'}</th>
                      <th className="w-28 text-right">{flat ? 'お預り' : 'お預り合計'}</th>
                      <th className="min-w-48">候補</th>
                      <th className="w-32">信頼度</th>
                      <th className="w-56">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flat
                      ? rows.map((s) => {
                          const row = txRow(s);
                          return (
                            <tr key={row.key}>
                              <td className="whitespace-nowrap tabular-nums">{s.date ? warekiShort(s.date) : '－'}</td>
                              <td className="max-w-80">
                                <span className="block truncate" title={s.description}>
                                  {s.description}
                                </span>
                              </td>
                              <td className="text-right whitespace-nowrap text-red-700 tabular-nums">{s.amountOut > 0 ? num(s.amountOut) : ''}</td>
                              <td className="text-right whitespace-nowrap text-blue-700 tabular-nums">{s.amountIn > 0 ? num(s.amountIn) : ''}</td>
                              <SuggestionCells row={row} {...actions(row)} />
                            </tr>
                          );
                        })
                      : groups.map((g) => {
                          const row = groupRow(g);
                          return (
                            <tr key={row.key}>
                              <td className="max-w-96">
                                <span className="block truncate font-medium" title={g.description}>
                                  {g.description}
                                </span>
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-slate-600">対象を確認</summary>
                                  <ul className="mt-1 space-y-0.5 text-slate-600">
                                    {g.txs.map((s) => (
                                      <li key={s.txId} className="tabular-nums">
                                        {s.date ? warekiShort(s.date) : '日付なし'}・{s.amountOut > 0 ? `払戻 ${num(s.amountOut)}円` : `お預り ${num(s.amountIn)}円`}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              </td>
                              <td className="text-right tabular-nums">{num(g.count)}</td>
                              <td className="text-right text-red-700 tabular-nums">{g.totalOut > 0 ? num(g.totalOut) : ''}</td>
                              <td className="text-right text-blue-700 tabular-nums">{g.totalIn > 0 ? num(g.totalIn) : ''}</td>
                              <SuggestionCells row={row} {...actions(row)} />
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            )}
            {dismissed.size > 0 && (
              <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                <EyeOff size={14} aria-hidden="true" />
                {num(dismissed.size)}件の候補を一覧から外しています（未分類のまま）
                <button type="button" className="text-blue-700 underline" onClick={() => setDismissed(new Set())}>
                  すべて戻す
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <details className="card" open={dash.globalPatterns.length + dash.casePatterns.length === 0 || undefined}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
          <Tags size={16} className="text-slate-500" aria-hidden="true" />
          分類パターンの管理
          <small className="font-normal text-slate-500">候補と自動分類はここのキーワードから作られます</small>
        </summary>
        <div className="border-t border-slate-200 p-4">
          <PatternManager
            globalPatterns={dash.globalPatterns}
            casePatterns={dash.casePatterns}
            categories={dash.options.categories}
            save={savePatterns}
            onSaved={reload}
          />
        </div>
      </details>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && void applyRow(confirm.row, confirm.category)}
        title="候補の適用"
        confirmLabel={`${num(confirm?.row.txIds.length ?? 0)}件を分類`}
      >
        {confirm && (
          <>
            摘要「{confirm.row.description}」の{num(confirm.row.txIds.length)}件を「{confirm.category}」に分類します。
            {confirm.category === confirm.row.category && <span className="mt-1 block text-xs text-slate-500">信頼度は{pct(confirm.row.score)}%です。</span>}
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={bulkConfirm !== null}
        onClose={() => setBulkConfirm(null)}
        onConfirm={applyBulk}
        title="候補の一括適用"
        confirmLabel={`${num(bulkConfirm === HIGH ? bulk95 : bulk85)}件を分類`}
        busy={busy === 'bulk'}
      >
        信頼度{bulkConfirm}%以上の候補{num(bulkConfirm === HIGH ? bulk95 : bulk85)}件を、それぞれの第1候補の分類にします。
        <span className="mt-1 block text-xs text-slate-500">
          表示の下限や一覧から外した候補に関わらず、未分類（付箋付きを除く）の全件が対象です。上の「直前の分類変更」から元に戻せます。
        </span>
      </ConfirmDialog>
      <PatternAddDialog caseId={caseId} target={patternTarget} onClose={() => setPatternTarget(null)} onApplied={onPatternApplied} />
    </div>
  );
}

// 候補・信頼度・操作の3列（まとめと1件ずつで共通）
function SuggestionCells({
  row,
  busy,
  disabled,
  onApply,
  onPattern,
  onDismiss,
}: {
  row: Row;
  busy: boolean;
  disabled: boolean;
  onApply: (category: string) => void;
  onPattern: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <td>
        <strong className="text-sm">{row.category}</strong>
        {row.alternatives.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1" aria-label="ほかの候補">
            {row.alternatives.map((a) => (
              <button
                key={a.category}
                type="button"
                className="rounded-full border border-slate-300 px-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                title={`「${a.category}」に分類（${pct(a.score)}%）`}
                disabled={disabled}
                onClick={() => onApply(a.category)}
              >
                {a.category} <span className="tabular-nums">{pct(a.score)}%</span>
              </button>
            ))}
          </div>
        )}
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"
            role="meter"
            aria-label="信頼度"
            aria-valuenow={pct(row.score)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full ${scoreTone(row.score)}`} style={{ width: `${row.score}%` }} />
          </div>
          <span className="text-xs tabular-nums">{pct(row.score)}%</span>
        </div>
      </td>
      <td className="whitespace-nowrap">
        <button type="button" className="btn btn-primary btn-sm" disabled={disabled} aria-busy={busy} onClick={() => onApply(row.category)}>
          適用
        </button>
        <button type="button" className="btn btn-secondary btn-sm ml-1" disabled={disabled} onClick={onPattern} title="キーワードを登録して、含むものをまとめて分類">
          <Tags size={14} />
          登録して適用
        </button>
        <button type="button" className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-100" disabled={disabled} onClick={onDismiss} aria-label={`「${row.description}」の候補を一覧から外す`} title="一覧から外す（未分類のまま）">
          <EyeOff size={14} />
        </button>
      </td>
    </>
  );
}
