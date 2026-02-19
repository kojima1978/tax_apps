import { memo, useState } from 'react';
import { Pencil, Plus, Check, X, Trash2 } from 'lucide-react';

interface SpecificNamesListProps {
  docId: string;
  names: string[];
  onAdd: (docId: string, name: string) => void;
  onEdit: (docId: string, index: number, name: string) => void;
  onRemove: (docId: string, index: number) => void;
}

const INPUT_CLASS = 'flex-1 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400';

/** 確定/キャンセルボタンペア（編集・追加モード共通） */
function InlineActions({ onSubmit, onCancel, submitLabel }: { onSubmit: () => void; onCancel: () => void; submitLabel: string }) {
  return (
    <>
      <button onClick={onSubmit} className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors" title={submitLabel} aria-label={submitLabel}>
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-0.5 text-slate-400 hover:text-red-500 transition-colors" title="キャンセル" aria-label="キャンセル">
        <X className="w-3.5 h-3.5" />
      </button>
    </>
  );
}

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

  const closeAdd = () => { setNewName(''); setAddingName(false); };
  const cancelEdit = () => { setEditingIndex(null); setEditingValue(''); };

  const submitAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAdd(docId, trimmed);
      closeAdd();
    }
  };

  const submitEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      onEdit(docId, editingIndex, editingValue.trim());
      cancelEdit();
    }
  };

  return (
    <div className="mt-1 print:mt-0">
      {names.length > 0 && (
        <ul className="space-y-0.5">
          {names.map((name, i) => (
              <li key={i} className="flex items-center gap-1 text-xs text-slate-600">
                {editingIndex === i ? (
                  <>
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, editingValue, submitEdit, cancelEdit)}
                      autoFocus
                      className={INPUT_CLASS}
                    />
                    <span className="flex items-center gap-0.5">
                      <InlineActions onSubmit={submitEdit} onCancel={cancelEdit} submitLabel="保存" />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400 mr-0.5 font-mono text-[10px]">({i + 1})</span>
                    <span
                      className="flex-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors print:cursor-default print:hover:text-slate-600 print:no-underline"
                      onClick={() => { setEditingIndex(i); setEditingValue(name); }}
                      title="クリックで編集"
                    >
                      {name}
                    </span>
                    <span className="print:hidden flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditingIndex(i); setEditingValue(name); }}
                        className="p-0.5 text-slate-400 hover:text-blue-500 transition-colors"
                        title="編集"
                        aria-label="編集"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemove(docId, i)}
                        className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="削除"
                        aria-label="削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  </>
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
            onKeyDown={(e) => handleKeyDown(e, newName, submitAdd, closeAdd)}
            placeholder="Enter で登録、Escape でキャンセル"
            autoFocus
            className={INPUT_CLASS}
          />
          <InlineActions onSubmit={submitAdd} onCancel={closeAdd} submitLabel="登録" />
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
