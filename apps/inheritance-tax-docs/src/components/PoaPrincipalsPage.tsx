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

// SQLite の datetime('now') は UTC の 'YYYY-MM-DD HH:MM:SS'。一覧には日付だけ出し、時刻はカーソルを当てたとき
const formatUpdatedAt = (value: string) => {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return { date: value, full: value };
  return {
    date: date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    full: date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
  };
};

const UpdatedAtCell = ({ value }: { value: string }) => {
  const { date, full } = formatUpdatedAt(value);
  return (
    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap" title={full}>
      {date}
    </td>
  );
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
const thClass = 'text-left font-medium px-3 py-2 whitespace-nowrap';
const nameButtonClass = 'text-left font-medium hover:text-emerald-700 hover:underline dark:hover:text-emerald-400';
// 名前は1文字ずつ折り返すと読めないので、狭い画面では表ごと横へ流す
const nameCellClass = 'px-3 py-2 whitespace-nowrap';
const memoCellClass = 'px-3 py-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap min-w-[10rem]';

type Undo = { action: () => Promise<unknown>; done: string };
type Message = { kind: 'ok' | 'error'; text: string; undo?: Undo } | null;

/**
 * 一覧の行の操作を実行して、結果を1行出してから読み直す（両方のタブで共用）。
 * 削除とつながりを外す操作は確認を挟まずに実行し、代わりに結果の行へ「元に戻す」を出す
 * （どちらもゴミ箱・つなぎ直しで戻せるので、毎回聞くより間違えたときにすぐ戻せるほうが速い）
 */
function useRowAction(reload: () => Promise<void>) {
  const [message, setMessage] = useState<Message>(null);
  const run = async (action: () => Promise<unknown>, done: string, undo?: Undo) => {
    try {
      await action();
      setMessage({ kind: 'ok', text: done, undo });
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
      <input className={`${inputClass} pl-8 pr-8`} value={query} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onQuery(e.target.value)} />
      {query && (
        <button
          type="button"
          onClick={() => onQuery('')}
          aria-label="検索語を消す"
          title="検索語を消す"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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

/** 結果の1行。取り消せる操作なら「元に戻す」を添える */
const MessageLine = ({ message, onUndo }: { message: Message; onUndo: (undo: Undo) => void }) =>
  message && (
    <p
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm ${
        message.kind === 'ok'
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      }`}
    >
      {message.text}
      {message.undo && (
        <button type="button" onClick={() => onUndo(message.undo!)} className="inline-flex items-center gap-1 font-bold underline">
          <RotateCcw className="w-3.5 h-3.5" /> 元に戻す
        </button>
      )}
    </p>
  );

/** 件数と、ゴミ箱を見ているときの目印（一覧と見た目が同じなので、ここで言わないと気づけない）。読み込み中は件数を出さない（「0件」に見える） */
const ListSummary = ({ count, loaded, showDeleted, onLeaveTrash }: { count: number; loaded: boolean; showDeleted: boolean; onLeaveTrash: () => void }) =>
  showDeleted ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
      <Trash2 className="w-4 h-4" aria-hidden="true" />
      <span>
        ゴミ箱の中を見ています{loaded && `（${count}件）`}。「戻す」で一覧へ戻せます。
      </span>
      <button type="button" onClick={onLeaveTrash} className="ml-auto font-bold underline">
        一覧に戻る
      </button>
    </div>
  ) : (
    <p className="min-h-4 text-xs text-slate-500 dark:text-slate-400">{loaded && `${count}件`}</p>
  );

/** 読み込み中・失敗・0件の1行 */
const ListState = ({ status, error, empty, emptyText }: { status: 'loading' | 'ok' | 'error'; error: string; empty: boolean; emptyText: string }) => {
  if (status === 'error') return <p className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!empty) return null;
  return <p className="px-3 py-6 text-center text-sm text-slate-500">{status === 'loading' ? '読み込み中…' : emptyText}</p>;
};

/** 行の右端の操作（両方のタブで共用） */
const RowActions = ({
  showDeleted,
  createHref,
  onRestore,
  onEdit,
  onDelete,
}: {
  showDeleted: boolean;
  createHref: string;
  onRestore: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <td className="px-3 py-2">
    <div className="flex justify-end gap-1 whitespace-nowrap">
      {showDeleted ? (
        <button type="button" onClick={onRestore} className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}>
          <RotateCcw className="w-3.5 h-3.5" /> 戻す
        </button>
      ) : (
        <>
          <Link to={createHref} className={`${rowButtonClass} text-emerald-700 dark:text-emerald-400`}>
            <FileSignature className="w-3.5 h-3.5" /> 委任状を作る
          </Link>
          <button type="button" onClick={onEdit} className={rowButtonClass}>
            <Pencil className="w-3.5 h-3.5" /> 編集
          </button>
          <button type="button" onClick={onDelete} className={`${rowButtonClass} text-slate-500 hover:text-red-600`}>
            <Trash2 className="w-3.5 h-3.5" /> 削除
          </button>
        </>
      )}
    </div>
  </td>
);

/** 氏名とフリガナ。一覧に出ている間は氏名を押せば編集が開く */
const NameCell = ({ name, nameKana, onEdit }: { name: string; nameKana: string; onEdit?: () => void }) => (
  <td className={nameCellClass}>
    {onEdit ? (
      <button type="button" onClick={onEdit} className={nameButtonClass}>
        {name}
      </button>
    ) : (
      <div className="font-medium">{name}</div>
    )}
    {nameKana && <div className="text-xs text-slate-500 dark:text-slate-400">{nameKana}</div>}
  </td>
);

type TabProps = { query: string; onQuery: (query: string) => void };

// 委任者の行から開いた被相続人。検索は相続人の名前も拾うので、同じ名前で引くと別の人も並ぶ。どれを開いたかは色で示す
const focusRowClass = 'bg-emerald-50/70 dark:bg-emerald-900/20';

const DeceasedTab = ({ query, onQuery, focusId }: TabProps & { focusId: number | null }) => {
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PoaDeceased | 'new' | null>(null);
  const [editingHeir, setEditingHeir] = useState<PoaPrincipal | null>(null);
  const [addingHeirTo, setAddingHeirTo] = useState<PoaDeceased | null>(null);
  const [creatingHeirFor, setCreatingHeirFor] = useState<PoaDeceased | null>(null);
  const { deceasedList, status, error, reload } = useDeceasedSearch(query, showDeleted);
  const { message, setMessage, run } = useRowAction(reload);

  const toggleDeleted = () => {
    setShowDeleted((v) => !v);
    setMessage(null);
  };

  const handleDelete = (deceased: PoaDeceased) =>
    void run(() => deleteDeceased(deceased.id), `「${deceased.name}」をゴミ箱へ移しました（相続人の委任者は残っています）`, {
      action: () => restoreDeceased(deceased.id),
      done: `「${deceased.name}」を戻しました`,
    });

  const handleUnlink = (deceased: PoaDeceased, heir: PoaPrincipal) =>
    void run(() => unlinkHeir(deceased.id, heir.id), `「${heir.name}」を「${deceased.name}」の相続人から外しました（委任者DBには残っています）`, {
      action: () => linkHeirs(deceased.id, [heir.id]),
      done: `「${heir.name}」を「${deceased.name}」の相続人に戻しました`,
    });

  return (
    <>
      <Toolbar
        query={query}
        onQuery={onQuery}
        placeholder="氏名・フリガナ・相続人の名前で探す"
        showDeleted={showDeleted}
        onToggleDeleted={toggleDeleted}
        onCreate={() => setEditing('new')}
      />
      <MessageLine message={message} onUndo={(undo) => void run(undo.action, undo.done)} />
      <ListSummary count={deceasedList.length} loaded={status === 'ok' || deceasedList.length > 0} showDeleted={showDeleted} onLeaveTrash={toggleDeleted} />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className={thClass}>被相続人</th>
              <th className={thClass}>相続人（委任者）</th>
              <th className={thClass}>メモ</th>
              <th className={thClass}>更新</th>
              <th className="px-3 py-2"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {deceasedList.map((deceased) => (
              <tr
                key={deceased.id}
                ref={deceased.id === focusId ? (row) => row?.scrollIntoView({ block: 'nearest' }) : undefined}
                className={`align-top ${deceased.id === focusId ? focusRowClass : ''}`}
              >
                <NameCell name={deceased.name} nameKana={deceased.nameKana} onEdit={showDeleted ? undefined : () => setEditing(deceased)} />
                <td className="px-3 py-2 min-w-[14rem]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {deceased.heirs.map((heir) => (
                      <span
                        key={heir.id}
                        className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-emerald-50 dark:bg-emerald-900/30 pl-2.5 pr-1 py-0.5 text-xs text-emerald-900 dark:text-emerald-200"
                      >
                        {showDeleted ? (
                          heir.name
                        ) : (
                          <button type="button" onClick={() => setEditingHeir(heir)} title={`「${heir.name}」を編集`} className="hover:underline">
                            {heir.name}
                          </button>
                        )}
                        {heir.kind === 'corporate' && <span className="text-[10px] text-emerald-700 dark:text-emerald-400">（法人）</span>}
                        {!showDeleted && (
                          <button
                            type="button"
                            title={`「${heir.name}」とのつながりを外す`}
                            aria-label={`「${heir.name}」とのつながりを外す`}
                            onClick={() => handleUnlink(deceased, heir)}
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
                <td className={memoCellClass}>{deceased.memo}</td>
                <UpdatedAtCell value={deceased.updatedAt} />
                <RowActions
                  showDeleted={showDeleted}
                  createHref={`/power-of-attorney?deceased=${deceased.id}`}
                  onRestore={() => void run(() => restoreDeceased(deceased.id), `「${deceased.name}」を戻しました`)}
                  onEdit={() => setEditing(deceased)}
                  onDelete={() => handleDelete(deceased)}
                />
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
      {editingHeir && (
        <PrincipalEditDialog
          principal={editingHeir}
          onClose={() => setEditingHeir(null)}
          onSaved={(saved) => {
            setEditingHeir(null);
            setMessage({ kind: 'ok', text: `「${saved.name}」を保存しました` });
            void reload();
          }}
        />
      )}
      {addingHeirTo && (
        <PrincipalPickerDialog
          title={`「${addingHeirTo.name}」の相続人を足す`}
          linkedIds={addingHeirTo.heirs.map((heir) => heir.id)}
          onClose={() => setAddingHeirTo(null)}
          onCreate={() => {
            setCreatingHeirFor(addingHeirTo);
            setAddingHeirTo(null);
          }}
          onPick={(principal) => {
            const target = addingHeirTo;
            setAddingHeirTo(null);
            void run(() => linkHeirs(target.id, [principal.id]), `「${principal.name}」を「${target.name}」の相続人としてつなぎました`);
          }}
        />
      )}
      {creatingHeirFor && (
        <PrincipalEditDialog
          onClose={() => setCreatingHeirFor(null)}
          onSaved={(saved) => {
            const target = creatingHeirFor;
            setCreatingHeirFor(null);
            void run(() => linkHeirs(target.id, [saved.id]), `「${saved.name}」を登録して「${target.name}」の相続人としてつなぎました`);
          }}
        />
      )}
    </>
  );
};

const PeopleTab = ({ query, onQuery, onOpenDeceased }: TabProps & { onOpenDeceased: (deceased: { id: number; name: string }) => void }) => {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PoaPrincipal | 'new' | null>(null);
  const { principals, status, error, reload } = usePrincipalSearch(query, showDeleted);
  const { message, setMessage, run } = useRowAction(reload);
  const shown = kindFilter === 'all' ? principals : principals.filter((principal) => principal.kind === kindFilter);
  // 検索し直している間は前の結果のまま数える（最初の読み込みだけ「0」に見えないよう出さない）
  const loaded = status === 'ok' || principals.length > 0;
  const kindCount = (value: KindFilter) => (value === 'all' ? principals.length : principals.filter((principal) => principal.kind === value).length);

  const toggleDeleted = () => {
    setShowDeleted((v) => !v);
    setMessage(null);
  };

  const handleDelete = (principal: PoaPrincipal) =>
    void run(() => deletePrincipal(principal.id), `「${principal.name}」をゴミ箱へ移しました`, {
      action: () => restorePrincipal(principal.id),
      done: `「${principal.name}」を戻しました`,
    });

  return (
    <>
      <Toolbar
        query={query}
        onQuery={onQuery}
        placeholder="氏名・フリガナ・被相続人で探す"
        showDeleted={showDeleted}
        onToggleDeleted={toggleDeleted}
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
              className={`px-3 py-1.5 font-medium whitespace-nowrap ${
                kindFilter === value ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {label}
              {loaded && <span className={`ml-1 text-xs ${kindFilter === value ? 'text-emerald-100' : 'text-slate-400'}`}>{kindCount(value)}</span>}
            </button>
          ))}
        </div>
      </Toolbar>
      <MessageLine message={message} onUndo={(undo) => void run(undo.action, undo.done)} />
      <ListSummary count={shown.length} loaded={loaded} showDeleted={showDeleted} onLeaveTrash={toggleDeleted} />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className={thClass}>氏名・法人名</th>
              <th className={thClass}>区分</th>
              <th className={thClass}>被相続人</th>
              <th className={thClass}>メモ</th>
              <th className={thClass}>更新</th>
              <th className="px-3 py-2"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.map((principal) => (
              <tr key={principal.id} className="align-top">
                <NameCell name={principal.name} nameKana={principal.nameKana} onEdit={showDeleted ? undefined : () => setEditing(principal)} />
                <td className="px-3 py-2 whitespace-nowrap">{KIND_LABELS[principal.kind]}</td>
                <td className="px-3 py-2">
                  {/* 押すと被相続人のタブでその人を探す（相続人の顔ぶれを見に行く近道） */}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {principal.deceased.map((deceased) => (
                      <button
                        key={deceased.id}
                        type="button"
                        onClick={() => onOpenDeceased(deceased)}
                        title={`被相続人「${deceased.name}」を見る`}
                        className="whitespace-nowrap text-left hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                      >
                        {deceased.name}
                      </button>
                    ))}
                  </div>
                </td>
                <td className={memoCellClass}>{principal.memo}</td>
                <UpdatedAtCell value={principal.updatedAt} />
                <RowActions
                  showDeleted={showDeleted}
                  createHref={`/power-of-attorney?principal=${principal.id}`}
                  onRestore={() => void run(() => restorePrincipal(principal.id), `「${principal.name}」を戻しました`)}
                  onEdit={() => setEditing(principal)}
                  onDelete={() => handleDelete(principal)}
                />
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
 * タブと検索語は URL に持つ（読み直しや戻るで消えないように。委任者の行から被相続人を開く近道もこれで渡す）。
 */
export const PoaPrincipalsPage = () => {
  const { isDark, toggleDark } = useDarkMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'people' ? 'people' : 'deceased';
  const query = searchParams.get('q') ?? '';
  const focusId = Number(searchParams.get('focus')) || null;

  // 打つたびに履歴を積まない（replace）。タブを移る近道だけは「戻る」で元の一覧へ帰れるように積む
  const show = (next: Tab, q = '', replace = true, focus?: number) => {
    const params: Record<string, string> = {};
    if (next !== 'deceased') params.tab = next;
    if (q) params.q = q;
    if (focus) params.focus = String(focus);
    setSearchParams(params, { replace });
  };

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
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
            className="ml-auto p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                onClick={() => show(value)}
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
          {tab === 'deceased' ? (
            <DeceasedTab query={query} focusId={focusId} onQuery={(q) => show('deceased', q)} />
          ) : (
            <PeopleTab query={query} onQuery={(q) => show('people', q)} onOpenDeceased={(deceased) => show('deceased', deceased.name, false, deceased.id)} />
          )}
        </div>
      </div>
    </div>
  );
};
