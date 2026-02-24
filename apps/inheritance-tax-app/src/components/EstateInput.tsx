import React from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { SectionHeader } from './SectionHeader';
import { CurrencyInput } from './CurrencyInput';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange, label, placeholder }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={Landmark} title="遺産総額" />
      <CurrencyInput
        id="estate-value"
        value={value}
        onChange={onChange}
        label={label}
        placeholder={placeholder}
      />
    </div>
  );
};
