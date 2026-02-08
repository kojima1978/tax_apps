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
import { ChevronDown, Plus, Trash2, RefreshCw, Pencil, X, FolderPlus } from 'lucide-react';
import type { CategoryData, DocumentItem, CustomDocumentItem, CustomSubcategory } from '../../constants/documents';
import { getIcon } from '../../utils/iconMap';
import { DocumentForm } from './DocumentForm';
import { SortableDocumentItem, DocumentItemContent } from './DocumentItem';

export interface CategoryItemProps {
  category: CategoryData;
  isExpanded: boolean;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  customSubcategories: CustomSubcategory[];
  documentOrder: string[];
  editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
  canDelegateOverrides: Record<string, boolean>;
  onToggleExpanded: (categoryId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDocument: (docId: string) => void;
  onDeleteAllInCategory: (categoryId: string) => void;
  onRestoreAllInCategory: (categoryId: string) => void;
  onAddCustomDocument: (categoryId: string, name: string, description: string, howToGet: string, subcategoryId?: string) => void;
  onRemoveCustomDocument: (docId: string, categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onEditDocument: (docId: string, changes: { name?: string; description?: string; howToGet?: string }) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onAddSubcategory: (categoryId: string, name: string) => void;
  onEditSubcategory: (subcatId: string, name: string) => void;
  onRemoveSubcategory: (subcatId: string) => void;
}

function CategoryItemComponent({
  category,
  isExpanded,
  deletedDocuments,
  customDocuments,
  customSubcategories,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  onToggleExpanded,
  onDeleteDocument,
  onRestoreDocument,
  onDeleteAllInCategory,
  onRestoreAllInCategory,
  onAddCustomDocument,
  onRemoveCustomDocument,
  onReorderDocuments,
  onEditDocument,
  onToggleCanDelegate,
  onAddSubcategory,
  onEditSubcategory,
  onRemoveSubcategory,
}: CategoryItemProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dndId = useId();

  // 小分類の追加/編集用state
  const [showAddSubcatForm, setShowAddSubcatForm] = useState(false);
  const [subcatAddName, setSubcatAddName] = useState('');
  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [editingSubcatName, setEditingSubcatName] = useState('');
  const [addFormForSubcatId, setAddFormForSubcatId] = useState<string | null>(null);

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

  // このカテゴリの小分類一覧
  const subcatsInCategory = useMemo(
    () => customSubcategories.filter((sc) => sc.categoryId === category.id),
    [customSubcategories, category.id]
  );

  // カテゴリ直下のカスタム書類（subcategoryIdなし）
  const topLevelCustomDocs = useMemo(
    () => customDocuments.filter((doc) => doc.categoryId === category.id && !doc.subcategoryId),
    [customDocuments, category.id]
  );

  // 全カスタム書類数（小分類配下も含む）
  const allCustomDocsInCategory = useMemo(
    () => customDocuments.filter((doc) => doc.categoryId === category.id),
    [customDocuments, category.id]
  );

  const docMap = useMemo(() => {
    const map = new Map<string, DocumentItem | CustomDocumentItem>();
    category.documents.forEach((doc) => map.set(doc.id, doc));
    topLevelCustomDocs.forEach((doc) => map.set(doc.id, doc));
    return map;
  }, [category.documents, topLevelCustomDocs]);

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
  const activeCount = category.documents.length - deletedCount + allCustomDocsInCategory.length;
  const totalCount = category.documents.length + allCustomDocsInCategory.length;
  const allBuiltInDeleted = deletedCount === category.documents.length;

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

  const handleAddSubcategory = () => {
    if (subcatAddName.trim()) {
      onAddSubcategory(category.id, subcatAddName.trim());
      setSubcatAddName('');
      setShowAddSubcatForm(false);
    }
  };

  const handleSaveSubcatEdit = () => {
    if (editingSubcatId && editingSubcatName.trim()) {
      onEditSubcategory(editingSubcatId, editingSubcatName.trim());
      setEditingSubcatId(null);
      setEditingSubcatName('');
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (allBuiltInDeleted) {
                onRestoreAllInCategory(category.id);
              } else {
                onDeleteAllInCategory(category.id);
              }
            }}
            className={`flex items-center px-2.5 py-1 text-xs rounded-lg transition-colors ${
              allBuiltInDeleted
                ? 'text-emerald-600 hover:bg-emerald-100'
                : 'text-slate-500 hover:bg-red-100 hover:text-red-600'
            }`}
            title={allBuiltInDeleted ? '一括復元' : '一括不要'}
          >
            {allBuiltInDeleted ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                一括復元
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                一括不要
              </>
            )}
          </button>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 書類リスト */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-white">
          {/* カテゴリ直下の書類 */}
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

          {/* カテゴリ直下の書類追加ボタン/フォーム */}
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

          {/* 小分類セクション */}
          {subcatsInCategory.map((subcat) => {
            const subcatDocs = customDocuments.filter(
              (doc) => doc.subcategoryId === subcat.id
            );
            const isEditingThis = editingSubcatId === subcat.id;
            const isAddingDoc = addFormForSubcatId === subcat.id;

            return (
              <div key={subcat.id} className="border-t-2 border-dashed border-slate-200">
                {/* 小分類ヘッダー */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSubcatName}
                        onChange={(e) => setEditingSubcatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSubcatEdit();
                          if (e.key === 'Escape') { setEditingSubcatId(null); setEditingSubcatName(''); }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveSubcatEdit}
                        disabled={!editingSubcatName.trim()}
                        className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded disabled:bg-slate-300"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => { setEditingSubcatId(null); setEditingSubcatName(''); }}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-sm text-slate-700">{subcat.name}</span>
                        <span className="text-xs text-slate-400">({subcatDocs.length}件)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingSubcatId(subcat.id); setEditingSubcatName(subcat.name); }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="小分類名を編集"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveSubcategory(subcat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="小分類を削除"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 小分類内の書類 */}
                {subcatDocs.map((doc) => (
                  <DocumentItemContent key={doc.id} {...getDocItemProps(doc)} />
                ))}

                {/* 小分類内の書類追加ボタン/フォーム */}
                {isAddingDoc ? (
                  <DocumentForm
                    variant="add"
                    onSubmit={(values) => {
                      onAddCustomDocument(category.id, values.name, values.description, values.howToGet, subcat.id);
                      setAddFormForSubcatId(null);
                    }}
                    onCancel={() => setAddFormForSubcatId(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddFormForSubcatId(subcat.id)}
                    className="w-full p-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 書類を追加
                  </button>
                )}
              </div>
            );
          })}

          {/* 小分類追加フォーム/ボタン */}
          <div className="border-t border-slate-200">
            {showAddSubcatForm ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50">
                <FolderPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <input
                  type="text"
                  value={subcatAddName}
                  onChange={(e) => setSubcatAddName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubcategory();
                    if (e.key === 'Escape') { setShowAddSubcatForm(false); setSubcatAddName(''); }
                  }}
                  placeholder="小分類名を入力..."
                  className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleAddSubcategory}
                  disabled={!subcatAddName.trim()}
                  className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded disabled:bg-slate-300"
                >
                  追加
                </button>
                <button
                  onClick={() => { setShowAddSubcatForm(false); setSubcatAddName(''); }}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSubcatForm(true)}
                className="w-full p-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
              >
                <FolderPlus className="w-4 h-4" /> 小分類を追加
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const CategoryItem = memo(CategoryItemComponent);
