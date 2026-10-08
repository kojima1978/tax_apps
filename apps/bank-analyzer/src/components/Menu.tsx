// 「…」ボタンから開く小さなメニュー。外側を押すか Escape で閉じる。
// trigger を渡すとボタンの中身をそれに替える（「書き出し ▼」のような文字のボタン）

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

type Props = { label: string; children: (close: () => void) => ReactNode; trigger?: ReactNode; buttonClassName?: string };

export function Menu({ label, children, trigger, buttonClassName = 'btn btn-secondary btn-sm' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={buttonClassName}
        aria-label={trigger ? undefined : label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger ?? <MoreVertical size={16} />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
