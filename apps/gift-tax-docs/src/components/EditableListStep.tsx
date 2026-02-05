'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronsUpDown,
  Info,
  RotateCcw,
  AlertTriangle,
  CornerDownRight,
  GripVertical,
  Download,
  Upload,
} from 'lucide-react';
import { giftData, type EditableDocumentList, type EditableDocument, type EditableCategory, type Step } from '@/constants';
import { reorderDocuments, reorderCategories } from '@/utils/editableListUtils';
import { useEditableListEditing, type EditingSubItem, type AddingSubItemTo } from '@/hooks/useEditableListEditing';

type EditableListStepProps = {
  documentList: EditableDocumentList;
  setDocumentList: React.Dispatch<React.SetStateAction<EditableDocumentList>>;
  setStep: (step: Step) => void;
  resetToMenu: () => void;
  handleExcelExport: () => void;
  staffName: string;
  setStaffName: (name: string) => void;
  staffPhone: string;
  setStaffPhone: (phone: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
};

// ─── ドラッグ可能な書類アイテムコンポーネント ───

type SortableDocumentItemProps = {
  doc: EditableDocument;
  categoryId: string;
  isEditing: boolean;
  editText: string;
  setEditText: (text: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onToggleCheck: () => void;
  onStartEdit: () => void;
  onRemove: () => void;
  onAddSubItem: () => void;
  editingSubItem: EditingSubItem;
  editSubItemText: string;
  setEditSubItemText: (text: string) => void;
  onStartSubItemEdit: (subItemId: string, text: string) => void;
  onConfirmSubItemEdit: () => void;
  onCancelSubItemEdit: () => void;
  onRemoveSubItem: (subItemId: string) => void;
  addingSubItemTo: AddingSubItemTo;
  newSubItemText: string;
  setNewSubItemText: (text: string) => void;
  onConfirmAddSubItem: () => void;
  onCancelAddSubItem: () => void;
  isDragging?: boolean;
};

const SortableDocumentItem = ({
  doc,
  categoryId,
  isEditing,
  editText,
  setEditText,
  onConfirmEdit,
  onCancelEdit,
  onToggleCheck,
  onStartEdit,
  onRemove,
  onAddSubItem,
  editingSubItem,
  editSubItemText,
  setEditSubItemText,
  onStartSubItemEdit,
  onConfirmSubItemEdit,
  onCancelSubItemEdit,
  onRemoveSubItem,
  addingSubItemTo,
  newSubItemText,
  setNewSubItemText,
  onConfirmAddSubItem,
  onCancelAddSubItem,
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
          onClick={onToggleCheck}
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
              onClick={onAddSubItem}
              className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
              title="中項目を追加"
              aria-label={`${doc.text}に中項目を追加`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onStartEdit}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
              title="編集"
              aria-label={`${doc.text}を編集`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
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
                      if (e.key === 'Enter') onConfirmSubItemEdit();
                      if (e.key === 'Escape') onCancelSubItemEdit();
                    }}
                  />
                  <button
                    onClick={onConfirmSubItemEdit}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    aria-label="編集を確定"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onCancelSubItemEdit}
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
                      onClick={() => onStartSubItemEdit(subItem.id, subItem.text)}
                      className="p-1 text-slate-400 hover:bg-slate-200 rounded transition-colors"
                      title="編集"
                      aria-label={`${subItem.text}を編集`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveSubItem(subItem.id)}
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
              if (e.key === 'Enter') onConfirmAddSubItem();
              if (e.key === 'Escape') onCancelAddSubItem();
            }}
          />
          <button
            onClick={onConfirmAddSubItem}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            追加
          </button>
          <button
            onClick={onCancelAddSubItem}
            className="px-3 py-1 text-sm bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}
    </li>
  );
};

// ─── ドラッグオーバーレイ用コンポーネント ───

const DragOverlayItem = ({ doc }: { doc: EditableDocument }) => (
  <div
    className={`flex items-start p-3 rounded-lg border shadow-2xl ${
      doc.checked
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-slate-50 border-slate-200'
    }`}
  >
    <GripVertical className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
    <div className="w-6 h-6 mr-3 rounded border-2 flex items-center justify-center bg-emerald-500 border-emerald-500 text-white">
      {doc.checked && <Check className="w-4 h-4" />}
    </div>
    <span className="text-slate-800">{doc.text}</span>
  </div>
);

