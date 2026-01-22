import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Edit2, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { DocumentItem } from '@/types';
import { SubItemComponent } from './SubItemComponent';

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

export function SortableDocumentItem({
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
            <div className="flex items-center py-2 border-b border-dashed border-slate-100 print:py-0.5">
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
                        <span className="w-8 text-center text-sm font-bold text-emerald-600 mr-1 print:w-6 print:mr-0.5 print:text-xs">{index}.</span>
                        <label className="flex items-center flex-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={doc.checked}
                                onChange={onToggleCheck}
                                className="w-4 h-4 mr-3 accent-emerald-600 print:w-3 print:h-3 print:mr-1"
                            />
                            <span className={`whitespace-pre-line ${doc.checked ? 'line-through text-slate-400' : 'text-slate-700'} print:text-xs`}>
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
