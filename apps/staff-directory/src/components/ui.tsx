import { useEffect, type ReactNode, type RefObject } from 'react';

export const btn = {
  primary:
    'rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50',
  secondary:
    'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50',
} as const;

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 disabled:bg-slate-50';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

// <dialog> の showModal() がフォーカスの閉じ込めと Escape を受け持つ。
// 閉じるのは ref.close() → onClose の一方向（キャンセルも Escape も同じ経路を通る）
export function Modal({
  title,
  aside,
  onClose,
  dialogRef,
  wide,
  children,
}: {
  title: string;
  aside?: ReactNode;
  onClose: () => void;
  dialogRef: RefObject<HTMLDialogElement | null>;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    dialogRef.current?.showModal();
  }, [dialogRef]);
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`m-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg p-0 shadow-xl`}
      aria-label={title}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {aside && <span className="text-sm text-slate-500">{aside}</span>}
        </div>
        {children}
      </div>
    </dialog>
  );
}
