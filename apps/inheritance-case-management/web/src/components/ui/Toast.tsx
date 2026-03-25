'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const TOAST_STYLES: Record<ToastType, { container: string; icon: ReactNode }> = {
  success: {
    container: 'bg-green-50 border-green-300 text-green-800',
    icon: <Check className="w-5 h-5 text-green-500" />,
  },
  error: {
    container: 'bg-red-50 border-red-300 text-red-800',
    icon: <X className="w-5 h-5 text-red-500" />,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-300 text-blue-800',
    icon: <Info className="w-5 h-5 text-blue-500" />,
  },
};

const TOAST_DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 8000,
  warning: 5000,
  info: 4000,
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const style = TOAST_STYLES[toast.type];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${style.container} animate-slide-in`}>
      {style.icon}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="通知を閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), TOAST_DURATION[type]);
  }, [removeToast]);

  const value = useMemo<ToastContextType>(() => ({
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    warning: (message) => addToast(message, 'warning'),
    info: (message) => addToast(message, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
