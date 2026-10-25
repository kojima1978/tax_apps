import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSignature, Home, Moon, Pencil, Plus, RotateCcw, Search, Sun, Trash2 } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePrincipalSearch } from '@/hooks/usePrincipalSearch';
import { inputClass } from '@/components/powerOfAttorney/FormFields';
import { PrincipalEditDialog } from '@/components/powerOfAttorney/PrincipalEditDialog';
import { deletePrincipal, restorePrincipal, type PoaPrincipal } from '@/utils/powerOfAttorney/principalApi';

// SQLite の datetime('now') は UTC の 'YYYY-MM-DD HH:MM:SS'
const formatUpdatedAt = (value: string) => {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const KIND_LABELS: Record<PoaPrincipal['kind'], string> = { individual: '個人', corporate: '法人' };

const rowButtonClass = 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-700';

/**
 * 委任者DB。委任状を作るたびに打ち直さないための控えで、相続税案件管理とは連動しない
 * （あちらは厳重に運用しているので、ここから書き換えない・引っ張られない）。
 * 住所・生年月日は一覧に出さず、編集のときだけ見せる。
 */
export const PoaPrincipalsPage = () => {
  const { isDark, toggleDark } = useDarkMode();
  const [query, setQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PoaPrincipal | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const { principals, status, error, reload } = usePrincipalSearch(query, showDeleted);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setMessage({ kind: 'ok', text: done });
      await reload();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : '操作できませんでした' });
    }
  };

  const handleDelete = (principal: PoaPrincipal) => {
    if (!window.confirm(`「${principal.name}」をゴミ箱へ移しますか？（ゴミ箱から戻せます）`)) return;
    void run(() => deletePrincipal(principal.id), `「${principal.name}」をゴミ箱へ移しました`);
  };

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
              <span className="text-sm font-medium">委任状</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">委任者DB</h1>
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClass} pl-8`}
              value={query}
              placeholder="氏名・フリガナ・被相続人で探す"
              aria-label="委任者を探す"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {!showDeleted && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> 新しく登録
            </button>
          )}
          <button
            type="button"
            aria-pressed={showDeleted}
            onClick={() => {
              setShowDeleted((v) => !v);
              setMessage(null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Trash2 className="w-4 h-4" /> {showDeleted ? '一覧に戻る' : 'ゴミ箱'}
          </button>
        </div>

        {message && (
          <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {message.text}
          </p>
        )}

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-3 py-2">氏名・法人名</th>
                <th className="text-left font-medium px-3 py-2 whitespace-nowrap">区分</th>
                <th className="text-left font-medium px-3 py-2">被相続人</th>
                <th className="text-left font-medium px-3 py-2">メモ</th>
                <th className="text-left font-medium px-3 py-2 whitespace-nowrap">更新</th>
                <th className="px-3 py-2"><span className="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {principals.map((principal) => (
                <tr key={principal.id} className="align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{principal.name}</div>
                    {principal.nameKana && <div className="text-xs text-slate-500 dark:text-slate-400">{principal.nameKana}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{KIND_LABELS[principal.kind]}</td>
                  <td className="px-3 py-2">{principal.deceasedName}</td>
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
          {status === 'loading' && principals.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">読み込み中…</p>}
          {status === 'error' && <p className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
          {status === 'ok' && principals.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              {query ? '当てはまる委任者がいません。' : showDeleted ? 'ゴミ箱は空です。' : 'まだ登録がありません。委任状の画面の「委任者DBに登録」からも登録できます。'}
            </p>
          )}
        </div>
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
    </div>
  );
};
