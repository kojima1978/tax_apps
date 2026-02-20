import { ChevronDown, UserPlus } from 'lucide-react';

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | '';
  onChange: (value: string) => void;
  options: T[];
  formatOption?: (option: T) => string;
  disabled?: boolean;
  onAdd?: () => void;
  addLabel?: string;
}

export default function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  formatOption,
  disabled = false,
  onAdd,
  addLabel
}: SelectFieldProps<T>) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-slate-700">{label}</label>
        {onAdd && !disabled && (
          <button
            onClick={onAdd}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center font-medium bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            {addLabel || '追加'}
          </button>
        )}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 appearance-none shadow-sm transition-shadow hover:border-emerald-300"
        >
          <option value="">選択してください</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {formatOption ? formatOption(opt) : opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
