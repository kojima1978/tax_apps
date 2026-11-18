import { useState } from 'react';
import { Check, Sparkles, Undo2 } from 'lucide-react';
import { useNotice } from '../../components/Notice';
import { api, errorMessage } from '../../lib/api';
import { num } from '../../lib/format';
import type { PatternLearningCandidate } from '../../../server/lib/import/summary';

type Props = {
  caseId: string;
  candidates: readonly PatternLearningCandidate[];
  dismissed: readonly PatternLearningCandidate[];
  onSaved: (key: string) => void;
  onDismiss: (keys: readonly string[]) => void;
  onRestore: (key: string) => void;
};
type Scope = 'case' | 'global';

const INITIAL_VISIBLE = 12;

export function PatternLearningCandidates({ caseId, candidates, dismissed, onSaved, onDismiss, onRestore }: Props) {
  const notice = useNotice();
  const [keywords, setKeywords] = useState<Record<string, string>>({});
  const [scopes, setScopes] = useState<Record<string, Scope>>({});
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const open = candidates.filter((candidate) => !saved.has(candidate.key));
  if (candidates.length === 0 && dismissed.length === 0) return null;

  const dismiss = (keys: readonly string[]) => {
    onDismiss(keys);
    setSelected((current) => new Set([...current].filter((key) => !keys.includes(key))));
  };

  const add = async (items: readonly PatternLearningCandidate[]) => {
    if (items.some((item) => !(keywords[item.key] ?? item.description).trim())) return notice.error('登録するキーワードを入力してください。');
    setBusyKey(items[0]!.key);
    let savedCount = 0;
    try {
      for (const item of items) {
        const result = await api.post<{ message: string }>(`/cases/${caseId}/patterns/add`, {
          category: item.category,
          keyword: (keywords[item.key] ?? item.description).trim(),
          scope: scopes[item.key] ?? 'case',
        });
        setSaved((current) => new Set(current).add(item.key));
        setSelected((current) => new Set([...current].filter((key) => key !== item.key)));
        onSaved?.(item.key);
        savedCount++;
        if (items.length === 1) notice.success(result.message);
      }
      if (items.length > 1) notice.success(`${num(savedCount)}件のパターンを登録しました。`);
    } catch (error) {
      notice.error(`${num(savedCount)}件を登録しました。続きは登録されていません: ${errorMessage(error)}`);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="card border-blue-200 bg-blue-50/40 p-4" aria-label="分類パターンの学習候補">
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden />
        <div>
          <h3 className="font-semibold text-slate-900">分類パターンの学習候補</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            取引の取り込みは完了しています。ここで決めるのは次回以降に使う分類パターンだけです。取引の分類は変わりません。
          </p>
        </div>
      </div>

      {open.length === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
          <Check size={16} aria-hidden />候補の確認が完了しました。取引の分類は変更されていません。
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">{num(selected.size)}件選択中</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={busyKey !== null || selected.size === 0} onClick={() => add(open.filter((item) => selected.has(item.key)))}>
              選択した候補を登録
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busyKey !== null || selected.size === 0} onClick={() => dismiss([...selected])}>
              選択した候補は登録しない
            </button>
            {selected.size > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>選択を解除</button>}
          </div>
          {open.slice(0, showAll ? undefined : INITIAL_VISIBLE).map((candidate) => (
            <div key={candidate.key} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" aria-label={`「${candidate.description}」を登録候補に選ぶ`} checked={selected.has(candidate.key)} onChange={(event) => setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(candidate.key);
                    else next.delete(candidate.key);
                    return next;
                  })} />
                  <span className="sr-only">登録候補に選ぶ</span>
                </label>
                <span>AI・CSV: <strong>{candidate.category}</strong></span>
                <span className="text-slate-500">アプリ候補: {candidate.autoCategory ?? '候補なし'}</span>
                {candidate.count > 1 && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{num(candidate.count)}件</span>}
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_12rem] md:items-end">
                <label className="text-xs font-medium text-slate-600">
                  登録する摘要キーワード
                  <input
                    className="input mt-1 w-full py-1.5 text-sm"
                    value={keywords[candidate.key] ?? candidate.description}
                    onChange={(event) => setKeywords((current) => ({ ...current, [candidate.key]: event.target.value }))}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  適用範囲
                  <select
                    className="input mt-1 w-full py-1.5 text-sm"
                    value={scopes[candidate.key] ?? 'case'}
                    onChange={(event) => setScopes((current) => ({ ...current, [candidate.key]: event.target.value as Scope }))}
                  >
                    <option value="case">この案件だけ</option>
                    <option value="global">全案件</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="mr-auto text-xs font-medium text-slate-600">この候補をどうしますか？</span>
                <button type="button" className="btn btn-primary btn-sm min-h-10 justify-center px-4" disabled={busyKey !== null} onClick={() => add([candidate])}>
                  {busyKey === candidate.key ? '登録中…' : 'パターンに登録する'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm min-h-10 justify-center px-4" disabled={busyKey !== null} onClick={() => dismiss([candidate.key])}>
                  今回は登録しない
                </button>
              </div>
            </div>
          ))}
          {!showAll && open.length > INITIAL_VISIBLE && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAll(true)}>
              残り{num(open.length - INITIAL_VISIBLE)}件を表示
            </button>
          )}
        </div>
      )}
      {dismissed.length > 0 && (
        <details className="mt-3 border-t border-slate-200 pt-3 text-sm">
          <summary className="cursor-pointer font-medium">登録しなかった候補 {num(dismissed.length)}件</summary>
          <p className="mt-1 text-slate-600">分類パターンにも取引にも変更はありません。このタブでは選び直せます。</p>
          <ul className="mt-2 space-y-2">
            {dismissed.map((candidate) => (
              <li key={candidate.key} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                <span>{candidate.description} → {candidate.category}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRestore(candidate.key)}><Undo2 size={14} aria-hidden />候補に戻す</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
