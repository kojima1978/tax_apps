// 画面上部の通知（Django の messages に当たるもの）。成功は数秒で消え、失敗は閉じるまで残す

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type Kind = 'success' | 'error';
type Item = { id: number; kind: Kind; text: string };
type Api = { success: (text: string) => void; error: (text: string) => void };

const NoticeContext = createContext<Api | null>(null);

export function useNotice(): Api {
  const api = useContext(NoticeContext);
  if (!api) throw new Error('NoticeProvider の外で useNotice が呼ばれました');
  return api;
}

const SUCCESS_MS = 4000;

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
      if (kind === 'success') setTimeout(() => dismiss(id), SUCCESS_MS);
    },
    [dismiss],
  );
  const api = useMemo<Api>(() => ({ success: (t) => push('success', t), error: (t) => push('error', t) }), [push]);

  return (
    <NoticeContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex w-full max-w-xl items-start gap-2 rounded-md border px-4 py-2.5 text-sm shadow ${
              n.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            {n.kind === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
            <span className="flex-1 whitespace-pre-line">{n.text}</span>
            <button type="button" onClick={() => dismiss(n.id)} aria-label="通知を閉じる" className="shrink-0 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}
