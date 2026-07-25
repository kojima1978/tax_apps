'use client';

import React, { useState } from 'react';

const formatComma = (n: number) => n ? n.toLocaleString() : '';

// 数値入力のカンマ表示を共通化（フォーム行つき / 素の input の2種類）
function useCommaDisplay(value: number, onChange: (n: number) => void) {
  const [display, setDisplay] = useState(formatComma(value));
  const [lastValue, setLastValue] = useState(value);

  // 外部から value が変わったときだけ表示を作り直す（レンダー中の派生state更新）
  if (value !== lastValue) {
    setLastValue(value);
    setDisplay(formatComma(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      setDisplay('');
      onChange(0);
    } else {
      const num = Number(raw);
      setDisplay(num.toLocaleString());
      onChange(num);
    }
  };

  return { display, handleChange, resetDisplay: () => setDisplay(formatComma(value)) };
}

export const CommaInput: React.FC<{
  value: number;
  onChange: (n: number) => void;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}> = ({ value, onChange, label, required = false, hint, error }) => {
  const { display, handleChange, resetDisplay } = useCommaDisplay(value, onChange);

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label>{label}{required && <> <span className="required-mark">*</span></>}</label>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onFocus={resetDisplay}
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
}> = ({ value, onChange, placeholder, ariaLabel }) => {
  const { display, handleChange, resetDisplay } = useCommaDisplay(value, onChange);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={resetDisplay}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
};

export default CommaInput;
