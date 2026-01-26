import { Check } from 'lucide-react';

interface CheckboxOptionProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (id: string) => void;
}

export function CheckboxOption({
    id,
    label,
    checked,
    onChange,
}: CheckboxOptionProps) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${checked
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-300'
                }`}
        >
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => onChange(id)}
                className="sr-only"
            />
            <div
                className={`mt-1 w-5 h-5 flex items-center justify-center border rounded ${checked
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-white border-gray-300'
                    }`}
                aria-hidden="true"
            >
                {checked && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="ml-3 text-slate-700 font-medium">{label}</span>
        </label>
    );
}
