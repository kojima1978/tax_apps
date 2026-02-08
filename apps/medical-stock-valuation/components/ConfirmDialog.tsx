'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-lg p-6 min-w-[360px] max-w-[90%] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mt-0 mb-4 text-lg font-bold">{title}</h3>
        <p className="mb-6 whitespace-pre-line text-gray-700">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 cursor-pointer transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white border border-red-600 rounded-lg hover:bg-red-700 cursor-pointer transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
