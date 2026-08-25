import React from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { SectionHeader } from './SectionHeader';
import { CurrencyInput } from './CurrencyInput';
import { CARD } from './tableStyles';

interface EstateInputProps {
  value: number;
  onChange: (value: number) => void;
  /** カードの見出し（既定は「遺産総額」） */
  title?: string;
  label?: string;
  /** 入力すべき金額の範囲を補足する説明文 */
  hint?: string;
  placeholder?: string;
  hasError?: boolean;
}

export const EstateInput: React.FC<EstateInputProps> = ({ value, onChange, title = '遺産総額', label, hint, placeholder, hasError }) => {
  return (
    <div className={`${CARD} ${hasError ? 'ring-2 ring-red-400' : ''}`}>
      <SectionHeader icon={Landmark} title={title} />
      <CurrencyInput
        id="estate-value"
        value={value}
        onChange={onChange}
        label={label}
        hint={hint}
        placeholder={placeholder}
        hasError={hasError}
      />
    </div>
  );
};
