'use client';

import React, { memo, useState, useMemo, useEffect, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  Trash2,
  RotateCcw,
  Plus,
  X,
  RefreshCw,
  GripVertical,
  Pencil,
  Check,
  Download,
  Upload,
} from 'lucide-react';
import { CATEGORIES, type CategoryData, type DocumentItem, type CustomDocumentItem } from '../constants/documents';
import { getIcon } from '../utils/iconMap';
import { readJsonFile, validateImportData, type ExportData } from '../utils/jsonDataManager';
import { StepIndicator } from './StepIndicator';

interface Stats {
  totalBuiltIn: number;
  deletedCount: number;
  customCount: number;
  activeCount: number;
}

interface SelectionScreenProps {
  clientName: string;
  deceasedName: string;
  deadline: string;
  expandedCategories: Record<string, boolean>;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
  canDelegateOverrides: Record<string, boolean>;
  stats: Stats;
  onClientNameChange: (value: string) => void;
  onDeceasedNameChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDocument: (docId: string) => void;
  onAddCustomDocument: (categoryId: string, name: string, description: string, howToGet: string) => void;
  onRemoveCustomDocument: (docId: string, categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onEditDocument: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onRestoreAll: () => void;
  onPreview: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
}

// 追加フォームコンポーネント
interface AddDocumentFormProps {
  categoryId: string;
  onAdd: (categoryId: string, name: string, description: string, howToGet: string) => void;
  onCancel: () => void;
}

const AddDocumentForm = memo(function AddDocumentForm({ categoryId, onAdd, onCancel }: AddDocumentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [howToGet, setHowToGet] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(categoryId, name.trim(), description.trim(), howToGet.trim());
      setName('');
      setDescription('');
      setHowToGet('');
    }
  };

