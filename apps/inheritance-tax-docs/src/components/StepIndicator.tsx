'use client';

import { memo } from 'react';
import { Pencil, Eye } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2;
  onStepChange?: (step: 1 | 2) => void;
  canGoToPreview?: boolean;
}

function StepIndicatorComponent({ currentStep, onStepChange, canGoToPreview = true }: StepIndicatorProps) {
  const handleStepClick = (step: 1 | 2) => {
    if (step === currentStep) return;
    if (step === 2 && !canGoToPreview) return;
    onStepChange?.(step);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4 bg-slate-100 print:hidden">
      {/* Step 1: 書類選択・編集 */}
      <button
        onClick={() => handleStepClick(1)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
          currentStep === 1
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
            currentStep === 1
              ? 'bg-white text-blue-600'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          1
        </div>
        <Pencil className="w-4 h-4" />
        <span className="font-medium text-sm">書類選択・編集</span>
      </button>

      {/* 矢印 */}
      <div className="flex items-center px-2">
        <svg
          className="w-6 h-6 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>

      {/* Step 2: プレビュー・出力 */}
      <button
        onClick={() => handleStepClick(2)}
        disabled={!canGoToPreview && currentStep !== 2}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
          currentStep === 2
            ? 'bg-emerald-600 text-white shadow-md'
            : canGoToPreview
              ? 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
              : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
            currentStep === 2
              ? 'bg-white text-emerald-600'
              : canGoToPreview
                ? 'bg-slate-100 text-slate-500'
                : 'bg-slate-100 text-slate-300'
          }`}
        >
          2
        </div>
        <Eye className="w-4 h-4" />
        <span className="font-medium text-sm">プレビュー・出力</span>
      </button>
    </div>
  );
}

export const StepIndicator = memo(StepIndicatorComponent);
