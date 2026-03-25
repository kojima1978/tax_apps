interface ResetButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function ResetButton({ onClick, label = 'リセット', className = '' }: ResetButtonProps) {
  return (
    <button
      className={`no-print gov-reset-btn ${className}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
