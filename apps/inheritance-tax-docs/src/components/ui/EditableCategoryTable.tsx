import { memo, useMemo, useState, useEffect, useId } from 'react';
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
import { ChevronDown, Plus, CheckSquare, Square, Trash2 } from 'lucide-react';
import type { CategoryData, DocumentItem, CustomDocumentItem, DocChanges } from '../../constants/documents';
import { isCustomDocument, toCircledNumber } from '../../utils/helpers';
import { getIcon } from '../../utils/iconMap';
import { SortableDocumentRow, StaticDocumentRow, type EditableDocumentRowProps } from './EditableDocumentRow';

interface EditableCategoryTableProps {
  category: CategoryData;
  categoryIndex: number;
  isExpanded: boolean;
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
  checkedDocuments: Record<string, boolean>;
  onToggleDocumentCheck: (docId: string) => void;
  onToggleAllInCategory: (categoryId: string, checked: boolean) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string, name: string) => void;
  hideSubmittedInPrint: boolean;
  onOpenAddModal: (categoryId: string) => void;
  onStartEdit: (docId: string) => void;
}

function EditableCategoryTableComponent({
  category,
  categoryIndex,
  isExpanded,
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
  checkedDocuments,
  onToggleDocumentCheck,
  onToggleAllInCategory,
  onRemoveDocument,
  onRemoveCategory,
  hideSubmittedInPrint,
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
  const allChecked = orderedDocs.length > 0 && checkedCount === orderedDocs.length;
  const someChecked = checkedCount > 0 && !allChecked;

  const totalCount = orderedDocs.length;

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

  const tableHead = (
    <thead className="bg-slate-100">
      <tr>
        <th className="w-10 px-1 py-2 text-center print:w-6">
          <span className="print:hidden">≡</span>
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
      isCustom,
      editedValues: editedDocuments[doc.id],
      canDelegate: canDelegateOverrides[doc.id] ?? originalCanDelegate,
      specificNames: specificDocNames[doc.id] || [],
      rowIndex: index,
      docNumber: `${index + 1}`,
      onStartEdit,
      onToggleCanDelegate: () => onToggleCanDelegate(doc.id, originalCanDelegate),
      onAddSpecificName,
      onEditSpecificName,
      onRemoveSpecificName,
      isChecked: checkedDocuments[doc.id] ?? false,
      onToggleCheck: onToggleDocumentCheck,
      onRemoveDocument,
      hideSubmittedInPrint,
    };
  };

  return (
    <div className={`print-compact-section ${allChecked && hideSubmittedInPrint ? 'print:hidden' : ''}`}>
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-3 cursor-pointer rounded-t-lg ${category.bgColor} hover:opacity-90 print:cursor-default print:p-1`}
        onClick={() => onToggleExpanded(category.id)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpanded(category.id);
          }
        }}
      >
        <div className="flex items-center">
          <span className={`mr-2 print:mr-1 ${category.color}`}>{getIcon(category.iconName)}</span>
          <span className={`font-bold text-lg print:text-sm ${category.color}`}>{toCircledNumber(categoryIndex)} {category.name}</span>
          <span className="ml-2 text-sm text-slate-500 print:text-sm print:ml-1">
            ({totalCount}件)
          </span>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCategory(category.id, category.name);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors"
            title="カテゴリを削除"
            aria-label="カテゴリを削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAllInCategory(category.id, !allChecked);
            }}
            className={`flex items-center px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              allChecked
                ? 'bg-emerald-600 text-white'
                : someChecked
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            title={allChecked ? '全済みを解除' : '全て提出済みにする'}
          >
            {allChecked
              ? <CheckSquare className="w-3.5 h-3.5 mr-1" />
              : <Square className="w-3.5 h-3.5 mr-1" />
            }
            全済み
          </button>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* テーブル本体（折りたたみ時は print のみ表示） */}
      <div className={`border border-t-0 border-slate-200 rounded-b-lg overflow-hidden print:border-t print:rounded-sm ${isExpanded ? '' : 'hidden print:block'}`}>
        {isExpanded && isMounted ? (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm print-compact-table">
              {tableHead}
              <tbody>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {orderedDocs.map((doc, i) => (
                    <SortableDocumentRow key={doc.id} {...getRowProps(doc, i)} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        ) : (
          <table className="w-full text-sm print-compact-table">
            {tableHead}
            <tbody>
              {orderedDocs.map((doc, i) => (
                <StaticDocumentRow key={doc.id} {...getRowProps(doc, i)} />
              ))}
            </tbody>
          </table>
        )}
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
