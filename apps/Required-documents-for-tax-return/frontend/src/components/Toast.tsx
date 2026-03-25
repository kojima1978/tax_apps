import { useEffect } from 'react';
import { Check, X, AlertTriangle, Info, Undo2 } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}

const TOAST_ICONS = {
  success: { icon: Check, bg: 'bg-emerald-600', ring: 'ring-emerald-200' },
  error: { icon: X, bg: 'bg-red-600', ring: 'ring-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500', ring: 'ring-amber-200' },
  info: { icon: Info, bg: 'bg-blue-500', ring: 'ring-blue-200' },
} as const;

const AUTO_DISMISS_MS: Record<ToastMessage['type'], number> = {
  success: 3000,
  error: 5000,
  warning: 5000,
  info: 4000,
};

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const { icon: Icon, bg, ring } = TOAST_ICONS[message.type];
  const dismissMs = message.action ? 8000 : AUTO_DISMISS_MS[message.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, dismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, dismissMs]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-slate-200 ring-2 ${ring} animate-slide-in-right min-w-[280px]`}
      role="alert"
    >
      <div className={`flex-shrink-0 w-6 h-6 ${bg} text-white rounded-full flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm text-slate-700 font-medium flex-1">{message.text}</span>
      {message.action && (
        <button
          onClick={() => {
            message.action!.onClick();
            onDismiss();
          }}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
        >
          <Undo2 className="w-3 h-3" />
          {message.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded"
        aria-label="閉じる"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ messages, onDismiss }: ToastProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print" aria-live="polite">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={() => onDismiss(msg.id)} />
      ))}
    </div>
  );
}
