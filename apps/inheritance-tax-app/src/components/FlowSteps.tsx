import React from 'react';
import { formatCurrency, formatDeltaArrow } from '../utils';

export interface FlowStep {
  title: string;
  description: string;
  currentValue: number;
  proposedValue: number;
  sign?: '+' | '−' | '';
  displayPrefix?: string;
}

interface FlowStepsProps {
  steps: FlowStep[];
}

export const FlowSteps: React.FC<FlowStepsProps> = ({ steps }) => {
  const lastStep = steps[steps.length - 1];
  const diff = lastStep ? lastStep.proposedValue - lastStep.currentValue : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">財産フロー</h3>
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const valueDiff = step.proposedValue - step.currentValue;
          const showArrow = !isLast;

          return (
            <React.Fragment key={step.title}>
              <div className={`flex gap-4 ${isLast ? 'mt-2' : ''}`}>
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isLast ? 'bg-green-700 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                <div className={`flex-1 min-w-0 ${isLast ? 'bg-green-50 rounded-lg p-3 border-2 border-green-300' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800">{step.sign ? `${step.sign} ` : ''}{step.title}</h4>
                    <span className="text-xs text-gray-400">{step.description}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block">現状</span>
                      <span className="font-medium text-gray-700">
                        {step.displayPrefix && step.currentValue > 0 ? `${step.displayPrefix}${formatCurrency(step.currentValue)}` : formatCurrency(step.currentValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">提案</span>
                      <span className="font-medium text-gray-700">
                        {step.displayPrefix && step.proposedValue > 0 ? `${step.displayPrefix}${formatCurrency(step.proposedValue)}` : formatCurrency(step.proposedValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">差額</span>
                      {valueDiff !== 0 ? (
                        <span className={`font-medium ${
                          isLast
                            ? (valueDiff > 0 ? 'text-green-700' : 'text-red-600')
                            : 'text-gray-600'
                        }`}>
                          {step.displayPrefix ? `${step.displayPrefix}${formatCurrency(Math.abs(valueDiff))}` : `${valueDiff > 0 ? '+' : ''}${formatCurrency(valueDiff)}`}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {showArrow && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    <div className="w-0.5 h-4 bg-green-300" />
                  </div>
                  <div />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className={`mt-4 text-center rounded-lg p-3 ${diff > 0 ? 'bg-green-100' : diff < 0 ? 'bg-red-50' : 'bg-gray-100'}`}>
        <span className="text-sm text-gray-600">提案による手取り変動: </span>
        <span className={`text-lg font-bold ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {formatDeltaArrow(diff)}
        </span>
      </div>
    </div>
  );
};
