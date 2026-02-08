'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, RotateCcw, Pencil, X } from 'lucide-react';
import type { DocumentItem as DocItem, CustomDocumentItem } from '../../constants/documents';
import { DocumentForm } from './DocumentForm';

export interface DocumentItemProps {
  doc: DocItem | CustomDocumentItem;
  categoryId: string;
  isDeleted: boolean;
  isCustom: boolean;
  isEditing: boolean;
  editedValues: { name?: string; description?: string; howToGet?: string } | undefined;
  canDelegate: boolean;
  onDelete: (docId: string) => void;
  onRestore: (docId: string) => void;
  onRemoveCustom: (docId: string, categoryId: string) => void;
  onStartEdit: (docId: string) => void;
  onSaveEdit: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onCancelEdit: () => void;
  onToggleCanDelegate: () => void;
}

interface DocumentItemContentProps extends DocumentItemProps {
  containerRef?: (node: HTMLElement | null) => void;
  containerStyle?: React.CSSProperties;
  isDragging?: boolean;
  /** useSortable の attributes + listeners をマージしたオブジェクト */
  dragHandleProps?: Record<string, unknown>;
}

/** 書類アイテムの共通UIコンポーネント（ソート可能/静的の両方で使用） */
export const DocumentItemContent = memo(function DocumentItemContent({
  doc,
  categoryId,
  isDeleted,
  isCustom,
  isEditing,
  editedValues,
  canDelegate,
  containerRef,
  containerStyle,
  isDragging = false,
  dragHandleProps,
  onDelete,
  onRestore,
  onRemoveCustom,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleCanDelegate,
}: DocumentItemContentProps) {
  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;

  if (isEditing) {
    return (
      <div ref={containerRef} style={containerStyle} className="p-4 border-b border-slate-100">
        <DocumentForm
          variant="edit"
          initialValues={{
            name: editedValues?.name ?? doc.name,
            description: editedValues?.description ?? doc.description,
            howToGet: editedValues?.howToGet ?? doc.howToGet,
          }}
          onSubmit={(values) => onSaveEdit(doc.id, values)}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`flex items-start p-4 border-b border-slate-100 last:border-b-0 ${
        isDeleted ? 'bg-slate-50' : isCustom ? 'bg-emerald-50/50' : ''
      } ${isDragging ? 'shadow-lg z-10' : ''}`}
    >
      {/* ドラッグハンドル */}
      {!isDeleted && dragHandleProps ? (
        <button
          {...(dragHandleProps as React.HTMLAttributes<HTMLButtonElement>)}
          className="mr-2 p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          title="ドラッグして並べ替え"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      ) : !isDeleted ? (
        <div className="mr-2 p-1 text-slate-400">
          <GripVertical className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-6 mr-2" />
      )}

      <div className="flex-1">
        <div className="flex items-center flex-wrap gap-1">
          <span className={`font-medium ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {displayName}
          </span>
          {isCustom && !isDeleted && (
            <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">追加</span>
          )}
          {!isDeleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCanDelegate();
              }}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors cursor-pointer ${
                canDelegate
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={canDelegate ? '取得代行可をオフにする' : '取得代行可をオンにする'}
            >
              {canDelegate ? '代行可' : '代行不可'}
            </button>
          )}
          {editedValues && !isDeleted && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">編集済</span>
          )}
        </div>
        <p className={`text-sm mt-1 ${isDeleted ? 'text-slate-300 line-through' : 'text-slate-500'}`}>
          {displayDescription}
        </p>
        {displayHowToGet && !isDeleted && (
          <p className="text-xs mt-1 text-slate-400">{displayHowToGet}</p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center">
        {!isDeleted && (
          <button
            onClick={() => onStartEdit(doc.id)}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="編集"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {isCustom ? (
          <button
            onClick={() => onRemoveCustom(doc.id, categoryId)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="削除"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => (isDeleted ? onRestore(doc.id) : onDelete(doc.id))}
            className={`p-2 rounded-lg transition-colors ${
              isDeleted
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title={isDeleted ? '復元' : '削除'}
          >
            {isDeleted ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
});

/** ソート可能な書類アイテム（DndContext内で使用） */
export function SortableDocumentItem(props: DocumentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.doc.id,
    disabled: props.isDeleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <DocumentItemContent
      {...props}
      containerRef={setNodeRef}
      containerStyle={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}
