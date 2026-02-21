import React from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { SectionHeader } from '../SectionHeader';
import { CurrencyInput } from '../CurrencyInput';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={Landmark} title="遺産総額" />
      <CurrencyInput value={value} onChange={onChange} />
    </div>
  );
};
