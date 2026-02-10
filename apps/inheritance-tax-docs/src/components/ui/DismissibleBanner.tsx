import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface DismissibleBannerProps {
  message: string | null;
  onDismiss: () => void;
  variant: 'error' | 'success';
}

export function DismissibleBanner({ message, onDismiss, variant }: DismissibleBannerProps) {
  if (!message) return null;
  const isError = variant === 'error';
  return (
    <div className={`mx-6 mt-4 p-3 border rounded-lg text-sm flex items-center justify-between no-print ${
      isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
      <div className="flex items-center">
        {isError
          ? <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          : <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />}
        {message}
      </div>
      <button onClick={onDismiss} className={isError ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