  return (
    <div className="p-4 bg-emerald-50 border-t border-emerald-200">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">書類名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="例：その他必要書類"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">説明</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="例：担当者から指示があった書類"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">取得方法</label>
          <input
            type="text"
            value={howToGet}
            onChange={(e) => setHowToGet(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="例：お手元にあるものをご用意ください"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`px-4 py-2 text-sm text-white rounded-lg ${
              name.trim() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
});

// 編集フォームコンポーネント
interface EditDocumentFormProps {
  doc: DocumentItem | CustomDocumentItem;
  editedValues: { name?: string; description?: string; howToGet?: string } | undefined;
  onSave: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onCancel: () => void;
}

const EditDocumentForm = memo(function EditDocumentForm({ doc, editedValues, onSave, onCancel }: EditDocumentFormProps) {
  const [name, setName] = useState(editedValues?.name ?? doc.name);
  const [description, setDescription] = useState(editedValues?.description ?? doc.description);
  const [howToGet, setHowToGet] = useState(editedValues?.howToGet ?? doc.howToGet);

  const handleSubmit = () => {
    onSave(doc.id, {
      name: name.trim(),
      description: description.trim(),
      howToGet: howToGet.trim(),
    });
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">書類名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">説明</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">取得方法</label>
          <input
            type="text"
            value={howToGet}
            onChange={(e) => setHowToGet(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`px-4 py-2 text-sm text-white rounded-lg ${
              name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
});

// ソート可能な書類アイテム
interface SortableDocumentItemProps {
  doc: DocumentItem | CustomDocumentItem;
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

function SortableDocumentItem({
  doc,
  categoryId,
  isDeleted,
  isCustom,
  isEditing,
  editedValues,
  canDelegate,
  onDelete,
  onRestore,
  onRemoveCustom,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleCanDelegate,
}: SortableDocumentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: doc.id,
    disabled: isDeleted, // 削除済みはドラッグ不可
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 表示用の値（編集済みの場合は編集値を使用）
  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;

  // 編集中の場合
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="p-4 border-b border-slate-100">
        <EditDocumentForm
          doc={doc}
          editedValues={editedValues}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start p-4 border-b border-slate-100 last:border-b-0 ${
        isDeleted ? 'bg-slate-50' : isCustom ? 'bg-emerald-50/50' : ''
      } ${isDragging ? 'shadow-lg z-10' : ''}`}
    >
      {/* ドラッグハンドル */}
      {!isDeleted && (
        <button
          {...attributes}
          {...listeners}
          className="mr-2 p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          title="ドラッグして並べ替え"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {isDeleted && <div className="w-6 mr-2" />}

      <div className="flex-1">
        <div className="flex items-center flex-wrap gap-1">
          <span
            className={`font-medium ${
              isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}
          >
            {displayName}
          </span>
          {isCustom && !isDeleted && (
            <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
              追加
            </span>
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
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              編集済
            </span>
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
        {/* 編集ボタン（削除済み以外） */}
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
}

// SSR時の静的書類アイテム（ドラッグなし）
interface StaticDocumentItemProps {
  doc: DocumentItem | CustomDocumentItem;
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

function StaticDocumentItem({
  doc,
  categoryId,
  isDeleted,
  isCustom,
  isEditing,
  editedValues,
  canDelegate,
  onDelete,
  onRestore,
  onRemoveCustom,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleCanDelegate,
}: StaticDocumentItemProps) {
  // 表示用の値（編集済みの場合は編集値を使用）
  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;

  // 編集中の場合
  if (isEditing) {
    return (
      <div className="p-4 border-b border-slate-100">
        <EditDocumentForm
          doc={doc}
          editedValues={editedValues}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-start p-4 border-b border-slate-100 last:border-b-0 ${
        isDeleted ? 'bg-slate-50' : isCustom ? 'bg-emerald-50/50' : ''
      }`}
    >
      {/* ドラッグハンドル（SSR時は単なるプレースホルダー） */}
      {!isDeleted && (
        <div className="mr-2 p-1 text-slate-400">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      {isDeleted && <div className="w-6 mr-2" />}

      <div className="flex-1">
        <div className="flex items-center flex-wrap gap-1">
          <span
            className={`font-medium ${
              isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}
          >
            {displayName}
          </span>
          {isCustom && !isDeleted && (
            <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
              追加
            </span>
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
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              編集済
            </span>
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
        {/* 編集ボタン（削除済み以外） */}
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
}

// カテゴリアイテムコンポーネント
interface CategoryItemProps {
  category: CategoryData;
  isExpanded: boolean;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: string[];
  editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
  canDelegateOverrides: Record<string, boolean>;
  onToggleExpanded: (categoryId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDocument: (docId: string) => void;
  onAddCustomDocument: (categoryId: string, name: string, description: string, howToGet: string) => void;
  onRemoveCustomDocument: (docId: string, categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onEditDocument: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
}

const CategoryItem = memo(function CategoryItem({
  category,
  isExpanded,
  deletedDocuments,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  onToggleExpanded,
  onDeleteDocument,
  onRestoreDocument,
  onAddCustomDocument,
  onRemoveCustomDocument,
  onReorderDocuments,
  onEditDocument,
  onToggleCanDelegate,
}: CategoryItemProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dndId = useId();

  const handleStartEdit = (docId: string) => {
    setEditingDocId(docId);
  };

  const handleSaveEdit = (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => {
    onEditDocument(docId, changes);
    setEditingDocId(null);
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
  };

  // クライアントサイドでのみDnDを有効化（ハイドレーション対策）
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // カテゴリ内のカスタム書類
  const customDocsInCategory = useMemo(
    () => customDocuments.filter((doc) => doc.categoryId === category.id),
    [customDocuments, category.id]
  );

  // 全書類をマップに格納
  const docMap = useMemo(() => {
    const map = new Map<string, DocumentItem | CustomDocumentItem>();
    category.documents.forEach((doc) => map.set(doc.id, doc));
    customDocsInCategory.forEach((doc) => map.set(doc.id, doc));
    return map;
  }, [category.documents, customDocsInCategory]);

  // 順序に従って並べた書類リスト
  const orderedDocs = useMemo(() => {
    const result: (DocumentItem | CustomDocumentItem)[] = [];
    const usedIds = new Set<string>();

    documentOrder.forEach((docId) => {
      const doc = docMap.get(docId);
      if (doc) {
        result.push(doc);
        usedIds.add(docId);
      }
    });

    // 順序に含まれない書類を末尾に追加
    docMap.forEach((doc, docId) => {
      if (!usedIds.has(docId)) {
        result.push(doc);
      }
    });

    return result;
  }, [documentOrder, docMap]);

  // 統計
  const deletedCount = category.documents.filter((doc) => deletedDocuments[doc.id]).length;
  const activeCount = category.documents.length - deletedCount + customDocsInCategory.length;
  const totalCount = category.documents.length + customDocsInCategory.length;

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedDocs.findIndex((doc) => doc.id === active.id);
      const newIndex = orderedDocs.findIndex((doc) => doc.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedDocs = arrayMove(orderedDocs, oldIndex, newIndex);
        const newOrder = newOrderedDocs.map((doc) => doc.id);
        onReorderDocuments(category.id, newOrder);
      }
    }
  };

  // ドラッグ可能なアイテムのIDリスト（削除済みは除外）
  const sortableIds = orderedDocs
    .filter((doc) => !deletedDocuments[doc.id])
    .map((doc) => doc.id);

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${category.borderColor}`}>
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer ${category.bgColor} hover:opacity-90`}
        onClick={() => onToggleExpanded(category.id)}
      >
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-white/50`}>
            <span className={category.color}>{getIcon(category.iconName)}</span>
          </div>
          <span className={`font-bold text-lg ${category.color}`}>{category.name}</span>
          <span className="ml-2 text-sm text-slate-500">
            ({activeCount}/{totalCount}件)
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* 書類リスト */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-white">
          {isMounted ? (
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {orderedDocs.map((doc) => {
                  const isDeleted = deletedDocuments[doc.id] ?? false;
                  const isCustom = 'isCustom' in doc && doc.isCustom === true;
                  const originalCanDelegate = isCustom ? false : ((doc as DocumentItem).canDelegate ?? false);
                  const canDelegate = canDelegateOverrides[doc.id] ?? originalCanDelegate;

                  return (
                    <SortableDocumentItem
                      key={doc.id}
                      doc={doc}
                      categoryId={category.id}
                      isDeleted={isDeleted}
                      isCustom={isCustom}
                      isEditing={editingDocId === doc.id}
                      editedValues={editedDocuments[doc.id]}
                      canDelegate={canDelegate}
                      onDelete={onDeleteDocument}
                      onRestore={onRestoreDocument}
                      onRemoveCustom={onRemoveCustomDocument}
                      onStartEdit={handleStartEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onToggleCanDelegate={() => onToggleCanDelegate(doc.id, originalCanDelegate)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            // SSR時はDnDなしで静的に表示
            orderedDocs.map((doc) => {
              const isDeleted = deletedDocuments[doc.id] ?? false;
              const isCustom = 'isCustom' in doc && doc.isCustom === true;
              const originalCanDelegate = isCustom ? false : ((doc as DocumentItem).canDelegate ?? false);
              const canDelegate = canDelegateOverrides[doc.id] ?? originalCanDelegate;

              return (
                <StaticDocumentItem
                  key={doc.id}
                  doc={doc}
                  categoryId={category.id}
                  isDeleted={isDeleted}
                  isCustom={isCustom}
                  isEditing={editingDocId === doc.id}
                  editedValues={editedDocuments[doc.id]}
                  canDelegate={canDelegate}
                  onDelete={onDeleteDocument}
                  onRestore={onRestoreDocument}
                  onRemoveCustom={onRemoveCustomDocument}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onToggleCanDelegate={() => onToggleCanDelegate(doc.id, originalCanDelegate)}
                />
              );
            })
          )}

          {/* 追加ボタン/フォーム */}
          {showAddForm ? (
            <AddDocumentForm
              categoryId={category.id}
              onAdd={(catId, name, desc, how) => {
                onAddCustomDocument(catId, name, desc, how);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-3 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> 書類を追加
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function SelectionScreenComponent({
  clientName,
  deceasedName,
  deadline,
  expandedCategories,
  deletedDocuments,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  stats,
  onClientNameChange,
  onDeceasedNameChange,
  onDeadlineChange,
  onToggleExpanded,
  onDeleteDocument,
  onRestoreDocument,
  onAddCustomDocument,
  onRemoveCustomDocument,
  onReorderDocuments,
  onEditDocument,
  onToggleCanDelegate,
  onRestoreAll,
  onPreview,
  onExportJson,
  onImportJson,
}: SelectionScreenProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const data = await readJsonFile(file);
      const validation = validateImportData(data);

      if (!validation.isValid) {
        setImportError(validation.error || 'データの検証に失敗しました。');
        return;
      }

      onImportJson(data as ExportData);
      alert('データを読み込みました。');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。');
    } finally {
      setIsImporting(false);
      // ファイル入力をリセット
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ステップインジケーター */}
      <StepIndicator
        currentStep={1}
        onStepChange={(step) => step === 2 && onPreview()}
        canGoToPreview={stats.activeCount > 0}
      />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-4">
        {/* ヘッダー */}
        <div className="bg-blue-800 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">相続税申告 資料準備ガイド</h1>
              <p className="text-blue-200 text-sm">
                ドラッグで並べ替え、鉛筆で編集、ゴミ箱で削除、＋で追加
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportJson}
                className="flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm bg-indigo-600 hover:bg-indigo-700"
                title="設定をJSONファイルとして保存"
              >
                <Download className="w-4 h-4 mr-1" /> 保存
              </button>
              <label
                className={`flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm cursor-pointer ${
                  isImporting
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                title="JSONファイルから設定を読み込み"
              >
                <Upload className="w-4 h-4 mr-1" /> 読込
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonImport}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* インポートエラー表示 */}
        {importError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{importError}</span>
            <button
              onClick={() => setImportError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 基本情報入力 */}
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">お客様名</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">被相続人名</label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => onDeceasedNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：山田 一郎"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">資料収集期限</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 統計バー */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-slate-600 flex items-center gap-4">
            <span>
              有効: <span className="font-bold text-blue-600">{stats.activeCount}</span>件
            </span>
            {stats.deletedCount > 0 && (
              <span className="text-slate-400">
                削除済み: <span className="text-red-500">{stats.deletedCount}</span>件
              </span>
            )}
            {stats.customCount > 0 && (
              <span className="text-slate-400">
                追加: <span className="text-emerald-600">{stats.customCount}</span>件
              </span>
            )}
          </div>
          {stats.deletedCount > 0 && (
            <button
              onClick={onRestoreAll}
              className="flex items-center px-3 py-1 text-sm text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> 全て復元
            </button>
          )}
        </div>

        {/* カテゴリリスト */}
        <div className="p-6 md:p-8 space-y-4">
          {CATEGORIES.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isExpanded={expandedCategories[category.id] ?? false}
              deletedDocuments={deletedDocuments}
              customDocuments={customDocuments}
              documentOrder={documentOrder[category.id] || []}
              editedDocuments={editedDocuments}
              canDelegateOverrides={canDelegateOverrides}
              onToggleExpanded={onToggleExpanded}
              onDeleteDocument={onDeleteDocument}
              onRestoreDocument={onRestoreDocument}
              onAddCustomDocument={onAddCustomDocument}
              onRemoveCustomDocument={onRemoveCustomDocument}
              onReorderDocuments={onReorderDocuments}
              onEditDocument={onEditDocument}
              onToggleCanDelegate={onToggleCanDelegate}
            />
          ))}
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
          税理士法人 マスエージェント / 〒770-0002 徳島県徳島市春日２丁目３番３３号
        </div>
      </div>
    </div>
  );
}

export const SelectionScreen = memo(SelectionScreenComponent);
