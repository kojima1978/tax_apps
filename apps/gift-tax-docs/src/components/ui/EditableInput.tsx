'use client';

import { Check, X } from 'lucide-react';

/** Enter/Escape キー共通ハンドラ */
export const handleInlineKeyDown = (
  e: React.KeyboardEvent,
  onConfirm: () => void,
  onCancel: () => void,
) => {
  if (e.key === 'Enter') onConfirm();
  if (e.key === 'Escape') onCancel();
};

// ─── 編集モード: input + Check/X アイコンボタン ───

type InlineEditInputProps = {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  ariaLabel: string;
  inputClass?: string;
  color?: 'emerald' | 'blue';
  iconSize?: string;
};

export const InlineEditInput = ({
  value,
  onChange,
  onConfirm,
  onCancel,
  ariaLabel,
  inputClass = 'flex-grow px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2',
  color = 'emerald',
  iconSize = 'w-5 h-5',
}: InlineEditInputProps) => (
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} focus:ring-${color}-500`}
      autoFocus
      aria-label={ariaLabel}
      onKeyDown={(e) => handleInlineKeyDown(e, onConfirm, onCancel)}
    />
    <button
      onClick={onConfirm}
      className={`p-1 text-${color}-600 hover:bg-${color}-100 rounded`}
      aria-label="編集を確定"
    >
      <Check className={iconSize} />
    </button>
    <button
      onClick={onCancel}
      className="p-1 text-slate-400 hover:bg-slate-100 rounded"
      aria-label="編集をキャンセル"
    >
      <X className={iconSize} />
    </button>
  </div>
);

// ─── 追加モード: input + 追加/キャンセル テキストボタン ───

type InlineAddInputProps = {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder: string;
  ariaLabel: string;
  inputClass?: string;
  color?: 'emerald' | 'blue';
  buttonSize?: 'sm' | 'base';
};

export const InlineAddInput = ({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder,
  ariaLabel,
  inputClass = 'flex-grow px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2',
  color = 'emerald',
  buttonSize = 'base',
}: InlineAddInputProps) => {
  const btnPad = buttonSize === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2';
  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} focus:ring-${color}-500`}
        autoFocus
        aria-label={ariaLabel}
        onKeyDown={(e) => handleInlineKeyDown(e, onConfirm, onCancel)}
      />
      <button
        onClick={onConfirm}
        className={`${btnPad} bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors`}
      >
        追加
      </button>
      <button
        onClick={onCancel}
        className={`${btnPad} bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors`}
      >
        キャンセル
      </button>
    </>
  );
};
