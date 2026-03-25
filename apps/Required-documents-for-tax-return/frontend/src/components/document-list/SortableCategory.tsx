import { useMemo } from 'react';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, ChevronRight, Edit2, GripVertical, Info, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { CategoryGroup } from '@/types';
import { handleInlineKeyDown } from '@/utils/keyboard';
import { SortableDocumentItem, SubItemHandlers } from './SortableDocumentItem';

export interface CategoryEditHandlers {
    editingCategoryId: string | null;
    editCategoryName: string;
    onEditCategoryNameChange: (name: string) => void;
    onSaveEditCategory: () => void;
    onCancelEditCategory: () => void;
    onStartEditCategory: () => void;
    onDeleteCategory: () => void;
}

export interface DocHandlers {
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
    onDocumentsReorder: (activeId: string, overId: string) => void;
}

interface SortableCategoryProps {
    group: CategoryGroup;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleCheckAll: () => void;
    searchQuery?: string;
    categoryHandlers: CategoryEditHandlers;
    docHandlers: DocHandlers;
    subItemHandlers: SubItemHandlers;
}

export function SortableCategory({
    group,
    isExpanded,
    onToggleExpand,
    onToggleCheckAll,
    searchQuery = '',
    categoryHandlers,
    docHandlers,
    subItemHandlers,
}: SortableCategoryProps) {
    const {
        editingCategoryId, editCategoryName, onEditCategoryNameChange,
        onSaveEditCategory, onCancelEditCategory, onStartEditCategory, onDeleteCategory,
    } = categoryHandlers;
    const {
        editingDocId, editText, onEditTextChange,
        onSaveEditDocument, onCancelEditDocument, onStartEditDocument,
        onToggleDocumentCheck, onDeleteDocument,
        addingToGroupId, newDocText, onNewDocTextChange,
        onAddDocument, onStartAddDocument, onCancelAddDocument,
        onDocumentsReorder,
    } = docHandlers;
    const deleteDialog = useConfirmDialog();

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
            onDocumentsReorder(active.id as string, over.id as string);
        }
    };

    // 書類とサブアイテムの合計チェック数を計算
    const { totalItems, checkedItems, allChecked } = useMemo(() => {
        let total = 0;
        let checked = 0;
        group.documents.forEach((doc) => {
            total += 1 + (doc.subItems?.length || 0);
            checked += (doc.checked ? 1 : 0) + (doc.subItems?.filter((s) => s.checked).length || 0);
        });
        return {
            totalItems: total,
            checkedItems: checked,
            allChecked: total > 0 && checked === total,
        };
    }, [group.documents]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="border border-slate-200 rounded-lg overflow-hidden bg-white"
        >
            {/* カテゴリヘッダー */}
            <div className="bg-emerald-50 border-b border-slate-200">
                <div className="flex items-center justify-between px-4 py-3 print:px-2 print:py-1">
                    <div className="flex items-center flex-1">
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-2.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mr-1 no-print"
                            aria-label={`${group.category}を並べ替え`}
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
                                    onKeyDown={handleInlineKeyDown(onSaveEditCategory, onCancelEditCategory)}
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
                            <h3 className="font-bold text-lg text-slate-800 print:text-sm">{group.category}</h3>
                        )}
                    </div>
                    <div className="flex items-center space-x-2 no-print">
                        {/* 一括チェック */}
                        <button
                            onClick={onToggleCheckAll}
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                                allChecked
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                            }`}
                            title={allChecked ? 'すべてのチェックを外す' : 'すべてチェック'}
                        >
                            {allChecked ? '✓ 全解除' : '全チェック'}
                        </button>
                        <span className="text-sm text-slate-500">
                            {checkedItems}/{totalItems}
                        </span>
                        <button
                            onClick={onStartEditCategory}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="カテゴリ名を編集"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => deleteDialog.open()}
                            className="p-2.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="カテゴリを削除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 書類リスト */}
            {isExpanded && (
                <div className="p-4 print:p-1">
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
                                        subItemHandlers={subItemHandlers}
                                        searchQuery={searchQuery}
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
                                onKeyDown={handleInlineKeyDown(() => onAddDocument(group.id), onCancelAddDocument)}
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

            <ConfirmDialog
                open={deleteDialog.isOpen}
                title="カテゴリの削除"
                message={`「${group.category}」を削除してもよろしいですか？\nカテゴリ内の書類もすべて削除されます。`}
                confirmLabel="削除"
                variant="danger"
                onConfirm={() => {
                    deleteDialog.close();
                    onDeleteCategory();
                }}
                onCancel={deleteDialog.close}
            />
        </div>
    );
}
