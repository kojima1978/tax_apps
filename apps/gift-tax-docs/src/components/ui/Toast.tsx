import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '@/hooks/useToast';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-500',
  },
} as const;

type ToastContainerProps = {
  toasts: ToastType[];
  removeToast: (id: number) => void;
};

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="no-print fixed bottom-4 right-4 z-[100] flex flex-col gap-2" aria-live="polite">
      {toasts.map(toast => {
        const config = TOAST_CONFIG[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg animate-toast-in ${config.bg}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} aria-hidden="true" />
            <span className={`text-sm font-medium ${config.text}`}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="通知を閉じる"
            >
              <X className={`w-4 h-4 ${config.text}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
