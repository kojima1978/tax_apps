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

const COLOR_CLASSES = {
  emerald: {
    ring: 'focus:ring-emerald-500',
    confirm: 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900',
    addBtn: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  blue: {
    ring: 'focus:ring-blue-500',
    confirm: 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900',
    addBtn: 'bg-blue-600 text-white hover:bg-blue-700',
  },
} as const;

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
  inputClass = 'flex-grow px-3 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200',
  color = 'emerald',
  iconSize = 'w-5 h-5',
}: InlineEditInputProps) => {
  const colors = COLOR_CLASSES[color];
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} ${colors.ring}`}
        autoFocus
        aria-label={ariaLabel}
        onKeyDown={(e) => handleInlineKeyDown(e, onConfirm, onCancel)}
      />
      <button
        onClick={onConfirm}
        className={`p-1 ${colors.confirm} rounded`}
        aria-label="編集を確定"
      >
        <Check className={iconSize} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
        aria-label="編集をキャンセル"
      >
        <X className={iconSize} />
      </button>
    </div>
  );
};

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
  inputClass = 'flex-grow px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200',
  color = 'emerald',
  buttonSize = 'base',
}: InlineAddInputProps) => {
  const btnPad = buttonSize === 'sm' ? 'px-3 py-1 text-sm' : 'px-4 py-2';
  const colors = COLOR_CLASSES[color];
  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} ${colors.ring}`}
        autoFocus
        aria-label={ariaLabel}
        onKeyDown={(e) => handleInlineKeyDown(e, onConfirm, onCancel)}
      />
      <button
        onClick={onConfirm}
        className={`${btnPad} ${colors.addBtn} rounded-lg transition-colors`}
      >
        追加
      </button>
      <button
        onClick={onCancel}
        className={`${btnPad} bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors`}
      >
        キャンセル
      </button>
    </>
  );
};
