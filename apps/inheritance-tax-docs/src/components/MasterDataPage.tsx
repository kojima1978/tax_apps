import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, FileText, FolderTree, History, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { DOC_LIST_TYPE_LABELS, type DocListType } from '@/constants';
import { ResourcesPage } from '@/components/ResourcesPage';
import { AuditLogPage } from '@/components/AuditLogPage';
import { CategoryMasterPage } from '@/components/CategoryMasterPage';
import { useCompanyInfo, type CompanyInfo } from '@/shared/staff-directory/company';
import { selectedOperatorHeaders } from '@/shared/staff-directory/operator';
import { OperatorPicker } from '@/shared/staff-directory/OperatorPicker';

type MasterDocument = {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate: boolean;
  companyIds?: number[];
};
type MasterCategory = {
  id: string;
  name: string;
  documents: MasterDocument[];
  isActive?: boolean;
};

type MasterResponse = {
  code: DocListType;
  label: string;
  version: number;
  updatedAt: string;
  categories: MasterCategory[];
};

type Version = { version: number; published_at: string };

const API_BASE = '/inheritance-tax-docs/api/document-masters';

const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const move = <T,>(items: T[], index: number, offset: number): T[] => {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const result = [...items];
  [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  return result;
};

export const MasterDataPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'categories' || requestedTab === 'resources' || requestedTab === 'history' ? requestedTab : 'documents';
  const { companies } = useCompanyInfo();
  const selectableCompanies = companies.filter((company): company is CompanyInfo & { id: number } => company.id !== null);
  const [masterType, setMasterType] = useState<DocListType>('income-tax');
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'publishing'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [categoryDirty, setCategoryDirty] = useState(false);

  const loadMaster = useCallback(async (type: DocListType) => {
    setStatus('loading');
    setError('');
    try {
      const [masterResponse, versionsResponse] = await Promise.all([
        fetch(`${API_BASE}/${type}`),
        fetch(`${API_BASE}/${type}/versions`),
      ]);
      if (!masterResponse.ok || !versionsResponse.ok) throw new Error('マスタを読み込めませんでした');
      const master = await masterResponse.json() as MasterResponse;
      const history = await versionsResponse.json() as Version[];
      setCategories(master.categories);
      setVersions(history);
      setPublishedVersion(master.version);
      setExpanded(new Set(master.categories.map((category) => category.id)));
      setDirty(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'マスタを読み込めませんでした');
    } finally {
      setStatus('idle');
    }
  }, []);

  useEffect(() => { void loadMaster(masterType); }, [loadMaster, masterType]);

  const updateCategories = (updater: (current: MasterCategory[]) => MasterCategory[]) => {
    setCategories(updater);
    setDirty(true);
    setMessage('');
  };

  const saveDraft = async (): Promise<boolean> => {
    setStatus('saving');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/${masterType}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...selectedOperatorHeaders() },
        body: JSON.stringify({ categories }),
      });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? '保存に失敗しました');
      setDirty(false);
      setMessage('下書きを保存しました');
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
      const response = await fetch(`${API_BASE}/${masterType}/publish`, { method: 'POST', headers: selectedOperatorHeaders() });
      if (!response.ok) throw new Error('公開に失敗しました');
      const result = await response.json() as { version: number };
      setMessage(`第${result.version}版を公開しました。新しく初期化するリストに反映されます`);
      await loadMaster(masterType);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '公開に失敗しました');
      setStatus('idle');
    }
  };

  const restore = async (version: number) => {
    if (!window.confirm(`第${version}版を下書きへ復元しますか？ 公開中の版は変わりません。`)) return;
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/${masterType}/restore/${version}`, { method: 'POST', headers: selectedOperatorHeaders() });
      if (!response.ok) throw new Error('復元に失敗しました');
      await loadMaster(masterType);
      setMessage(`第${version}版を下書きへ復元しました`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '復元に失敗しました');
      setStatus('idle');
    }
  };

  const updateCategory = (categoryId: string, updater: (category: MasterCategory) => MasterCategory) =>
    updateCategories((current) => current.map((category) => category.id === categoryId ? updater(category) : category));

  const updateDocument = (categoryId: string, documentId: string, field: keyof Omit<MasterDocument, 'id'>, value: string | boolean | number[]) =>
    updateCategory(categoryId, (category) => ({
      ...category,
      documents: category.documents.map((document) => document.id === documentId ? { ...document, [field]: value } : document),
    }));

  const disabled = status !== 'idle';
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-emerald-900';
  const iconButtonClass = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:min-h-9 sm:min-w-9';

  const switchTab = (tab: 'documents' | 'categories' | 'resources' | 'history') => {
    if (tab === activeTab) return;
    if (activeTab === 'documents' && dirty && !window.confirm('未保存の変更を破棄してタブを切り替えますか？')) return;
    if (activeTab === 'categories' && categoryDirty && !window.confirm('未保存のカテゴリー変更を破棄してタブを切り替えますか？')) return;
    setSearchParams(tab === 'documents' ? {} : { tab }, { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 dark:bg-slate-950 dark:text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to="/" className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-400 sm:min-h-0">
                <ArrowLeft className="h-4 w-4" />必要書類リストへ戻る
              </Link>
              <h1 className="text-2xl font-bold">書類マスタ管理</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">下書きを確認してから公開します。通常画面での個別編集には影響しません。</p>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:min-w-64">
              <OperatorPicker usage="書類マスタの保存・公開・復元の履歴に名前が残ります" className="justify-self-start sm:justify-self-end" />
              {activeTab === 'documents' ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                  公開中: <strong>第{publishedVersion}版</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="マスタ種別">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'documents'}
              onClick={() => switchTab('documents')}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:gap-2 sm:px-4 sm:text-sm ${activeTab === 'documents' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/60'}`}
            >
              <FileText className="hidden h-4 w-4 sm:block" /><span>必要書類<span className="hidden sm:inline">マスタ</span></span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'categories'}
              onClick={() => switchTab('categories')}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:gap-2 sm:px-4 sm:text-sm ${activeTab === 'categories' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/60'}`}
            >
              <FolderTree className="hidden h-4 w-4 sm:block" /><span>カテゴリ<span className="hidden sm:inline">ーマスタ</span></span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'resources'}
              onClick={() => switchTab('resources')}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:gap-2 sm:px-4 sm:text-sm ${activeTab === 'resources' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/60'}`}
            >
              <BookOpen className="hidden h-4 w-4 sm:block" /><span>参考資料<span className="hidden sm:inline">マスタ</span></span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => switchTab('history')}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:gap-2 sm:px-4 sm:text-sm ${activeTab === 'history' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/60'}`}
            >
              <History className="hidden h-4 w-4 sm:block" />操作履歴
            </button>
          </div>

          {activeTab === 'documents' ? <>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto_auto]">
            <label className="grid gap-1 text-sm font-medium">
              書類リスト種別
              <select value={masterType} onChange={(event) => {
                const next = event.target.value as DocListType;
                if (dirty && !window.confirm('未保存の変更を破棄して種別を切り替えますか？')) return;
                setMasterType(next);
              }} className={`${inputClass} cursor-pointer`}>
                {(Object.entries(DOC_LIST_TYPE_LABELS) as [DocListType, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button disabled={disabled || !dirty} onClick={() => void saveDraft()} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
              <Save className="h-4 w-4" />下書き保存
            </button>
            <button disabled={disabled} onClick={() => void publish()} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" />保存して公開
            </button>
          </div>
          {message ? <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />{message}</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">{error}</p> : null}
          </> : activeTab === 'categories' ? (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              税目ごとのカテゴリーを追加・編集・並び替え・有効化・無効化します。所属書類を安全に移動して削除できます。
            </p>
          ) : activeTab === 'resources' ? (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              全税目で共通利用する案内資料・ひな形・外部リンクを登録します。登録内容はすぐに参考資料一覧へ反映されます。
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              マスタへの追加・編集・無効化・並び替え・公開・復元を、変更前後の内容とともに確認できます。
            </p>
          )}
        </header>

        {activeTab === 'documents' ? <>
        {status === 'loading' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">読み込み中…</div>
        ) : (
          <section aria-label="書類マスタ" className="space-y-4">
            {categories.map((category, categoryIndex) => {
              const isExpanded = expanded.has(category.id);
              return (
                <article key={category.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-3 dark:bg-slate-800">
                    <button onClick={() => setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(category.id)) next.delete(category.id); else next.add(category.id);
                      return next;
                    })} className={iconButtonClass} aria-expanded={isExpanded} aria-label={`${category.name}を${isExpanded ? '折りたたむ' : '展開する'}`}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-slate-500">{categoryIndex + 1}</span>
                    {category.isActive === false ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">無効</span> : null}
                    <label className="min-w-[220px] flex-1">
                      <span className="sr-only">カテゴリ名</span>
                      <input value={category.name} onChange={(event) => updateCategory(category.id, (current) => ({ ...current, name: event.target.value }))} className={`${inputClass} font-bold`} />
                    </label>
                    <button onClick={() => updateCategories((current) => move(current, categoryIndex, -1))} disabled={categoryIndex === 0} className={iconButtonClass} aria-label="カテゴリを上へ"><ArrowUp className="h-4 w-4" /></button>
                    <button onClick={() => updateCategories((current) => move(current, categoryIndex, 1))} disabled={categoryIndex === categories.length - 1} className={iconButtonClass} aria-label="カテゴリを下へ"><ArrowDown className="h-4 w-4" /></button>
                    <button onClick={() => {
                      if (window.confirm(`カテゴリ「${category.name}」を下書きから削除しますか？`)) updateCategories((current) => current.filter((item) => item.id !== category.id));
                    }} className={`${iconButtonClass} text-red-600 dark:text-red-400`} aria-label="カテゴリを削除"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {isExpanded ? (
                    <div className="space-y-3 p-4">
                      {category.documents.map((document, documentIndex) => (
                        <div key={document.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <div className="grid gap-3 lg:grid-cols-[2rem_minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
                            <span className="pt-2 text-center text-sm font-semibold text-slate-500">{documentIndex + 1}</span>
                            <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">書類名<input value={document.name} onChange={(event) => updateDocument(category.id, document.id, 'name', event.target.value)} className={inputClass} /></label>
                            <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">内容説明<input value={document.description} onChange={(event) => updateDocument(category.id, document.id, 'description', event.target.value)} className={inputClass} /></label>
                            <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">取得方法<input value={document.howToGet} onChange={(event) => updateDocument(category.id, document.id, 'howToGet', event.target.value)} className={inputClass} /></label>
                            <div className="flex items-end gap-1">
                              <button onClick={() => updateCategory(category.id, (current) => ({ ...current, documents: move(current.documents, documentIndex, -1) }))} disabled={documentIndex === 0} className={iconButtonClass} aria-label="書類を上へ"><ArrowUp className="h-4 w-4" /></button>
                              <button onClick={() => updateCategory(category.id, (current) => ({ ...current, documents: move(current.documents, documentIndex, 1) }))} disabled={documentIndex === category.documents.length - 1} className={iconButtonClass} aria-label="書類を下へ"><ArrowDown className="h-4 w-4" /></button>
                              <button onClick={() => updateCategory(category.id, (current) => ({ ...current, documents: current.documents.filter((item) => item.id !== document.id) }))} className={`${iconButtonClass} text-red-600 dark:text-red-400`} aria-label="書類を削除"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium sm:min-h-0">
                            <input type="checkbox" checked={document.canDelegate} onChange={(event) => updateDocument(category.id, document.id, 'canDelegate', event.target.checked)} className="h-4 w-4 accent-emerald-600" />取得代行可
                          </label>
                          <fieldset className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <legend className="px-1 text-xs font-bold text-slate-600 dark:text-slate-300">公開範囲</legend>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:min-h-0"><input type="radio" checked={(document.companyIds ?? []).length === 0} onChange={() => updateDocument(category.id, document.id, 'companyIds', [])} className="h-4 w-4 accent-emerald-600" />全社共通</label>
                              {selectableCompanies.map((company) => {
                                const selected = (document.companyIds ?? []).includes(company.id);
                                return <label key={company.id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:min-h-0"><input type="checkbox" checked={selected} onChange={(event) => updateDocument(category.id, document.id, 'companyIds', event.target.checked ? [...(document.companyIds ?? []), company.id] : (document.companyIds ?? []).filter((id) => id !== company.id))} className="h-4 w-4 accent-emerald-600" />{company.name}</label>;
                              })}
                            </div>
                          </fieldset>
                        </div>
                      ))}
                      <button onClick={() => updateCategory(category.id, (current) => ({ ...current, documents: [...current.documents, { id: createId(), name: '新しい書類', description: '', howToGet: '', canDelegate: false, companyIds: [] }] }))} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
                        <Plus className="h-4 w-4" />書類を追加
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            <button onClick={() => {
              const id = createId();
              updateCategories((current) => [...current, { id, name: '新しいカテゴリ', documents: [] }]);
              setExpanded((current) => new Set(current).add(id));
            }} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
              <Plus className="h-4 w-4" />カテゴリを追加
            </button>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="publish-history-heading">
          <h2 id="publish-history-heading" className="text-lg font-bold">公開履歴</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">過去版はまず下書きへ復元されます。確認後に公開してください。</p>
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
            {versions.map((version) => (
              <li key={version.version} className="flex items-center justify-between gap-3 py-3">
                <div><strong>第{version.version}版</strong><span className="ml-3 text-sm text-slate-500">{new Date(`${version.published_at}Z`).toLocaleString('ja-JP')}</span></div>
                <button disabled={disabled} onClick={() => void restore(version.version)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"><RotateCcw className="h-4 w-4" />下書きへ復元</button>
              </li>
            ))}
          </ul>
        </section>
        </> : activeTab === 'categories' ? (
          <CategoryMasterPage onDirtyChange={setCategoryDirty} />
        ) : activeTab === 'resources' ? (
          <section role="tabpanel" aria-label="参考資料マスタ" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ResourcesPage embedded />
          </section>
        ) : (
          <AuditLogPage />
        )}
      </div>
    </main>
  );
};
