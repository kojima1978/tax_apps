import { Loader2, Save } from 'lucide-react';

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
  className,
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
