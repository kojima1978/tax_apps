import { Calculator } from 'lucide-react';

interface CalcButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export function CalcButton({ onClick, disabled }: CalcButtonProps) {
  return (
    <>
      <div className="mt-6 flex justify-center">
        <button
          onClick={onClick}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-light)] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
        >
          <Calculator size={20} />
          計算する
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">Ctrl + Enter でも計算できます</p>
    </>
  );
}
