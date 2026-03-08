import { useState, useCallback } from 'react';
import { ToastMessage } from '@/components/Toast';

let nextId = 0;

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = ++nextId;
    setMessages((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, toast, dismiss };
}
