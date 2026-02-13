import React from 'react';
import { Landmark } from 'lucide-react';
import { formatCurrency } from '../../utils';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-5 h-5 text-green-600" aria-hidden="true" />
        <h2 className="text-xl font-bold text-gray-800">遺産総額</h2>
      </div>

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
