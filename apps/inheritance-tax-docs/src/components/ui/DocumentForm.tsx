import { memo, useState } from 'react';
import type { DocChanges } from '../../constants/documents';

const VARIANT_CONFIG = {
  add: {
    container: 'p-4 bg-emerald-50 border-t border-emerald-200',
    ring: 'focus:ring-emerald-500',
    submitBtn: 'bg-emerald-600 hover:bg-emerald-700',
    submitText: '追加',
    placeholders: {
      name: '例：その他必要書類',
      description: '例：担当者から指示があった書類',
      howToGet: '例：お手元にあるものをご用意ください',
    },
  },
  edit: {
    container: 'p-4 bg-blue-50 border border-blue-200 rounded-lg',
    ring: 'focus:ring-blue-500',
    submitBtn: 'bg-blue-600 hover:bg-blue-700',
    submitText: '保存',
    placeholders: {
      name: undefined,
      description: undefined,
      howToGet: undefined,
    },
  },
} as const;

interface DocumentFormProps {
  variant: 'add' | 'edit';
  initialValues?: DocChanges;
  onSubmit: (values: { name: string; description: string; howToGet: string }) => void;
  onCancel: () => void;
}

const FORM_FIELDS = [
  { key: 'name' as const, label: '書類名', required: true, autoFocus: true },
  { key: 'description' as const, label: '説明', required: false, autoFocus: false },
  { key: 'howToGet' as const, label: '取得方法', required: false, autoFocus: false },
] as const;

function DocumentFormComponent({ variant, initialValues, onSubmit, onCancel }: DocumentFormProps) {
  const [values, setValues] = useState(() => ({
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
    howToGet: initialValues?.howToGet ?? '',
  }));

  const config = VARIANT_CONFIG[variant];
  const inputClass = `w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${config.ring}`;

  const handleSubmit = () => {
    if (values.name.trim()) {
      onSubmit({ name: values.name.trim(), description: values.description.trim(), howToGet: values.howToGet.trim() });
    }
  };

  return (
    <div className={config.container}>
      <div className="space-y-3">
        {FORM_FIELDS.map(({ key, label, required, autoFocus }) => (
          <div key={key}>
            <label className="block text-xs text-slate-600 mb-1">
              {label}{required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={values[key]}
              onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
              className={inputClass}
              placeholder={config.placeholders[key]}
              autoFocus={autoFocus}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!values.name.trim()}
            className={`px-4 py-2 text-sm text-white rounded-lg ${
              values.name.trim() ? config.submitBtn : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {config.submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

export const DocumentForm = memo(DocumentFormComponent);
