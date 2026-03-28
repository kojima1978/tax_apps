import { Plus } from 'lucide-react';
import { InlineAddInput } from './EditableInput';

type AddCategoryFormProps = {
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  onAdd: () => void;
  onCancel: () => void;
};

export const AddCategoryForm = ({
  isAdding,
  setIsAdding,
  name,
  setName,
  onAdd,
  onCancel,
}: AddCategoryFormProps) => {
  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center justify-center px-6 py-4 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 transition-all font-medium hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm"
        aria-label="新しいカテゴリを追加"
      >
        <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
        新しいカテゴリを追加
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden p-4">
      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">新しいカテゴリを追加</h3>
      <div className="flex items-center gap-2">
        <InlineAddInput
          value={name}
          onChange={setName}
          onConfirm={onAdd}
          onCancel={onCancel}
          placeholder="カテゴリ名を入力..."
          ariaLabel="新しいカテゴリ名を入力"
          inputClass="flex-grow px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>
    </div>
  );
};
