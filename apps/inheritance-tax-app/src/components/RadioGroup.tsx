interface RadioOption<T extends string | boolean> {
  value: T;
  label: string;
  id: string;
}

interface RadioGroupProps<T extends string | boolean> {
  name: string;
  legend: string;
  options: readonly RadioOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  bgClass?: string;
}

export function RadioGroup<T extends string | boolean>({
  name,
  legend,
  options,
  selected,
  onSelect,
  bgClass = 'bg-gray-50',
}: RadioGroupProps<T>) {
  return (
    <fieldset className={`mb-6 p-4 ${bgClass} rounded-lg border-0`}>
      <legend className="font-semibold text-gray-700 mb-3">{legend}</legend>
      <div className="space-y-2" role="radiogroup" aria-label={legend}>
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={selected === opt.value}
              onChange={() => onSelect(opt.value)}
              className="w-4 h-4 accent-green-600"
              aria-describedby={opt.id}
            />
            <span className="text-sm" id={opt.id}>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
