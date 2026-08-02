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
  const current = STEPS.find((step) => step.id === currentStep)!;

  return (
    <nav aria-label="入力ステップ" className="mb-6 sm:mb-8">
      <div className="sm:hidden rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-emerald-700">
            ステップ {currentStep} / {STEPS.length}
          </span>
          <span className="min-w-0 truncate text-sm font-bold text-slate-800">
            {current.label}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={currentStep}
          aria-label={`全${STEPS.length}ステップ中${currentStep}ステップ目`}
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width] duration-200"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between gap-2">
          {STEPS.map((step) => {
            const isClickable = step.id <= maxReachedStep && step.id !== currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step.id === currentStep
                    ? 'bg-emerald-600 text-white'
                    : step.id < currentStep
                      ? 'bg-emerald-100 text-emerald-800 enabled:hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                } disabled:cursor-default`}
                aria-label={`${step.id}. ${step.label}${step.id === currentStep ? '（現在）' : ''}`}
                aria-current={step.id === currentStep ? 'step' : undefined}
              >
                {step.id < currentStep ? <Check size={18} aria-hidden="true" /> : step.id}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden items-center justify-center gap-2 sm:flex">
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
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              aria-current={isActive ? 'step' : undefined}
              className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white cursor-default'
                  : isCompleted
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                    : isClickable
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
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
      </div>
    </nav>
  );
}
