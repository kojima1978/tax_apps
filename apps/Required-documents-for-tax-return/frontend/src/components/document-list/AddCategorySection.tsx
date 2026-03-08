import { CategoryGroup } from '@/types';
import { handleInlineKeyDown } from '@/utils/keyboard';
import { MissingCategoriesRestore } from './MissingCategoriesRestore';

interface AddCategorySectionProps {
  addingNewCategory: boolean;
  newCategoryName: string;
  onNewCategoryNameChange: (name: string) => void;
  onStartAdd: () => void;
  onAdd: () => void;
  onCancel: () => void;
  onRestore: (group: CategoryGroup) => void;
  documentGroups: CategoryGroup[];
  year: number;
}

export function AddCategorySection({
  addingNewCategory,
  newCategoryName,
  onNewCategoryNameChange,
  onStartAdd,
  onAdd,
  onCancel,
  onRestore,
  documentGroups,
  year,
}: AddCategorySectionProps) {
  if (!addingNewCategory) {
    return (
      <button
        onClick={onStartAdd}
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
      >
        + 新しいカテゴリを追加
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-fade-in">
      <h3 className="font-bold text-slate-700 mb-3">新しいカテゴリを追加</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => onNewCategoryNameChange(e.target.value)}
          placeholder="カテゴリ名（例: 給与所得）"
          className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
          onKeyDown={handleInlineKeyDown(onAdd, onCancel)}
        />
        <button
          onClick={onAdd}
          disabled={!newCategoryName.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 font-bold"
        >
          追加
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
        >
          キャンセル
        </button>
      </div>

      <MissingCategoriesRestore
        documentGroups={documentGroups}
        year={year}
        onRestore={onRestore}
      />
    </div>
  );
}
