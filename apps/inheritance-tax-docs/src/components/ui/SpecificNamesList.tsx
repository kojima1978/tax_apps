'use client';

import { memo, useState } from 'react';
import { Pencil, X, Plus } from 'lucide-react';

interface SpecificNamesListProps {
  docId: string;
  names: string[];
  onAdd: (docId: string, name: string) => void;
  onEdit: (docId: string, index: number, name: string) => void;
  onRemove: (docId: string, index: number) => void;
}

const INPUT_CLASS = 'flex-1 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400';

function handleKeyDown(
  e: React.KeyboardEvent,
  value: string,
  onSubmit: () => void,
  onCancel: () => void,
) {
  if (e.key === 'Enter' && value.trim()) {
    onSubmit();
  } else if (e.key === 'Escape') {
    onCancel();
  }
}

function SpecificNamesListComponent({ docId, names, onAdd, onEdit, onRemove }: SpecificNamesListProps) {
  const [addingName, setAddingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const cancelAdd = () => { setNewName(''); setAddingName(false); };
  const cancelEdit = () => { setEditingIndex(null); setEditingValue(''); };

  return (
    <div className="mt-1 print:mt-0">
      {names.length > 0 && (
        <ul className="space-y-0.5">
          {names.map((name, i) => (
            <li key={i} className="flex items-center gap-1 text-xs text-slate-600">
              {editingIndex === i ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(
                    e,
                    editingValue,
                    () => { onEdit(docId, i, editingValue.trim()); cancelEdit(); },
                    cancelEdit,
                  )}
                  autoFocus
                  className={INPUT_CLASS}
                />
              ) : (
                <>
                  <span className="text-slate-400 mr-0.5">・</span>
                  <span className="flex-1">{name}</span>
                </>
              )}
              {editingIndex !== i && (
                <span className="print:hidden flex items-center gap-0.5">
                  <button
                    onClick={() => { setEditingIndex(i); setEditingValue(name); }}
                    className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                    title="編集"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(docId, i)}
                    className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {addingName ? (
        <div className="flex items-center gap-1 mt-0.5 print:hidden">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(
              e,
              newName,
              () => { onAdd(docId, newName.trim()); cancelAdd(); },
              cancelAdd,
            )}
            placeholder="例：三菱UFJ銀行 普通口座"
            autoFocus
            className={INPUT_CLASS}
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingName(true)}
          className="flex items-center gap-0.5 mt-0.5 text-xs text-blue-500 hover:text-blue-700 transition-colors print:hidden"
        >
          <Plus className="w-3 h-3" />
          具体名追加
        </button>
      )}
    </div>
  );
}

export const SpecificNamesList = memo(SpecificNamesListComponent);
