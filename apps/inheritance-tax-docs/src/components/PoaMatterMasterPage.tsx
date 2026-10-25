import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, RotateCcw, Save, ScrollText, Trash2 } from 'lucide-react';
import {
  MATTER_PRESETS,
  PURPOSES,
  PURPOSE_LABELS,
  type MatterMaster,
  type MatterPresetId,
  type Purpose,
} from '@/constants/powerOfAttorneyMatters';
import { MatterMasterError, fetchMatterMaster, saveMatterMaster } from '@/utils/powerOfAttorney/matterMasterApi';

const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') return `matter-${crypto.randomUUID()}`;
  return `matter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const move = <T,>(items: T[], index: number, offset: number): T[] => {
  const destination = index + offset;
  if (destination < 0 || destination >= items.length) return items;
  const next = [...items];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
};

const PURPOSE_NOTES: Record<Purpose, string> = {
  inheritance: '被相続人の名前を見出しに刷る委任状で使います。提出先ボタンを押したときに印が付く事項を選べます。',
  personal: '委任者本人の手続きの委任状で使います（被相続人は刷りません）。',
};

/**
 * マスタ管理の「委任事項」タブ。委任状の画面で選べる定型文（全社共通）を直す。
 * 提出先のボタン4つは固定で、どの事項に印を付けるかだけをここで変える。
 */
export const PoaMatterMasterPage = ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
  const [master, setMaster] = useState<MatterMaster | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);

  const dirty = master !== null && JSON.stringify(master) !== savedJson;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const accept = useCallback((loaded: MatterMaster & { version: number }) => {
    const next = { matters: loaded.matters, presets: loaded.presets };
    setMaster(next);
    setSavedJson(JSON.stringify(next));
    setVersion(loaded.version);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    setConflict(false);
    try {
      accept(await fetchMatterMaster());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '委任事項を読み込めませんでした');
    } finally {
      setStatus('idle');
    }
  }, [accept]);

  useEffect(() => { void load(); }, [load]);

  const update = (updater: (current: MatterMaster) => MatterMaster) => {
    setMaster((current) => (current ? updater(current) : current));
    setMessage('');
  };

  const setMatters = (purpose: Purpose, updater: (list: MatterMaster['matters'][Purpose]) => MatterMaster['matters'][Purpose]) =>
    update((current) => ({ ...current, matters: { ...current.matters, [purpose]: updater(current.matters[purpose]) } }));

  const addMatter = (purpose: Purpose) => setMatters(purpose, (list) => [...list, { id: createId(), text: '' }]);

  const removeMatter = (purpose: Purpose, matterId: string, text: string) => {
    if (!window.confirm(`次の事項を削除しますか？（保存するまでは反映されません）\n\n${text || '（空の事項）'}`)) return;
    update((current) => ({
      matters: { ...current.matters, [purpose]: current.matters[purpose].filter((matter) => matter.id !== matterId) },
      presets: Object.fromEntries(
        MATTER_PRESETS.map(({ id }) => [id, current.presets[id].filter((presetMatterId) => presetMatterId !== matterId)]),
      ) as MatterMaster['presets'],
    }));
  };

  const togglePreset = (presetId: MatterPresetId, matterId: string) => update((current) => {
    const ids = current.presets[presetId];
    const nextIds = ids.includes(matterId) ? ids.filter((id) => id !== matterId) : [...ids, matterId];
    // 並びはマスタの並びに揃えておく（サーバも揃えるので、揃えないと保存直後に「未保存」に見える）
    const ordered = current.matters.inheritance.filter((matter) => nextIds.includes(matter.id)).map((matter) => matter.id);
    return { ...current, presets: { ...current.presets, [presetId]: ordered } };
  });

  const emptyCount = useMemo(
    () => (master ? PURPOSES.reduce((sum, purpose) => sum + master.matters[purpose].filter((matter) => !matter.text.trim()).length, 0) : 0),
    [master],
  );

  const save = async () => {
    if (!master) return;
    if (emptyCount > 0) {
      setError('文面が空の事項があります。文面を入れるか、削除してください');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      const result = await saveMatterMaster(master, version);
      accept(result);
      setMessage(result.unchanged ? '変更はありませんでした' : '委任事項を保存しました。委任状の画面を開き直すと反映されます');
    } catch (reason) {
      if (reason instanceof MatterMasterError && reason.status === 409) setConflict(true);
      setError(reason instanceof Error ? reason.message : '委任事項を保存できませんでした');
    } finally {
      setStatus('idle');
    }
  };

  const discard = () => {
    if (!window.confirm('保存していない変更を取り消しますか？')) return;
    setMaster(JSON.parse(savedJson) as MatterMaster);
    setError('');
    setMessage('');
  };

  const reload = () => {
    if (dirty && !window.confirm('保存していない変更を捨てて読み直しますか？')) return;
    void load();
  };

  const disabled = status !== 'idle' || master === null;
  const iconButtonClass = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-9 sm:min-w-9';
  const outlineButtonClass = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950';

  return (
    <section role="tabpanel" aria-label="委任事項" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><ScrollText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />委任事項</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            委任状の「１．」の下に刷る定型文です（全社共通）。上から順に刷るので、足すときは近い事項の隣へ動かしてください。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={discard} disabled={disabled || !dirty} className={outlineButtonClass}><RotateCcw className="h-4 w-4" />取り消す</button>
          <button type="button" onClick={() => void save()} disabled={disabled || !dirty} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />保存</button>
        </div>
      </div>

      {message ? <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check className="h-4 w-4" />{message}</p> : null}
      {error ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
          <span>{error}</span>
          {conflict || master === null ? <button type="button" onClick={reload} className="cursor-pointer underline">読み直す</button> : null}
        </div>
      ) : null}

      {status === 'loading' ? <p className="py-12 text-center text-sm text-slate-500">読み込み中…</p> : master ? (
        <div className="mt-5 space-y-6">
          {PURPOSES.map((purpose) => {
            const list = master.matters[purpose];
            return (
              <div key={purpose}>
                <h3 className="text-base font-bold">{PURPOSE_LABELS[purpose]}<span className="ml-2 text-sm font-normal text-slate-500">{list.length}件</span></h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{PURPOSE_NOTES[purpose]}</p>
                <ol className="mt-3 space-y-3">
                  {list.map((matter, index) => (
                    <li key={matter.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <label className="sr-only" htmlFor={`poa-matter-${matter.id}`}>{PURPOSE_LABELS[purpose]}の{index + 1}番目の文面</label>
                          <textarea
                            id={`poa-matter-${matter.id}`}
                            rows={3}
                            value={matter.text}
                            onChange={(event) => setMatters(purpose, (current) => current.map((item) => item.id === matter.id ? { ...item, text: event.target.value } : item))}
                            disabled={disabled}
                            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 ${matter.text.trim() ? 'border-slate-300 dark:border-slate-600' : 'border-red-400 dark:border-red-500'}`}
                          />
                          {purpose === 'inheritance' ? (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-slate-500">提出先ボタン:</span>
                              {MATTER_PRESETS.map((preset) => {
                                const active = master.presets[preset.id].includes(matter.id);
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    aria-pressed={active}
                                    disabled={disabled}
                                    onClick={() => togglePreset(preset.id, matter.id)}
                                    className={`cursor-pointer rounded-full border px-2.5 py-1 font-medium transition-colors disabled:cursor-not-allowed ${active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                          <button type="button" onClick={() => setMatters(purpose, (current) => move(current, index, -1))} disabled={index === 0 || disabled} className={iconButtonClass} aria-label={`${index + 1}番目の事項を上へ`}><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setMatters(purpose, (current) => move(current, index, 1))} disabled={index === list.length - 1 || disabled} className={iconButtonClass} aria-label={`${index + 1}番目の事項を下へ`}><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeMatter(purpose, matter.id, matter.text)} disabled={disabled} className={`${iconButtonClass} text-red-600 dark:text-red-400`} aria-label={`${index + 1}番目の事項を削除`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={() => addMatter(purpose)} disabled={disabled} className={`${outlineButtonClass} mt-3`}><Plus className="h-4 w-4" />{PURPOSE_LABELS[purpose]}の事項を足す</button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
