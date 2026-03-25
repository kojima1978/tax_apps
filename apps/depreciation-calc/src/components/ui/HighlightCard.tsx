import { type ReactNode } from "react";

type HighlightCardProps = {
    label: string;
    sublabel?: string;
    value: string;
    unit: string;
    children?: ReactNode;
};

const HighlightCard = ({ label, sublabel, value, unit, children }: HighlightCardProps) => (
    <div className="p-5 bg-green-50 border-2 border-green-700 rounded-lg text-center mb-4 animate-fade-in">
        <p className="text-sm text-green-900 font-semibold mb-1 m-0">{label}</p>
        {sublabel && <p className="text-xs text-green-700 mb-2 m-0">{sublabel}</p>}
        <p className="text-4xl sm:text-5xl font-bold text-green-800 font-mono-num m-0">
            {value}<span className="text-2xl sm:text-3xl">{unit}</span>
        </p>
        {children}
    </div>
);

export default HighlightCard;
