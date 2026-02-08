'use client';

import { memo, useState, useMemo, useEffect, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, Plus } from 'lucide-react';
import type { CategoryData, DocumentItem, CustomDocumentItem } from '../../constants/documents';
import { getIcon } from '../../utils/iconMap';
import { DocumentForm } from './DocumentForm';
import { SortableDocumentItem, DocumentItemContent } from './DocumentItem';

export interface CategoryItemProps {
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

function CategoryItemComponent({
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const customDocsInCategory = useMemo(
    () => customDocuments.filter((doc) => doc.categoryId === category.id),
    [customDocuments, category.id]
  );

  const docMap = useMemo(() => {
    const map = new Map<string, DocumentItem | CustomDocumentItem>();
    category.documents.forEach((doc) => map.set(doc.id, doc));
    customDocsInCategory.forEach((doc) => map.set(doc.id, doc));
    return map;
  }, [category.documents, customDocsInCategory]);

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

    docMap.forEach((doc, docId) => {
      if (!usedIds.has(docId)) result.push(doc);
    });

    return result;
  }, [documentOrder, docMap]);

  const deletedCount = category.documents.filter((doc) => deletedDocuments[doc.id]).length;
  const activeCount = category.documents.length - deletedCount + customDocsInCategory.length;
  const totalCount = category.documents.length + customDocsInCategory.length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedDocs.findIndex((doc) => doc.id === active.id);
      const newIndex = orderedDocs.findIndex((doc) => doc.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedDocs = arrayMove(orderedDocs, oldIndex, newIndex);
        onReorderDocuments(category.id, newOrderedDocs.map((doc) => doc.id));
      }
    }
  };

  const sortableIds = orderedDocs
    .filter((doc) => !deletedDocuments[doc.id])
    .map((doc) => doc.id);

  /** 書類アイテムの共通propsを生成 */
  const getDocItemProps = (doc: DocumentItem | CustomDocumentItem) => {
    const isDeleted = deletedDocuments[doc.id] ?? false;
    const isCustom = 'isCustom' in doc && doc.isCustom === true;
    const originalCanDelegate = isCustom ? false : ((doc as DocumentItem).canDelegate ?? false);
    const canDelegate = canDelegateOverrides[doc.id] ?? originalCanDelegate;

    return {
      doc,
      categoryId: category.id,
      isDeleted,
      isCustom,
      isEditing: editingDocId === doc.id,
      editedValues: editedDocuments[doc.id],
      canDelegate,
      onDelete: onDeleteDocument,
      onRestore: onRestoreDocument,
      onRemoveCustom: onRemoveCustomDocument,
      onStartEdit: setEditingDocId,
      onSaveEdit: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => {
        onEditDocument(docId, changes);
        setEditingDocId(null);
      },
      onCancelEdit: () => setEditingDocId(null),
      onToggleCanDelegate: () => onToggleCanDelegate(doc.id, originalCanDelegate),
    };
  };

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${category.borderColor}`}>
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer ${category.bgColor} hover:opacity-90`}
        onClick={() => onToggleExpanded(category.id)}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-white/50">
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
                {orderedDocs.map((doc) => (
                  <SortableDocumentItem key={doc.id} {...getDocItemProps(doc)} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            orderedDocs.map((doc) => (
              <DocumentItemContent key={doc.id} {...getDocItemProps(doc)} />
            ))
          )}

          {/* 追加ボタン/フォーム */}
          {showAddForm ? (
            <DocumentForm
              variant="add"
              onSubmit={(values) => {
                onAddCustomDocument(category.id, values.name, values.description, values.howToGet);
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
}

export const CategoryItem = memo(CategoryItemComponent);
