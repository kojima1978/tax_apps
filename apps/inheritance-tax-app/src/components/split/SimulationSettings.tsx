import React from 'react';
import Settings from 'lucide-react/icons/settings';
import type { HeirAcquisition } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { CARD, INPUT_FOCUS } from '../tableStyles';

interface SimulationSettingsProps {
  acquisitions: HeirAcquisition[];
  onChange: (acquisitions: HeirAcquisition[]) => void;
  rowCount: number;
  onRowCountChange: (count: number) => void;
}

export const SimulationSettings: React.FC<SimulationSettingsProps> = ({
  acquisitions,
  onChange,
  rowCount,
  onRowCountChange,
}) => {
  const handleStepChange = (index: number, value: number) => {
    const next = acquisitions.map((h, i) => i === index ? { ...h, step: value } : h);
    onChange(next);
  };

  const handleAutoAdjustChange = (index: number) => {
    const next = acquisitions.map((h, i) => ({
      ...h,
      isAutoAdjust: i === index,
      step: i === index ? 0 : h.step,
    }));
    onChange(next);
  };

  return (
    <div className={CARD}>
      <SectionHeader icon={Settings} title="シミュレーション設定" />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            各相続人の増減額/行（万円）
          </label>
          <div className="space-y-2">
            {acquisitions.map((heir, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20 flex-shrink-0">
                  {heir.label}
                </span>
                {heir.isAutoAdjust ? (
                  <div className="flex-1 px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700 text-center font-medium">
                    自動調整
                  </div>
                ) : (
                  <input
                    type="number"
                    value={heir.step || ''}
                    onChange={e => handleStepChange(i, Number(e.target.value) || 0)}
                    onWheel={e => e.currentTarget.blur()}
                    step={100}
                    inputMode="numeric"
                    className={`flex-1 px-3 py-2 border rounded-lg text-right text-sm ${INPUT_FOCUS} border-gray-300 hover:border-green-400`}
                    placeholder="0"
                  />
                )}
                <span className="text-gray-600 text-sm whitespace-nowrap">
                  {heir.isAutoAdjust ? '' : '万円'}
                </span>
                <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                  <input
                    type="radio"
                    name="autoAdjust"
                    checked={heir.isAutoAdjust}
                    onChange={() => handleAutoAdjustChange(i)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-500">自動</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="row-count" className="block text-sm font-medium text-gray-700 mb-1">
            行数（基準から上下）
          </label>
          <div className="flex items-center gap-3">
            <input
              id="row-count"
              type="number"
              value={rowCount}
              onChange={e => onRowCountChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              onWheel={e => e.currentTarget.blur()}
              min={1}
              max={20}
              className={`w-24 px-3 py-2 border rounded-lg text-right text-sm ${INPUT_FOCUS} border-gray-300 hover:border-green-400`}
            />
            <span className="text-sm text-gray-500">
              合計 {rowCount * 2 + 1} 行（上{rowCount} + 基準 + 下{rowCount}）
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
