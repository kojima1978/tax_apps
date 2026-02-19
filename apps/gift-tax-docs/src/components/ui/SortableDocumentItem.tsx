import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  CornerDownRight,
  GripVertical,
  X,
} from 'lucide-react';
import { InlineEditInput, InlineAddInput } from './EditableInput';
import type { EditableDocument } from '@/constants';
import type { EditingSubItem, AddingSubItemTo, DocHandlers, SubItemHandlers } from '@/hooks/useEditableListEditing';

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
    checked
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : 'border-slate-300'
  }`}>
    {checked && <Check className="w-4 h-4" />}
  </div>
);

// ─── Props ───

type SortableDocumentItemProps = {
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
}: SortableDocumentItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      {/* 大項目 */}
      <div
        className={`flex items-start p-3 rounded-lg border transition-colors ${
          doc.checked
            ? 'bg-slate-100 border-slate-300'
            : 'bg-slate-50 border-slate-200'
        } ${isDragging ? 'shadow-lg ring-2 ring-emerald-400' : ''}`}
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

        {/* チェックボックス（提出済みトグル） */}
        <button
          onClick={() => docHandlers.toggleCheck(categoryId, doc.id)}
          className="flex-shrink-0 mr-3 mt-0.5 transition-colors"
          role="checkbox"
          aria-checked={doc.checked}
          aria-label={`${doc.text}を${doc.checked ? '未提出に戻す' : '提出済みにする'}`}
        >
          <CheckboxIcon checked={doc.checked} />
        </button>

        {/* 書類内容 */}
        <div className="flex-grow min-w-0">
          {isEditing ? (
            <InlineEditInput
              value={editText}
              onChange={setEditText}
              onConfirm={onConfirmEdit}
              onCancel={onCancelEdit}
              ariaLabel="書類名を編集"
            />
          ) : (
            <span className={doc.checked ? 'text-slate-400 line-through' : 'text-slate-600'}>
              {doc.text}
            </span>
          )}
        </div>

        {/* アクションボタン */}
        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            {[
              { onClick: () => subItemHandlers.startAdd(categoryId, doc.id), Icon: Plus, colorClass: 'text-blue-500 hover:bg-blue-100', title: '中項目を追加', ariaLabel: `${doc.text}に中項目を追加` },
              { onClick: () => docHandlers.startEdit(categoryId, doc.id, doc.text), Icon: Edit3, colorClass: 'text-slate-500 hover:bg-slate-200', title: '編集', ariaLabel: `${doc.text}を編集` },
              { onClick: () => docHandlers.remove(categoryId, doc.id), Icon: Trash2, colorClass: 'text-red-500 hover:bg-red-100', title: '削除', ariaLabel: `${doc.text}を削除` },
            ].map(({ onClick, Icon, colorClass, title, ariaLabel }) => (
              <button key={title} onClick={onClick} className={`p-1.5 ${colorClass} rounded transition-colors`} title={title} aria-label={ariaLabel}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
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
                <div className="flex-grow">
                  <InlineEditInput
                    value={editSubItemText}
                    onChange={setEditSubItemText}
                    onConfirm={subItemHandlers.confirmEdit}
                    onCancel={subItemHandlers.cancelEdit}
                    ariaLabel="中項目を編集"
                    inputClass="flex-grow px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2"
                    color="blue"
                    iconSize="w-4 h-4"
                  />
                </div>
              ) : (
                <>
                  <span className="text-sm flex-grow text-slate-600">{subItem.text}</span>
                  <div className="flex items-center gap-1">
                    {[
                      { onClick: () => subItemHandlers.startEdit(categoryId, doc.id, subItem.id, subItem.text), Icon: Edit3, colorClass: 'text-slate-400 hover:bg-slate-200', title: '編集', ariaLabel: `${subItem.text}を編集` },
                      { onClick: () => subItemHandlers.remove(categoryId, doc.id, subItem.id), Icon: X, colorClass: 'text-red-400 hover:bg-red-100', title: '削除', ariaLabel: `${subItem.text}を削除` },
                    ].map(({ onClick, Icon, colorClass, title, ariaLabel }) => (
                      <button key={title} onClick={onClick} className={`p-1 ${colorClass} rounded transition-colors`} title={title} aria-label={ariaLabel}>
                        <Icon className="w-3 h-3" />
                      </button>
                    ))}
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
          <InlineAddInput
            value={newSubItemText}
            onChange={setNewSubItemText}
            onConfirm={() => subItemHandlers.confirmAdd(categoryId, doc.id)}
            onCancel={subItemHandlers.cancelAdd}
            placeholder="中項目を入力..."
            ariaLabel="新しい中項目を入力"
            inputClass="flex-grow px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2"
            color="blue"
            buttonSize="sm"
          />
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
        ? 'bg-slate-100 border-slate-300'
        : 'bg-slate-50 border-slate-200'
    }`}
  >
    <GripVertical className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
    <div className="mr-3">
      <CheckboxIcon checked={doc.checked} />
    </div>
    <span className={doc.checked ? 'text-slate-400 line-through' : 'text-slate-800'}>{doc.text}</span>
  </div>
);
