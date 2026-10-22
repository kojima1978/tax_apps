import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, FolderTree, Pencil, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { DOC_LIST_TYPE_LABELS, type DocListType } from '@/constants';
import { useOverlayDismiss } from '@/hooks/useOverlayDismiss';
import { operatorRequestHeaders, useOperator } from '@/shared/staff-directory/operator';

type MasterDocument = {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate: boolean;
};

type MasterCategory = {
  id: string;
  name: string;
  documents: MasterDocument[];
  isActive?: boolean;
};

type MasterResponse = {
  version: number;
  categories: MasterCategory[];
};

const API_BASE = '/inheritance-tax-docs/api/document-masters';
const UNCATEGORIZED_ID = 'uncategorized';

const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const move = <T,>(items: T[], index: number, offset: number): T[] => {
  const destination = index + offset;
  if (destination < 0 || destination >= items.length) return items;
  const next = [...items];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
};

type DeleteCategoryDialogProps = {
  category: MasterCategory;
  categories: MasterCategory[];
  onClose: () => void;
  onConfirm: (destinationId: string | null) => void;
};

const DeleteCategoryDialog = ({ category, categories, onClose, onConfirm }: DeleteCategoryDialogProps) => {
  const alternatives = categories.filter((item) => item.id !== category.id);
  const canUseUncategorized = category.id !== UNCATEGORIZED_ID;
  const initialDestination = alternatives[0]?.id ?? (canUseUncategorized ? UNCATEGORIZED_ID : '');
  const [destinationId, setDestinationId] = useState(initialDestination);
  const dismiss = useOverlayDismiss(onClose);
  const hasDocuments = category.documents.length > 0;
  const canDelete = !hasDocuments || Boolean(destinationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" {...dismiss}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-category-heading" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h2 id="delete-category-heading" className="text-lg font-bold">カテゴリーを削除</h2>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-800" aria-label="閉じる"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">「{category.name}」を下書きから削除します。</p>
        {hasDocuments ? (
          <label className="grid gap-2 text-sm font-medium">所属書類 {category.documents.length}件の移動先
            <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800">
              {alternatives.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              {canUseUncategorized && !alternatives.some((item) => item.id === UNCATEGORIZED_ID) ? <option value={UNCATEGORIZED_ID}>未分類（新規作成）</option> : null}
            </select>
          </label>
        ) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">所属書類がないため、そのまま削除できます。</p>}
        {!canDelete ? <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">書類の移動先がないため削除できません。別のカテゴリーを先に作成してください。</p> : null}
        <div className="flex gap-2">
          <button type="button" disabled={!canDelete} onClick={() => onConfirm(hasDocuments ? destinationId : null)} className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" />移動して削除</button>
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:hover:bg-slate-800">キャンセル</button>
        </div>
      </div>
    </div>
  );
};

export const CategoryMasterPage = ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
  const { operator } = useOperator();
  const [masterType, setMasterType] = useState<DocListType>('income-tax');
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'publishing'>('loading');
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MasterCategory | null>(null);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = useCallback(async (type: DocListType) => {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/${type}`);
      if (!response.ok) throw new Error('カテゴリーマスタを読み込めませんでした');
      const data = await response.json() as MasterResponse;
      setCategories(data.categories);
      setPublishedVersion(data.version);
      setDirty(false);
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'カテゴリーマスタを読み込めませんでした');
    } finally {
      setStatus('idle');
    }
  }, []);

  useEffect(() => { void load(masterType); }, [load, masterType]);

  const updateCategories = (updater: (current: MasterCategory[]) => MasterCategory[]) => {
    setCategories(updater);
    setDirty(true);
    setMessage('');
  };

  const saveDraft = async (): Promise<boolean> => {
    if (categories.some((category) => !category.name.trim())) {
      setError('カテゴリー名を入力してください');
      return false;
    }
    setStatus('saving');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/${masterType}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorRequestHeaders(operator) },
        body: JSON.stringify({ categories }),
      });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? '保存に失敗しました');
      setDirty(false);
      setMessage('カテゴリーの下書きを保存しました');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存に失敗しました');
      return false;
    } finally {
      setStatus('idle');
    }
  };

  const publish = async () => {
    setStatus('publishing');
    const saved = await saveDraft();
    if (!saved) return;
    setStatus('publishing');
    try {
      const response = await fetch(`${API_BASE}/${masterType}/publish`, { method: 'POST', headers: operatorRequestHeaders(operator) });
      if (!response.ok) throw new Error('公開に失敗しました');
      const result = await response.json() as { version: number };
      await load(masterType);
      setMessage(`第${result.version}版を公開しました。無効なカテゴリーは新しい必要書類リストに表示されません`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '公開に失敗しました');
      setStatus('idle');
    }
  };

  const addCategory = () => {
    const id = createId();
    updateCategories((current) => [...current, { id, name: '新しいカテゴリー', documents: [], isActive: true }]);
    setEditingId(id);
    setEditingName('新しいカテゴリー');
  };

  const startEditing = (category: MasterCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const finishEditing = () => {
    const name = editingName.trim();
    if (!editingId || !name) {
      setError('カテゴリー名を入力してください');
      return;
    }
    updateCategories((current) => current.map((category) => category.id === editingId ? { ...category, name } : category));
    setEditingId(null);
    setError('');
  };

  const deleteCategory = (destinationId: string | null) => {
    if (!deleteTarget) return;
    updateCategories((current) => {
      const remaining = current.filter((category) => category.id !== deleteTarget.id);
      if (!destinationId || deleteTarget.documents.length === 0) return remaining;
      const destinationExists = remaining.some((category) => category.id === destinationId);
      if (!destinationExists && destinationId === UNCATEGORIZED_ID) {
        return [...remaining, { id: UNCATEGORIZED_ID, name: '未分類', documents: deleteTarget.documents, isActive: true }];
      }
      return remaining.map((category) => category.id === destinationId ? { ...category, documents: [...category.documents, ...deleteTarget.documents] } : category);
    });
    setDeleteTarget(null);
  };

  const disabled = status !== 'idle';
  const iconButtonClass = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <section role="tabpanel" aria-label="カテゴリーマスタ" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><FolderTree className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />カテゴリーマスタ</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">税目ごとにカテゴリー名、表示順、有効状態を管理します。変更は公開後、新しく作る必要書類リストへ反映されます。</p>
        </div>
        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">公開中: <strong>第{publishedVersion}版</strong></span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
        <label className="grid gap-1 text-sm font-medium">書類リスト種別
          <select value={masterType} onChange={(event) => {
            const next = event.target.value as DocListType;
            if (dirty && !window.confirm('未保存の変更を破棄して種別を切り替えますか？')) return;
            setMasterType(next);
          }} className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800">
            {(Object.entries(DOC_LIST_TYPE_LABELS) as [DocListType, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" onClick={addCategory} disabled={disabled} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950"><Plus className="h-4 w-4" />追加</button>
        <button type="button" onClick={() => void saveDraft()} disabled={disabled || !dirty} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950"><Save className="h-4 w-4" />下書き保存</button>
        <button type="button" onClick={() => void publish()} disabled={disabled} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />保存して公開</button>
      </div>

      {message ? <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check className="h-4 w-4" />{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p> : null}

      {status === 'loading' ? <p className="py-12 text-center text-sm text-slate-500">読み込み中…</p> : (
        <ol className="mt-5 space-y-3">
          {categories.map((category, index) => {
            const active = category.isActive !== false;
            return (
              <li key={category.id} className={`rounded-xl border p-4 transition-colors ${active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                  <div className="min-w-[180px] flex-1">
                    {editingId === category.id ? (
                      <div className="flex gap-2">
                        <label className="sr-only" htmlFor={`category-${category.id}`}>カテゴリー名</label>
                        <input id={`category-${category.id}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') finishEditing(); if (event.key === 'Escape') setEditingId(null); }} autoFocus className="min-h-11 w-full rounded-lg border border-emerald-500 bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900" />
                        <button type="button" onClick={finishEditing} className={iconButtonClass} aria-label="カテゴリー名を確定"><Check className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setEditingId(null)} className={iconButtonClass} aria-label="カテゴリー名の編集をキャンセル"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><strong className={active ? '' : 'text-slate-500'}>{category.name}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{active ? '有効' : '無効'}</span></div>
                        <p className="mt-1 text-xs text-slate-500">所属書類 {category.documents.length}件</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => updateCategories((current) => move(current, index, -1))} disabled={index === 0 || disabled} className={iconButtonClass} aria-label={`${category.name}を上へ`}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => updateCategories((current) => move(current, index, 1))} disabled={index === categories.length - 1 || disabled} className={iconButtonClass} aria-label={`${category.name}を下へ`}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => updateCategories((current) => current.map((item) => item.id === category.id ? { ...item, isActive: !active } : item))} disabled={disabled} className={iconButtonClass} aria-label={`${category.name}を${active ? '無効' : '有効'}にする`} aria-pressed={!active}>{active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    <button type="button" onClick={() => startEditing(category)} disabled={disabled} className={iconButtonClass} aria-label={`${category.name}を編集`}><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setDeleteTarget(category)} disabled={disabled} className={`${iconButtonClass} text-red-600 dark:text-red-400`} aria-label={`${category.name}を削除`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {deleteTarget ? <DeleteCategoryDialog category={deleteTarget} categories={categories} onClose={() => setDeleteTarget(null)} onConfirm={deleteCategory} /> : null}
    </section>
  );
};
