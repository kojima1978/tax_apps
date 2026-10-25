import type { ReactNode } from 'react';
import type { PrincipalInput } from '@/utils/powerOfAttorney/record';

// 委任状の画面と委任者DBの画面で共用する入力部品

export const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500';

export const BIRTH_PLACEHOLDER = '1970/3/2 または 昭和45年3月2日';

export const KIND_OPTIONS: { value: PrincipalInput['kind']; label: string }[] = [
  { value: 'individual', label: '個人' },
  { value: 'corporate', label: '法人' },
];

/** DB の画面の「開く」リンクなど、見出しの右に置くものは action に渡す */
export const Section = ({ title, children, note, action }: { title: string; children: ReactNode; note?: ReactNode; action?: ReactNode }) => (
  <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      {action}
    </div>
    {note && <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    {children}
  </section>
);

export function RadioGroup<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-emerald-600"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}) => (
  <label className="block space-y-1">
    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
    <input
      className={`${inputClass} ${error ? 'border-red-500 dark:border-red-500' : ''}`}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
    />
    {error && <span className="block text-xs text-red-600 dark:text-red-400">{error}</span>}
  </label>
);
