'use client';

import { useState } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Printer, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, AlertCircle, Info, GripVertical, FileSpreadsheet, Save, Download, Copy, Loader2 } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';
import { taxReturnData, replaceYearPlaceholder } from '@/data/taxReturnData';
import { generateReiwaYears, formatDate } from '@/utils/date';

// サブアイテムの型
export interface SubItem {
  id: string;
  text: string;
  checked: boolean;
}

// 書類アイテムの型（サブアイテムを含む）
export interface DocumentItem {
  id: string;
  text: string;
  checked: boolean;
  subItems?: SubItem[];
}

export interface CategoryGroup {
  id: string;
  category: string;
  documents: DocumentItem[];
  note?: string;
}

interface DocumentListScreenProps {
  year: number;
  documentGroups: CategoryGroup[];
  onDocumentGroupsChange: (groups: CategoryGroup[]) => void;
  onBack: () => void;
  onYearChange: (year: number) => void;
  customerName: string;
  staffName: string;
  onCustomerNameChange: (name: string) => void;
  onStaffNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onCopyToNextYear: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
}

// 初期データを生成する関数
export function generateInitialDocumentGroups(year: number): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  let docIdCounter = 0;

  // 基本書類
  taxReturnData.baseRequired.forEach((group, groupIndex) => {
    groups.push({
      id: `base_${groupIndex}`,
      category: group.category,
      documents: group.documents.map((doc) => ({
        id: `doc_${docIdCounter++}`,
        text: replaceYearPlaceholder(doc, year),
        checked: false,
        subItems: [],
      })),
      note: group.note,
    });
  });

  // 所得の種類別
  taxReturnData.options.forEach((opt) => {
    groups.push({
      id: `option_${opt.id}`,
      category: `【所得】${opt.label}`,
      documents: opt.documents.map((doc) => ({
        id: `doc_${docIdCounter++}`,
        text: replaceYearPlaceholder(doc, year),
        checked: false,
        subItems: [],
      })),
    });
  });

  // 控除項目
  taxReturnData.deductions.forEach((ded) => {
    groups.push({
      id: `deduction_${ded.id}`,
      category: `【控除】${ded.label}`,
      documents: ded.documents.map((doc) => ({
        id: `doc_${docIdCounter++}`,
        text: replaceYearPlaceholder(doc, year),
        checked: false,
        subItems: [],
      })),
    });
  });

  return groups;
}

// サブアイテムコンポーネント
interface SubItemComponentProps {
  subItem: SubItem;
  subIndex: number;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
}

