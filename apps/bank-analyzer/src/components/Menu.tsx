// 「…」ボタンから開く小さなメニュー。外側を押すか Escape で閉じる

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

export function Menu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
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
      <button type="button" className="btn btn-secondary btn-sm" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
