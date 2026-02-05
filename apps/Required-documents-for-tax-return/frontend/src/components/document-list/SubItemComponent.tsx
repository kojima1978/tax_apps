import { Check, Edit2, Trash2, X } from 'lucide-react';
import { SubItem } from '@/types';

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

export function SubItemComponent({
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
        <li className="flex items-center py-1.5 pl-12 print:pl-2 print:py-0.5 border-b border-dotted border-slate-100 last:border-0 bg-slate-50">
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
