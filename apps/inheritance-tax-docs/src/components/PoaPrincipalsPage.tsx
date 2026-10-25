import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileSignature, Home, Moon, Pencil, Plus, RotateCcw, Search, Sun, Trash2, UserPlus, X } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useDeceasedSearch } from '@/hooks/useDeceasedSearch';
import { usePrincipalSearch } from '@/hooks/usePrincipalSearch';
import { inputClass } from '@/components/powerOfAttorney/FormFields';
import { DeceasedEditDialog } from '@/components/powerOfAttorney/DeceasedEditDialog';
import { PrincipalEditDialog } from '@/components/powerOfAttorney/PrincipalEditDialog';
import { PrincipalPickerDialog } from '@/components/powerOfAttorney/PrincipalPickerDialog';
import { deleteDeceased, linkHeirs, restoreDeceased, unlinkHeir, type PoaDeceased } from '@/utils/powerOfAttorney/deceasedApi';
import { deletePrincipal, restorePrincipal, type PoaPrincipal } from '@/utils/powerOfAttorney/principalApi';

// SQLite の datetime('now') は UTC の 'YYYY-MM-DD HH:MM:SS'
const formatUpdatedAt = (value: string) => {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const KIND_LABELS: Record<PoaPrincipal['kind'], string> = { individual: '個人', corporate: '法人' };

type Tab = 'deceased' | 'people';
const TABS: { value: Tab; label: string }[] = [
  { value: 'deceased', label: '被相続人' },
  { value: 'people', label: '人・法人（委任者）' },
];

type KindFilter = 'all' | PoaPrincipal['kind'];
const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'individual', label: '個人' },
  { value: 'corporate', label: '法人' },
];

const rowButtonClass = 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-700';
const toolbarButtonClass = 'flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700';
const thClass = 'text-left font-medium px-3 py-2';

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** 一覧の行の操作を実行して、結果を1行出してから読み直す（両方のタブで共用） */
function useRowAction(reload: () => Promise<void>) {
  const [message, setMessage] = useState<Message>(null);
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setMessage({ kind: 'ok', text: done });
      await reload();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : '操作できませんでした' });
    }
  };
  return { message, setMessage, run };
}

/** 検索欄・新規・ゴミ箱の並び（両方のタブで共用） */
const Toolbar = ({
  query,
  onQuery,
  placeholder,
  showDeleted,
  onToggleDeleted,
  onCreate,
  children,
}: {
  query: string;
  onQuery: (query: string) => void;
  placeholder: string;
  showDeleted: boolean;
  onToggleDeleted: () => void;
  onCreate: () => void;
  children?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <label className="relative flex-1 min-w-[220px] max-w-md">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
      <input className={`${inputClass} pl-8`} value={query} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onQuery(e.target.value)} />
    </label>
    {children}
    {!showDeleted && (
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold"
      >
        <Plus className="w-4 h-4" /> 新しく登録
      </button>
    )}
    <button type="button" aria-pressed={showDeleted} onClick={onToggleDeleted} className={toolbarButtonClass}>
      <Trash2 className="w-4 h-4" /> {showDeleted ? '一覧に戻る' : 'ゴミ箱'}
    </button>
  </div>
);

const MessageLine = ({ message }: { message: Message }) =>
  message && (
    <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {message.text}
    </p>
  );

/** 読み込み中・失敗・0件の1行 */
const ListState = ({ status, error, empty, emptyText }: { status: 'loading' | 'ok' | 'error'; error: string; empty: boolean; emptyText: string }) => {
  if (status === 'error') return <p className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!empty) return null;
  return <p className="px-3 py-6 text-center text-sm text-slate-500">{status === 'loading' ? '読み込み中…' : emptyText}</p>;
};

