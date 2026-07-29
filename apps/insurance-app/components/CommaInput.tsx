'use client';

import React, { useState } from 'react';

const formatComma = (n: number, decimalPlaces: number) => n
  ? n.toLocaleString('ja-JP', { maximumFractionDigits: decimalPlaces })
  : '';

// 数値入力のカンマ表示を共通化（フォーム行つき / 素の input の2種類）
function useCommaDisplay(value: number, onChange: (n: number) => void, decimalPlaces: number) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatComma(value, decimalPlaces);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = e.target.value
      .replace(/[０-９．]/g, char => char === '．' ? '.' : String(char.charCodeAt(0) - 0xFEE0))
      .replace(/[,，\s]/g, '');
    const raw = decimalPlaces > 0
      ? normalized.replace(/[^\d.]/g, '')
      : normalized.replace(/[^\d]/g, '');

    if (!raw) {
      setDraft('');
      onChange(0);
      return;
    }

    const [integerToken = '', ...fractionTokens] = raw.split('.');
    const integerDigits = integerToken.replace(/^0+(?=\d)/, '') || '0';
    const fractionDigits = fractionTokens.join('').slice(0, decimalPlaces);
    const hasDecimalPoint = decimalPlaces > 0 && raw.includes('.');
    const nextDisplay = `${Number(integerDigits).toLocaleString('ja-JP')}${
      hasDecimalPoint ? `.${fractionDigits}` : ''
    }`;
    const nextValue = Number(`${integerDigits}${hasDecimalPoint ? `.${fractionDigits}` : ''}`);

    setDraft(nextDisplay);
    onChange(Number.isFinite(nextValue) ? nextValue : 0);
  };

  return {
    display,
    handleChange,
    handleFocus: () => setDraft(formatComma(value, decimalPlaces)),
    handleBlur: () => setDraft(null),
  };
}

export const CommaInput: React.FC<{
  value: number;
  onChange: (n: number) => void;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  decimalPlaces?: number;
}> = ({ value, onChange, label, required = false, hint, error, decimalPlaces = 0 }) => {
  const { display, handleChange, handleFocus, handleBlur } = useCommaDisplay(value, onChange, decimalPlaces);

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label>{label}{required && <> <span className="required-mark">*</span></>}</label>
      <input
        type="text"
        inputMode={decimalPlaces > 0 ? 'decimal' : 'numeric'}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
};

export const CommaInputRaw: React.FC<{
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  ariaLabel?: string;
  decimalPlaces?: number;
}> = ({ value, onChange, placeholder, ariaLabel, decimalPlaces = 0 }) => {
  const { display, handleChange, handleFocus, handleBlur } = useCommaDisplay(value, onChange, decimalPlaces);

  return (
    <input
      type="text"
      inputMode={decimalPlaces > 0 ? 'decimal' : 'numeric'}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
};

export default CommaInput;
