import React, { memo } from 'react';
import SettingsIcon from 'lucide-react/icons/settings';
import { TABLE_CONFIG } from '../constants';
import { formatCurrency } from '../utils';
import { SectionHeader } from './SectionHeader';

interface RangeSettingsProps {
  maxValue: number;
  onMaxValueChange: (value: number) => void;
}

// 最大値の選択肢（5,000万円刻み）
const MAX_VALUE_OPTIONS = [
  { value: 10000, label: '1億円' },
  { value: 15000, label: '1億5千万円' },
  { value: 20000, label: '2億円' },
  { value: 25000, label: '2億5千万円' },
  { value: 30000, label: '3億円' },
  { value: 35000, label: '3億5千万円' },
  { value: 40000, label: '4億円' },
  { value: 45000, label: '4億5千万円' },
  { value: 50000, label: '5億円' },
  { value: 60000, label: '6億円' },
  { value: 70000, label: '7億円' },
  { value: 80000, label: '8億円' },
  { value: 90000, label: '9億円' },
  { value: 100000, label: '10億円' },
] as const;

export const RangeSettings: React.FC<RangeSettingsProps> = memo(({
  maxValue,
  onMaxValueChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 no-print">
      <SectionHeader icon={SettingsIcon} title="シミュレーション設定" />

      <div className="space-y-4">
        {/* 最小値（固定） */}
        <div>
          <label id="min-value-label" className="block text-sm font-medium text-gray-700 mb-2">
            相続財産額（開始）
          </label>
          <div
            className="px-4 py-2 bg-gray-100 rounded border border-gray-300 text-gray-600"
            aria-labelledby="min-value-label"
          >
            {formatCurrency(TABLE_CONFIG.MIN_VALUE)}（固定）
          </div>
        </div>

        {/* 最大値（選択可能） */}
        <div>
          <label htmlFor="max-value-select" className="block text-sm font-medium text-gray-700 mb-2">
            相続財産額（終了）
          </label>
          <select
            id="max-value-select"
            value={maxValue}
            onChange={(e) => onMaxValueChange(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
            aria-describedby="step-description"
          >
            {MAX_VALUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* ステップ説明 */}
        <div id="step-description" className="text-xs text-gray-500 mt-2">
          ※ {formatCurrency(TABLE_CONFIG.STEP)}刻みでテーブルを生成します
        </div>
      </div>
    </div>
  );
});

RangeSettings.displayName = 'RangeSettings';
