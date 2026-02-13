import React from 'react';
import { Heart } from 'lucide-react';
import type { SpouseAcquisitionMode } from '../../types';
import { formatCurrency } from '../../utils';

const MODE_OPTIONS = [
  {
    mode: 'legal' as const,
    label: '法定相続分どおり',
    description: '配偶者が法定相続分に従って取得',
  },
  {
    mode: 'limit160m' as const,
    label: '1億6,000万円まで',
    description: '配偶者の税額軽減の上限額まで取得',
  },
  {
    mode: 'custom' as const,
    label: '任意の金額を入力',
    description: '配偶者の取得額を直接指定',
  },
] as const;

interface SpouseAcquisitionSettingsProps {
  value: SpouseAcquisitionMode;
  onChange: (value: SpouseAcquisitionMode) => void;
  hasSpouse: boolean;
}

export const SpouseAcquisitionSettings: React.FC<SpouseAcquisitionSettingsProps> = ({
  value,
  onChange,
  hasSpouse,
}) => {
  if (!hasSpouse) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-green-600" aria-hidden="true" />
        <h2 className="text-xl font-bold text-gray-800">配偶者の取得割合</h2>
      </div>

      <fieldset className="space-y-3 border-0">
        <legend className="sr-only">配偶者の取得割合モード</legend>
        {MODE_OPTIONS.map((opt) => (
          <label key={opt.mode} className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="spouseMode"
              checked={value.mode === opt.mode}
              onChange={() => {
                if (opt.mode === 'custom') {
                  onChange({ mode: 'custom', value: 0 });
                } else {
                  onChange({ mode: opt.mode });
                }
              }}
              className="w-4 h-4 mt-0.5 accent-green-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <p className="text-xs text-gray-500">{opt.description}</p>
            </div>
          </label>
        ))}
      </fieldset>

      {value.mode === 'custom' && (
        <div className="mt-4 ml-6">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={value.value || ''}
              onChange={(e) =>
                onChange({ mode: 'custom', value: Number(e.target.value) || 0 })
              }
              min={0}
              step={100}
              className="w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
              placeholder="金額を入力"
            />
            <span className="text-gray-600 text-sm">万円</span>
          </div>
          {value.value > 0 && (
            <p className="mt-1 text-xs text-green-700">
              {formatCurrency(value.value)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