const CategoryDragOverlay = ({ category }: { category: EditableCategory }) => {
  const checkedCount = category.documents.filter((d) => d.checked).length;
  return (
    <div
      className={`rounded-xl shadow-2xl overflow-hidden ${
        category.isSpecial
          ? 'bg-purple-50 border-l-4 border-purple-500'
          : 'bg-emerald-50 border-l-4 border-emerald-500'
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-5 h-5 text-slate-400" aria-hidden="true" />
        <h3 className="font-bold text-slate-800">
          {category.isSpecial && <span className="text-purple-600">【特例】</span>}
          {category.name}
        </h3>
        <span className="px-2 py-0.5 bg-white rounded text-sm text-slate-600">
          {checkedCount}/{category.documents.length}
        </span>
      </div>
    </div>
  );
};

// ─── カテゴリ用ソート可能フック ───

const useSortableCategory = (categoryId: string) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${categoryId}` });

  return {
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties,
    isDragging,
    dragHandleProps: { attributes, listeners },
  };
};

// ─── カテゴリ編集状態の型 ───

type CategoryEditState = {
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  confirm: () => void;
  cancel: () => void;
};

type CategoryHandlers = {
  toggleExpand: (id: string) => void;
  toggleSpecial: (id: string) => void;
  startEdit: (id: string, name: string) => void;
  remove: (id: string) => void;
  toggleAll: (id: string, checked: boolean) => void;
};

// ─── カテゴリカードコンポーネント（ドラッグ対応） ───

type SortableCategoryCardProps = {
  category: EditableCategory;
  checkedCount: number;
  allChecked: boolean;
  someChecked: boolean;
  editState: CategoryEditState;
  handlers: CategoryHandlers;
  children: React.ReactNode;
};

const SortableCategoryCard = ({
  category,
  checkedCount,
  allChecked,
  someChecked,
  editState,
  handlers,
  children,
}: SortableCategoryCardProps) => {
  const { setNodeRef, style, isDragging, dragHandleProps } = useSortableCategory(category.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${isDragging ? 'opacity-50 ring-2 ring-emerald-400' : ''}`}
      role="region"
      aria-label={`カテゴリ: ${category.name}`}
    >
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 transition-colors ${
          category.isSpecial
            ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500'
            : 'bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-500'
        }`}
      >
        {/* ドラッグハンドル */}
        <button
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="flex-shrink-0 p-1 mr-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          title="ドラッグして並び替え"
          aria-label={`${category.name}カテゴリを並び替え`}
          aria-roledescription="ドラッグ可能なカテゴリ"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div
          className="flex items-center gap-3 flex-grow cursor-pointer"
          onClick={() => handlers.toggleExpand(category.id)}
          role="button"
          aria-expanded={category.isExpanded}
          aria-label={`${category.name}を${category.isExpanded ? '折りたたむ' : '展開する'}`}
        >
          {category.isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" aria-hidden="true" />
          )}
          {editState.editingId === category.id ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editState.editName}
                onChange={(e) => editState.setEditName(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                autoFocus
                aria-label="カテゴリ名を編集"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') editState.confirm();
                  if (e.key === 'Escape') editState.cancel();
                }}
              />
              <button
                onClick={editState.confirm}
                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                aria-label="編集を確定"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={editState.cancel}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                aria-label="編集をキャンセル"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-slate-800">
                {category.isSpecial && <span className="text-purple-600">【特例】</span>}
                {category.name}
              </h3>
              <span className="px-2 py-0.5 bg-white rounded text-sm text-slate-600">
                {checkedCount}/{category.documents.length}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editState.editingId !== category.id && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.toggleSpecial(category.id);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  category.isSpecial
                    ? 'bg-purple-200 text-purple-700 hover:bg-purple-300'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title="特例切り替え"
                aria-label={`${category.name}の特例を${category.isSpecial ? '解除' : '設定'}`}
                aria-pressed={category.isSpecial}
              >
                特例
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.startEdit(category.id, category.name);
                }}
                className="p-1.5 text-slate-500 hover:bg-white/50 rounded transition-colors"
                title="カテゴリ名を編集"
                aria-label={`${category.name}の名前を編集`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.remove(category.id);
                }}
                className="p-1.5 text-red-500 hover:bg-red-100/50 rounded transition-colors"
                title="カテゴリを削除"
                aria-label={`${category.name}を削除`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-300 mx-1" aria-hidden="true" />
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlers.toggleAll(category.id, !allChecked);
            }}
            className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
              allChecked
                ? 'bg-emerald-600 text-white'
                : someChecked
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            aria-label={allChecked ? `${category.name}の全選択を解除` : `${category.name}を全選択`}
          >
            {allChecked ? (
              <>
                <CheckSquare className="w-4 h-4 mr-1" aria-hidden="true" /> 全選択
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-1" aria-hidden="true" /> 全選択
              </>
            )}
          </button>
        </div>
      </div>

      {/* カテゴリコンテンツ */}
      {category.isExpanded && children}
    </div>
  );
};

