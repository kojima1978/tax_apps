import { DndContext, DragEndEvent, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, ChevronRight, Edit2, GripVertical, Info, Plus, Trash2, X } from 'lucide-react';
import { CategoryGroup } from '@/types';
import { SortableDocumentItem } from './SortableDocumentItem';

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

export function SortableCategory({
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
