import { Loader2, Save } from 'lucide-react';

const DEFAULT_CLASS =
  'w-full py-3.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center';

interface SubmitButtonProps {
  isSubmitting: boolean;
  disabled?: boolean;
  submitLabel: string;
  submittingLabel: string;
  className?: string;
}

export default function SubmitButton({
  isSubmitting,
  disabled,
  submitLabel,
  submittingLabel,
  className = DEFAULT_CLASS,
}: SubmitButtonProps) {
  return (
    <button type="submit" disabled={disabled} className={className}>
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          {submittingLabel}
        </>
      ) : (
        <>
          <Save className="w-5 h-5 mr-2" />
          {submitLabel}
        </>
      )}
    </button>
  );
}
