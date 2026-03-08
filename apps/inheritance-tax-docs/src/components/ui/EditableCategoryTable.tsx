import React, { memo, useMemo, useState, useEffect, useId } from 'react';
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
import { ChevronDown, Plus, CheckSquare, Square, Trash2, Power, CheckCircle2 } from 'lucide-react';
import type { CategoryData, DocumentItem, CustomDocumentItem, DocChanges } from '../../constants/documents';
import type { FilterCriteria } from '../UnifiedDocumentView';
import { isCustomDocument, toCircledNumber, COLOR_ACCENT_MAP } from '../../utils/helpers';
import { getIcon } from '../../utils/iconMap';
import { SortableDocumentRow, StaticDocumentRow, type EditableDocumentRowProps } from './EditableDocumentRow';
import { SpecificNamesTableRows } from './SpecificNamesList';

/** カテゴリヘッダー（展開/折りたたみ、操作ボタン） */
const CategoryHeader = memo(function CategoryHeader({
  category, categoryIndex, isExpanded, allChecked, someChecked,
  urgentCount,
  onToggleExpanded, onToggleCategoryDisabled, onRemoveCategory, onToggleAllInCategory,
}: {
  category: CategoryData; categoryIndex: number; isExpanded: boolean;
  allChecked: boolean; someChecked: boolean;
  urgentCount: number;
  onToggleExpanded: (categoryId: string) => void;
  onToggleCategoryDisabled: (categoryId: string) => void;
  onRemoveCategory: (categoryId: string, name: string) => void;
  onToggleAllInCategory: (categoryId: string, checked: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 cursor-pointer rounded-t-lg transition-colors hover:opacity-90 print:cursor-default print:p-1 ${
        allChecked ? 'bg-emerald-100 border border-emerald-300' : category.bgColor
      }`}
      onClick={() => onToggleExpanded(category.id)}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpanded(category.id); }
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`print:mr-1 ${allChecked ? 'text-emerald-600' : category.color}`}>
          {allChecked ? <CheckCircle2 className="w-6 h-6" /> : getIcon(category.iconName, 'w-6 h-6')}
        </span>
        <span className={`font-bold text-lg print:text-sm ${allChecked ? 'text-emerald-700' : category.color}`}>
          {toCircledNumber(categoryIndex)} {category.name}
        </span>
        {urgentCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 font-bold rounded">
            急 {urgentCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 print:hidden">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCategoryDisabled(category.id); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          title="このカテゴリを対象外にする"
          aria-label="カテゴリを対象外にする"
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveCategory(category.id, category.name); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors"
          title="カテゴリを削除"
          aria-label="カテゴリを削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleAllInCategory(category.id, !allChecked); }}
          className={`flex items-center px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
            allChecked ? 'bg-emerald-600 text-white' : someChecked ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
          title={allChecked ? '全済みを解除' : '全て提出済みにする'}
        >
          {allChecked ? <CheckSquare className="w-3.5 h-3.5 mr-1" /> : <Square className="w-3.5 h-3.5 mr-1" />}
          全済み
        </button>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
    </div>
  );
});

interface EditableCategoryTableProps {
  category: CategoryData;
  categoryIndex: number;
  isExpanded: boolean;
  isDisabled: boolean;
  customDocuments: CustomDocumentItem[];
  documentOrder: string[];
  editedDocuments: Record<string, DocChanges>;
  canDelegateOverrides: Record<string, boolean>;
  specificDocNames: Record<string, string[]>;
  onToggleExpanded: (categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
  onReorderSpecificNames: (docId: string, newNames: string[]) => void;
  checkedDocuments: Record<string, boolean>;
  checkedDates: Record<string, string>;
  documentMemos: Record<string, string>;
  excludedDocuments: Record<string, boolean>;
  urgentDocuments: Record<string, boolean>;
  onToggleDocumentCheck: (docId: string) => void;
  onToggleAllInCategory: (categoryId: string, checked: boolean) => void;
  onSetDocumentMemo: (docId: string, memo: string) => void;
  onToggleExcluded: (docId: string) => void;
  onToggleUrgent: (docId: string) => void;
  onToggleCategoryDisabled: (categoryId: string) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string, name: string) => void;
  hideSubmittedInPrint: boolean;
  filterCriteria: FilterCriteria;
  onOpenAddModal: (categoryId: string) => void;
  onStartEdit: (docId: string) => void;
}

function EditableCategoryTableComponent({
  category,
  categoryIndex,
  isExpanded,
  isDisabled,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  specificDocNames,
  onToggleExpanded,
  onReorderDocuments,
  onToggleCanDelegate,
  onAddSpecificName,
  onEditSpecificName,
  onRemoveSpecificName,
  onReorderSpecificNames,
  checkedDocuments,
  checkedDates,
  documentMemos,
  excludedDocuments,
  urgentDocuments,
  onToggleDocumentCheck,
  onToggleAllInCategory,
  onSetDocumentMemo,
  onToggleExcluded,
  onToggleUrgent,
  onToggleCategoryDisabled,
  onRemoveDocument,
  onRemoveCategory,
  hideSubmittedInPrint,
  filterCriteria,
  onOpenAddModal,
  onStartEdit,
}: EditableCategoryTableProps) {
  const [isMounted, setIsMounted] = useState(false);
  const dndId = useId();

  useEffect(() => { setIsMounted(true); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    documentOrder.forEach((docId) => {
      const doc = docMap.get(docId);
      if (doc) result.push(doc);
    });
    return result;
  }, [documentOrder, docMap]);

  const checkedCount = orderedDocs.filter(doc => checkedDocuments[doc.id]).length;
  const urgentCount = orderedDocs.filter(doc => urgentDocuments[doc.id]).length;
  const allChecked = orderedDocs.length > 0 && checkedCount === orderedDocs.length;
  const someChecked = checkedCount > 0 && !allChecked;
  const totalCount = orderedDocs.length;

  // フィルタリングされた表示用ドキュメント（DnDの順序には影響しない）
  const filteredDocIds = useMemo(() => {
    const { searchQuery, showOnlyUnchecked, showOnlyDelegatable, showOnlyUrgent, hideExcluded: filterHideExcluded } = filterCriteria;
    const ids = new Set<string>();
    orderedDocs.forEach(doc => {
      const docIsCustom = isCustomDocument(doc);
      const originalCanDelegate = docIsCustom ? false : ((doc as DocumentItem).canDelegate ?? false);
      const canDelegate = canDelegateOverrides[doc.id] ?? originalCanDelegate;
      const displayName = editedDocuments[doc.id]?.name ?? doc.name;

      if (showOnlyUnchecked && checkedDocuments[doc.id]) return;
      if (showOnlyUrgent && !urgentDocuments[doc.id]) return;
      if (showOnlyDelegatable && !canDelegate) return;
      if (filterHideExcluded && excludedDocuments[doc.id]) return;
      if (searchQuery && !displayName.toLowerCase().includes(searchQuery.toLowerCase())) return;
      ids.add(doc.id);
    });
    return ids;
  }, [orderedDocs, filterCriteria, checkedDocuments, canDelegateOverrides, editedDocuments, excludedDocuments, urgentDocuments]);

  const hasVisibleDocs = filteredDocIds.size > 0;

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

  const sortableIds = orderedDocs.map((doc) => doc.id);

  const colorAccent = COLOR_ACCENT_MAP[category.color] ?? '';

  const tableHead = (
    <thead className="bg-slate-100">
      <tr>
        <th className="w-10 px-1 py-2 text-center print:w-6">
          <span className="print:hidden">#</span>
          <span className="hidden print:inline">✓</span>
        </th>
        <th className="px-3 py-2 text-left font-bold text-slate-700">必要書類名</th>
        <th className="px-3 py-2 text-left font-bold text-slate-700 hidden md:table-cell print:table-cell">
          内容説明
        </th>
        <th className="px-3 py-2 text-left font-bold text-slate-700 hidden lg:table-cell print:table-cell">
          取得方法
        </th>
        <th className="w-16 px-2 py-2 text-center font-bold text-slate-700 print:w-12">代行</th>
        <th className="w-20 px-1 py-2 text-center font-bold text-slate-700 print:hidden">操作</th>
      </tr>
    </thead>
  );

  const getRowProps = (doc: DocumentItem | CustomDocumentItem, index: number): EditableDocumentRowProps => {
    const isCustom = isCustomDocument(doc);
    const originalCanDelegate = isCustom ? false : ((doc as DocumentItem).canDelegate ?? false);
    return {
      doc,
      categoryId: category.id,
      categoryColor: category.color,
      isCustom,
      editedValues: editedDocuments[doc.id],
      canDelegate: canDelegateOverrides[doc.id] ?? originalCanDelegate,
      specificNames: specificDocNames[doc.id] || [],
      rowIndex: index,
      docNumber: `${index + 1}`,
      onStartEdit,
      onToggleCanDelegate: () => onToggleCanDelegate(doc.id, originalCanDelegate),
      isChecked: checkedDocuments[doc.id] ?? false,
      checkedDate: checkedDates[doc.id],
      memo: documentMemos[doc.id] ?? '',
      isExcluded: excludedDocuments[doc.id] ?? false,
      isUrgent: urgentDocuments[doc.id] ?? false,
      onToggleCheck: onToggleDocumentCheck,
      onSetMemo: onSetDocumentMemo,
      onToggleExcluded: onToggleExcluded,
      onToggleUrgent: onToggleUrgent,
      onRemoveDocument,
      hideSubmittedInPrint,
      isVisible: filteredDocIds.has(doc.id),
    };
  };

  // C4: カテゴリ無効時は印刷でも非表示
  if (isDisabled) {
    return (
      <div className="print:hidden print-compact-section">
        <div
          className="flex items-center justify-between p-3 cursor-pointer rounded-lg bg-slate-100 opacity-50 no-print"
          onClick={() => onToggleExpanded(category.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpanded(category.id); }
          }}
        >
          <div className="flex items-center">
            <span className="mr-2 text-slate-400">{getIcon(category.iconName, 'w-6 h-6')}</span>
            <span className="font-bold text-lg text-slate-400 line-through">{toCircledNumber(categoryIndex)} {category.name}</span>
            <span className="ml-2 text-sm text-slate-400">({totalCount}件)</span>
            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 text-slate-500 rounded">対象外</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCategoryDisabled(category.id); }}
              className="flex items-center px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-300 text-slate-700 hover:bg-slate-400 transition-colors"
              title="カテゴリを有効にする"
            >
              <Power className="w-3.5 h-3.5 mr-1" /> 有効にする
            </button>
          </div>
        </div>
      </div>
    );
  }

  // フィルターで全ドキュメントが非表示の場合、カテゴリ自体を非表示（print時は常に表示）
  const hasActiveFilter = filterCriteria.searchQuery !== '' || filterCriteria.showOnlyUnchecked || filterCriteria.showOnlyDelegatable || filterCriteria.showOnlyUrgent || filterCriteria.hideExcluded;

  return (
    <div className={`print-compact-section ${allChecked && hideSubmittedInPrint ? 'print:hidden' : ''} ${hasActiveFilter && !hasVisibleDocs ? 'hidden print:block' : ''}`}>
      <CategoryHeader
        category={category}
        categoryIndex={categoryIndex}
        isExpanded={isExpanded}
        allChecked={allChecked}
        someChecked={someChecked}
        urgentCount={urgentCount}
        onToggleExpanded={onToggleExpanded}
        onToggleCategoryDisabled={onToggleCategoryDisabled}
        onRemoveCategory={onRemoveCategory}
        onToggleAllInCategory={onToggleAllInCategory}
      />

      {/* テーブル本体（折りたたみ時は print のみ表示） */}
      <div className={`border border-t-0 border-slate-200 rounded-b-lg overflow-hidden print:border-t print:rounded-sm ${isExpanded ? '' : 'hidden print:block'}`}>
        {(() => {
          const renderDocRows = (RowComponent: typeof SortableDocumentRow | typeof StaticDocumentRow) =>
            orderedDocs.map((doc, i) => {
              const docIsExcluded = excludedDocuments[doc.id] ?? false;
              return (
                <React.Fragment key={doc.id}>
                  <RowComponent {...getRowProps(doc, i)} />
                  {!docIsExcluded && (
                    <SpecificNamesTableRows
                      docId={doc.id}
                      categoryId={category.id}
                      docNumber={`${i + 1}`}
                      names={specificDocNames[doc.id] || []}
                      colorAccent={colorAccent}
                      isVisible={filteredDocIds.has(doc.id)}
                      hideSubmittedInPrint={hideSubmittedInPrint}
                      isChecked={checkedDocuments[doc.id] ?? false}
                      onAdd={onAddSpecificName}
                      onEdit={onEditSpecificName}
                      onRemove={onRemoveSpecificName}
                      onReorder={onReorderSpecificNames}
                    />
                  )}
                </React.Fragment>
              );
            });

          return isExpanded && isMounted ? (
            <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm print-compact-table">
                {tableHead}
                <tbody>
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {renderDocRows(SortableDocumentRow)}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          ) : (
            <table className="w-full text-sm print-compact-table">
              {tableHead}
              <tbody>{renderDocRows(StaticDocumentRow)}</tbody>
            </table>
          );
        })()}
        {/* 書類追加ボタン */}
        <button
          onClick={() => onOpenAddModal(category.id)}
          className="w-full p-2.5 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 transition-colors border-t border-slate-200 print:hidden"
        >
          <Plus className="w-4 h-4" /> 書類を追加
        </button>
      </div>
    </div>
  );
}

export const EditableCategoryTable = memo(EditableCategoryTableComponent);
