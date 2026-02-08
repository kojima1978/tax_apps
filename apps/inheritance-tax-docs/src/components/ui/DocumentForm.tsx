'use client';

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

function DocumentFormComponent({ variant, initialValues, onSubmit, onCancel }: DocumentFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [howToGet, setHowToGet] = useState(initialValues?.howToGet ?? '');

  const config = VARIANT_CONFIG[variant];

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name: name.trim(), description: description.trim(), howToGet: howToGet.trim() });
    }
  };

  return (
    <div className={config.container}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">書類名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${config.ring}`}
            placeholder={config.placeholders.name}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">説明</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${config.ring}`}
            placeholder={config.placeholders.description}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">取得方法</label>
          <input
            type="text"
            value={howToGet}
            onChange={(e) => setHowToGet(e.target.value)}
            className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${config.ring}`}
            placeholder={config.placeholders.howToGet}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`px-4 py-2 text-sm text-white rounded-lg ${
              name.trim() ? config.submitBtn : 'bg-slate-300 cursor-not-allowed'
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
