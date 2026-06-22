import { useState } from 'react';
import { Trash2, RotateCcw, X, FileText, FolderOpen, Undo2 } from 'lucide-react';
import type { Trash } from '@/constants';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';

type TrashModalProps = {
  trash: Trash;
  onRestore: (trashId: string) => void;
  onRemove: (trashId: string) => void;
  onRestoreAll: () => void;
  onClear: () => void;
  onClose: () => void;
};

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const TrashModal = ({ trash, onRestore, onRemove, onRestoreAll, onClear, onClose }: TrashModalProps) => {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <DialogOverlay labelledBy="trash-modal-title" onClose={onClose} maxWidth="max-w-lg">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-slate-500 dark:text-slate-300" aria-hidden="true" />
          </div>
          <h3 id="trash-modal-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">
            ゴミ箱 <span className="text-sm font-normal text-slate-400 dark:text-slate-500">({trash.length})</span>
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {trash.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
          削除した書類・カテゴリはありません
        </p>
      ) : (
        <>
          <ul className="max-h-[50vh] overflow-y-auto space-y-2 mb-4 pr-1">
            {trash.map((item) => {
              const isCategory = item.kind === 'category';
              const name = isCategory ? item.category.name : item.document.name;
              const sub = isCategory
                ? `カテゴリ・書類${item.category.documents.length}件`
                : `書類 ／ ${item.categoryName}`;
              return (
                <li
                  key={item.trashId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCategory
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300'
                    }`}
                  >
                    {isCategory ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {sub} ・ {formatDateTime(item.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(item.trashId)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />復元
                  </button>
                  <button
                    onClick={() => onRemove(item.trashId)}
                    aria-label="完全に削除"
                    title="完全に削除"
                    className="flex-shrink-0 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* フッター操作 */}
          <div className="flex justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
            {confirmingClear ? (
              <button
                onClick={() => { onClear(); setConfirmingClear(false); }}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                本当に空にしますか？
              </button>
            ) : (
              <button
                onClick={() => setConfirmingClear(true)}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg font-medium transition-colors"
              >
                ゴミ箱を空にする
              </button>
            )}
            <button
              onClick={onRestoreAll}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />すべて復元
            </button>
          </div>
        </>
      )}
    </DialogOverlay>
  );
};