// ─── メインコンポーネント ───

export const EditableListStep = ({
  documentList,
  setDocumentList,
  setStep,
  resetToMenu,
  handleExcelExport,
  staffName,
  setStaffName,
  staffPhone,
  setStaffPhone,
  customerName,
  setCustomerName,
}: EditableListStepProps) => {
  // 編集状態管理フックを使用
  const editing = useEditableListEditing({
    documentList,
    setDocumentList,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
  });

  // ドラッグ中のアイテム
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);

  // DnDセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;
    setActiveId(activeIdStr);

    if (activeIdStr.startsWith('category-')) {
      setIsDraggingCategory(true);
      setActiveCategoryId(null);
    } else {
      setIsDraggingCategory(false);
      for (const category of documentList) {
        const docIndex = category.documents.findIndex((d) => d.id === activeIdStr);
        if (docIndex !== -1) {
          setActiveCategoryId(category.id);
          break;
        }
      }
    }
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      if (isDraggingCategory && activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
        const activeCatId = activeIdStr.replace('category-', '');
        const overCatId = overIdStr.replace('category-', '');

        const oldIndex = documentList.findIndex((c) => c.id === activeCatId);
        const newIndex = documentList.findIndex((c) => c.id === overCatId);

        if (oldIndex !== -1 && newIndex !== -1) {
          setDocumentList(prev => reorderCategories(prev, oldIndex, newIndex));
        }
      } else if (!isDraggingCategory && activeCategoryId) {
        const category = documentList.find((c) => c.id === activeCategoryId);
        if (category) {
          const oldIndex = category.documents.findIndex((d) => d.id === activeIdStr);
          const newIndex = category.documents.findIndex((d) => d.id === overIdStr);

          if (oldIndex !== -1 && newIndex !== -1) {
            setDocumentList(prev => reorderDocuments(prev, activeCategoryId, oldIndex, newIndex));
          }
        }
      }
    }

    setActiveId(null);
    setActiveCategoryId(null);
    setIsDraggingCategory(false);
  };

  // ドラッグ中のアイテムを取得（メモ化）
  const activeDocument = useMemo(() => {
    if (!activeId || !activeCategoryId) return null;
    const category = documentList.find((c) => c.id === activeCategoryId);
    return category?.documents.find((d) => d.id === activeId) ?? null;
  }, [activeId, activeCategoryId, documentList]);

  const activeCategory = useMemo(() => {
    if (!activeId || !isDraggingCategory) return null;
    const categoryId = activeId.replace('category-', '');
    return documentList.find((c) => c.id === categoryId) ?? null;
  }, [activeId, isDraggingCategory, documentList]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ヘッダーツールバー */}
      <div className="no-print bg-white rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10" role="toolbar" aria-label="編集ツールバー">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">{giftData.title}</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium" aria-live="polite">
              {editing.checkedCount} / {editing.totalCount} 選択中
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editing.handleExpandAll(true)}
              className="flex items-center px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="全て展開"
              aria-label="全カテゴリを展開"
            >
              <ChevronsUpDown className="w-4 h-4 mr-1" aria-hidden="true" />
              展開
            </button>
            <button
              onClick={() => editing.handleExpandAll(false)}
              className="flex items-center px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="全て折りたたむ"
              aria-label="全カテゴリを折りたたむ"
            >
              <ChevronUp className="w-4 h-4 mr-1" aria-hidden="true" />
              折畳
            </button>
            <button
              onClick={() => editing.setShowResetDialog(true)}
              className="flex items-center px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
              title="デフォルトに戻す"
              aria-label="編集内容をリセット"
            >
              <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
              リセット
            </button>
            <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
            <button
              onClick={editing.handleJsonExport}
              className="flex items-center px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors"
              title="JSONで出力"
              aria-label="JSONファイルとして出力"
            >
              <Download className="w-4 h-4 mr-1" aria-hidden="true" />
              出力
            </button>
            <label
              className="flex items-center px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors cursor-pointer"
              title="JSONを取り込み"
            >
              <Upload className="w-4 h-4 mr-1" aria-hidden="true" />
              取込
              <input
                type="file"
                accept=".json"
                onChange={editing.handleFileSelect}
                className="hidden"
                aria-label="JSONファイルを選択"
              />
            </label>
            <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
            <button
              onClick={() => setStep('result')}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              aria-label="印刷プレビューを表示"
            >
              <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
              印刷プレビュー
            </button>
            <button
              onClick={handleExcelExport}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              aria-label="Excelファイルとして出力"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
              Excel
            </button>
            <button
              onClick={resetToMenu}
              className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors"
              aria-label="トップメニューに戻る"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* カテゴリリスト */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={documentList.map((c) => `category-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {documentList.map((category) => {
              const categoryCheckedCount = category.documents.filter((d) => d.checked).length;
              const allChecked = category.documents.length > 0 && categoryCheckedCount === category.documents.length;
              const someChecked = categoryCheckedCount > 0 && !allChecked;

              return (
                <SortableCategoryCard
                  key={category.id}
                  category={category}
                  checkedCount={categoryCheckedCount}
                  allChecked={allChecked}
                  someChecked={someChecked}
                  editState={editing.categoryEditState}
                  handlers={editing.categoryHandlers}
                >
                  <div className="p-4">
                    {/* 注記 */}
                    {category.note && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start text-sm text-amber-800" role="note">
                        <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        {category.note}
                      </div>
                    )}

                    {/* 書類リスト */}
                    <SortableContext
                      items={category.documents.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-2">
                        {category.documents.map((doc) => (
                          <SortableDocumentItem
                            key={doc.id}
                            doc={doc}
                            categoryId={category.id}
                            isEditing={editing.editingDoc?.categoryId === category.id && editing.editingDoc?.docId === doc.id}
                            editText={editing.editText}
                            setEditText={editing.setEditText}
                            onConfirmEdit={editing.confirmEdit}
                            onCancelEdit={editing.cancelEdit}
                            onToggleCheck={() => editing.handleToggleCheck(category.id, doc.id)}
                            onStartEdit={() => editing.startEdit(category.id, doc.id, doc.text)}
                            onRemove={() => editing.handleRemoveDocument(category.id, doc.id)}
                            onAddSubItem={() => editing.startAddSubItem(category.id, doc.id)}
                            editingSubItem={editing.editingSubItem}
                            editSubItemText={editing.editSubItemText}
                            setEditSubItemText={editing.setEditSubItemText}
                            onStartSubItemEdit={(subItemId, text) =>
                              editing.startSubItemEdit(category.id, doc.id, subItemId, text)
                            }
                            onConfirmSubItemEdit={editing.confirmSubItemEdit}
                            onCancelSubItemEdit={editing.cancelSubItemEdit}
                            onRemoveSubItem={(subItemId) =>
                              editing.handleRemoveSubItem(category.id, doc.id, subItemId)
                            }
                            addingSubItemTo={editing.addingSubItemTo}
                            newSubItemText={editing.newSubItemText}
                            setNewSubItemText={editing.setNewSubItemText}
                            onConfirmAddSubItem={() => editing.handleAddSubItem(category.id, doc.id)}
                            onCancelAddSubItem={editing.cancelAddSubItem}
                          />
                        ))}
                      </ul>
                    </SortableContext>

                    {/* 書類追加 */}
                    {editing.addingToCategory === category.id ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={editing.newDocText}
                          onChange={(e) => editing.setNewDocText(e.target.value)}
                          placeholder="書類名を入力..."
                          className="flex-grow px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                          aria-label="新しい書類名を入力"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') editing.handleAddDocument(category.id);
                            if (e.key === 'Escape') {
                              editing.setAddingToCategory(null);
                              editing.setNewDocText('');
                            }
                          }}
                        />
                        <button
                          onClick={() => editing.handleAddDocument(category.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          追加
                        </button>
                        <button
                          onClick={() => {
                            editing.setAddingToCategory(null);
                            editing.setNewDocText('');
                          }}
                          className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => editing.setAddingToCategory(category.id)}
                        className="mt-3 flex items-center px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-300 transition-colors w-full justify-center"
                        aria-label={`${category.name}に書類を追加`}
                      >
                        <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                        書類を追加
                      </button>
                    )}
                  </div>
                </SortableCategoryCard>
              );
            })}

          {/* カテゴリ追加 */}
          {editing.isAddingCategory ? (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4">
              <h3 className="font-bold text-slate-800 mb-3">新しいカテゴリを追加</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editing.newCategoryName}
                  onChange={(e) => editing.setNewCategoryName(e.target.value)}
                  placeholder="カテゴリ名を入力..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  aria-label="新しいカテゴリ名を入力"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editing.handleAddCategory();
                    if (e.key === 'Escape') {
                      editing.setIsAddingCategory(false);
                      editing.setNewCategoryName('');
                      editing.setNewCategoryIsSpecial(false);
                    }
                  }}
                />
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.newCategoryIsSpecial}
                    onChange={(e) => editing.setNewCategoryIsSpecial(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className={editing.newCategoryIsSpecial ? 'text-purple-600 font-medium' : ''}>
                    特例カテゴリとして追加
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={editing.handleAddCategory}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => {
                      editing.setIsAddingCategory(false);
                      editing.setNewCategoryName('');
                      editing.setNewCategoryIsSpecial(false);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => editing.setIsAddingCategory(true)}
              className="w-full flex items-center justify-center px-6 py-4 text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-emerald-300 transition-colors font-medium"
              aria-label="新しいカテゴリを追加"
            >
              <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
              新しいカテゴリを追加
            </button>
          )}
          </div>
        </SortableContext>

        {/* ドラッグオーバーレイ */}
        <DragOverlay>
          {isDraggingCategory && activeId && activeCategory ? (
            <CategoryDragOverlay category={activeCategory} />
          ) : activeId && activeDocument ? (
            <DragOverlayItem doc={activeDocument} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* フッター */}
      <div className="mt-8 text-center text-sm text-slate-400">
        ※チェックを入れた書類が印刷対象になります
      </div>

      {/* リセット確認ダイアログ */}
      {editing.showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" aria-hidden="true" />
              </div>
              <h3 id="reset-dialog-title" className="text-xl font-bold text-slate-800">編集内容をリセットしますか？</h3>
            </div>
            <div className="mb-6 pl-15">
              <p className="text-slate-600 mb-3">以下の内容が初期状態に戻ります：</p>
              <ul className="text-sm text-slate-500 space-y-1">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2" aria-hidden="true" />
                  チェック状態
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2" aria-hidden="true" />
                  追加したカテゴリ・書類
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2" aria-hidden="true" />
                  中項目
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2" aria-hidden="true" />
                  並び順
                </li>
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => editing.setShowResetDialog(false)}
                className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={editing.handleResetToDefault}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}

      {/* インポート確認ダイアログ */}
      {editing.showImportDialog && editing.importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-violet-600" aria-hidden="true" />
              </div>
              <h3 id="import-dialog-title" className="text-xl font-bold text-slate-800">データを取り込みますか？</h3>
            </div>
            <div className="mb-6">
              <p className="text-slate-600 mb-3">以下のデータが読み込まれます：</p>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                {editing.importPreview.customerName && (
                  <p><span className="text-slate-500">お客様名:</span> <span className="font-medium">{editing.importPreview.customerName}</span></p>
                )}
                {editing.importPreview.staffName && (
                  <p><span className="text-slate-500">担当者:</span> <span className="font-medium">{editing.importPreview.staffName}</span></p>
                )}
                {editing.importPreview.staffPhone && (
                  <p><span className="text-slate-500">担当者携帯:</span> <span className="font-medium">{editing.importPreview.staffPhone}</span></p>
                )}
                <p>
                  <span className="text-slate-500">カテゴリ数:</span>{' '}
                  <span className="font-medium">{editing.importPreview.documentList.length}</span>
                </p>
                <p>
                  <span className="text-slate-500">書類数:</span>{' '}
                  <span className="font-medium">
                    {editing.importPreview.documentList.reduce((acc, cat) => acc + cat.documents.length, 0)}
                  </span>
                </p>
                {editing.importPreview.exportedAt && (
                  <p>
                    <span className="text-slate-500">エクスポート日時:</span>{' '}
                    <span className="font-medium">
                      {new Date(editing.importPreview.exportedAt).toLocaleString('ja-JP')}
                    </span>
                  </p>
                )}
              </div>
              <p className="mt-3 text-sm text-amber-600">
                ※現在の編集内容は上書きされます
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={editing.cancelImport}
                className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={editing.confirmImport}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
              >
                取り込む
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
