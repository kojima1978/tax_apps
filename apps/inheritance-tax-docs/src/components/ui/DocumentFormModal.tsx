'use client';

import { useCallback } from 'react';
import type { DocChanges } from '../../constants/documents';
import { DocumentForm } from './DocumentForm';

interface DocumentFormModalProps {
  isOpen: boolean;
  variant: 'add' | 'edit';
  initialValues?: DocChanges;
  onSubmit: (values: { name: string; description: string; howToGet: string }) => void;
  onClose: () => void;
}

export function DocumentFormModal({ isOpen, variant, initialValues, onSubmit, onClose }: DocumentFormModalProps) {
  const handleOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-form-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 id="document-form-modal-title" className="text-lg font-bold text-slate-800">
            {variant === 'add' ? '書類を追加' : '書類を編集'}
          </h3>
        </div>
        <DocumentForm
          variant={variant}
          initialValues={initialValues}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