const DeceasedTab = () => {
  const [query, setQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PoaDeceased | 'new' | null>(null);
  const [addingHeirTo, setAddingHeirTo] = useState<PoaDeceased | null>(null);
  const { deceasedList, status, error, reload } = useDeceasedSearch(query, showDeleted);
  const { message, setMessage, run } = useRowAction(reload);

  const handleDelete = (deceased: PoaDeceased) => {
    if (!window.confirm(`「${deceased.name}」をゴミ箱へ移しますか？（相続人の委任者は消えません。ゴミ箱から戻せます）`)) return;
    void run(() => deleteDeceased(deceased.id), `「${deceased.name}」をゴミ箱へ移しました`);
  };

  return (
    <>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="氏名・フリガナ・相続人の名前で探す"
        showDeleted={showDeleted}
        onToggleDeleted={() => {
          setShowDeleted((v) => !v);
          setMessage(null);
        }}
        onCreate={() => setEditing('new')}
      />
      <MessageLine message={message} />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className={thClass}>被相続人</th>
              <th className={thClass}>相続人（委任者）</th>
              <th className={thClass}>メモ</th>
              <th className={`${thClass} whitespace-nowrap`}>更新</th>
              <th className="px-3 py-2"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {deceasedList.map((deceased) => (
              <tr key={deceased.id} className="align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{deceased.name}</div>
                  {deceased.nameKana && <div className="text-xs text-slate-500 dark:text-slate-400">{deceased.nameKana}</div>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {deceased.heirs.map((heir) => (
                      <span
                        key={heir.id}
                        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 pl-2.5 pr-1 py-0.5 text-xs text-emerald-900 dark:text-emerald-200"
                      >
                        {heir.name}
                        {heir.kind === 'corporate' && <span className="text-[10px] text-emerald-700 dark:text-emerald-400">（法人）</span>}
                        {!showDeleted && (
                          <button
                            type="button"
                            title={`「${heir.name}」とのつながりを外す`}
                            aria-label={`「${heir.name}」とのつながりを外す`}
                            onClick={() =>
                              void run(() => unlinkHeir(deceased.id, heir.id), `「${heir.name}」を「${deceased.name}」の相続人から外しました（委任者DBには残っています）`)
                            }
                            className="rounded-full p-0.5 text-emerald-700 hover:bg-emerald-100 hover:text-red-600 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {!showDeleted && (
                      <button type="button" onClick={() => setAddingHeirTo(deceased)} className={`${rowButtonClass} text-slate-600 dark:text-slate-300`}>
                        <UserPlus className="w-3.5 h-3.5" /> 相続人を足す
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-w-[200px]">{deceased.memo}</td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{formatUpdatedAt(deceased.updatedAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    {showDeleted ? (
                      <button
                        type="button"
                        onClick={() => void run(() => restoreDeceased(deceased.id), `「${deceased.name}」を戻しました`)}
                        className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> 戻す
                      </button>
                    ) : (
                      <>
                        <Link to={`/power-of-attorney?deceased=${deceased.id}`} className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}>
                          <FileSignature className="w-3.5 h-3.5" /> 委任状を作る
                        </Link>
                        <button type="button" onClick={() => setEditing(deceased)} className={rowButtonClass}>
                          <Pencil className="w-3.5 h-3.5" /> 編集
                        </button>
                        <button type="button" onClick={() => handleDelete(deceased)} className={`${rowButtonClass} text-slate-500 hover:text-red-600`}>
                          <Trash2 className="w-3.5 h-3.5" /> 削除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ListState
          status={status}
          error={error}
          empty={deceasedList.length === 0}
          emptyText={
            query ? '当てはまる被相続人がいません。' : showDeleted ? 'ゴミ箱は空です。' : 'まだ登録がありません。委任状の画面の「被相続人DBに登録」からも登録できます。'
          }
        />
      </div>

      {editing && (
        <DeceasedEditDialog
          deceased={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setMessage({ kind: 'ok', text: `「${saved.name}」を保存しました` });
            void reload();
          }}
        />
      )}
      {addingHeirTo && (
        <PrincipalPickerDialog
          title={`「${addingHeirTo.name}」の相続人を足す`}
          onClose={() => setAddingHeirTo(null)}
          onPick={(principal) => {
            const target = addingHeirTo;
            setAddingHeirTo(null);
            void run(() => linkHeirs(target.id, [principal.id]), `「${principal.name}」を「${target.name}」の相続人としてつなぎました`);
          }}
        />
      )}
    </>
  );
};

const PeopleTab = () => {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PoaPrincipal | 'new' | null>(null);
  const { principals, status, error, reload } = usePrincipalSearch(query, showDeleted);
  const { message, setMessage, run } = useRowAction(reload);
  const shown = kindFilter === 'all' ? principals : principals.filter((principal) => principal.kind === kindFilter);

  const handleDelete = (principal: PoaPrincipal) => {
    if (!window.confirm(`「${principal.name}」をゴミ箱へ移しますか？（ゴミ箱から戻せます）`)) return;
    void run(() => deletePrincipal(principal.id), `「${principal.name}」をゴミ箱へ移しました`);
  };

  return (
    <>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="氏名・フリガナ・被相続人で探す"
        showDeleted={showDeleted}
        onToggleDeleted={() => {
          setShowDeleted((v) => !v);
          setMessage(null);
        }}
        onCreate={() => setEditing('new')}
      >
        <div role="radiogroup" aria-label="区分で絞る" className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-sm">
          {KIND_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kindFilter === value}
              onClick={() => setKindFilter(value)}
              className={`px-3 py-1.5 font-medium ${
                kindFilter === value ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Toolbar>
      <MessageLine message={message} />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className={thClass}>氏名・法人名</th>
              <th className={`${thClass} whitespace-nowrap`}>区分</th>
              <th className={thClass}>被相続人</th>
              <th className={thClass}>メモ</th>
              <th className={`${thClass} whitespace-nowrap`}>更新</th>
              <th className="px-3 py-2"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.map((principal) => (
              <tr key={principal.id} className="align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{principal.name}</div>
                  {principal.nameKana && <div className="text-xs text-slate-500 dark:text-slate-400">{principal.nameKana}</div>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{KIND_LABELS[principal.kind]}</td>
                <td className="px-3 py-2">{principal.deceased.map((deceased) => deceased.name).join('・')}</td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-w-[240px]">{principal.memo}</td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{formatUpdatedAt(principal.updatedAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    {showDeleted ? (
                      <button
                        type="button"
                        onClick={() => void run(() => restorePrincipal(principal.id), `「${principal.name}」を戻しました`)}
                        className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> 戻す
                      </button>
                    ) : (
                      <>
                        <Link to={`/power-of-attorney?principal=${principal.id}`} className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}>
                          <FileSignature className="w-3.5 h-3.5" /> 委任状を作る
                        </Link>
                        <button type="button" onClick={() => setEditing(principal)} className={rowButtonClass}>
                          <Pencil className="w-3.5 h-3.5" /> 編集
                        </button>
                        <button type="button" onClick={() => handleDelete(principal)} className={`${rowButtonClass} text-slate-500 hover:text-red-600`}>
                          <Trash2 className="w-3.5 h-3.5" /> 削除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ListState
          status={status}
          error={error}
          empty={shown.length === 0}
          emptyText={
            query || principals.length > 0
              ? '当てはまる委任者がいません。'
              : showDeleted
                ? 'ゴミ箱は空です。'
                : 'まだ登録がありません。委任状の画面の「委任者DBに登録」からも登録できます。'
          }
        />
      </div>

      {editing && (
        <PrincipalEditDialog
          principal={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setMessage({ kind: 'ok', text: `「${saved.name}」を保存しました` });
            void reload();
          }}
        />
      )}
    </>
  );
};

/**
 * 委任状のDB（被相続人・委任者）。委任状を作るたびに打ち直さないための控えで、相続税案件管理とは連動しない
 * （あちらは厳重に運用しているので、ここから書き換えない・引っ張られない）。
 * 被相続人と委任者は多対多（二次相続では同じ相続人が2人の被相続人につながる）。
 * 住所・生年月日は一覧に出さず、編集のときだけ見せる。
 */
export const PoaPrincipalsPage = () => {
  const { isDark, toggleDark } = useDarkMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'people' ? 'people' : 'deceased';

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href="/" className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400" title="ポータルに戻る">
              <Home className="h-5 w-5" />
              <span className="hidden md:inline text-sm font-medium">ポータル</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <Link to="/power-of-attorney" className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400" title="委任状に戻る">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">委任状に戻る</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">委任状のDB</h1>
          </div>
          <button
            onClick={toggleDark}
            className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto p-4 md:px-8 md:py-6 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          委任状を作るときに呼び出すための控えです。相続税案件管理とは連動しません（ここで直しても案件管理は変わりません）。
        </p>

        <div role="tablist" aria-label="DBの種類" className="grid max-w-md grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/60">
          {TABS.map(({ value, label }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSearchParams(value === 'deceased' ? {} : { tab: value }, { replace: true })}
                className={`min-h-11 px-3 text-sm font-bold rounded-lg ${
                  active
                    ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="space-y-4">
          {tab === 'deceased' ? <DeceasedTab /> : <PeopleTab />}
        </div>
      </div>
    </div>
  );
};
