import { memo, useState } from 'react';

// ─── フォームフィールド定義 ───

const FORM_FIELDS = [
  { key: 'name' as const, label: '書類名', required: true, autoFocus: true, placeholder: '例：その他必要書類' },
  { key: 'description' as const, label: '説明', required: false, autoFocus: false, placeholder: '例：担当者から指示があった書類' },
  { key: 'howToGet' as const, label: '取得方法', required: false, autoFocus: false, placeholder: '例：お手元にあるものをご用意ください' },
] as const;

// ─── Props ───

type DocumentFormModalProps = {
  mode: 'add' | 'edit';
  initialValues?: { name?: string; description?: string; howToGet?: string };
  onSave: (values: { name: string; description: string; howToGet: string }) => void;
  onClose: () => void;
};

// ─── コンポーネント ───

const DocumentFormModalComponent = ({ mode, initialValues, onSave, onClose }: DocumentFormModalProps) => {
  const [values, setValues] = useState(() => ({
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
    howToGet: initialValues?.howToGet ?? '',
  }));

  const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-slate-200';

  const handleSubmit = () => {
    if (values.name.trim()) {
      onSave({
        name: values.name.trim(),
        description: values.description.trim(),
        howToGet: values.howToGet.trim(),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-form-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 id="document-form-modal-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {mode === 'add' ? '書類を追加' : '書類を編集'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {FORM_FIELDS.map(({ key, label, required, autoFocus, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                {label}{required && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={values[key]}
                onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                className={inputClass}
                placeholder={mode === 'add' ? placeholder : undefined}
                autoFocus={autoFocus}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={!values.name.trim()}
              className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                values.name.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
              }`}
            >
              {mode === 'add' ? '追加' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentFormModal = memo(DocumentFormModalComponent);
