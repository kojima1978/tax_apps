'use client';

import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, RotateCcw, Pencil, X, Plus } from 'lucide-react';
import type { DocumentItem, CustomDocumentItem, DocChanges } from '../../constants/documents';

export interface EditableDocumentRowProps {
  doc: DocumentItem | CustomDocumentItem;
  categoryId: string;
  isDeleted: boolean;
  isCustom: boolean;
  editedValues?: DocChanges;
  canDelegate: boolean;
  specificNames: string[];
  rowIndex: number;
  onDelete: (docId: string) => void;
  onRestore: (docId: string) => void;
  onRemoveCustom: (docId: string, categoryId: string) => void;
  onStartEdit: (docId: string) => void;
  onToggleCanDelegate: () => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
}

interface RowContentProps extends EditableDocumentRowProps {
  containerRef?: (node: HTMLElement | null) => void;
  containerStyle?: React.CSSProperties;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const RowContent = memo(function RowContent({
  doc,
  categoryId,
  isDeleted,
  isCustom,
  editedValues,
  canDelegate,
  specificNames,
  rowIndex,
  onDelete,
  onRestore,
  onRemoveCustom,
  onStartEdit,
  onToggleCanDelegate,
  onAddSpecificName,
  onEditSpecificName,
  onRemoveSpecificName,
  containerRef,
  containerStyle,
  isDragging = false,
  dragHandleProps,
}: RowContentProps) {
  const [addingName, setAddingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;
  const rowBg = isDeleted ? 'bg-slate-50' : isCustom ? 'bg-emerald-50/30' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

  return (
    <tr
      ref={containerRef}
      style={containerStyle}
      className={`${rowBg} ${isDeleted ? 'print:hidden' : ''} ${isDragging ? 'shadow-lg z-10 opacity-70' : ''} border-b border-slate-100 last:border-b-0`}
    >
      {/* 列1: DnDハンドル / 印刷チェックボックス */}
      <td className="w-8 px-1 py-2 text-center align-top">
        {!isDeleted && dragHandleProps ? (
          <button
            {...(dragHandleProps as React.HTMLAttributes<HTMLButtonElement>)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none print:hidden"
            title="ドラッグして並べ替え"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        ) : !isDeleted ? (
          <span className="inline-block p-1 text-slate-300 print:hidden">
            <GripVertical className="w-4 h-4" />
          </span>
        ) : (
          <span className="inline-block w-6 print:hidden" />
        )}
        {!isDeleted && (
          <span className="hidden print:inline-block w-4 h-4 border-2 border-slate-400 rounded-sm print:w-3 print:h-3 print:border" />
        )}
      </td>

      {/* 列2: 書類名 + バッジ + 具体名 */}
      <td className="px-3 py-2 align-top">
        <div className="flex items-center flex-wrap gap-1">
          <span className={`font-medium doc-name ${isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {displayName}
          </span>
          {isCustom && !isDeleted && (
            <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded print:border print:border-emerald-700 print:px-1 print:py-0 print:text-[8px]">
              追加
            </span>
          )}
          {editedValues && !isDeleted && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded print:hidden">
              編集済
            </span>
          )}
        </div>
        {/* モバイル: description + howToGet inline */}
        {!isDeleted && (
          <p className="text-xs text-slate-500 mt-1 md:hidden print:hidden doc-desc">{displayDescription}</p>
        )}
        {displayHowToGet && !isDeleted && (
          <p className="text-xs text-slate-400 mt-0.5 lg:hidden print:hidden doc-how">{displayHowToGet}</p>
        )}
        {/* 具体的書類名 */}
        {!isDeleted && (
          <div className="mt-1 print:mt-0">
            {specificNames.length > 0 && (
              <ul className="space-y-0.5">
                {specificNames.map((name, i) => (
                  <li key={i} className="flex items-center gap-1 text-xs text-slate-600">
                    {editingIndex === i ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingValue.trim()) {
                            onEditSpecificName(doc.id, i, editingValue.trim());
                            setEditingIndex(null);
                            setEditingValue('');
                          } else if (e.key === 'Escape') {
                            setEditingIndex(null);
                            setEditingValue('');
                          }
                        }}
                        autoFocus
                        className="flex-1 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <>
                        <span className="text-slate-400 mr-0.5">・</span>
                        <span className="flex-1">{name}</span>
                      </>
                    )}
                    {editingIndex !== i && (
                      <span className="print:hidden flex items-center gap-0.5">
                        <button
                          onClick={() => { setEditingIndex(i); setEditingValue(name); }}
                          className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                          title="編集"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemoveSpecificName(doc.id, i)}
                          className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {addingName ? (
              <div className="flex items-center gap-1 mt-0.5 print:hidden">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) {
                      onAddSpecificName(doc.id, newName.trim());
                      setNewName('');
                      setAddingName(false);
                    } else if (e.key === 'Escape') {
                      setNewName('');
                      setAddingName(false);
                    }
                  }}
                  placeholder="例：三菱UFJ銀行 普通口座"
                  autoFocus
                  className="flex-1 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingName(true)}
                className="flex items-center gap-0.5 mt-0.5 text-xs text-blue-500 hover:text-blue-700 transition-colors print:hidden"
              >
                <Plus className="w-3 h-3" />
                具体名追加
              </button>
            )}
          </div>
        )}
      </td>

      {/* 列3: 内容説明 */}
      <td className={`px-3 py-2 text-sm text-slate-600 hidden md:table-cell print:table-cell align-top doc-desc ${isDeleted ? 'text-slate-300 line-through' : ''}`}>
        {displayDescription}
      </td>

      {/* 列4: 取得方法 */}
      <td className={`px-3 py-2 text-xs text-slate-500 hidden lg:table-cell print:table-cell align-top doc-how ${isDeleted ? 'text-slate-300 line-through' : ''}`}>
        {displayHowToGet || '-'}
      </td>

      {/* 列5: 代行 */}
      <td className="w-16 px-2 py-2 text-center align-top">
        {!isDeleted && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCanDelegate(); }}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors cursor-pointer print:hidden ${
                canDelegate
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={canDelegate ? '代行可をオフ' : '代行可をオン'}
            >
              {canDelegate ? '可' : '−'}
            </button>
            {canDelegate && (
              <span className="hidden print:inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded print:border print:border-amber-700 print:px-1 print:py-0 print:text-[8px]">
                可
              </span>
            )}
          </>
        )}
      </td>

      {/* 列6: 操作 */}
      <td className="w-20 px-1 py-2 text-center align-top print:hidden">
        <div className="flex items-center justify-center gap-0.5">
          {!isDeleted && (
            <button
              onClick={() => onStartEdit(doc.id)}
              className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="編集"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {isCustom ? (
            <button
              onClick={() => onRemoveCustom(doc.id, categoryId)}
              className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="完全削除"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => (isDeleted ? onRestore(doc.id) : onDelete(doc.id))}
              className={`p-1.5 rounded transition-colors ${
                isDeleted
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isDeleted ? '復元' : '不要'}
            >
              {isDeleted ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

/** ソート可能なテーブル行（DndContext内で使用） */
export function SortableDocumentRow(props: EditableDocumentRowProps) {
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
  };

  return (
    <RowContent
      {...props}
      containerRef={setNodeRef}
      containerStyle={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

/** 静的テーブル行（SSR用） */
export function StaticDocumentRow(props: EditableDocumentRowProps) {
  return <RowContent {...props} />;
}
