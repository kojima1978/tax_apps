import { useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // アンマウント時にタイマーをクリア
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, 3000);
    timersRef.current.set(id, timer);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  return { toasts, addToast, removeToast };
};
