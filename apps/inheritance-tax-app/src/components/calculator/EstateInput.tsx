import React from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { formatCurrency } from '../../utils';
import { SectionHeader } from '../SectionHeader';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={Landmark} title="遺産総額" />

      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          min={0}
          step={100}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right text-lg"
          placeholder="例: 10000"
        />
        <span className="text-gray-600 whitespace-nowrap font-medium">万円</span>
      </div>

      {value > 0 && (
        <p className="mt-2 text-sm text-green-700 font-medium">
          {formatCurrency(value)}
        </p>
      )}
    </div>
  );
};
