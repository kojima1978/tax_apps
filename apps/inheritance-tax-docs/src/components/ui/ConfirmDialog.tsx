interface ConfirmDialogProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  children: React.ReactNode;
}

export function ConfirmDialog({ title, onConfirm, onCancel, confirmLabel = '削除', children }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      >
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        {children}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
