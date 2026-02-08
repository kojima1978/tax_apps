'use client';

import { Plus } from 'lucide-react';
import { InlineAddInput } from './EditableInput';

type AddCategoryFormProps = {
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  isSpecial: boolean;
  setIsSpecial: (value: boolean) => void;
  onAdd: () => void;
  onCancel: () => void;
};

export const AddCategoryForm = ({
  isAdding,
  setIsAdding,
  name,
  setName,
  isSpecial,
  setIsSpecial,
  onAdd,
  onCancel,
}: AddCategoryFormProps) => {
  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center justify-center px-6 py-4 text-emerald-600 hover:bg-emerald-50 rounded-xl border-2 border-dashed border-emerald-300 transition-colors font-medium"
        aria-label="新しいカテゴリを追加"
      >
        <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
        新しいカテゴリを追加
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4">
      <h3 className="font-bold text-slate-800 mb-3">新しいカテゴリを追加</h3>
      <div className="space-y-3">
        <InlineAddInput
          value={name}
          onChange={setName}
          onConfirm={onAdd}
          onCancel={onCancel}
          placeholder="カテゴリ名を入力..."
          ariaLabel="新しいカテゴリ名を入力"
          inputClass="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isSpecial}
            onChange={(e) => setIsSpecial(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
          />
          <span className={isSpecial ? 'text-purple-600 font-medium' : ''}>
            特例カテゴリとして追加
          </span>
        </label>
      </div>
    </div>
  );
};
