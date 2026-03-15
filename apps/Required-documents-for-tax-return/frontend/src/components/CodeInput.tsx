import { Hash } from 'lucide-react';

interface CodeInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  /** FormPageLayout内のフォーム用スタイル（rounded-xl, py-3.5） */
  variant?: 'form' | 'compact';
}

export default function CodeInput({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  variant = 'form',
}: CodeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength));
  };

  const isForm = variant === 'form';

  return (
    <div>
      {isForm ? (
        <label htmlFor={id} className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
          <Hash className="w-4 h-4 mr-2 text-emerald-600" />
          {label} <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">任意</span>
        </label>
      ) : (
        <label htmlFor={id} className="block text-sm font-bold text-slate-700 mb-2">
          {label} <span className="text-xs font-normal text-slate-500">（任意）</span>
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={
          isForm
            ? 'w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-base'
            : 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all'
        }
      />
    </div>
  );
}
