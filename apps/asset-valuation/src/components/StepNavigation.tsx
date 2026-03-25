import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface Props {
  onBack?: () => void;
  onNext?: () => void;
  onGoToStep1: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
}

export function StepNavigation({
  onBack,
  onNext,
  onGoToStep1,
  nextDisabled = false,
  nextLabel = '次へ',
  nextIcon,
}: Props) {
  return (
    <div className="flex justify-between">
      <div className="flex gap-2">
        <button
          onClick={onGoToStep1}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 cursor-pointer transition-colors"
        >
          <RotateCcw size={14} /> Step 1に戻る
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} /> 戻る
          </button>
        )}
      </div>
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={`flex items-center gap-1 px-6 py-2 rounded-md font-medium transition-colors ${
            nextDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
          }`}
        >
          {nextLabel} {nextIcon ?? <ChevronRight size={16} />}
        </button>
      )}
    </div>
  );
}
