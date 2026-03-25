type PresetButtonsProps = {
    items: { label: string; value: string }[];
    current: string;
    onChange: (value: string) => void;
};

const PresetButtons = ({ items, current, onChange }: PresetButtonsProps) => (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
        {items.map((item) => (
            <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                    current === item.value
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-green-800 border-green-300 hover:bg-green-50 hover:border-green-500'
                }`}
            >
                {item.label}
            </button>
        ))}
    </div>
);

export default PresetButtons;
