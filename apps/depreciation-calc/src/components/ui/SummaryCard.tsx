type SummaryCardProps = {
    label: string;
    value: string;
    unit: string;
    variant?: 'primary' | 'secondary';
};

const STYLES = {
    primary: {
        container: 'bg-green-50 border-2 border-green-700',
        label: 'text-green-900',
        value: 'text-2xl sm:text-3xl text-green-800',
        unit: 'text-base',
    },
    secondary: {
        container: 'bg-gray-50 border border-gray-200',
        label: 'text-gray-600',
        value: 'text-xl sm:text-2xl text-gray-800',
        unit: 'text-sm',
    },
} as const;

const SummaryCard = ({ label, value, unit, variant = 'secondary' }: SummaryCardProps) => {
    const s = STYLES[variant];
    return (
        <div className={`p-4 rounded-lg text-center ${s.container}`}>
            <p className={`text-xs font-semibold mb-1 m-0 ${s.label}`}>{label}</p>
            <p className={`font-bold font-mono-num m-0 ${s.value}`}>
                {value}<span className={s.unit}>{unit}</span>
            </p>
        </div>
    );
};

export default SummaryCard;
