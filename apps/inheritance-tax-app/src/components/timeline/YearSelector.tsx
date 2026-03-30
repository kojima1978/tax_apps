import React from 'react';
import { TIMELINE_YEAR_OPTIONS } from '../../constants';

interface YearSelectorProps {
  selectedYears: number[];
  onChange: (years: number[]) => void;
}

export const YearSelector: React.FC<YearSelectorProps> = ({ selectedYears, onChange }) => {
  const toggle = (year: number) => {
    onChange(
      selectedYears.includes(year)
        ? selectedYears.filter(y => y !== year)
        : [...selectedYears, year],
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        シミュレーション年数（複数選択可）
      </label>
      <div className="flex flex-wrap gap-2">
        {TIMELINE_YEAR_OPTIONS.map(year => {
          const active = selectedYears.includes(year);
          return (
            <button
              key={year}
              type="button"
              onClick={() => toggle(year)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                active
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:border-green-400'
              }`}
            >
              {year}年後
            </button>
          );
        })}
      </div>
    </div>
  );
};
