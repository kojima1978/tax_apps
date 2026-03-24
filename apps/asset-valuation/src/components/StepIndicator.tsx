import { STEPS } from '@/types';
import type { StepId } from '@/types';
import { Check } from 'lucide-react';

interface Props {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
  maxReachedStep: StepId;
}

export function StepIndicator({
  currentStep,
  onStepClick,
  maxReachedStep,
}: Props) {
  return (
    <nav className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isClickable = step.id <= maxReachedStep;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={`w-8 h-0.5 ${
                  step.id <= currentStep ? 'bg-green-600' : 'bg-gray-300'
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-green-600 text-white'
                  : isCompleted
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : isClickable
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCompleted ? (
                <Check size={16} />
              ) : (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isActive
                      ? 'bg-white text-green-600'
                      : 'bg-gray-400 text-white'
                  }`}
                >
                  {step.id}
                </span>
              )}
              {step.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