function SubItemComponent({
  subItem,
  subIndex,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onToggleCheck,
  onDelete,
}: SubItemComponentProps) {
  return (
    <li className="flex items-center py-1.5 pl-12 border-b border-dotted border-slate-100 last:border-0 bg-slate-50">
      {isEditing ? (
        <div className="flex items-center flex-1">
          <span className="w-6 text-center text-xs text-slate-500 mr-2">{subIndex})</span>
          <input
            type="text"
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="flex-1 px-2 py-1 border border-slate-300 rounded mr-2 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <button onClick={onSaveEdit} className="p-1 text-green-600 hover:text-green-800">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={onCancelEdit} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <span className="w-6 text-center text-xs text-slate-500 mr-2">{subIndex})</span>
          <label className="flex items-center flex-1 cursor-pointer">
            <input
              type="checkbox"
              checked={subItem.checked}
              onChange={onToggleCheck}
              className="w-3 h-3 mr-2 accent-emerald-600"
            />
            <span className={`text-sm ${subItem.checked ? 'line-through text-slate-400' : 'text-slate-600'}`}>
              {subItem.text}
            </span>
          </label>
          <div className="flex items-center space-x-1 no-print">
            <button onClick={onStartEdit} className="p-1 text-slate-400 hover:text-emerald-600" title="編集">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600" title="削除">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

// ドラッグ可能な書類アイテム
interface SortableDocumentItemProps {
  doc: DocumentItem;
  groupId: string;
  index: number;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  // サブアイテム関連
  editingSubItemId: string | null;
  editSubItemText: string;
  onEditSubItemTextChange: (text: string) => void;
  onStartEditSubItem: (subItemId: string, text: string) => void;
  onSaveEditSubItem: (groupId: string, docId: string) => void;
  onCancelEditSubItem: () => void;
  onToggleSubItemCheck: (groupId: string, docId: string, subItemId: string) => void;
  onDeleteSubItem: (groupId: string, docId: string, subItemId: string) => void;
  addingSubItemToDocId: string | null;
  newSubItemText: string;
  onNewSubItemTextChange: (text: string) => void;
  onAddSubItem: (groupId: string, docId: string) => void;
  onStartAddSubItem: (docId: string) => void;
  onCancelAddSubItem: () => void;
}

function SortableDocumentItem({
  doc,
  groupId,
  index,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onToggleCheck,
  onDelete,
  editingSubItemId,
  editSubItemText,
  onEditSubItemTextChange,
  onStartEditSubItem,
  onSaveEditSubItem,
  onCancelEditSubItem,
  onToggleSubItemCheck,
  onDeleteSubItem,
  addingSubItemToDocId,
  newSubItemText,
  onNewSubItemTextChange,
  onAddSubItem,
  onStartAddSubItem,
  onCancelAddSubItem,
}: SortableDocumentItemProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSubItems = doc.subItems && doc.subItems.length > 0;

  return (
    <li ref={setNodeRef} style={style} className="bg-white">
      <div className="flex items-center py-2 border-b border-dashed border-slate-100">
        {isEditing ? (
          <div className="flex items-center flex-1 ml-6">
            <span className="w-8 text-center text-sm font-bold text-emerald-600 mr-2">{index}.</span>
            <input
              type="text"
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-300 rounded mr-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <button onClick={onSaveEdit} className="p-1 text-green-600 hover:text-green-800">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing no-print"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-emerald-600 mr-1">{index}.</span>
            <label className="flex items-center flex-1 cursor-pointer">
              <input
                type="checkbox"
                checked={doc.checked}
                onChange={onToggleCheck}
                className="w-4 h-4 mr-3 accent-emerald-600"
              />
              <span className={`whitespace-pre-line ${doc.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {doc.text}
              </span>
            </label>
            <div className="flex items-center space-x-1 no-print">
              <button
                onClick={() => onStartAddSubItem(doc.id)}
                className="p-1 text-slate-400 hover:text-green-600"
                title="小項目を追加"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={onStartEdit} className="p-1 text-slate-400 hover:text-emerald-600" title="編集">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600" title="削除">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* サブアイテムリスト */}
      {hasSubItems && (
        <ul className="ml-4">
          {doc.subItems!.map((subItem, subIndex) => (
            <SubItemComponent
              key={subItem.id}
              subItem={subItem}
              subIndex={subIndex + 1}
              isEditing={editingSubItemId === subItem.id}
              editText={editSubItemText}
              onEditTextChange={onEditSubItemTextChange}
              onSaveEdit={() => onSaveEditSubItem(groupId, doc.id)}
              onCancelEdit={onCancelEditSubItem}
              onStartEdit={() => onStartEditSubItem(subItem.id, subItem.text)}
              onToggleCheck={() => onToggleSubItemCheck(groupId, doc.id, subItem.id)}
              onDelete={() => onDeleteSubItem(groupId, doc.id, subItem.id)}
            />
          ))}
        </ul>
      )}

      {/* サブアイテム追加フォーム */}
      {addingSubItemToDocId === doc.id && (
        <div className="ml-12 mt-2 mb-2 flex items-center no-print">
          <input
            type="text"
            value={newSubItemText}
            onChange={(e) => onNewSubItemTextChange(e.target.value)}
            placeholder="小項目名を入力..."
            className="flex-1 px-2 py-1 border border-slate-300 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAddSubItem(groupId, doc.id);
              if (e.key === 'Escape') onCancelAddSubItem();
            }}
          />
          <button
            onClick={() => onAddSubItem(groupId, doc.id)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-r hover:bg-green-700"
          >
            追加
          </button>
          <button onClick={onCancelAddSubItem} className="ml-2 p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </li>
  );
}

// ドラッグ可能なカテゴリ
interface SortableCategoryProps {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  editingCategoryId: string | null;
  editCategoryName: string;
  onEditCategoryNameChange: (name: string) => void;
  onSaveEditCategory: () => void;
  onCancelEditCategory: () => void;
  onStartEditCategory: () => void;
  onDeleteCategory: () => void;
  editingDocId: string | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEditDocument: (groupId: string) => void;
  onCancelEditDocument: () => void;
  onStartEditDocument: (docId: string, text: string) => void;
  onToggleDocumentCheck: (groupId: string, docId: string) => void;
  onDeleteDocument: (groupId: string, docId: string) => void;
  addingToGroupId: string | null;
  newDocText: string;
  onNewDocTextChange: (text: string) => void;
  onAddDocument: (groupId: string) => void;
  onStartAddDocument: (groupId: string) => void;
  onCancelAddDocument: () => void;
  onDocumentsReorder: (groupId: string, activeId: string, overId: string) => void;
  // サブアイテム関連
  editingSubItemId: string | null;
  editSubItemText: string;
  onEditSubItemTextChange: (text: string) => void;
  onStartEditSubItem: (subItemId: string, text: string) => void;
  onSaveEditSubItem: (groupId: string, docId: string) => void;
  onCancelEditSubItem: () => void;
  onToggleSubItemCheck: (groupId: string, docId: string, subItemId: string) => void;
  onDeleteSubItem: (groupId: string, docId: string, subItemId: string) => void;
  addingSubItemToDocId: string | null;
  newSubItemText: string;
  onNewSubItemTextChange: (text: string) => void;
  onAddSubItem: (groupId: string, docId: string) => void;
  onStartAddSubItem: (docId: string) => void;
  onCancelAddSubItem: () => void;
}

function SortableCategory({
  group,
  isExpanded,
  onToggleExpand,
  editingCategoryId,
  editCategoryName,
  onEditCategoryNameChange,
  onSaveEditCategory,
  onCancelEditCategory,
  onStartEditCategory,
  onDeleteCategory,
  editingDocId,
  editText,
  onEditTextChange,
  onSaveEditDocument,
  onCancelEditDocument,
  onStartEditDocument,
  onToggleDocumentCheck,
  onDeleteDocument,
  addingToGroupId,
  newDocText,
  onNewDocTextChange,
  onAddDocument,
  onStartAddDocument,
  onCancelAddDocument,
  onDocumentsReorder,
  editingSubItemId,
  editSubItemText,
  onEditSubItemTextChange,
  onStartEditSubItem,
  onSaveEditSubItem,
  onCancelEditSubItem,
  onToggleSubItemCheck,
  onDeleteSubItem,
  addingSubItemToDocId,
  newSubItemText,
  onNewSubItemTextChange,
  onAddSubItem,
  onStartAddSubItem,
  onCancelAddSubItem,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDocumentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onDocumentsReorder(group.id, active.id as string, over.id as string);
    }
  };

  // 書類とサブアイテムの合計チェック数を計算
  const totalItems = group.documents.reduce((acc, doc) => {
    return acc + 1 + (doc.subItems?.length || 0);
  }, 0);
  const checkedItems = group.documents.reduce((acc, doc) => {
    const subChecked = doc.subItems?.filter((s) => s.checked).length || 0;
    return acc + (doc.checked ? 1 : 0) + subChecked;
  }, 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-slate-200 rounded-lg overflow-hidden bg-white"
    >
      {/* カテゴリヘッダー */}
      <div className="bg-emerald-50 border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center flex-1">
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mr-1 no-print"
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleExpand}
              className="mr-2 text-slate-500 hover:text-slate-700 no-print"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            {editingCategoryId === group.id ? (
              <div className="flex items-center flex-1">
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => onEditCategoryNameChange(e.target.value)}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded mr-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEditCategory();
                    if (e.key === 'Escape') onCancelEditCategory();
                  }}
                />
                <button
                  onClick={onSaveEditCategory}
                  className="p-1 text-green-600 hover:text-green-800"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={onCancelEditCategory}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 className="font-bold text-lg text-slate-800">{group.category}</h3>
            )}
          </div>
          <div className="flex items-center space-x-2 no-print">
            <span className="text-sm text-slate-500">
              {checkedItems}/{totalItems}
            </span>
            <button
              onClick={onStartEditCategory}
              className="p-1 text-slate-400 hover:text-emerald-600"
              title="カテゴリ名を編集"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDeleteCategory}
              className="p-1 text-slate-400 hover:text-red-600"
              title="カテゴリを削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 書類リスト */}
      {isExpanded && (
        <div className="p-4">
          {group.note && (
            <p className="mb-3 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start">
              <Info className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
              {group.note}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDocumentDragEnd}
          >
            <SortableContext
              items={group.documents.map((doc) => doc.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {group.documents.map((doc, docIndex) => (
                  <SortableDocumentItem
                    key={doc.id}
                    doc={doc}
                    groupId={group.id}
                    index={docIndex + 1}
                    isEditing={editingDocId === doc.id}
                    editText={editText}
                    onEditTextChange={onEditTextChange}
                    onSaveEdit={() => onSaveEditDocument(group.id)}
                    onCancelEdit={onCancelEditDocument}
                    onStartEdit={() => onStartEditDocument(doc.id, doc.text)}
                    onToggleCheck={() => onToggleDocumentCheck(group.id, doc.id)}
                    onDelete={() => onDeleteDocument(group.id, doc.id)}
                    editingSubItemId={editingSubItemId}
                    editSubItemText={editSubItemText}
                    onEditSubItemTextChange={onEditSubItemTextChange}
                    onStartEditSubItem={onStartEditSubItem}
                    onSaveEditSubItem={onSaveEditSubItem}
                    onCancelEditSubItem={onCancelEditSubItem}
                    onToggleSubItemCheck={onToggleSubItemCheck}
                    onDeleteSubItem={onDeleteSubItem}
                    addingSubItemToDocId={addingSubItemToDocId}
                    newSubItemText={newSubItemText}
                    onNewSubItemTextChange={onNewSubItemTextChange}
                    onAddSubItem={onAddSubItem}
                    onStartAddSubItem={onStartAddSubItem}
                    onCancelAddSubItem={onCancelAddSubItem}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {/* 書類追加 */}
          {addingToGroupId === group.id ? (
            <div className="mt-3 flex items-center no-print">
              <input
                type="text"
                value={newDocText}
                onChange={(e) => onNewDocTextChange(e.target.value)}
                placeholder="書類名を入力..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddDocument(group.id);
                  if (e.key === 'Escape') onCancelAddDocument();
                }}
              />
              <button
                onClick={() => onAddDocument(group.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-r-lg hover:bg-emerald-700"
              >
                追加
              </button>
              <button
                onClick={onCancelAddDocument}
                className="ml-2 p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onStartAddDocument(group.id)}
              className="mt-3 flex items-center text-sm text-emerald-600 hover:text-emerald-800 no-print"
            >
              <Plus className="w-4 h-4 mr-1" />
              書類を追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentListScreen({
  year,
  documentGroups,
  onDocumentGroupsChange,
  onBack,
  onYearChange,
  customerName,
  staffName,
  onCustomerNameChange,
  onStaffNameChange,
  onSave,
  onLoad,
  onCopyToNextYear,
  isSaving,
  isLoading,
  lastSaved,
}: DocumentListScreenProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {};
    documentGroups.forEach((group) => {
      expanded[group.id] = true;
    });
    return expanded;
  });
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [newDocText, setNewDocText] = useState('');
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // サブアイテム用の状態
  const [editingSubItemId, setEditingSubItemId] = useState<string | null>(null);
  const [editSubItemText, setEditSubItemText] = useState('');
  const [addingSubItemToDocId, setAddingSubItemToDocId] = useState<string | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');

  const currentDate = formatDate();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // カテゴリの並び替え
  const handleCategoryDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = documentGroups.findIndex((g) => g.id === active.id);
      const newIndex = documentGroups.findIndex((g) => g.id === over.id);
      onDocumentGroupsChange(arrayMove(documentGroups, oldIndex, newIndex));
    }
  };

  // 書類の並び替え
  const handleDocumentsReorder = (groupId: string, activeId: string, overId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        const oldIndex = group.documents.findIndex((d) => d.id === activeId);
        const newIndex = group.documents.findIndex((d) => d.id === overId);
        return {
          ...group,
          documents: arrayMove(group.documents, oldIndex, newIndex),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // カテゴリの展開/折りたたみ
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // 書類のチェック状態を切り替え
  const toggleDocumentCheck = (groupId: string, docId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) =>
            doc.id === docId ? { ...doc, checked: !doc.checked } : doc
          ),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 書類の編集開始
  const startEditDocument = (docId: string, currentText: string) => {
    setEditingDocId(docId);
    setEditText(currentText);
  };

  // 書類の編集保存
  const saveEditDocument = (groupId: string) => {
    if (!editText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) =>
            doc.id === editingDocId ? { ...doc, text: editText.trim() } : doc
          ),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingDocId(null);
    setEditText('');
  };

  // 書類の編集キャンセル
  const cancelEditDocument = () => {
    setEditingDocId(null);
    setEditText('');
  };

  // 書類の削除
  const deleteDocument = (groupId: string, docId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.filter((doc) => doc.id !== docId),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 書類の追加
  const addDocument = (groupId: string) => {
    if (!newDocText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: [
            ...group.documents,
            {
              id: `doc_${Date.now()}`,
              text: newDocText.trim(),
              checked: false,
              subItems: [],
            },
          ],
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setAddingToGroupId(null);
    setNewDocText('');
  };

  // カテゴリの追加
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newGroup: CategoryGroup = {
      id: `category_${Date.now()}`,
      category: newCategoryName.trim(),
      documents: [],
    };
    onDocumentGroupsChange([...documentGroups, newGroup]);
    setExpandedGroups((prev) => ({ ...prev, [newGroup.id]: true }));
    setAddingNewCategory(false);
    setNewCategoryName('');
  };

  // カテゴリの削除
  const deleteCategory = (groupId: string) => {
    if (!confirm('このカテゴリと含まれる書類を全て削除しますか？')) return;
    onDocumentGroupsChange(documentGroups.filter((group) => group.id !== groupId));
  };

  // カテゴリ名の編集開始
  const startEditCategory = (groupId: string, currentName: string) => {
    setEditingCategoryId(groupId);
    setEditCategoryName(currentName);
  };

  // カテゴリ名の編集保存
  const saveEditCategory = () => {
    if (!editCategoryName.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === editingCategoryId) {
        return { ...group, category: editCategoryName.trim() };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  // サブアイテムの追加
  const addSubItem = (groupId: string, docId: string) => {
    if (!newSubItemText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId) {
              return {
                ...doc,
                subItems: [
                  ...(doc.subItems || []),
                  {
                    id: `sub_${Date.now()}`,
                    text: newSubItemText.trim(),
                    checked: false,
                  },
                ],
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setAddingSubItemToDocId(null);
    setNewSubItemText('');
  };

  // サブアイテムの編集開始
  const startEditSubItem = (subItemId: string, currentText: string) => {
    setEditingSubItemId(subItemId);
    setEditSubItemText(currentText);
  };

  // サブアイテムの編集保存
  const saveEditSubItem = (groupId: string, docId: string) => {
    if (!editSubItemText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId) {
              return {
                ...doc,
                subItems: doc.subItems?.map((sub) =>
                  sub.id === editingSubItemId ? { ...sub, text: editSubItemText.trim() } : sub
                ),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingSubItemId(null);
    setEditSubItemText('');
  };

  // サブアイテムの編集キャンセル
  const cancelEditSubItem = () => {
    setEditingSubItemId(null);
    setEditSubItemText('');
  };

  // サブアイテムのチェック切り替え
  const toggleSubItemCheck = (groupId: string, docId: string, subItemId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId) {
              return {
                ...doc,
                subItems: doc.subItems?.map((sub) =>
                  sub.id === subItemId ? { ...sub, checked: !sub.checked } : sub
                ),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // サブアイテムの削除
  const deleteSubItem = (groupId: string, docId: string, subItemId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId) {
              return {
                ...doc,
                subItems: doc.subItems?.filter((sub) => sub.id !== subItemId),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  const years = generateReiwaYears();
  const activeGroup = activeId ? documentGroups.find((g) => g.id === activeId) : null;

  return (
    <div className="animate-fade-in">
      {/* ヘッダー */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          TOPへ戻る
        </button>
        <div className="flex items-center space-x-3">
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                令和{y}年分
              </option>
            ))}
          </select>
          <button
            onClick={() => exportToExcel(documentGroups, year, customerName, staffName)}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-green-600 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel出力
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-emerald-600 font-bold"
          >
            <Printer className="w-4 h-4 mr-2" /> 印刷 / PDF保存
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
        <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{taxReturnData.title}</h1>
            <p className="text-slate-600">
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded mr-2 align-middle">
                令和{year}年分
              </span>
              書類を追加・編集・削除・並び替えして必要な書類リストを作成してください。
            </p>
          </div>
          <div className="text-right text-sm text-slate-500 no-print">
            <p>発行日: {currentDate}</p>
            <p className="font-bold text-slate-700">{taxReturnData.contactInfo.office}</p>
          </div>
        </div>

        {/* お客様名・担当者名入力欄 */}
        <div className="mb-4 grid grid-cols-2 gap-4 no-print">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">お客様名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="お客様名を入力..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">担当者名</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => onStaffNameChange(e.target.value)}
              placeholder="担当者名を入力..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* データ操作ボタン */}
        <div className="mb-8 flex flex-wrap items-center gap-3 no-print">
          <button
            onClick={onLoad}
            disabled={isLoading || !customerName.trim() || !staffName.trim()}
            className="flex items-center px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            データ読込
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !customerName.trim() || !staffName.trim()}
            className="flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存
          </button>
          <button
            onClick={onCopyToNextYear}
            disabled={isSaving || !customerName.trim() || !staffName.trim()}
            className="flex items-center px-4 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 mr-2" />
            翌年度更新
          </button>
          {lastSaved && (
            <span className="text-sm text-slate-500">
              最終保存: {lastSaved.toLocaleTimeString('ja-JP')}
            </span>
          )}
        </div>

        {/* 書類リスト */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleCategoryDragStart}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={documentGroups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {documentGroups.map((group) => (
                <SortableCategory
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups[group.id] ?? true}
                  onToggleExpand={() => toggleGroup(group.id)}
                  editingCategoryId={editingCategoryId}
                  editCategoryName={editCategoryName}
                  onEditCategoryNameChange={setEditCategoryName}
                  onSaveEditCategory={saveEditCategory}
                  onCancelEditCategory={() => setEditingCategoryId(null)}
                  onStartEditCategory={() => startEditCategory(group.id, group.category)}
                  onDeleteCategory={() => deleteCategory(group.id)}
                  editingDocId={editingDocId}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onSaveEditDocument={saveEditDocument}
                  onCancelEditDocument={cancelEditDocument}
                  onStartEditDocument={startEditDocument}
                  onToggleDocumentCheck={toggleDocumentCheck}
                  onDeleteDocument={deleteDocument}
                  addingToGroupId={addingToGroupId}
                  newDocText={newDocText}
                  onNewDocTextChange={setNewDocText}
                  onAddDocument={addDocument}
                  onStartAddDocument={setAddingToGroupId}
                  onCancelAddDocument={() => setAddingToGroupId(null)}
                  onDocumentsReorder={handleDocumentsReorder}
                  editingSubItemId={editingSubItemId}
                  editSubItemText={editSubItemText}
                  onEditSubItemTextChange={setEditSubItemText}
                  onStartEditSubItem={startEditSubItem}
                  onSaveEditSubItem={saveEditSubItem}
                  onCancelEditSubItem={cancelEditSubItem}
                  onToggleSubItemCheck={toggleSubItemCheck}
                  onDeleteSubItem={deleteSubItem}
                  addingSubItemToDocId={addingSubItemToDocId}
                  newSubItemText={newSubItemText}
                  onNewSubItemTextChange={setNewSubItemText}
                  onAddSubItem={addSubItem}
                  onStartAddSubItem={setAddingSubItemToDocId}
                  onCancelAddSubItem={() => setAddingSubItemToDocId(null)}
                />
              ))}

              {/* カテゴリ追加 */}
              <div className="no-print">
                {addingNewCategory ? (
                  <div className="flex items-center p-4 border-2 border-dashed border-slate-300 rounded-lg">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="カテゴリ名を入力..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addCategory();
                        if (e.key === 'Escape') setAddingNewCategory(false);
                      }}
                    />
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => setAddingNewCategory(false)}
                      className="ml-2 p-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingNewCategory(true)}
                    className="w-full flex items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    新しいカテゴリを追加
                  </button>
                )}
              </div>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeGroup ? (
              <div className="border border-emerald-400 rounded-lg overflow-hidden bg-white shadow-lg opacity-90">
                <div className="bg-emerald-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-bold text-lg text-slate-800">{activeGroup.category}</h3>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-slate-300">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>【お問い合わせ先】</strong>
              </p>
              <p className="font-bold text-lg text-slate-700">{taxReturnData.contactInfo.office}</p>
              <p>{taxReturnData.contactInfo.address}</p>
              <p>
                TEL: {taxReturnData.contactInfo.tel}
                {taxReturnData.contactInfo.fax && ` / FAX: ${taxReturnData.contactInfo.fax}`}
              </p>
              <br />
              <p>
                <strong>※ご留意事項</strong>
              </p>
              <p>・原本が必要な書類と、コピーで対応可能な書類がございます。詳細はお問い合わせください。</p>
              <p className="no-print">・ドラッグ＆ドロップでカテゴリや書類の順番を変更できます。</p>
              <p className="no-print">・各書類の「+」ボタンで小項目を追加できます。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
