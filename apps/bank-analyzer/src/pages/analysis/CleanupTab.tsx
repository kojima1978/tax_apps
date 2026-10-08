// データクレンジングタブ（Django: _tab_cleanup.html と analysis_tabs.js の CleanupView・
// analysis_transactions.js のフィールド一括置換）。ID 範囲の削除と復元・値の一括置換・重複の削除。
//
// Django 版との違い（直したもの）:
// - 重複一覧の「全選択」は元の1件まで含めて全部に印を付け、そのまま消すと重複していた取引が
//   1件も残らなかった。「各組の1件目を残して選択」にし、組の全件を選んだまま消そうとすると
//   確認の画面で警告する
// - 一括置換の件数は、摘要なら取引の数、銀行名・支店名・口座番号なら口座の数だった（同じ
//   「N件」表記）。何を数えたかを書く
// - 範囲削除のプレビューは入力のたびに要求を出し、遅れて返った古い応答で上書きされることがあった。
//   最後に出した要求の応答だけを使う
// - 削除の確認は画面で見た件数（expectedCount）をサーバーへ渡し、その間に件数が変わっていたら
//   消さない（段階4）

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CircleCheck, Copy, Eraser, Layers, Replace, RotateCcw, Scissors, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/Dialog';
import { useNotice } from '../../components/Notice';
import { useAction } from '../../hooks/useAction';
import { api, errorMessage } from '../../lib/api';
import { num, warekiShort } from '../../lib/format';
import type { DashboardSummary, TabData } from './types';

type Props = { dash: DashboardSummary & TabData['cleanup']; reload: () => void };

export function CleanupTab({ dash, reload }: Props) {
  return (
    <div className="space-y-4">
      <RangeDelete caseId={dash.case.id} backup={dash.latestDeletionBackup} reload={reload} />
      <BulkReplace caseId={dash.case.id} reload={reload} />
      <Duplicates caseId={dash.case.id} rows={dash.duplicateTxs} reload={reload} />
    </div>
  );
}

const timeFormat = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' });

// ---------------------------------------------------------------------------
// ID 範囲の削除
// ---------------------------------------------------------------------------

type RangePreview = {
  startId: number;
  endId: number;
  count: number;
  sample: { id: number; date: string; description: string; amountOut: number; amountIn: number }[];
};

const PREVIEW_DELAY_MS = 300;
const CONFIRM_WORD = '削除';

