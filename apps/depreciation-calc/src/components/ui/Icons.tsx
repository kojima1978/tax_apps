/**
 * 共通SVGアイコン集
 * lucide-react 互換のインラインSVGアイコン
 */

type IconProps = {
    size?: number;
};

const svgBase = (size: number) => ({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
});

// --- Header ---

export const HomeIcon = ({ size = 22 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
);

export const PrinterIcon = ({ size = 16 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
);

// --- Tab Icons ---

export const CalendarIcon = ({ size = 16 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <path d="M8 2v4" /><path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
    </svg>
);

export const ClockIcon = ({ size = 16 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export const CalculatorIcon = ({ size = 16 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" />
        <path d="M12 14h.01" /><path d="M8 14h.01" />
        <path d="M12 18h.01" /><path d="M8 18h.01" />
    </svg>
);

// --- EmptyState Icons ---

export const BuildingIcon = ({ size = 48 }: IconProps = {}) => (
    <svg {...svgBase(size)} strokeWidth={1.5}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
);

export const BarChartIcon = ({ size = 48 }: IconProps = {}) => (
    <svg {...svgBase(size)} strokeWidth={1.5}>
        <line x1="12" x2="12" y1="20" y2="10" />
        <line x1="18" x2="18" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
);

export const CalendarDaysIcon = ({ size = 48 }: IconProps = {}) => (
    <svg {...svgBase(size)} strokeWidth={1.5}>
        <path d="M8 2v4" /><path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
        <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
    </svg>
);

// --- Misc ---

export const CheckIcon = ({ size = 12 }: IconProps = {}) => (
    <svg {...svgBase(size)}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
);
