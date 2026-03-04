import React from 'react';
import Heart from 'lucide-react/icons/heart';
import type { SpouseAcquisitionMode } from '../../types';
import { formatCurrency } from '../../utils';
import { SectionHeader } from '../SectionHeader';
import { CARD, INPUT_FOCUS } from '../tableStyles';

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
    label: '任意の値を入力',
    description: '配偶者の取得額を金額または割合で指定',
  },
] as const;

const UNIT_OPTIONS = [
  { unit: 'amount' as const, label: '万円' },
  { unit: 'percent' as const, label: '％' },
] as const;

const UNIT_BTN_BASE = 'px-3 py-1 text-sm font-medium rounded-md transition-colors';
const UNIT_BTN_ACTIVE = `${UNIT_BTN_BASE} bg-green-600 text-white`;
const UNIT_BTN_INACTIVE = `${UNIT_BTN_BASE} bg-gray-100 text-gray-600 hover:bg-gray-200`;

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

  const currentUnit = value.mode === 'custom' ? value.unit : 'amount';

  return (
    <div className={CARD}>
      <SectionHeader icon={Heart} title="配偶者の取得割合" />

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
                  onChange({ mode: 'custom', value: 0, unit: currentUnit });
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
          <div className="flex items-center gap-2 mb-3">
            {UNIT_OPTIONS.map(({ unit, label }) => (
              <button
                key={unit}
                type="button"
                onClick={() => onChange({ mode: 'custom', value: 0, unit })}
                className={value.unit === unit ? UNIT_BTN_ACTIVE : UNIT_BTN_INACTIVE}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={value.value || ''}
              onChange={(e) =>
                onChange({ mode: 'custom', value: Number(e.target.value) || 0, unit: value.unit })
              }
              min={0}
              max={value.unit === 'percent' ? 100 : undefined}
              step={value.unit === 'percent' ? 1 : 100}
              onWheel={e => e.currentTarget.blur()}
              className={`w-48 px-3 py-1.5 border border-gray-300 rounded-lg ${INPUT_FOCUS} text-right`}
              placeholder={value.unit === 'percent' ? '割合を入力' : '金額を入力'}
            />
            <span className="text-gray-600 text-sm">
              {value.unit === 'percent' ? '％' : '万円'}
            </span>
          </div>
          {value.value > 0 && value.unit === 'amount' && (
            <p className="mt-1 text-xs text-green-700">
              {formatCurrency(value.value)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
