import React from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { SectionHeader } from './SectionHeader';
import { CurrencyInput } from './CurrencyInput';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  hasError?: boolean;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange, label, placeholder, hasError }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${hasError ? 'ring-2 ring-red-400' : ''}`}>
      <SectionHeader icon={Landmark} title="遺産総額" />
      <CurrencyInput
        id="estate-value"
        value={value}
        onChange={onChange}
        label={label}
        placeholder={placeholder}
        hasError={hasError}
      />
    </div>
  );
};
