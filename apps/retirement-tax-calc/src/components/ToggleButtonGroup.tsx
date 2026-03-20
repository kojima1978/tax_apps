type ToggleButtonGroupProps<T extends string> = {
    options: ReadonlyArray<{ value: T; label: string }>;
    selected: T;
    onChange: (value: T) => void;
    className?: string;
    size?: "normal" | "small";
};

const ToggleButtonGroup = <T extends string>({
    options,
    selected,
    onChange,
    className = "mode-toggle",
    size = "normal",
}: ToggleButtonGroupProps<T>) => (
    <div className={className}>
        {options.map((opt) => (
            <button
                key={opt.value}
                type="button"
                className={`toggle-btn${size === "small" ? " small" : ""} ${selected === opt.value ? "active" : ""}`}
                onClick={() => onChange(opt.value)}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

export default ToggleButtonGroup;
