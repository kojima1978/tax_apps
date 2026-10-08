// モーダル。<dialog> の showModal に任せる（フォーカスの閉じ込め・Escape・背景の操作不可がブラウザ標準で付く）

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

export function Dialog({ open, onClose, title, children, footer, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // React の autoFocus は showModal より前に効いて捨てられ、showModal は先頭の「閉じる」へ
      // フォーカスを置く。開いた直後に入力欄へ置き直す（data-autofocus があればそれを優先）
      el.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), select, textarea')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // 背景（dialog 自身）を押したら閉じる。中身を押したときは target が子要素になる
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${WIDTH[size]} rounded-lg bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="閉じる">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
};

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = '実行する', danger, busy }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} disabled={busy}>
            {busy ? '処理中…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed">{children}</div>
    </Dialog>
  );
}
