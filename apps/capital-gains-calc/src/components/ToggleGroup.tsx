export type ToggleOption<T extends string> = {
    value: T;
    label: string;
};

type ToggleGroupProps<T extends string> = {
    options: ToggleOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel: string;
};

/** 排他選択のトグル。選択肢は定数配列で渡す（データ駆動UI） */
function ToggleGroup<T extends string>({ options, value, onChange, ariaLabel }: ToggleGroupProps<T>) {
    return (
        <div className="mode-toggle" role="radiogroup" aria-label={ariaLabel}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    className={`toggle-btn${option.value === value ? " active" : ""}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default ToggleGroup;