function RangeDelete({ caseId, backup, reload }: { caseId: number; backup: DashboardSummary['latestDeletionBackup']; reload: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [preview, setPreview] = useState<RangePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const seq = useRef(0);

  const valid = /^\d+$/.test(startId.trim()) && /^\d+$/.test(endId.trim());
  useEffect(() => {
    const mine = ++seq.current;
    if (!valid) return;
    const timer = window.setTimeout(async () => {
      try {
        const q = new URLSearchParams({ startId: startId.trim(), endId: endId.trim() });
        const res = await api.get<RangePreview>(`/cases/${caseId}/range-delete/preview?${q}`);
        if (mine !== seq.current) return;
        setPreview(res);
        setPreviewError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        setPreview(null);
        setPreviewError(errorMessage(err));
      }
    }, PREVIEW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [caseId, startId, endId, valid]);

  const shown = valid ? preview : null;
  const canDelete = !!shown && shown.count > 0 && confirmation.trim() === CONFIRM_WORD && busy === null;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!shown || !canDelete) return;
    const res = await run('rangeDelete', () =>
      api.post<{ message: string }>(`/cases/${caseId}/range-delete`, {
        startId: shown.startId,
        endId: shown.endId,
        expectedCount: shown.count,
        confirmation: confirmation.trim(),
      }),
    );
    if (!res) return;
    notice.success(res.message);
    setStartId('');
    setEndId('');
    setConfirmation('');
    setPreview(null);
    reload();
  };

  const restore = async () => {
    if (!backup) return;
    const res = await run('restore', () => api.post<{ message: string }>(`/cases/${caseId}/range-delete/restore`, { backupId: backup.id }));
    setConfirmRestore(false);
    if (!res) return;
    notice.success(res.message);
    reload();
  };

  return (
    <section className="card p-4" aria-labelledby="rangeDeleteTitle">
      <h2 id="rangeDeleteTitle" className="mb-1 flex items-center gap-1 font-bold">
        <Scissors size={16} aria-hidden="true" />
        IDの範囲で削除
      </h2>
      <p className="mb-3 text-xs text-slate-500">取引一覧のIDで範囲を指定して、まとめて削除します。削除した取引は直前の1回分だけ復元できます。</p>

      {backup && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" role="status">
          <span>
            直前の削除: ID {backup.startId}〜{backup.endId} の{num(backup.transactionCount)}件（{timeFormat.format(new Date(backup.createdAt))}）
          </span>
          <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={() => setConfirmRestore(true)} disabled={busy !== null}>
            <RotateCcw size={14} aria-hidden="true" />
            復元する
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-600">開始ID</span>
            <input className="input w-32" inputMode="numeric" value={startId} onChange={(e) => setStartId(e.target.value)} aria-label="開始ID" />
          </label>
          <span className="pb-2">〜</span>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-600">終了ID</span>
            <input className="input w-32" inputMode="numeric" value={endId} onChange={(e) => setEndId(e.target.value)} aria-label="終了ID" />
          </label>
        </div>

        {valid && previewError && <p className="text-sm text-red-700">{previewError}</p>}
        {shown && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm" aria-live="polite">
            {shown.count === 0 ? (
              <p className="text-slate-600">ID {shown.startId}〜{shown.endId} に取引はありません。</p>
            ) : (
              <>
                <p className="mb-2">
                  ID {shown.startId}〜{shown.endId} の <strong className="text-red-700">{num(shown.count)}件</strong> が削除されます。
                  {shown.count > shown.sample.length && <span className="text-xs text-slate-500">（先頭{shown.sample.length}件を表示）</span>}
                </p>
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>日付</th>
                      <th>摘要</th>
                      <th className="text-right">出金</th>
                      <th className="text-right">入金</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.sample.map((s) => (
                      <tr key={s.id}>
                        <td className="tabular-nums">{s.id}</td>
                        <td className="whitespace-nowrap">{warekiShort(s.date)}</td>
                        <td className="max-w-64 truncate">{s.description || '-'}</td>
                        <td className="text-right tabular-nums">{s.amountOut ? num(s.amountOut) : ''}</td>
                        <td className="text-right tabular-nums">{s.amountIn ? num(s.amountIn) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {shown && shown.count > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-600">確認のため「{CONFIRM_WORD}」と入力</span>
              <input className="input w-40" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-label="確認の入力" />
            </label>
            <button type="submit" className="btn btn-danger btn-sm" disabled={!canDelete}>
              <Trash2 size={14} aria-hidden="true" />
              {num(shown.count)}件を削除
            </button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={restore}
        title="削除した取引を復元"
        confirmLabel="復元する"
        busy={busy === 'restore'}
      >
        {backup && (
          <>
            ID {backup.startId}〜{backup.endId} で削除した{num(backup.transactionCount)}件を元に戻します。同じIDの取引がすでにあるものは戻しません。
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 値の一括置換
// ---------------------------------------------------------------------------

const FIELDS = [
  ['bankName', '銀行名', '口座'],
  ['branchName', '支店名', '口座'],
  ['accountNumber', '口座番号', '口座'],
  ['description', '摘要', '取引'],
] as const;
type Field = (typeof FIELDS)[number][0];

function BulkReplace({ caseId, reload }: { caseId: number; reload: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [field, setField] = useState<Field | ''>('');
  const [values, setValues] = useState<{ value: string; count: number }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oldValue, setOldValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [version, setVersion] = useState(0);
  const newRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!field) return;
    let live = true;
    api
      .get<{ values: { value: string; count: number }[] }>(`/cases/${caseId}/field-values?field=${field}`)
      .then((res) => live && (setValues(res.values), setLoadError(null)))
      .catch((err) => live && (setValues(null), setLoadError(errorMessage(err))));
    return () => {
      live = false;
    };
  }, [caseId, field, version]);

  const meta = FIELDS.find(([f]) => f === field);
  const unit = meta?.[2] ?? '';
  const selected = values?.find((v) => v.value === oldValue);
  const trimmed = newValue.trim();
  const same = !!oldValue && trimmed === oldValue;
  const ready = !!field && !!selected && !!trimmed && !same;

  const changeField = (f: Field | '') => {
    setField(f);
    setValues(null);
    setLoadError(null);
    setOldValue('');
    setNewValue('');
  };

  const copyOld = () => {
    setNewValue(oldValue);
    requestAnimationFrame(() => newRef.current?.select());
  };

  const submit = async () => {
    if (!ready) return;
    const res = await run('replace', () => api.post<{ message: string }>(`/cases/${caseId}/bulk-replace`, { field, oldValue, newValue: trimmed }));
    setConfirm(false);
    if (!res) return;
    notice.success(res.message);
    setOldValue('');
    setNewValue('');
    setVersion((v) => v + 1);
    reload();
  };

  return (
    <section className="card p-4" aria-labelledby="replaceTitle">
      <h2 id="replaceTitle" className="mb-1 flex items-center gap-1 font-bold">
        <Replace size={16} aria-hidden="true" />
        値の一括置換
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        表記ゆれ（「〇〇銀行」と「〇〇銀」など）をまとめます。口座番号を既にある番号へ置き換えると、2つの口座を1つにまとめます。
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) setConfirm(true);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-600">項目</span>
          <select className="input w-32" value={field} onChange={(e) => changeField(e.target.value as Field | '')} aria-label="置換する項目">
            <option value="">選択</option>
            {FIELDS.map(([f, label]) => (
              <option key={f} value={f}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-600">置換前</span>
          <select
            className="input w-64"
            value={oldValue}
            onChange={(e) => setOldValue(e.target.value)}
            disabled={!values || values.length === 0}
            aria-label="置換前の値"
          >
            <option value="">{!field ? '先に項目を選択' : loadError ? '取得できませんでした' : !values ? '読み込み中…' : values.length === 0 ? 'データがありません' : '選択'}</option>
            {values?.map((v) => (
              <option key={v.value} value={v.value}>
                {v.value}（{unit}{num(v.count)}件）
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary btn-sm mb-0.5" onClick={copyOld} disabled={!oldValue} title="置換前の値を写して直す">
          <Copy size={14} aria-hidden="true" />
          写す
        </button>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-600">置換後</span>
          <input
            ref={newRef}
            className="input w-64"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={oldValue || '正しい値を入力'}
            disabled={!field}
            aria-label="置換後の値"
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm mb-0.5" disabled={!ready || busy !== null}>
          置換
        </button>
      </form>
      {loadError && <p className="mt-2 text-sm text-red-700">{loadError}</p>}
      {same && <p className="mt-2 text-sm text-amber-800">置換前と置換後の値が同じです。</p>}
      {ready && meta && (
        <p className="mt-2 text-sm text-slate-600">
          {meta[1]}を「<strong>{oldValue}</strong>」から「<strong>{trimmed}</strong>」に置換します（{unit}
          {num(selected.count)}件が対象）。
        </p>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={submit} title="値の一括置換" confirmLabel="置換する" busy={busy === 'replace'}>
        {meta && selected && (
          <>
            {meta[1]}「{oldValue}」を「{trimmed}」に置き換えます（{unit}
            {num(selected.count)}件）。この操作は元に戻せません。
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 重複の削除
// ---------------------------------------------------------------------------

type DupRow = TabData['cleanup']['duplicateTxs'][number];

// サーバーの duplicateTransactions と同じ組の鍵
const dupKey = (t: DupRow) => JSON.stringify([t.date, t.amountOut, t.amountIn, t.description, t.accountNumber]);

function Duplicates({ caseId, rows, reload }: { caseId: number; rows: DupRow[]; reload: () => void }) {
  const notice = useNotice();
  const { busy, run } = useAction();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [lastRows, setLastRows] = useState(rows);
  if (lastRows !== rows) {
    setLastRows(rows);
    const ids = new Set(rows.map((r) => r.id));
    setChecked((c) => new Set([...c].filter((id) => ids.has(id))));
  }

  const groups = useMemo(() => {
    const m = new Map<string, DupRow[]>();
    for (const r of rows) m.set(dupKey(r), [...(m.get(dupKey(r)) ?? []), r]);
    return [...m.values()];
  }, [rows]);
  // 各組の2件目以降（ID の小さい1件を残す）
  const extras = useMemo(() => groups.flatMap((g) => [...g].sort((a, b) => a.id - b.id).slice(1).map((r) => r.id)), [groups]);
  const wholeGroups = groups.filter((g) => g.every((r) => checked.has(r.id))).length;

  const toggle = (id: number) =>
    setChecked((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const remove = async () => {
    const ids = [...checked];
    const res = await run('deleteDup', () => api.post<{ message: string }>(`/cases/${caseId}/transactions/delete-duplicates`, { ids }));
    setConfirm(false);
    if (!res) return;
    notice.success(res.message);
    setChecked(new Set());
    reload();
  };

  return (
    <section className="card p-4" aria-labelledby="dupTitle">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 id="dupTitle" className="flex items-center gap-1 font-bold">
          <Layers size={16} aria-hidden="true" />
          重複の候補（{num(rows.length)}件・{num(groups.length)}組）
        </h2>
        {rows.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChecked(new Set(extras))} disabled={busy !== null}>
              <CircleCheck size={14} aria-hidden="true" />
              各組の1件目を残して選択
            </button>
            {checked.size > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChecked(new Set())}>
                <Eraser size={14} aria-hidden="true" />
                選択を解除
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(true)} disabled={checked.size === 0 || busy !== null}>
              <Trash2 size={14} aria-hidden="true" />
              選択した{num(checked.size)}件を削除
            </button>
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">
        日付・金額・摘要・口座番号がすべて同じ取引です。同じ日に同じ額を2回引き出した場合なども並ぶので、通帳と見比べてから削除してください。
      </p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">重複データは見つかりませんでした</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="w-8" aria-label="選択" />
                <th>ID</th>
                <th>日付</th>
                <th>銀行名</th>
                <th>支店名</th>
                <th>口座番号</th>
                <th>摘要</th>
                <th className="text-right">出金</th>
                <th className="text-right">入金</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={t.dupGroupIdx ? 'bg-slate-50' : undefined}>
                  <td>
                    <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggle(t.id)} aria-label={`ID ${t.id} を選択`} />
                  </td>
                  <td className="tabular-nums">{t.id}</td>
                  <td className="whitespace-nowrap">{warekiShort(t.date)}</td>
                  <td>{t.bankName || '-'}</td>
                  <td>{t.branchName || '-'}</td>
                  <td>{t.accountNumber || '-'}</td>
                  <td className="max-w-64 truncate" title={t.description}>
                    {t.description || '-'}
                  </td>
                  <td className="text-right tabular-nums text-red-700">{t.amountOut ? num(t.amountOut) : ''}</td>
                  <td className="text-right tabular-nums text-emerald-700">{t.amountIn ? num(t.amountIn) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="重複データの削除"
        confirmLabel="削除する"
        danger
        busy={busy === 'deleteDup'}
      >
        <p>選択した{num(checked.size)}件の取引を削除します。この操作は元に戻せません。</p>
        {wholeGroups > 0 && (
          <p className="mt-2 font-semibold text-red-700">
            {num(wholeGroups)}組は全件が選ばれています。このまま削除すると、その取引は1件も残りません。
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
