'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  CornerDownRight,
  GripVertical,
} from 'lucide-react';
import type { EditableDocument } from '@/constants';
import type { EditingSubItem, AddingSubItemTo, DocHandlers, SubItemHandlers } from '@/hooks/useEditableListEditing';

// ─── Props ───

export type SortableDocumentItemProps = {
  doc: EditableDocument;
  categoryId: string;
  isEditing: boolean;
  editText: string;
  setEditText: (text: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  docHandlers: DocHandlers;
  editingSubItem: EditingSubItem;
  editSubItemText: string;
  setEditSubItemText: (text: string) => void;
  addingSubItemTo: AddingSubItemTo;
  newSubItemText: string;
  setNewSubItemText: (text: string) => void;
  subItemHandlers: SubItemHandlers;
  isDragging?: boolean;
};

// ─── ドラッグ可能な書類アイテム ───

export const SortableDocumentItem = memo(({
  doc,
  categoryId,
  isEditing,
  editText,
  setEditText,
  onConfirmEdit,
  onCancelEdit,
  docHandlers,
  editingSubItem,
  editSubItemText,
  setEditSubItemText,
  addingSubItemTo,
  newSubItemText,
  setNewSubItemText,
  subItemHandlers,
  isDragging = false,
}: SortableDocumentItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isCurrentlyDragging ? 'opacity-50' : ''}`}
    >
      {/* 大項目 */}
      <div
        className={`flex items-start p-3 rounded-lg border transition-colors ${
          doc.checked
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-slate-50 border-slate-200'
        } ${isCurrentlyDragging ? 'shadow-lg ring-2 ring-emerald-400' : ''}`}
      >
        {/* ドラッグハンドル */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 mr-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          title="ドラッグして並び替え"
          aria-label={`${doc.text}を並び替え`}
          aria-roledescription="ドラッグ可能な書類"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* チェックボックス */}
        <button
          onClick={() => docHandlers.toggleCheck(categoryId, doc.id)}
          className={`flex-shrink-0 w-6 h-6 mr-3 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
            doc.checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-400'
          }`}
          role="checkbox"
          aria-checked={doc.checked}
          aria-label={`${doc.text}を${doc.checked ? '選択解除' : '選択'}`}
        >
          {doc.checked && <Check className="w-4 h-4" />}
        </button>

        {/* 書類内容 */}
        <div className="flex-grow min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-grow px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
                aria-label="書類名を編集"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={onConfirmEdit}
                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                aria-label="編集を確定"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                aria-label="編集をキャンセル"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <span className={doc.checked ? 'text-slate-800' : 'text-slate-600'}>
              {doc.text}
            </span>
          )}
        </div>

        {/* アクションボタン */}
        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => subItemHandlers.startAdd(categoryId, doc.id)}
              className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
              title="中項目を追加"
              aria-label={`${doc.text}に中項目を追加`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => docHandlers.startEdit(categoryId, doc.id, doc.text)}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
              title="編集"
              aria-label={`${doc.text}を編集`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => docHandlers.remove(categoryId, doc.id)}
              className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
              title="削除"
              aria-label={`${doc.text}を削除`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 中項目リスト */}
      {doc.subItems.length > 0 && (
        <ul className="ml-9 mt-1 space-y-1">
          {doc.subItems.map((subItem) => (
            <li
              key={subItem.id}
              className="flex items-center p-2 pl-3 bg-slate-100 rounded-lg border-l-2 border-slate-300"
            >
              <CornerDownRight className="w-3 h-3 text-slate-400 mr-2 flex-shrink-0" aria-hidden="true" />
              {editingSubItem?.subItemId === subItem.id ? (
                <div className="flex items-center gap-2 flex-grow">
                  <input
                    type="text"
                    value={editSubItemText}
                    onChange={(e) => setEditSubItemText(e.target.value)}
                    className="flex-grow px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    aria-label="中項目を編集"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') subItemHandlers.confirmEdit();
                      if (e.key === 'Escape') subItemHandlers.cancelEdit();
                    }}
                  />
                  <button
                    onClick={subItemHandlers.confirmEdit}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    aria-label="編集を確定"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={subItemHandlers.cancelEdit}
                    className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                    aria-label="編集をキャンセル"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-slate-600 flex-grow">{subItem.text}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => subItemHandlers.startEdit(categoryId, doc.id, subItem.id, subItem.text)}
                      className="p-1 text-slate-400 hover:bg-slate-200 rounded transition-colors"
                      title="編集"
                      aria-label={`${subItem.text}を編集`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => subItemHandlers.remove(categoryId, doc.id, subItem.id)}
                      className="p-1 text-red-400 hover:bg-red-100 rounded transition-colors"
                      title="削除"
                      aria-label={`${subItem.text}を削除`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 中項目追加フォーム */}
      {addingSubItemTo?.categoryId === categoryId && addingSubItemTo?.docId === doc.id && (
        <div className="ml-9 mt-1 flex items-center gap-2">
          <CornerDownRight className="w-3 h-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={newSubItemText}
            onChange={(e) => setNewSubItemText(e.target.value)}
            placeholder="中項目を入力..."
            className="flex-grow px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            aria-label="新しい中項目を入力"
            onKeyDown={(e) => {
              if (e.key === 'Enter') subItemHandlers.confirmAdd(categoryId, doc.id);
              if (e.key === 'Escape') subItemHandlers.cancelAdd();
            }}
          />
          <button
            onClick={() => subItemHandlers.confirmAdd(categoryId, doc.id)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            追加
          </button>
          <button
            onClick={subItemHandlers.cancelAdd}
            className="px-3 py-1 text-sm bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}
    </li>
  );
});
SortableDocumentItem.displayName = 'SortableDocumentItem';

// ─── ドラッグオーバーレイ ───

export const DragOverlayItem = ({ doc }: { doc: EditableDocument }) => (
  <div
    className={`flex items-start p-3 rounded-lg border shadow-2xl ${
      doc.checked
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-slate-50 border-slate-200'
    }`}
  >
    <GripVertical className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
    <div className={`w-6 h-6 mr-3 rounded border-2 flex items-center justify-center ${
      doc.checked
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : 'border-slate-300'
    }`}>
      {doc.checked && <Check className="w-4 h-4" />}
    </div>
    <span className="text-slate-800">{doc.text}</span>
  </div>
);
