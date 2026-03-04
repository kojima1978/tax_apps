import React from 'react';
import { formatCurrency } from '../utils';
import { INPUT_FOCUS } from './tableStyles';

interface CurrencyInputProps {
  id?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  hasError?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ id, label, value, onChange, placeholder = '例: 10000', hasError }) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onWheel={(e) => e.currentTarget.blur()}
          min={0}
          step={100}
          inputMode="numeric"
          className={`w-full px-4 py-2 border rounded-lg ${INPUT_FOCUS} text-right text-lg ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
          placeholder={placeholder}
        />
        <span className="text-gray-600 whitespace-nowrap font-medium">万円</span>
      </div>
      {value > 0 && (
        <p className="mt-1 text-sm text-green-700 font-medium">
          {formatCurrency(value)}
        </p>
      )}
    </div>
  );
};
